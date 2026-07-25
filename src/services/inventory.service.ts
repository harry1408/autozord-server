import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { paginate, buildPaginationMeta, shopScope } from '../utils/helpers';

export async function getParts(params: {
  shopId: string | null;
  search?: string; category?: string; lowStock?: boolean;
  page: number; limit: number; sortBy: string; sortOrder: 'asc' | 'desc';
}) {
  const { shopId, search, category, lowStock, page, limit, sortBy, sortOrder } = params;
  const { take, skip } = paginate(page, limit);
  const where: Record<string, unknown> = { ...shopScope(shopId), deletedAt: null };
  if (category) where.category = category;
  if (search) {
    (where as { OR?: unknown[] }).OR = [
      { name: { contains: search } },
      { partNumber: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.part.findMany({ where, take, skip, orderBy: { [sortBy]: sortOrder }, include: { supplier: { select: { name: true } } } }),
    prisma.part.count({ where }),
  ]);

  const result = lowStock ? data.filter(p => p.quantityOnHand <= p.minStock) : data;
  return { data: result, pagination: buildPaginationMeta(total, page, take) };
}

export async function getPart(id: string, shopId: string | null) {
  const part = await prisma.part.findFirst({ where: { id, ...shopScope(shopId), deletedAt: null }, include: { supplier: true } });
  if (!part) throw new AppError('Part not found', 404);
  return part;
}

export async function createPart(data: {
  name: string; partNumber?: string; description?: string; category?: string;
  unitCost: number; sellingPrice: number; quantityOnHand?: number; minStock?: number; supplierId?: string;
}, shopId: string | null) {
  if (!data.name) throw new AppError('Part name is required', 400);
  if (!shopId) throw new AppError('A shop context is required to create a part', 400);
  return prisma.part.create({ data: { ...data, shopId } });
}

export async function updatePart(id: string, data: Partial<{
  name: string; partNumber: string; description: string; category: string;
  unitCost: number; sellingPrice: number; quantityOnHand: number; minStock: number; supplierId: string;
}>, shopId: string | null) {
  const existing = await prisma.part.findFirst({ where: { id, ...shopScope(shopId), deletedAt: null } });
  if (!existing) throw new AppError('Part not found', 404);
  return prisma.part.update({ where: { id }, data });
}

export async function deletePart(id: string, shopId: string | null) {
  const existing = await prisma.part.findFirst({ where: { id, ...shopScope(shopId), deletedAt: null } });
  if (!existing) throw new AppError('Part not found', 404);
  return prisma.part.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function getSuppliers(shopId: string | null) {
  return prisma.supplier.findMany({ where: shopScope(shopId), orderBy: { name: 'asc' } });
}

export async function createSupplier(data: {
  name: string; contact?: string; phone?: string; email?: string; address?: string;
}, shopId: string | null) {
  if (!data.name) throw new AppError('Supplier name is required', 400);
  if (!shopId) throw new AppError('A shop context is required to create a supplier', 400);
  return prisma.supplier.create({ data: { ...data, shopId } });
}
