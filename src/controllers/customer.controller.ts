import { Request, Response, NextFunction } from 'express';
import * as customerService from '../services/customer.service';

export async function getCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, page = '1', limit = '20', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const result = await customerService.getCustomers({
      shopId: req.user!.shopId,
      search: search as string,
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

export async function getCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await customerService.getCustomer(req.params.id, req.user!.shopId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await customerService.createCustomer(req.body, req.user!.shopId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await customerService.updateCustomer(req.params.id, req.body, req.user!.shopId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await customerService.deleteCustomer(req.params.id, req.user!.shopId);
    res.json({ success: true, message: 'Customer deleted' });
  } catch (err) {
    next(err);
  }
}

export async function getCustomerVehicles(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await customerService.getCustomerVehicles(req.params.id, req.user!.shopId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getCustomerRepairOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await customerService.getCustomerRepairOrders(req.params.id, req.user!.shopId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
