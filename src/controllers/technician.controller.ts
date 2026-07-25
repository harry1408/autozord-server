import { Request, Response, NextFunction } from 'express';
import * as techService from '../services/technician.service';

export async function getTechnicians(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page = '1', limit = '20' } = req.query;
    res.json({ success: true, ...(await techService.getTechnicians({ shopId: req.user!.shopId, page: parseInt(page as string), limit: parseInt(limit as string) })) });
  } catch (err) { next(err); }
}

export async function getTechnician(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await techService.getTechnician(req.params.id, req.user!.shopId) });
  } catch (err) { next(err); }
}

export async function createTechnician(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(201).json({ success: true, data: await techService.createTechnician(req.body, req.user!.shopId) });
  } catch (err) { next(err); }
}

export async function updateTechnician(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await techService.updateTechnician(req.params.id, req.body, req.user!.shopId) });
  } catch (err) { next(err); }
}

export async function deleteTechnician(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await techService.deleteTechnician(req.params.id, req.user!.shopId);
    res.json({ success: true, message: 'Technician deactivated' });
  } catch (err) { next(err); }
}
