import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';

export async function getUsers() {
  return prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createUser(data: {
  email: string; password: string; firstName: string; lastName: string; role: string;
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
      role: data.role ?? 'RECEPTIONIST',
    },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true },
  });

  return user;
}

export async function updateUser(id: string, data: Partial<{
  firstName: string; lastName: string; email: string; role: string; isActive: boolean; password: string;
}>) {
  const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new AppError('User not found', 404);

  const updateData: Record<string, unknown> = { ...data };
  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, 10);
    delete updateData.password;
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
  });
}

export async function deleteUser(id: string) {
  const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new AppError('User not found', 404);
  return prisma.user.update({ where: { id }, data: { isActive: false } });
}
