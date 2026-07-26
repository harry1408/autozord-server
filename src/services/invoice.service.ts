import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { paginate, buildPaginationMeta, generateInvoiceNumber, shopScope } from '../utils/helpers';
import { sendEmail, wrapEmailHtml } from '../utils/email';

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
  shopId: string | null;
  status?: string; customerId?: string;
  page: number; limit: number; sortBy: string; sortOrder: 'asc' | 'desc';
}) {
  const { shopId, status, customerId, page, limit, sortBy, sortOrder } = params;
  const { take, skip } = paginate(page, limit);
  const where: Record<string, unknown> = { ...shopScope(shopId), deletedAt: null };
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

export async function getInvoice(id: string, shopId: string | null) {
  const inv = await prisma.invoice.findFirst({ where: { id, ...shopScope(shopId), deletedAt: null }, include: INVOICE_INCLUDE });
  if (!inv) throw new AppError('Invoice not found', 404);
  return inv;
}

export async function createInvoice(data: {
  repairOrderId: string; taxRate?: number; discount?: number; notes?: string; dueDate?: string;
}, shopId: string | null) {
  const ro = await prisma.repairOrder.findFirst({
    where: { id: data.repairOrderId, ...shopScope(shopId), deletedAt: null },
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
      shopId: ro.shopId,
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
}>, shopId: string | null) {
  const existing = await prisma.invoice.findFirst({ where: { id, ...shopScope(shopId), deletedAt: null } });
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

export async function updateStatus(id: string, status: string, shopId: string | null) {
  const valid = ['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'VOID'];
  if (!valid.includes(status)) throw new AppError('Invalid status', 400);
  const existing = await prisma.invoice.findFirst({ where: { id, ...shopScope(shopId), deletedAt: null } });
  if (!existing) throw new AppError('Invoice not found', 404);
  return prisma.invoice.update({ where: { id }, data: { status }, include: INVOICE_INCLUDE });
}

export async function sendInvoiceEmail(id: string, shopId: string | null, emailOverride: string | undefined, pdfBase64: string) {
  if (!pdfBase64) throw new AppError('Invoice PDF is required', 400);

  const inv = await prisma.invoice.findFirst({ where: { id, ...shopScope(shopId), deletedAt: null }, include: INVOICE_INCLUDE });
  if (!inv) throw new AppError('Invoice not found', 404);

  const trimmedOverride = emailOverride?.trim();
  const targetEmail = trimmedOverride || inv.customer.email;
  if (!targetEmail) throw new AppError('Customer email is required', 400);

  if (trimmedOverride && trimmedOverride !== inv.customer.email) {
    await prisma.customer.update({ where: { id: inv.customer.id }, data: { email: trimmedOverride } });
  }

  const settings = await prisma.shopSettings.findFirst({ where: { shopId: inv.shopId } });
  const shopName = settings?.shopName ?? 'Autozord';

  await sendEmail({
    to: targetEmail,
    subject: `Invoice ${inv.invoiceNumber} from ${shopName}`,
    html: wrapEmailHtml(`<p>Hi ${inv.customer.firstName},</p><p>Please find attached your invoice #${inv.invoiceNumber} from ${shopName}.</p><p>Total: $${inv.total.toFixed(2)} | Balance Due: $${inv.balance.toFixed(2)}</p><p>Thank you for your business.</p>`),
    category: 'INVOICE',
    attachment: {
      filename: `invoice-${inv.invoiceNumber}.pdf`,
      contentBase64: pdfBase64,
    },
  });

  return { email: targetEmail };
}
