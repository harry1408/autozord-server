import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function generateTempPassword(): string {
  return crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 12) + 'A1!';
}

export async function getEmailLogs() {
  return prisma.emailLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}

export async function resetUserPassword(id: string) {
  const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!user) throw new AppError('User not found', 404);

  const password = generateTempPassword();
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id }, data: { passwordHash, refreshToken: null } });

  return { password };
}

export async function getShops() {
  return prisma.shop.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { users: true, customers: true, vehicles: true, repairOrders: true } },
    },
  });
}

export async function getShop(id: string) {
  const shop = await prisma.shop.findFirst({ where: { id, deletedAt: null } });
  if (!shop) throw new AppError('Shop not found', 404);

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
    },
  });

  let adminUser = null;
  if (data.adminEmail && data.adminPassword) {
    const passwordHash = await bcrypt.hash(data.adminPassword, 10);
    adminUser = await prisma.user.create({
      data: {
        email: data.adminEmail,
        passwordHash,
        firstName: data.adminFirstName ?? 'Shop',
        lastName: data.adminLastName ?? 'Admin',
        role: 'SHOP_ADMIN',
        shopId: shop.id,
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });
  }

  return { shop, adminUser };
}

export async function updateShop(id: string, data: Partial<{
  name: string; address: string; city: string; state: string; zip: string; phone: string; email: string; isActive: boolean;
  planType: string; isVerified: boolean; trialEndsAt: string; paidUntil: string;
  country: string; currency: string; subscriptionPrice: number;
}>) {
  const existing = await prisma.shop.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new AppError('Shop not found', 404);
  return prisma.shop.update({
    where: { id },
    data: {
      ...data,
      trialEndsAt: data.trialEndsAt !== undefined ? (data.trialEndsAt ? new Date(data.trialEndsAt) : null) : undefined,
      paidUntil: data.paidUntil !== undefined ? (data.paidUntil ? new Date(data.paidUntil) : null) : undefined,
    },
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
