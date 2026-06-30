import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { paginate, buildPaginationMeta, generateInvoiceNumber } from '../utils/helpers';

const INVOICE_INCLUDE = {
  repairOrder: {
    include: {
      laborLines: true,
      partsLines: true,
      vehicle: { select: { make: true, model: true, year: true, vin: true, licensePlate: true } },
      technicians: {
        include: {
          technician: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
      },
      statusHistory: {
        include: { changedBy: { select: { firstName: true, lastName: true } } },
        orderBy: { changedAt: 'asc' as const },
      },
    },
  },
  customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, address: true } },
  payments: { orderBy: { paidAt: 'asc' as const } },
};

export async function getInvoices(params: {
  status?: string; customerId?: string;
  page: number; limit: number; sortBy: string; sortOrder: 'asc' | 'desc';
}) {
  const { status, customerId, page, limit, sortBy, sortOrder } = params;
  const { take, skip } = paginate(page, limit);
  const where: Record<string, unknown> = { deletedAt: null };
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;

  const [data, total] = await Promise.all([
    prisma.invoice.findMany({
      where, take, skip, orderBy: { [sortBy]: sortOrder },
      include: { customer: { select: { firstName: true, lastName: true } } },
    }),
    prisma.invoice.count({ where }),
  ]);
  return { data, pagination: buildPaginationMeta(total, page, take) };
}

export async function getInvoice(id: string) {
  const inv = await prisma.invoice.findFirst({ where: { id, deletedAt: null }, include: INVOICE_INCLUDE });
  if (!inv) throw new AppError('Invoice not found', 404);
  return inv;
}

export async function createInvoice(data: {
  repairOrderId: string; taxRate?: number; discount?: number; notes?: string; dueDate?: string;
}) {
  const ro = await prisma.repairOrder.findFirst({
    where: { id: data.repairOrderId, deletedAt: null },
    include: { laborLines: true, partsLines: true },
  });
  if (!ro) throw new AppError('Repair order not found', 404);

  const existing = await prisma.invoice.findFirst({ where: { repairOrderId: data.repairOrderId, deletedAt: null } });
  if (existing) throw new AppError('Invoice already exists for this repair order', 400);

  const laborTotal = ro.laborLines.reduce((sum, l) => sum + l.subtotal, 0);
  const partsTotal = ro.partsLines.reduce((sum, p) => sum + p.subtotal, 0);
  const subtotal = laborTotal + partsTotal;
  const taxRate = data.taxRate ?? 0;
  const discount = data.discount ?? 0;
  const taxAmount = ((subtotal - discount) * taxRate) / 100;
  const total = subtotal - discount + taxAmount;

  const inv = await prisma.invoice.create({
    data: {
      invoiceNumber: generateInvoiceNumber(),
      repairOrderId: data.repairOrderId,
      customerId: ro.customerId,
      subtotal,
      taxRate,
      taxAmount,
      discount,
      total,
      balance: total,
      notes: data.notes,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    },
    include: INVOICE_INCLUDE,
  });

  await prisma.repairOrder.update({ where: { id: data.repairOrderId }, data: { status: 'INVOICED' } });
  return inv;
}

export async function updateInvoice(id: string, data: Partial<{
  taxRate: number; discount: number; notes: string; dueDate: string;
}>) {
  const existing = await prisma.invoice.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new AppError('Invoice not found', 404);

  const taxRate = data.taxRate ?? existing.taxRate;
  const discount = data.discount ?? existing.discount;
  const taxAmount = ((existing.subtotal - discount) * taxRate) / 100;
  const total = existing.subtotal - discount + taxAmount;
  const balance = total - existing.amountPaid;

  return prisma.invoice.update({
    where: { id },
    data: { ...data, taxRate, taxAmount, total, balance, dueDate: data.dueDate ? new Date(data.dueDate) : undefined },
    include: INVOICE_INCLUDE,
  });
}

export async function updateStatus(id: string, status: string) {
  const valid = ['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'VOID'];
  if (!valid.includes(status)) throw new AppError('Invalid status', 400);
  const existing = await prisma.invoice.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new AppError('Invoice not found', 404);
  return prisma.invoice.update({ where: { id }, data: { status }, include: INVOICE_INCLUDE });
}
