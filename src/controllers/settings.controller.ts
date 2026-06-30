import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';

export async function getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let settings = await prisma.shopSettings.findFirst({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.shopSettings.create({
        data: { id: 'default', shopName: 'Autozord' },
      });
    }
    res.json({ success: true, data: settings });
  } catch (err) { next(err); }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const settings = await prisma.shopSettings.upsert({
      where: { id: 'default' },
      update: req.body,
      create: { id: 'default', shopName: req.body.shopName ?? 'Autozord', ...req.body },
    });
    res.json({ success: true, data: settings });
  } catch (err) { next(err); }
}
