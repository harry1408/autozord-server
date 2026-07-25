import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from './errorHandler';
import { getSubscriptionState, isAllowedToOperate } from '../utils/subscription';

const STATUS_MESSAGES: Record<string, string> = {
  PENDING_VERIFICATION: 'Your account is pending verification. We\'ll notify you once approved.',
  SUSPENDED: 'This shop has been deactivated.',
  EXPIRED: 'Your subscription has expired. Contact info@autozord.com to renew.',
};

export async function requireActiveSubscription(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user || req.user.role === 'GLOBAL_ADMIN' || !req.user.shopId) {
      next();
      return;
    }

    const shop = await prisma.shop.findUnique({ where: { id: req.user.shopId } });
    if (!shop) {
      throw new AppError('Shop not found', 404);
    }

    const { status } = getSubscriptionState(shop);
    if (!isAllowedToOperate(status)) {
      throw new AppError(STATUS_MESSAGES[status] ?? 'Access is currently restricted', 403);
    }

    next();
  } catch (err) {
    next(err);
  }
}
