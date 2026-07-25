import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';

const SELF_SERVE_PLANS = ['MONTHLY', 'YEARLY'];
const TRIAL_DAYS = 7;

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function createSignup(data: {
  shopName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  planType: string;
}) {
  if (!SELF_SERVE_PLANS.includes(data.planType)) {
    throw new AppError('Invalid plan selected', 400);
  }

  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingUser) throw new AppError('Email already in use', 400);

  const baseSlug = slugify(data.shopName);
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.shop.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++suffix}`;
  }

  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const shop = await prisma.shop.create({
    data: {
      name: data.shopName,
      slug,
      planType: data.planType,
      isVerified: false,
      trialEndsAt,
    },
  });

  const passwordHash = await bcrypt.hash(data.password, 10);
  await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: 'SHOP_ADMIN',
      shopId: shop.id,
    },
  });

  return { shopId: shop.id, shopName: shop.name };
}
