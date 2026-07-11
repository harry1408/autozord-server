import { Request, Response, NextFunction } from 'express';
import * as roService from '../services/repairOrder.service';

export async function getRepairOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, status, customerId, vehicleId, technicianId, page = '1', limit = '20', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const result = await roService.getRepairOrders({
      search: search as string,
      status: status as string,
      customerId: customerId as string,
      vehicleId: vehicleId as string,
      technicianId: technicianId as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

export async function getRepairOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await roService.getRepairOrder(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function createRepairOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await roService.createRepairOrder(req.body, req.user!.userId);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function updateRepairOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await roService.updateRepairOrder(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function deleteRepairOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await roService.deleteRepairOrder(req.params.id);
    res.json({ success: true, message: 'Repair order deleted' });
  } catch (err) { next(err); }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, note } = req.body;
    const data = await roService.updateStatus(req.params.id, status, req.user!.userId, note);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function assignTechnician(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { technicianId } = req.body;
    const data = await roService.assignTechnician(req.params.id, technicianId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function removeTechnician(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await roService.removeTechnician(req.params.id, req.params.techId);
    res.json({ success: true, message: 'Technician removed' });
  } catch (err) { next(err); }
}

export async function addJobLine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await roService.addJobLine(req.params.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function updateJobLine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await roService.updateJobLine(req.params.jobId, req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function deleteJobLine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await roService.deleteJobLine(req.params.jobId);
    res.json({ success: true, message: 'Job deleted' });
  } catch (err) { next(err); }
}

export async function addLaborLine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await roService.addLaborLine(req.params.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function updateLaborLine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await roService.updateLaborLine(req.params.lineId, req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function deleteLaborLine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await roService.deleteLaborLine(req.params.lineId);
    res.json({ success: true, message: 'Labor line deleted' });
  } catch (err) { next(err); }
}

export async function addPartsLine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await roService.addPartsLine(req.params.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function updatePartsLine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await roService.updatePartsLine(req.params.lineId, req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function deletePartsLine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await roService.deletePartsLine(req.params.lineId);
    res.json({ success: true, message: 'Parts line deleted' });
  } catch (err) { next(err); }
}
