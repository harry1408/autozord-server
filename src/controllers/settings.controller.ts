import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { getSubscriptionState } from '../utils/subscription';
import { archiveCurrentLogo } from '../utils/shopLogo';

export async function getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const shopId = req.user!.shopId;
    if (!shopId) throw new AppError('A shop context is required to view settings', 400);

    let settings = await prisma.shopSettings.findFirst({ where: { shopId } });
    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!settings) {
      settings = await prisma.shopSettings.create({
        data: { shopId, shopName: shop?.name ?? 'My Auto Shop' },
      });
    }
    res.json({
      success: true,
      data: {
        ...settings,
        country: shop?.country ?? null,
        state: shop?.state ?? null,
        city: shop?.city ?? null,
        zip: shop?.zip ?? null,
      },
    });
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
        country: shop.country,
        currency: shop.currency,
        subscriptionPrice: shop.subscriptionPrice,
      },
    });
  } catch (err) { next(err); }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const shopId = req.user!.shopId;
    if (!shopId) throw new AppError('A shop context is required to update settings', 400);

    // country/state/city/zip live on Shop (used by the public directory and
    // inquiry filtering), not ShopSettings - split them out so Prisma
    // doesn't reject the ShopSettings upsert with unknown-argument errors.
    const { country, state, city, zip, ...settingsBody } = req.body;
    const hasLocationFields = [country, state, city, zip].some(v => v !== undefined);
    if (hasLocationFields) {
      if (!country || !state || !city || !zip) {
        throw new AppError('Country, state, city, and postal code are all required', 400);
      }
      await prisma.shop.update({ where: { id: shopId }, data: { country, state, city, zip } });
    }

    if (settingsBody.logoUrl !== undefined) {
      await archiveCurrentLogo(shopId, settingsBody.logoUrl);
    }

    const settings = await prisma.shopSettings.upsert({
      where: { shopId },
      update: settingsBody,
      create: { shopId, shopName: settingsBody.shopName ?? 'My Auto Shop', ...settingsBody },
    });

    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    res.json({
      success: true,
      data: {
        ...settings,
        country: shop?.country ?? null,
        state: shop?.state ?? null,
        city: shop?.city ?? null,
        zip: shop?.zip ?? null,
      },
    });
  } catch (err) { next(err); }
}
