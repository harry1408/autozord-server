import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  JwtPayload,
} from '../middleware/auth';
import { getSubscriptionState, isAllowedToOperate } from '../utils/subscription';

const SUBSCRIPTION_LOGIN_MESSAGES: Record<string, string> = {
  PENDING_VERIFICATION: 'Your account is pending verification. We\'ll notify you once approved.',
  SUSPENDED: 'This shop has been deactivated.',
  EXPIRED: 'Your subscription has expired. Contact info@autozord.com to renew.',
};

async function assertShopAllowsLogin(user: { role: string; shopId: string | null }): Promise<void> {
  if (user.role === 'GLOBAL_ADMIN' || !user.shopId) return;
  const shop = await prisma.shop.findUnique({ where: { id: user.shopId } });
  if (!shop) throw new AppError('Shop not found', 404);
  const { status } = getSubscriptionState(shop);
  if (!isAllowedToOperate(status)) {
    throw new AppError(SUBSCRIPTION_LOGIN_MESSAGES[status] ?? 'Access is currently restricted', 403);
  }
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

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive || user.deletedAt) {
    throw new AppError('Invalid credentials', 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid credentials', 401);
  }

  await assertShopAllowsLogin(user);

  const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role, shopId: user.shopId };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

  return { accessToken, refreshToken, user: sanitizeUser(user) };
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

  await assertShopAllowsLogin(user);

  const newPayload: JwtPayload = { userId: user.id, email: user.email, role: user.role, shopId: user.shopId };
  const newAccessToken = generateAccessToken(newPayload);
  const newRefreshToken = generateRefreshToken(newPayload);

  await prisma.user.update({ where: { id: user.id }, data: { refreshToken: newRefreshToken } });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken, user: sanitizeUser(user) };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) {
    throw new AppError('User not found', 404);
  }
  return sanitizeUser(user);
}
