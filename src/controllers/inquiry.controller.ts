import { Request, Response, NextFunction } from 'express';
import * as inquiryService from '../services/inquiry.service';

export async function getInquiries(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await inquiryService.getInquiries(req.user!.shopId) });
  } catch (err) { next(err); }
}

export async function respondToInquiry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await inquiryService.respondToInquiry(req.params.id, req.body, req.user!.shopId, req.user!.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}
