import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { paginate, buildPaginationMeta, generateRoNumber } from '../utils/helpers';

const RO_INCLUDE = {
  customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
  vehicle: { select: { id: true, make: true, model: true, year: true, vin: true, licensePlate: true } },
  laborLines: true,
  partsLines: { include: { part: { select: { id: true, name: true, partNumber: true } } } },
  technicians: {
    include: {
      technician: {
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  },
  statusHistory: {
    orderBy: { changedAt: 'asc' as const },
    include: { changedBy: { select: { firstName: true, lastName: true } } },
  },
  invoice: { select: { id: true, invoiceNumber: true, status: true, total: true } },
};

const VALID_STATUSES = ['ESTIMATE', 'APPROVED', 'IN_PROGRESS', 'WAITING_PARTS', 'QUALITY_CHECK', 'COMPLETED', 'INVOICED', 'CLOSED', 'CANCELLED'];

export async function getRepairOrders(params: {
  search?: string;
  status?: string;
  customerId?: string;
  vehicleId?: string;
  technicianId?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}) {
  const { search, status, customerId, vehicleId, technicianId, page, limit, sortBy, sortOrder } = params;
  const { take, skip } = paginate(page, limit);

  const where: Record<string, unknown> = { deletedAt: null };
  if (status) {
    where.status = status.includes(',')
      ? { in: status.split(',').map(s => s.trim()) }
      : status;
  }
  if (customerId) where.customerId = customerId;
  if (vehicleId) where.vehicleId = vehicleId;
  if (technicianId) {
    where.technicians = { some: { technicianId } };
  }
  if (search) {
    (where as { OR?: unknown[] }).OR = [
      { roNumber: { contains: search } },
      { customer: { OR: [{ firstName: { contains: search } }, { lastName: { contains: search } }] } },
      { vehicle: { OR: [{ make: { contains: search } }, { model: { contains: search } }] } },
    ];
  }

  const allowedSort = ['roNumber', 'status', 'createdAt', 'promisedDate'];
  const orderField = allowedSort.includes(sortBy) ? sortBy : 'createdAt';

  const [data, total] = await Promise.all([
    prisma.repairOrder.findMany({
      where,
      take,
      skip,
      orderBy: { [orderField]: sortOrder },
      include: {
        customer: { select: { firstName: true, lastName: true } },
        vehicle: { select: { make: true, model: true, year: true } },
        technicians: {
          include: { technician: { include: { user: { select: { firstName: true, lastName: true } } } } },
        },
        _count: { select: { laborLines: true, partsLines: true } },
      },
    }),
    prisma.repairOrder.count({ where }),
  ]);

  return { data, pagination: buildPaginationMeta(total, page, take) };
}

export async function getRepairOrder(id: string) {
  const ro = await prisma.repairOrder.findFirst({
    where: { id, deletedAt: null },
    include: RO_INCLUDE,
  });
  if (!ro) throw new AppError('Repair order not found', 404);
  return ro;
}

export async function createRepairOrder(data: {
  customerId: string;
  vehicleId: string;
  promisedDate?: string;
  mileageIn?: number;
  customerNotes?: string;
  internalNotes?: string;
}, userId: string) {
  if (!data.customerId || !data.vehicleId) {
    throw new AppError('Customer and vehicle are required', 400);
  }

  const roNumber = generateRoNumber();
  const ro = await prisma.repairOrder.create({
    data: {
      roNumber,
      customerId: data.customerId,
      vehicleId: data.vehicleId,
      status: 'ESTIMATE',
      promisedDate: data.promisedDate ? new Date(data.promisedDate) : undefined,
      mileageIn: data.mileageIn,
      customerNotes: data.customerNotes,
      internalNotes: data.internalNotes,
      statusHistory: {
        create: { fromStatus: null, toStatus: 'ESTIMATE', changedById: userId },
      },
    },
    include: RO_INCLUDE,
  });

  return ro;
}

export async function updateRepairOrder(id: string, data: Partial<{
  promisedDate: string;
  mileageIn: number;
  mileageOut: number;
  customerNotes: string;
  internalNotes: string;
}>) {
  const existing = await prisma.repairOrder.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new AppError('Repair order not found', 404);

  return prisma.repairOrder.update({
    where: { id },
    data: {
      ...data,
      promisedDate: data.promisedDate ? new Date(data.promisedDate) : undefined,
    },
    include: RO_INCLUDE,
  });
}

export async function deleteRepairOrder(id: string) {
  const existing = await prisma.repairOrder.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new AppError('Repair order not found', 404);
  return prisma.repairOrder.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function updateStatus(id: string, newStatus: string, userId: string, note?: string) {
  if (!VALID_STATUSES.includes(newStatus)) {
    throw new AppError('Invalid status', 400);
  }
  const existing = await prisma.repairOrder.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new AppError('Repair order not found', 404);

  const [ro] = await prisma.$transaction([
    prisma.repairOrder.update({ where: { id }, data: { status: newStatus }, include: RO_INCLUDE }),
    prisma.rOStatusHistory.create({
      data: {
        repairOrderId: id,
        fromStatus: existing.status,
        toStatus: newStatus,
        note,
        changedById: userId,
      },
    }),
  ]);

  return ro;
}

export async function assignTechnician(roId: string, technicianId: string) {
  const ro = await prisma.repairOrder.findFirst({ where: { id: roId, deletedAt: null } });
  if (!ro) throw new AppError('Repair order not found', 404);
  const tech = await prisma.technician.findFirst({ where: { id: technicianId, isActive: true } });
  if (!tech) throw new AppError('Technician not found', 404);

  await prisma.repairOrderTechnician.upsert({
    where: { repairOrderId_technicianId: { repairOrderId: roId, technicianId } },
    update: {},
    create: { repairOrderId: roId, technicianId },
  });

  return prisma.repairOrder.findFirst({ where: { id: roId }, include: RO_INCLUDE });
}

export async function removeTechnician(roId: string, technicianId: string) {
  await prisma.repairOrderTechnician.deleteMany({
    where: { repairOrderId: roId, technicianId },
  });
}

export async function addLaborLine(roId: string, data: {
  description: string;
  hours: number;
  rate: number;
}) {
  const ro = await prisma.repairOrder.findFirst({ where: { id: roId, deletedAt: null } });
  if (!ro) throw new AppError('Repair order not found', 404);

  const subtotal = data.hours * data.rate;
  return prisma.laborLine.create({
    data: { repairOrderId: roId, ...data, subtotal },
  });
}

export async function updateLaborLine(lineId: string, data: Partial<{
  description: string;
  hours: number;
  rate: number;
}>) {
  const line = await prisma.laborLine.findUnique({ where: { id: lineId } });
  if (!line) throw new AppError('Labor line not found', 404);

  const hours = data.hours ?? line.hours;
  const rate = data.rate ?? line.rate;
  return prisma.laborLine.update({
    where: { id: lineId },
    data: { ...data, subtotal: hours * rate },
  });
}

export async function deleteLaborLine(lineId: string) {
  await prisma.laborLine.delete({ where: { id: lineId } });
}

export async function addPartsLine(roId: string, data: {
  name: string;
  partNumber?: string;
  partId?: string;
  quantity: number;
  unitCost: number;
  sellingPrice: number;
}) {
  const ro = await prisma.repairOrder.findFirst({ where: { id: roId, deletedAt: null } });
  if (!ro) throw new AppError('Repair order not found', 404);

  const subtotal = data.quantity * data.sellingPrice;
  return prisma.partsLine.create({
    data: { repairOrderId: roId, ...data, subtotal },
  });
}

export async function updatePartsLine(lineId: string, data: Partial<{
  name: string;
  partNumber: string;
  quantity: number;
  unitCost: number;
  sellingPrice: number;
}>) {
  const line = await prisma.partsLine.findUnique({ where: { id: lineId } });
  if (!line) throw new AppError('Parts line not found', 404);

  const qty = data.quantity ?? line.quantity;
  const price = data.sellingPrice ?? line.sellingPrice;
  return prisma.partsLine.update({
    where: { id: lineId },
    data: { ...data, subtotal: qty * price },
  });
}

export async function deletePartsLine(lineId: string) {
  await prisma.partsLine.delete({ where: { id: lineId } });
}
