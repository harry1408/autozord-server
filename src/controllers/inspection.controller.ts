import { Request, Response, NextFunction } from 'express';
import * as inspectionService from '../services/inspection.service';

export async function getInspections(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { vehicleId, repairOrderId, page = '1', limit = '20' } = req.query;
    res.json({ success: true, ...(await inspectionService.getInspections({ vehicleId: vehicleId as string, repairOrderId: repairOrderId as string, page: parseInt(page as string), limit: parseInt(limit as string) })) });
  } catch (err) { next(err); }
}

export async function getInspection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await inspectionService.getInspection(req.params.id) });
  } catch (err) { next(err); }
}

export async function createInspection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(201).json({ success: true, data: await inspectionService.createInspection(req.body) });
  } catch (err) { next(err); }
}

export async function updateInspection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await inspectionService.updateInspection(req.params.id, req.body) });
  } catch (err) { next(err); }
}

export async function addItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(201).json({ success: true, data: await inspectionService.addItem(req.params.id, req.body) });
  } catch (err) { next(err); }
}

export async function updateItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await inspectionService.updateItem(req.params.itemId, req.body) });
  } catch (err) { next(err); }
}
