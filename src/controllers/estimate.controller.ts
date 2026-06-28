import { Request, Response, NextFunction } from 'express';
import * as estimateService from '../services/estimate.service';

export async function getEstimates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, status, customerId, page = '1', limit = '20', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const result = await estimateService.getEstimates({
      search: search as string, status: status as string, customerId: customerId as string,
      page: parseInt(page as string), limit: parseInt(limit as string),
      sortBy: sortBy as string, sortOrder: sortOrder as 'asc' | 'desc',
    });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

export async function getEstimate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await estimateService.getEstimate(req.params.id) });
  } catch (err) { next(err); }
}

export async function createEstimate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(201).json({ success: true, data: await estimateService.createEstimate(req.body) });
  } catch (err) { next(err); }
}

export async function updateEstimate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await estimateService.updateEstimate(req.params.id, req.body) });
  } catch (err) { next(err); }
}

export async function deleteEstimate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await estimateService.deleteEstimate(req.params.id);
    res.json({ success: true, message: 'Estimate deleted' });
  } catch (err) { next(err); }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await estimateService.updateStatus(req.params.id, req.body.status) });
  } catch (err) { next(err); }
}

export async function convertToRO(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(201).json({ success: true, data: await estimateService.convertToRO(req.params.id, req.user!.userId) });
  } catch (err) { next(err); }
}
