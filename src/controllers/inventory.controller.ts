import { Request, Response, NextFunction } from 'express';
import * as inventoryService from '../services/inventory.service';

export async function getParts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, category, lowStock, page = '1', limit = '20', sortBy = 'name', sortOrder = 'asc' } = req.query;
    res.json({ success: true, ...(await inventoryService.getParts({ shopId: req.user!.shopId, search: search as string, category: category as string, lowStock: lowStock === 'true', page: parseInt(page as string), limit: parseInt(limit as string), sortBy: sortBy as string, sortOrder: sortOrder as 'asc' | 'desc' })) });
  } catch (err) { next(err); }
}

export async function getPart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await inventoryService.getPart(req.params.id, req.user!.shopId) });
  } catch (err) { next(err); }
}

export async function createPart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(201).json({ success: true, data: await inventoryService.createPart(req.body, req.user!.shopId) });
  } catch (err) { next(err); }
}

export async function updatePart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await inventoryService.updatePart(req.params.id, req.body, req.user!.shopId) });
  } catch (err) { next(err); }
}

export async function deletePart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await inventoryService.deletePart(req.params.id, req.user!.shopId);
    res.json({ success: true, message: 'Part deleted' });
  } catch (err) { next(err); }
}

export async function getSuppliers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await inventoryService.getSuppliers(req.user!.shopId) });
  } catch (err) { next(err); }
}

export async function createSupplier(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(201).json({ success: true, data: await inventoryService.createSupplier(req.body, req.user!.shopId) });
  } catch (err) { next(err); }
}
