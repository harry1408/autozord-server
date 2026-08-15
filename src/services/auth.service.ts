import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  JwtPayload,
} from '../middleware/auth';
import { getSubscriptionState, isAllowedToOperate } from '../utils/subscription';
import { sendEmail, wrapEmailHtml, CLIENT_URL, EMAIL_COLORS } from '../utils/email';

const SUBSCRIPTION_LOGIN_MESSAGES: Record<string, string> = {
  PENDING_VERIFICATION: 'Your account is pending verification. We\'ll notify you once approved.',
  SUSPENDED: 'This shop has been deactivated.',
  EXPIRED: 'Your subscription has expired. Contact info@autozord.com to renew.',
};

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function assertEmailVerified(user: { emailVerifiedAt: Date | null }): void {
  if (!user.emailVerifiedAt) {
    throw new AppError('Please verify your email before logging in.', 403);
  }
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function sanitizeUser(user: { id: string; email: string; firstName: string; lastName: string; role: string; shopId: string | null; isActive: boolean }) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    shopId: user.shopId,
    isActive: user.isActive,
  };
}

// Returns the shop's subscription status without blocking login for
// PENDING_VERIFICATION - the client shows a full-screen lock overlay for
// that state instead, across every role, so a newly registered shop admin
// (or anyone they've invited in the meantime) can at least see their own
// account is real while the shop itself is still being confirmed.
// SUSPENDED/EXPIRED still block login entirely, unchanged.
async function getShopLoginStatus(user: { role: string; shopId: string | null }): Promise<string | null> {
  if (user.role === 'GLOBAL_ADMIN' || !user.shopId) return null;
  const shop = await prisma.shop.findUnique({ where: { id: user.shopId } });
  if (!shop) throw new AppError('Shop not found', 404);
  const { status } = getSubscriptionState(shop);
  if (status !== 'PENDING_VERIFICATION' && !isAllowedToOperate(status)) {
    throw new AppError(SUBSCRIPTION_LOGIN_MESSAGES[status] ?? 'Access is currently restricted', 403);
  }
  return status;
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive || user.deletedAt) {
    throw new AppError('Invalid credentials', 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid credentials', 401);
  }

  assertEmailVerified(user);
  const shopStatus = await getShopLoginStatus(user);

  const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role, shopId: user.shopId };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

  return { accessToken, refreshToken, user: { ...sanitizeUser(user), shopStatus } };
}

export async function logout(refreshToken: string) {
  await prisma.user.updateMany({
    where: { refreshToken },
    data: { refreshToken: null },
  });
}

export async function refresh(refreshToken: string) {
  let payload: JwtPayload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Invalid refresh token', 401);
  }

  const user = await prisma.user.findFirst({
    where: { id: payload.userId, refreshToken },
  });
  if (!user || !user.isActive || user.deletedAt) {
    throw new AppError('Invalid refresh token', 401);
  }

  assertEmailVerified(user);
  const shopStatus = await getShopLoginStatus(user);

  const newPayload: JwtPayload = { userId: user.id, email: user.email, role: user.role, shopId: user.shopId };
  const newAccessToken = generateAccessToken(newPayload);
  const newRefreshToken = generateRefreshToken(newPayload);

  await prisma.user.update({ where: { id: user.id }, data: { refreshToken: newRefreshToken } });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken, user: { ...sanitizeUser(user), shopStatus } };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) {
    throw new AppError('User not found', 404);
  }
  // Non-blocking here (unlike login/refresh) - a token already issued stays
  // valid on page reload even if shop status changed since; this is purely
  // so the client can (re)show the lock overlay after a refresh.
  let shopStatus: string | null = null;
  if (user.role !== 'GLOBAL_ADMIN' && user.shopId) {
    const shop = await prisma.shop.findUnique({ where: { id: user.shopId } });
    if (shop) shopStatus = getSubscriptionState(shop).status;
  }
  return { ...sanitizeUser(user), shopStatus };
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always behave the same whether or not the account exists, so this
  // endpoint can't be used to enumerate registered emails.
  if (!user || !user.isActive || user.deletedAt) return;

  const rawToken = crypto.randomBytes(32).toString('hex');
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetTokenHash: hashToken(rawToken),
      passwordResetExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  // NOTE: HTML attributes here must use single quotes, not double quotes -
  // see the matching note in signup.service.ts.
  await sendEmail({
    to: user.email,
    subject: 'Reset your Autozord password',
    html: wrapEmailHtml(`<p style='margin:0 0 16px;'>Hi ${user.firstName},</p><p style='margin:0 0 24px;'>Click the button below to set a new password. This link expires in 1 hour.</p><table role='presentation' cellpadding='0' cellspacing='0' style='margin:0 0 24px;'><tr><td bgcolor='${EMAIL_COLORS.BRAND_RED}' style='border-radius:8px;background-color:${EMAIL_COLORS.BRAND_RED};'><a href='${CLIENT_URL}/reset-password?token=${rawToken}' style='display:inline-block;padding:14px 28px;color:#ffffff;font-weight:bold;text-decoration:none;font-size:14px;border-radius:8px;'>Reset your password</a></td></tr></table><p style='margin:0;color:${EMAIL_COLORS.TEXT_MUTED};font-size:13px;'>If you didn't request this, you can safely ignore this email.</p>`),
    category: 'PASSWORD_RESET',
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(token);
  const user = await prisma.user.findFirst({ where: { passwordResetTokenHash: tokenHash } });
  if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt.getTime() < Date.now()) {
    throw new AppError('This reset link is invalid or has expired.', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, passwordResetTokenHash: null, passwordResetExpiresAt: null, refreshToken: null },
  });
}
