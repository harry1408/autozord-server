import { Request, Response, NextFunction } from 'express';
import * as invoiceService from '../services/invoice.service';

export async function getInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, customerId, page = '1', limit = '20', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const result = await invoiceService.getInvoices({
      shopId: req.user!.shopId,
      status: status as string, customerId: customerId as string,
      page: parseInt(page as string), limit: parseInt(limit as string),
      sortBy: sortBy as string, sortOrder: sortOrder as 'asc' | 'desc',
    });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

export async function getInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await invoiceService.getInvoice(req.params.id, req.user!.shopId) });
  } catch (err) { next(err); }
}

export async function createInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(201).json({ success: true, data: await invoiceService.createInvoice(req.body, req.user!.shopId) });
  } catch (err) { next(err); }
}

export async function updateInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await invoiceService.updateInvoice(req.params.id, req.body, req.user!.shopId) });
  } catch (err) { next(err); }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await invoiceService.updateStatus(req.params.id, req.body.status, req.user!.shopId) });
  } catch (err) { next(err); }
}

export async function sendInvoiceEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await invoiceService.sendInvoiceEmail(req.params.id, req.user!.shopId, req.body.email, req.body.pdfBase64);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}
