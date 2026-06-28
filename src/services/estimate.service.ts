import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { paginate, buildPaginationMeta, generateEstimateNumber, generateRoNumber } from '../utils/helpers';

const ESTIMATE_INCLUDE = {
  customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
  laborLines: true,
  partsLines: true,
};

export async function getEstimates(params: {
  search?: string; status?: string; customerId?: string;
  page: number; limit: number; sortBy: string; sortOrder: 'asc' | 'desc';
}) {
  const { search, status, customerId, page, limit, sortBy, sortOrder } = params;
  const { take, skip } = paginate(page, limit);
  const where: Record<string, unknown> = { deletedAt: null };
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;
  if (search) {
    (where as { OR?: unknown[] }).OR = [
      { estimateNumber: { contains: search } },
      { customer: { OR: [{ firstName: { contains: search } }, { lastName: { contains: search } }] } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.estimate.findMany({
      where, take, skip, orderBy: { [sortBy]: sortOrder },
      include: { customer: { select: { firstName: true, lastName: true } }, _count: { select: { laborLines: true, partsLines: true } } },
    }),
    prisma.estimate.count({ where }),
  ]);
  return { data, pagination: buildPaginationMeta(total, page, take) };
}

export async function getEstimate(id: string) {
  const est = await prisma.estimate.findFirst({ where: { id, deletedAt: null }, include: ESTIMATE_INCLUDE });
  if (!est) throw new AppError('Estimate not found', 404);
  return est;
}

export async function createEstimate(data: {
  customerId: string; vehicleId?: string; notes?: string; expiryDate?: string;
  laborLines?: { description: string; hours: number; rate: number }[];
  partsLines?: { name: string; partNumber?: string; quantity: number; unitCost: number; sellingPrice: number }[];
}) {
  if (!data.customerId) throw new AppError('Customer is required', 400);
  const estimateNumber = generateEstimateNumber();
  return prisma.estimate.create({
    data: {
      estimateNumber,
      customerId: data.customerId,
      vehicleId: data.vehicleId,
      notes: data.notes,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      laborLines: data.laborLines ? {
        create: data.laborLines.map(l => ({ ...l, subtotal: l.hours * l.rate })),
      } : undefined,
      partsLines: data.partsLines ? {
        create: data.partsLines.map(p => ({ ...p, subtotal: p.quantity * p.sellingPrice })),
      } : undefined,
    },
    include: ESTIMATE_INCLUDE,
  });
}

export async function updateEstimate(id: string, data: Partial<{
  notes: string; expiryDate: string; status: string;
}>) {
  const existing = await prisma.estimate.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new AppError('Estimate not found', 404);
  return prisma.estimate.update({
    where: { id },
    data: { ...data, expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined },
    include: ESTIMATE_INCLUDE,
  });
}

export async function deleteEstimate(id: string) {
  const existing = await prisma.estimate.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new AppError('Estimate not found', 404);
  return prisma.estimate.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function updateStatus(id: string, status: string) {
  const valid = ['DRAFT', 'SENT', 'APPROVED', 'DECLINED', 'EXPIRED'];
  if (!valid.includes(status)) throw new AppError('Invalid status', 400);
  const existing = await prisma.estimate.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new AppError('Estimate not found', 404);
  return prisma.estimate.update({ where: { id }, data: { status }, include: ESTIMATE_INCLUDE });
}

export async function convertToRO(estimateId: string, userId: string) {
  const estimate = await prisma.estimate.findFirst({
    where: { id: estimateId, deletedAt: null },
    include: { laborLines: true, partsLines: true },
  });
  if (!estimate) throw new AppError('Estimate not found', 404);
  if (!estimate.vehicleId) throw new AppError('Estimate must have a vehicle to convert to RO', 400);

  const roNumber = generateRoNumber();
  const ro = await prisma.repairOrder.create({
    data: {
      roNumber,
      customerId: estimate.customerId,
      vehicleId: estimate.vehicleId,
      status: 'APPROVED',
      laborLines: {
        create: estimate.laborLines.map(l => ({
          description: l.description, hours: l.hours, rate: l.rate, subtotal: l.subtotal,
        })),
      },
      partsLines: {
        create: estimate.partsLines.map(p => ({
          name: p.name, partNumber: p.partNumber ?? undefined, quantity: p.quantity,
          unitCost: p.unitCost, sellingPrice: p.sellingPrice, subtotal: p.subtotal,
        })),
      },
      statusHistory: { create: { fromStatus: null, toStatus: 'APPROVED', changedById: userId } },
    },
  });

  await prisma.estimate.update({ where: { id: estimateId }, data: { status: 'APPROVED' } });
  return ro;
}
