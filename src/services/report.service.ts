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
    include: { invoice: { select: { invoiceNumber: true, customer: { select: { firstName: true, lastName: true } } } } },
    orderBy: { paidAt: 'asc' },
  });

  const total = payments.reduce((sum, p) => sum + p.amount, 0);
  const byMethod: Record<string, number> = {};
  for (const p of payments) {
    byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount;
  }

  return { total, byMethod, payments };
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

  const byStatus: Record<string, number> = {};
  for (const ro of ros) {
    byStatus[ro.status] = (byStatus[ro.status] ?? 0) + 1;
  }

  return { total: ros.length, byStatus, repairOrders: ros };
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
    const rangeAssignments = t.assignments.filter(a =>
      a.repairOrder &&
      a.repairOrder.createdAt >= range.gte &&
      a.repairOrder.createdAt <= range.lte
    );
    const completedROs = rangeAssignments.filter(a =>
      a.repairOrder && ['COMPLETED', 'INVOICED', 'CLOSED'].includes(a.repairOrder.status)
    );
    const totalHours = completedROs.reduce((sum: number, a) =>
      sum + (a.repairOrder?.laborLines.reduce((s: number, l: { hours: number }) => s + l.hours, 0) ?? 0), 0
    );
    return {
      id: t.id,
      name: `${t.user.firstName} ${t.user.lastName}`,
      totalAssigned: rangeAssignments.length,
      totalCompleted: completedROs.length,
      totalHours,
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

  return { totalParts: parts.length, totalValue, lowStockCount: lowStock.length, outOfStockCount: outOfStock.length, lowStock, parts };
}

export async function getAgingReport() {
  const invoices = await prisma.invoice.findMany({
    where: { deletedAt: null, status: { in: ['SENT', 'PARTIALLY_PAID'] } },
    include: { customer: { select: { firstName: true, lastName: true, phone: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const now = new Date();
  const buckets: Record<string, typeof invoices> = {
    '0-30': [], '31-60': [], '61-90': [], '90+': [],
  };

  for (const inv of invoices) {
    const days = Math.floor((now.getTime() - inv.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 30) buckets['0-30'].push(inv);
    else if (days <= 60) buckets['31-60'].push(inv);
    else if (days <= 90) buckets['61-90'].push(inv);
    else buckets['90+'].push(inv);
  }

  return {
    total: invoices.length,
    totalBalance: invoices.reduce((sum, i) => sum + i.balance, 0),
    buckets: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, {
      count: v.length,
      total: v.reduce((s, i) => s + i.balance, 0),
      invoices: v,
    }])),
  };
}
