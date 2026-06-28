import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { paginate, buildPaginationMeta } from '../utils/helpers';
import bcrypt from 'bcryptjs';

const TECH_INCLUDE = {
  user: { select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true } },
  assignments: {
    include: {
      repairOrder: {
        select: { id: true, roNumber: true, status: true, vehicle: { select: { make: true, model: true, year: true } } },
      },
    },
  },
};

export async function getTechnicians({ page, limit }: { page: number; limit: number }) {
  const { take, skip } = paginate(page, limit);
  const [data, total] = await Promise.all([
    prisma.technician.findMany({
      take, skip, orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, isActive: true } },
        _count: { select: { assignments: true } },
      },
    }),
    prisma.technician.count(),
  ]);
  return { data, pagination: buildPaginationMeta(total, page, take) };
}

export async function getTechnician(id: string) {
  const tech = await prisma.technician.findFirst({ where: { id }, include: TECH_INCLUDE });
  if (!tech) throw new AppError('Technician not found', 404);
  return tech;
}

export async function createTechnician(data: {
  firstName: string; lastName: string; email: string; password: string;
  specializations?: string; hourlyRate?: number;
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError('Email already in use', 400);

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: 'TECHNICIAN',
    },
  });

  return prisma.technician.create({
    data: {
      userId: user.id,
      specializations: data.specializations,
      hourlyRate: data.hourlyRate ?? 0,
    },
    include: TECH_INCLUDE,
  });
}

export async function updateTechnician(id: string, data: Partial<{
  firstName: string; lastName: string; specializations: string; hourlyRate: number; isActive: boolean;
}>) {
  const tech = await prisma.technician.findFirst({ where: { id } });
  if (!tech) throw new AppError('Technician not found', 404);

  const { firstName, lastName, ...techData } = data;

  if (firstName || lastName) {
    await prisma.user.update({
      where: { id: tech.userId },
      data: { firstName, lastName },
    });
  }

  return prisma.technician.update({ where: { id }, data: techData, include: TECH_INCLUDE });
}

export async function deleteTechnician(id: string) {
  const tech = await prisma.technician.findFirst({ where: { id } });
  if (!tech) throw new AppError('Technician not found', 404);
  return prisma.technician.update({ where: { id }, data: { isActive: false } });
}
