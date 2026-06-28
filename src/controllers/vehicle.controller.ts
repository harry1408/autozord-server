import { Request, Response, NextFunction } from 'express';
import * as vehicleService from '../services/vehicle.service';

export async function getVehicles(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, customerId, page = '1', limit = '20', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const result = await vehicleService.getVehicles({
      search: search as string,
      customerId: customerId as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function getVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await vehicleService.getVehicle(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await vehicleService.createVehicle(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await vehicleService.updateVehicle(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await vehicleService.deleteVehicle(req.params.id);
    res.json({ success: true, message: 'Vehicle deleted' });
  } catch (err) {
    next(err);
  }
}
