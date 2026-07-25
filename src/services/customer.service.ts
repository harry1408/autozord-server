import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { paginate, buildPaginationMeta, shopScope } from '../utils/helpers';

interface GetCustomersParams {
  shopId: string | null;
  search?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const allowedSortFields = ['firstName', 'lastName', 'email', 'phone', 'createdAt'];

export async function getCustomers({ shopId, search, page, limit, sortBy, sortOrder }: GetCustomersParams) {
  const { take, skip } = paginate(page, limit);
  const orderField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

  const where = {
    ...shopScope(shopId),
    deletedAt: null,
    ...(search && {
      OR: [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      take,
      skip,
      orderBy: { [orderField]: sortOrder },
      include: {
        _count: { select: { vehicles: true, repairOrders: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return { data, pagination: buildPaginationMeta(total, page, take) };
}

export async function getCustomer(id: string, shopId: string | null) {
  const customer = await prisma.customer.findFirst({
    where: { id, ...shopScope(shopId), deletedAt: null },
    include: {
      vehicles: { where: { deletedAt: null } },
      _count: { select: { repairOrders: true } },
    },
  });
  if (!customer) throw new AppError('Customer not found', 404);
  return customer;
}

export async function createCustomer(data: {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
}, shopId: string | null) {
  if (!data.firstName || !data.lastName || !data.phone) {
    throw new AppError('First name, last name, and phone are required', 400);
  }
  if (!shopId) throw new AppError('A shop context is required to create a customer', 400);
  return prisma.customer.create({ data: { ...data, shopId } });
}

export async function updateCustomer(id: string, data: Partial<{
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
}>, shopId: string | null) {
  const existing = await prisma.customer.findFirst({ where: { id, ...shopScope(shopId), deletedAt: null } });
  if (!existing) throw new AppError('Customer not found', 404);
  return prisma.customer.update({ where: { id }, data });
}

export async function deleteCustomer(id: string, shopId: string | null) {
  const existing = await prisma.customer.findFirst({ where: { id, ...shopScope(shopId), deletedAt: null } });
  if (!existing) throw new AppError('Customer not found', 404);
  return prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function getCustomerVehicles(customerId: string, shopId: string | null) {
  return prisma.vehicle.findMany({
    where: { customerId, ...shopScope(shopId), deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getCustomerRepairOrders(customerId: string, shopId: string | null) {
  return prisma.repairOrder.findMany({
    where: { customerId, ...shopScope(shopId), deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: {
      vehicle: { select: { make: true, model: true, year: true } },
    },
  });
}
