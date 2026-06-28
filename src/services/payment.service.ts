import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { paginate, buildPaginationMeta } from '../utils/helpers';

const VALID_METHODS = ['CASH', 'CARD', 'CHECK', 'FINANCING', 'OTHER'];

export async function getPayments({ page, limit }: { page: number; limit: number }) {
  const { take, skip } = paginate(page, limit);
  const [data, total] = await Promise.all([
    prisma.payment.findMany({
      take, skip, orderBy: { paidAt: 'desc' },
      include: { invoice: { select: { invoiceNumber: true, customerId: true, customer: { select: { firstName: true, lastName: true } } } } },
    }),
    prisma.payment.count(),
  ]);
  return { data, pagination: buildPaginationMeta(total, page, take) };
}

export async function createPayment(data: {
  invoiceId: string; amount: number; method: string;
  referenceNumber?: string; notes?: string; paidAt?: string;
}) {
  if (!data.invoiceId || !data.amount || !data.method) {
    throw new AppError('Invoice, amount, and method are required', 400);
  }
  if (!VALID_METHODS.includes(data.method)) throw new AppError('Invalid payment method', 400);

  const invoice = await prisma.invoice.findFirst({ where: { id: data.invoiceId, deletedAt: null } });
  if (!invoice) throw new AppError('Invoice not found', 404);
  if (invoice.status === 'VOID') throw new AppError('Cannot pay a voided invoice', 400);

  const payment = await prisma.payment.create({
    data: {
      invoiceId: data.invoiceId,
      amount: data.amount,
      method: data.method,
      referenceNumber: data.referenceNumber,
      notes: data.notes,
      paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
    },
  });

  const newAmountPaid = invoice.amountPaid + data.amount;
  const newBalance = invoice.total - newAmountPaid;
  const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';

  await prisma.invoice.update({
    where: { id: data.invoiceId },
    data: { amountPaid: newAmountPaid, balance: newBalance, status: newStatus },
  });

  return payment;
}

export async function getInvoicePayments(invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, deletedAt: null } });
  if (!invoice) throw new AppError('Invoice not found', 404);
  return prisma.payment.findMany({
    where: { invoiceId },
    orderBy: { paidAt: 'desc' },
  });
}
