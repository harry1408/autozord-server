import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { getSubscriptionState } from '../utils/subscription';

export async function getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const shopId = req.user!.shopId;
    if (!shopId) throw new AppError('A shop context is required to view settings', 400);

    let settings = await prisma.shopSettings.findFirst({ where: { shopId } });
    if (!settings) {
      const shop = await prisma.shop.findUnique({ where: { id: shopId } });
      settings = await prisma.shopSettings.create({
        data: { shopId, shopName: shop?.name ?? 'My Auto Shop' },
      });
    }
    res.json({ success: true, data: settings });
  } catch (err) { next(err); }
}

export async function getSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const shopId = req.user!.shopId;
    if (!shopId) throw new AppError('A shop context is required', 400);

    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new AppError('Shop not found', 404);

    const { status, daysLeft } = getSubscriptionState(shop);
    res.json({
      success: true,
      data: {
        planType: shop.planType,
        status,
        daysLeft,
        trialEndsAt: shop.trialEndsAt,
        paidUntil: shop.paidUntil,
      },
    });
  } catch (err) { next(err); }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const shopId = req.user!.shopId;
    if (!shopId) throw new AppError('A shop context is required to update settings', 400);

    const settings = await prisma.shopSettings.upsert({
      where: { shopId },
      update: req.body,
      create: { shopId, shopName: req.body.shopName ?? 'My Auto Shop', ...req.body },
    });
    res.json({ success: true, data: settings });
  } catch (err) { next(err); }
}
