import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { paginate, buildPaginationMeta } from '../utils/helpers';

const INSPECTION_INCLUDE = {
  vehicle: { select: { make: true, model: true, year: true, vin: true } },
  technician: { include: { user: { select: { firstName: true, lastName: true } } } },
  items: { orderBy: { category: 'asc' as const } },
};

export async function getInspections(params: { vehicleId?: string; repairOrderId?: string; page: number; limit: number }) {
  const { vehicleId, repairOrderId, page, limit } = params;
  const { take, skip } = paginate(page, limit);
  const where: Record<string, unknown> = {};
  if (vehicleId) where.vehicleId = vehicleId;
  if (repairOrderId) where.repairOrderId = repairOrderId;

  const [data, total] = await Promise.all([
    prisma.inspection.findMany({ where, take, skip, orderBy: { createdAt: 'desc' }, include: INSPECTION_INCLUDE }),
    prisma.inspection.count({ where }),
  ]);
  return { data, pagination: buildPaginationMeta(total, page, take) };
}

export async function getInspection(id: string) {
  const insp = await prisma.inspection.findFirst({ where: { id }, include: INSPECTION_INCLUDE });
  if (!insp) throw new AppError('Inspection not found', 404);
  return insp;
}

export async function createInspection(data: {
  vehicleId: string; repairOrderId?: string; technicianId?: string;
  items?: { category: string; name: string; status?: string; notes?: string }[];
}) {
  if (!data.vehicleId) throw new AppError('Vehicle is required', 400);
  return prisma.inspection.create({
    data: {
      vehicleId: data.vehicleId,
      repairOrderId: data.repairOrderId,
      technicianId: data.technicianId,
      items: data.items ? { create: data.items } : undefined,
    },
    include: INSPECTION_INCLUDE,
  });
}

export async function updateInspection(id: string, data: { status?: string; technicianId?: string }) {
  const insp = await prisma.inspection.findFirst({ where: { id } });
  if (!insp) throw new AppError('Inspection not found', 404);
  return prisma.inspection.update({ where: { id }, data, include: INSPECTION_INCLUDE });
}

export async function addItem(inspectionId: string, data: {
  category: string; name: string; status?: string; notes?: string;
}) {
  const insp = await prisma.inspection.findFirst({ where: { id: inspectionId } });
  if (!insp) throw new AppError('Inspection not found', 404);
  return prisma.inspectionItem.create({ data: { inspectionId, ...data } });
}

export async function updateItem(itemId: string, data: Partial<{
  status: string; notes: string; photos: string;
}>) {
  const item = await prisma.inspectionItem.findUnique({ where: { id: itemId } });
  if (!item) throw new AppError('Item not found', 404);
  return prisma.inspectionItem.update({ where: { id: itemId }, data });
}
