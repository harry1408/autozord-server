import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { shopScope } from '../utils/helpers';

const VALID_STATUSES = ['NEW', 'VIEWED', 'RESPONDED', 'DECLINED'];

export async function getPublicShops() {
  return prisma.shop.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, name: true, city: true, state: true, country: true, phone: true },
    orderBy: { name: 'asc' },
  });
}

export async function createInquiry(data: {
  name: string;
  email: string;
  phone?: string;
  vehicleInfo?: string;
  message: string;
  shopIds: string[];
  acceptedTerms: boolean;
}) {
  if (!data.acceptedTerms) {
    throw new AppError('You must accept the Terms & Conditions', 400);
  }

  const shops = await prisma.shop.findMany({
    where: { id: { in: data.shopIds }, isActive: true, deletedAt: null },
  });
  if (shops.length === 0) {
    throw new AppError('No valid shops selected', 400);
  }

  return prisma.inquiry.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      vehicleInfo: data.vehicleInfo,
      message: data.message,
      termsAcceptedAt: new Date(),
      targets: {
        create: shops.map(shop => ({ shopId: shop.id })),
      },
    },
    include: { targets: { include: { shop: { select: { id: true, name: true } } } } },
  });
}

export async function getInquiries(shopId: string | null) {
  return prisma.inquiryShop.findMany({
    where: shopScope(shopId),
    include: {
      inquiry: true,
      shop: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function respondToInquiry(id: string, data: { status: string; response?: string }, shopId: string | null, userId: string) {
  if (!VALID_STATUSES.includes(data.status)) throw new AppError('Invalid status', 400);
  const existing = await prisma.inquiryShop.findFirst({ where: { id, ...shopScope(shopId) } });
  if (!existing) throw new AppError('Inquiry not found', 404);

  return prisma.inquiryShop.update({
    where: { id },
    data: {
      status: data.status,
      response: data.response,
      respondedAt: new Date(),
      respondedById: userId,
    },
    include: { inquiry: true, shop: { select: { id: true, name: true } } },
  });
}
