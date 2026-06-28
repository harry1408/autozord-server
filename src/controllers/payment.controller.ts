import { Request, Response, NextFunction } from 'express';
import * as paymentService from '../services/payment.service';

export async function getPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page = '1', limit = '20' } = req.query;
    const result = await paymentService.getPayments({
      page: parseInt(page as string), limit: parseInt(limit as string),
    });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

export async function createPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(201).json({ success: true, data: await paymentService.createPayment(req.body) });
  } catch (err) { next(err); }
}

export async function getInvoicePayments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await paymentService.getInvoicePayments(req.params.invoiceId) });
  } catch (err) { next(err); }
}
