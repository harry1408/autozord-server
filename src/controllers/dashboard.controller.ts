import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboard.service';

export async function getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await dashboardService.getStats(req.user!.shopId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getRevenueChart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const data = await dashboardService.getRevenueChart(days, req.user!.shopId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getRecentOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await dashboardService.getRecentOrders(req.user!.shopId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getActivityFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await dashboardService.getActivityFeed(req.user!.shopId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
