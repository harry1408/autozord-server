import { prisma } from '../utils/prisma';

export async function getStats() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const [
    openROs,
    vehiclesInShop,
    pendingEstimates,
    todayPayments,
    overdueROs,
  ] = await Promise.all([
    prisma.repairOrder.count({
      where: {
        deletedAt: null,
        status: { in: ['APPROVED', 'IN_PROGRESS', 'WAITING_PARTS', 'QUALITY_CHECK'] },
      },
    }),
    prisma.repairOrder.count({
      where: {
        deletedAt: null,
        status: { in: ['APPROVED', 'IN_PROGRESS', 'WAITING_PARTS', 'QUALITY_CHECK'] },
      },
    }),
    prisma.estimate.count({
      where: { deletedAt: null, status: { in: ['DRAFT', 'SENT'] } },
    }),
    prisma.payment.aggregate({
      where: { paidAt: { gte: todayStart, lt: todayEnd } },
      _sum: { amount: true },
    }),
    prisma.repairOrder.count({
      where: {
        deletedAt: null,
        status: { in: ['APPROVED', 'IN_PROGRESS', 'WAITING_PARTS'] },
        promisedDate: { lt: now },
      },
    }),
  ]);

  return {
    openRepairOrders: openROs,
    vehiclesInShop,
    pendingEstimates,
    todayRevenue: todayPayments._sum.amount ?? 0,
    overdueRepairOrders: overdueROs,
  };
}

export async function getRevenueChart(days: number) {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

  const payments = await prisma.payment.findMany({
    where: { paidAt: { gte: startDate, lte: endDate } },
    select: { paidAt: true, amount: true },
    orderBy: { paidAt: 'asc' },
  });

  const grouped: Record<string, number> = {};
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    grouped[key] = 0;
  }

  for (const p of payments) {
    const key = p.paidAt.toISOString().slice(0, 10);
    if (grouped[key] !== undefined) {
      grouped[key] += p.amount;
    }
  }

  return Object.entries(grouped).map(([date, revenue]) => ({ date, revenue }));
}

export async function getRecentOrders() {
  return prisma.repairOrder.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      customer: { select: { firstName: true, lastName: true } },
      vehicle: { select: { make: true, model: true, year: true } },
      technicians: {
        include: { technician: { include: { user: { select: { firstName: true, lastName: true } } } } },
      },
    },
  });
}

export async function getActivityFeed() {
  const history = await prisma.rOStatusHistory.findMany({
    orderBy: { changedAt: 'desc' },
    take: 20,
    include: {
      repairOrder: {
        select: {
          roNumber: true,
          customer: { select: { firstName: true, lastName: true } },
        },
      },
      changedBy: { select: { firstName: true, lastName: true } },
    },
  });

  return history.map((h) => ({
    id: h.id,
    type: 'status_change',
    message: `RO ${h.repairOrder.roNumber} changed to ${h.toStatus}`,
    customer: `${h.repairOrder.customer.firstName} ${h.repairOrder.customer.lastName}`,
    by: `${h.changedBy.firstName} ${h.changedBy.lastName}`,
    timestamp: h.changedAt,
  }));
}
