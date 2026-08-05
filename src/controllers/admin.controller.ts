import { Request, Response, NextFunction } from 'express';
import * as adminService from '../services/admin.service';
import * as inquiryService from '../services/inquiry.service';

export async function getShops(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await adminService.getShops() });
  } catch (err) { next(err); }
}

export async function getShop(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await adminService.getShop(req.params.id) });
  } catch (err) { next(err); }
}

export async function createShop(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(201).json({ success: true, data: await adminService.createShop(req.body) });
  } catch (err) { next(err); }
}

export async function updateShop(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await adminService.updateShop(req.params.id, req.body) });
  } catch (err) { next(err); }
}

export async function deleteShop(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminService.deleteShop(req.params.id);
    res.json({ success: true, message: 'Shop deleted' });
  } catch (err) { next(err); }
}

export async function getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await adminService.getUsers() });
  } catch (err) { next(err); }
}

export async function getInquiries(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await inquiryService.getInquiries(req.user!.shopId) });
  } catch (err) { next(err); }
}

export async function resetUserPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await adminService.resetUserPassword(req.params.id) });
  } catch (err) { next(err); }
}

export async function getEmailLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await adminService.getEmailLogs() });
  } catch (err) { next(err); }
}

export async function sendDatabaseDump(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await adminService.generateAndEmailDatabaseDump() });
  } catch (err) { next(err); }
}
