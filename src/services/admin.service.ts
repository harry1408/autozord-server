import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import zlib from 'zlib';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { sendEmail, wrapEmailHtml, CLIENT_URL, EMAIL_COLORS } from '../utils/email';
import { generateDatabaseDumpSql } from '../utils/dbDump';
import { OTP_TTL_MINUTES, generateOtp, sendOtpEmail } from '../utils/otp';
import { archiveCurrentLogo } from '../utils/shopLogo';
import { buildPromoEmail, isValidPromoRegion, PromoRegion } from '../utils/promoEmail';
import { getSubscriptionState } from '../utils/subscription';

const DB_DUMP_RECIPIENT = 'autozord.com@gmail.com';

// Writes the dump to a temp file only for the moment it takes to email it,
// then removes it in a finally block - guaranteed cleanup even if the
// email send fails, and nothing is left behind either way.
export async function generateAndEmailDatabaseDump(): Promise<{ email: string; tableCount: number; rowCount: number; sizeBytes: number }> {
  const { sql, tableCount, rowCount } = await generateDatabaseDumpSql();
  const gzipped = zlib.gzipSync(sql);
  const filename = `autozord-db-dump-${new Date().toISOString().replace(/[:.]/g, '-')}.sql.gz`;
  const tmpPath = path.join(os.tmpdir(), filename);

  try {
    await fs.writeFile(tmpPath, gzipped);

    await sendEmail({
      to: DB_DUMP_RECIPIENT,
      subject: `Autozord database dump - ${new Date().toLocaleDateString()}`,
      html: wrapEmailHtml(`<p style='margin:0 0 16px;'>Database dump attached.</p><p style='margin:0;color:${EMAIL_COLORS.TEXT_MUTED};font-size:13px;'>${tableCount} tables, ${rowCount} rows, generated ${new Date().toISOString()}.</p>`),
      category: 'DB_DUMP',
      attachment: {
        filename,
        contentBase64: gzipped.toString('base64'),
      },
    });

    return { email: DB_DUMP_RECIPIENT, tableCount, rowCount, sizeBytes: gzipped.length };
  } finally {
    await fs.unlink(tmpPath).catch(() => {});
  }
}

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function generateTempPassword(): string {
  return crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 12) + 'A1!';
}

async function sendShopVerifiedEmail(shopId: string, shopName: string): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { shopId, role: 'SHOP_ADMIN', isActive: true, deletedAt: null },
  });
  for (const admin of admins) {
    await sendEmail({
      to: admin.email,
      subject: 'Your Autozord account is verified',
      html: wrapEmailHtml(`<p style='margin:0 0 16px;'>Hi ${admin.firstName},</p><p style='margin:0 0 24px;'>Good news — ${shopName} has been verified. You can now log in and start using Autozord.</p><table role='presentation' cellpadding='0' cellspacing='0' style='margin:0 0 16px;'><tr><td bgcolor='${EMAIL_COLORS.BRAND_RED}' style='border-radius:8px;background-color:${EMAIL_COLORS.BRAND_RED};'><a href='${CLIENT_URL}/login' style='display:inline-block;padding:14px 28px;color:#ffffff;font-weight:bold;text-decoration:none;font-size:14px;border-radius:8px;'>Log in</a></td></tr></table><p style='margin:0;color:${EMAIL_COLORS.TEXT_MUTED};font-size:13px;'>Welcome aboard!</p>`),
      category: 'ACCOUNT_VERIFIED',
    });
  }
}

export async function getEmailLogs() {
  return prisma.emailLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}

export async function sendPromoEmail(to: string, region: PromoRegion): Promise<void> {
  if (!to || !/^\S+@\S+\.\S+$/.test(to)) throw new AppError('A valid recipient email is required', 400);
  if (!isValidPromoRegion(region)) throw new AppError('Region must be US or CA', 400);

  const { subject, html } = buildPromoEmail(region);
  await sendEmail({ to, subject, html, category: 'PROMOTION' });
}

export async function resetUserPassword(id: string, customPassword?: string) {
  const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!user) throw new AppError('User not found', 404);

  if (customPassword !== undefined && customPassword.length < 6) {
    throw new AppError('Password must be at least 6 characters', 400);
  }

  const password = customPassword || generateTempPassword();
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id }, data: { passwordHash, refreshToken: null } });

  return { password };
}

export async function getShops() {
  const shops = await prisma.shop.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { users: true, customers: true, vehicles: true, repairOrders: true } },
      settings: { select: { logoUrl: true } },
    },
  });
  return shops.map(shop => ({ ...shop, ...getSubscriptionState(shop) }));
}

export async function getShop(id: string) {
  const shopRow = await prisma.shop.findFirst({
    where: { id, deletedAt: null },
    include: { settings: { select: { logoUrl: true } } },
  });
  if (!shopRow) throw new AppError('Shop not found', 404);
  const shop = { ...shopRow, ...getSubscriptionState(shopRow) };

  const [users, customerCount, vehicleCount, repairOrderCount, openRepairOrderCount, revenue] = await Promise.all([
    prisma.user.findMany({
      where: { shopId: id, deletedAt: null },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.customer.count({ where: { shopId: id, deletedAt: null } }),
    prisma.vehicle.count({ where: { shopId: id, deletedAt: null } }),
    prisma.repairOrder.count({ where: { shopId: id, deletedAt: null } }),
    prisma.repairOrder.count({
      where: { shopId: id, deletedAt: null, status: { in: ['APPROVED', 'IN_PROGRESS', 'WAITING_PARTS', 'QUALITY_CHECK'] } },
    }),
    prisma.payment.aggregate({ where: { shopId: id }, _sum: { amount: true } }),
  ]);

  return {
    shop,
    users,
    stats: {
      customerCount,
      vehicleCount,
      repairOrderCount,
      openRepairOrderCount,
      totalRevenue: revenue._sum.amount ?? 0,
    },
  };
}

export async function createShop(data: {
  name: string;
  slug?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  adminFirstName?: string;
  adminLastName?: string;
  adminEmail?: string;
  adminPassword?: string;
}) {
  if (!data.name) throw new AppError('Shop name is required', 400);

  const slug = data.slug ? slugify(data.slug) : slugify(data.name);
  const existingShop = await prisma.shop.findUnique({ where: { slug } });
  if (existingShop) throw new AppError('A shop with this slug already exists', 400);

  if (data.adminEmail || data.adminPassword) {
    if (!data.adminEmail || !data.adminPassword) {
      throw new AppError('Both an admin email and password are required to create the shop admin', 400);
    }
    const existingUser = await prisma.user.findUnique({ where: { email: data.adminEmail } });
    if (existingUser) throw new AppError('Email already in use', 400);
  }

  // Starts unverified like a self-signup shop - Global Admin still has to
  // explicitly confirm/verify it (e.g. payment) before it's fully active.
  // The client shows a lock-screen overlay for PENDING_VERIFICATION rather
  // than blocking login outright, so the new admin can still sign in.
  const shop = await prisma.shop.create({
    data: {
      name: data.name,
      slug,
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      phone: data.phone,
      email: data.email,
      isVerified: false,
    },
  });

  let adminUser = null;
  if (data.adminEmail && data.adminPassword) {
    const passwordHash = await bcrypt.hash(data.adminPassword, 10);
    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    adminUser = await prisma.user.create({
      data: {
        email: data.adminEmail,
        passwordHash,
        firstName: data.adminFirstName ?? 'Shop',
        lastName: data.adminLastName ?? 'Admin',
        role: 'SHOP_ADMIN',
        shopId: shop.id,
        emailVerifiedAt: null,
        emailOtp: otp,
        emailOtpExpiresAt: otpExpiresAt,
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });
    await sendOtpEmail(data.adminEmail, adminUser.firstName, otp);
  }

  return { shop, adminUser };
}

export async function updateShop(id: string, data: Partial<{
  name: string; address: string; city: string; state: string; zip: string; phone: string; email: string; isActive: boolean;
  planType: string; isVerified: boolean; trialEndsAt: string; paidUntil: string;
  country: string; currency: string; subscriptionPrice: number; logoUrl: string;
}>) {
  const existing = await prisma.shop.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new AppError('Shop not found', 404);

  // logoUrl lives on ShopSettings (shared with the shop's own self-service
  // Settings page), not on Shop itself, so it's upserted separately here
  // rather than spread into the Shop update below.
  const { logoUrl, ...shopData } = data;

  const updated = await prisma.shop.update({
    where: { id },
    data: {
      ...shopData,
      trialEndsAt: shopData.trialEndsAt !== undefined ? (shopData.trialEndsAt ? new Date(shopData.trialEndsAt) : null) : undefined,
      paidUntil: shopData.paidUntil !== undefined ? (shopData.paidUntil ? new Date(shopData.paidUntil) : null) : undefined,
    },
  });

  if (logoUrl !== undefined) {
    await archiveCurrentLogo(id, logoUrl);
    await prisma.shopSettings.upsert({
      where: { shopId: id },
      update: { logoUrl },
      create: { shopId: id, logoUrl },
    });
  }

  if (data.isVerified === true && !existing.isVerified) {
    await sendShopVerifiedEmail(updated.id, updated.name);
  }

  return updated;
}

export async function getShopLogoHistory(shopId: string) {
  const shop = await prisma.shop.findFirst({ where: { id: shopId, deletedAt: null } });
  if (!shop) throw new AppError('Shop not found', 404);

  const settings = await prisma.shopSettings.findUnique({ where: { shopId } });
  const history = await prisma.shopLogoHistory.findMany({
    where: { shopId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  // The currently-active logo isn't "history" - filter it out in case it
  // also happens to appear as an archived row (e.g. after a restore).
  return history.filter(h => h.logoUrl !== settings?.logoUrl);
}

export async function restoreShopLogo(shopId: string, historyId: string) {
  const entry = await prisma.shopLogoHistory.findFirst({ where: { id: historyId, shopId, deletedAt: null } });
  if (!entry) throw new AppError('Logo history entry not found', 404);

  // Reuses the same archive-then-overwrite path as a normal upload, so
  // whatever's currently active gets preserved in history too, not lost.
  await archiveCurrentLogo(shopId, entry.logoUrl);
  return prisma.shopSettings.upsert({
    where: { shopId },
    update: { logoUrl: entry.logoUrl },
    create: { shopId, logoUrl: entry.logoUrl },
  });
}

export async function deleteShop(id: string) {
  const existing = await prisma.shop.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new AppError('Shop not found', 404);
  return prisma.shop.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
}

export async function getUsers() {
  return prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      createdAt: true,
      shopId: true,
      shop: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}
