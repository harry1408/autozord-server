import { Request, Response, NextFunction } from 'express';
import * as reportService from '../services/report.service';

export async function getRevenue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { startDate, endDate } = req.query;
    res.json({ success: true, data: await reportService.getRevenueReport(startDate as string, endDate as string) });
  } catch (err) { next(err); }
}

export async function getRepairOrdersReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { startDate, endDate } = req.query;
    res.json({ success: true, data: await reportService.getRepairOrdersReport(startDate as string, endDate as string) });
  } catch (err) { next(err); }
}

export async function getTechnicianReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { startDate, endDate } = req.query;
    res.json({ success: true, data: await reportService.getTechnicianReport(startDate as string, endDate as string) });
  } catch (err) { next(err); }
}

export async function getInventoryReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await reportService.getInventoryReport() });
  } catch (err) { next(err); }
}

export async function getAgingReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await reportService.getAgingReport() });
  } catch (err) { next(err); }
}
