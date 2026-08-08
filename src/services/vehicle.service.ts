import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { paginate, buildPaginationMeta, shopScope } from '../utils/helpers';

interface GetVehiclesParams {
  shopId: string | null;
  search?: string;
  customerId?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export async function getVehicles({ shopId, search, customerId, page, limit, sortBy, sortOrder }: GetVehiclesParams) {
  const { take, skip } = paginate(page, limit);

  const where: Record<string, unknown> = { ...shopScope(shopId), deletedAt: null };
  if (customerId) where.customerId = customerId;
  if (search) {
    (where as { OR?: unknown[] }).OR = [
      { make: { contains: search } },
      { model: { contains: search } },
      { vin: { contains: search } },
      { licensePlate: { contains: search } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      take,
      skip,
      orderBy: { [sortBy]: sortOrder },
      include: {
        customer: { select: { firstName: true, lastName: true, phone: true } },
        _count: { select: { repairOrders: true } },
      },
    }),
    prisma.vehicle.count({ where }),
  ]);

  return { data, pagination: buildPaginationMeta(total, page, take) };
}

export async function getVehicle(id: string, shopId: string | null) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id, ...shopScope(shopId), deletedAt: null },
    include: {
      customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
      repairOrders: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { technicians: { include: { technician: { include: { user: { select: { firstName: true, lastName: true } } } } } } },
      },
    },
  });
  if (!vehicle) throw new AppError('Vehicle not found', 404);
  return vehicle;
}

export async function createVehicle(data: {
  customerId: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  licensePlate?: string;
  color?: string;
  engineSize?: string;
  mileage?: number;
}, shopId: string | null) {
  if (!data.customerId || !data.make || !data.model || !data.year) {
    throw new AppError('Customer, make, model, and year are required', 400);
  }
  if (!shopId) throw new AppError('A shop context is required to create a vehicle', 400);
  const customer = await prisma.customer.findFirst({ where: { id: data.customerId, shopId, deletedAt: null } });
  if (!customer) throw new AppError('Customer not found', 404);

  return prisma.vehicle.create({ data: { ...data, shopId } });
}

export async function updateVehicle(id: string, data: Partial<{
  make: string;
  model: string;
  year: number;
  vin: string;
  licensePlate: string;
  color: string;
  engineSize: string;
  mileage: number;
}>, shopId: string | null) {
  const existing = await prisma.vehicle.findFirst({ where: { id, ...shopScope(shopId), deletedAt: null } });
  if (!existing) throw new AppError('Vehicle not found', 404);
  return prisma.vehicle.update({ where: { id }, data });
}

export async function deleteVehicle(id: string, shopId: string | null) {
  const existing = await prisma.vehicle.findFirst({ where: { id, ...shopScope(shopId), deletedAt: null } });
  if (!existing) throw new AppError('Vehicle not found', 404);
  return prisma.vehicle.update({ where: { id }, data: { deletedAt: new Date() } });
}
