import { prisma } from '../utils/prisma';

function dateRange(startDate?: string, endDate?: string) {
  const now = new Date();
  const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = endDate ? new Date(endDate) : now;
  return { gte: start, lte: end };
}

export async function getRevenueReport(startDate?: string, endDate?: string) {
  const range = dateRange(startDate, endDate);
  const payments = await prisma.payment.findMany({
    where: { paidAt: range },
    include: {
      invoice: {
        select: {
          invoiceNumber: true,
          customer: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { paidAt: 'asc' },
  });

  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  // Build byMethod array with count
  const methodMap: Record<string, { amount: number; count: number }> = {};
  for (const p of payments) {
    if (!methodMap[p.method]) methodMap[p.method] = { amount: 0, count: 0 };
    methodMap[p.method].amount += p.amount;
    methodMap[p.method].count += 1;
  }
  const byMethod = Object.entries(methodMap).map(([method, v]) => ({
    method,
    amount: v.amount,
    count: v.count,
  }));

  const flatPayments = payments.map(p => ({
    paidAt: p.paidAt,
    amount: p.amount,
    method: p.method,
    invoiceNumber: p.invoice?.invoiceNumber ?? null,
    customer: p.invoice?.customer
      ? `${p.invoice.customer.firstName} ${p.invoice.customer.lastName}`
      : null,
  }));

  return { total, byMethod, payments: flatPayments };
}

export async function getRepairOrdersReport(startDate?: string, endDate?: string) {
  const range = dateRange(startDate, endDate);
  const ros = await prisma.repairOrder.findMany({
    where: { deletedAt: null, createdAt: range },
    include: {
      customer: { select: { firstName: true, lastName: true } },
      vehicle: { select: { make: true, model: true, year: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const statusMap: Record<string, number> = {};
  for (const ro of ros) {
    statusMap[ro.status] = (statusMap[ro.status] ?? 0) + 1;
  }
  const byStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

  const orders = ros.map(ro => ({
    roNumber: ro.roNumber,
    status: ro.status,
    createdAt: ro.createdAt,
    customer: ro.customer
      ? `${ro.customer.firstName} ${ro.customer.lastName}`
      : null,
    vehicle: ro.vehicle
      ? `${ro.vehicle.year} ${ro.vehicle.make} ${ro.vehicle.model}`
      : null,
  }));

  return { total: ros.length, byStatus, orders };
}

export async function getTechnicianReport(startDate?: string, endDate?: string) {
  const range = dateRange(startDate, endDate);
  const technicians = await prisma.technician.findMany({
    include: {
      user: { select: { firstName: true, lastName: true } },
      assignments: {
        include: {
          repairOrder: {
            include: { laborLines: true },
          },
        },
      },
    },
  });

  return technicians.map(t => {
    const rangeAssignments = t.assignments.filter(
      a => a.repairOrder &&
        a.repairOrder.createdAt >= range.gte &&
        a.repairOrder.createdAt <= range.lte
    );
    const completed = rangeAssignments.filter(
      a => a.repairOrder && ['COMPLETED', 'INVOICED', 'CLOSED'].includes(a.repairOrder.status)
    );
    const totalHours = completed.reduce(
      (sum, a) => sum + (a.repairOrder?.laborLines.reduce((s, l) => s + l.hours, 0) ?? 0), 0
    );
    const revenue = completed.reduce(
      (sum, a) => sum + (a.repairOrder?.laborLines.reduce((s, l) => s + l.subtotal, 0) ?? 0), 0
    );
    return {
      id: t.id,
      name: `${t.user.firstName} ${t.user.lastName}`,
      jobsCompleted: completed.length,
      totalHours,
      revenue,
    };
  });
}

export async function getInventoryReport() {
  const parts = await prisma.part.findMany({
    where: { deletedAt: null },
    orderBy: { quantityOnHand: 'asc' },
  });

  const totalValue = parts.reduce((sum, p) => sum + p.quantityOnHand * p.unitCost, 0);
  const lowStock = parts.filter(p => p.quantityOnHand <= p.minStock);
  const outOfStock = parts.filter(p => p.quantityOnHand === 0);

  return {
    totalParts: parts.length,
    totalValue,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    lowStock,
    parts,
  };
}

export async function getAgingReport() {
  const invoices = await prisma.invoice.findMany({
    where: { deletedAt: null, status: { in: ['SENT', 'PARTIALLY_PAID'] } },
    include: { customer: { select: { firstName: true, lastName: true, phone: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const now = new Date();
  const bucketMap: Record<string, { count: number; amount: number }> = {
    '0-30 days': { count: 0, amount: 0 },
    '31-60 days': { count: 0, amount: 0 },
    '61-90 days': { count: 0, amount: 0 },
    '90+ days': { count: 0, amount: 0 },
  };

  const details = invoices.map(inv => {
    const daysOld = Math.floor((now.getTime() - inv.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const bucket =
      daysOld <= 30 ? '0-30 days' :
      daysOld <= 60 ? '31-60 days' :
      daysOld <= 90 ? '61-90 days' : '90+ days';
    bucketMap[bucket].count += 1;
    bucketMap[bucket].amount += inv.balance;
    return {
      invoiceNumber: inv.invoiceNumber,
      customer: inv.customer
        ? `${inv.customer.firstName} ${inv.customer.lastName}`
        : '—',
      total: inv.total,
      balance: inv.balance,
      daysOld,
    };
  });

  const buckets = Object.entries(bucketMap).map(([label, v]) => ({
    label,
    count: v.count,
    amount: v.amount,
  }));

  return {
    total: invoices.length,
    totalBalance: invoices.reduce((s, i) => s + i.balance, 0),
    buckets,
    details,
  };
}
