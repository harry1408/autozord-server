import { Request, Response, NextFunction } from 'express';
import * as inquiryService from '../services/inquiry.service';

export async function getPublicShops(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await inquiryService.getPublicShops() });
  } catch (err) { next(err); }
}

export async function createInquiry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, phone, vehicleInfo, message, shopIds } = req.body;
    if (!name || !email || !message) {
      res.status(400).json({ success: false, message: 'Name, email, and message are required' });
      return;
    }
    if (!Array.isArray(shopIds) || shopIds.length === 0) {
      res.status(400).json({ success: false, message: 'Select at least one shop' });
      return;
    }
    const data = await inquiryService.createInquiry({ name, email, phone, vehicleInfo, message, shopIds });
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}
