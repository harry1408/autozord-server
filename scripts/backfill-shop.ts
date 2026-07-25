// One-off, idempotent backfill for the multi-tenancy rollout (Stage A -> Stage B).
//
// Run this AFTER `prisma db push` has applied the Stage A schema (nullable shopId
// columns + new Shop/Inquiry/InquiryShop tables), and BEFORE applying Stage B
// (making shopId required + compound uniques). See schema.prisma for the full
// two-stage sequence.
//
// Usage:
//   npx ts-node scripts/backfill-shop.ts
//
// Safe to re-run: every step is scoped to rows that don't already have a shopId,
// and shop creation is an upsert on a fixed slug.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_SHOP_SLUG = 'default-shop';

async function main() {
  console.log('Starting multi-tenancy backfill...');

  const existingSettings = await prisma.shopSettings.findFirst();
  const shopName = existingSettings?.shopName ?? 'My Auto Shop';

  const shop = await prisma.shop.upsert({
    where: { slug: DEFAULT_SHOP_SLUG },
    update: {},
    create: {
      slug: DEFAULT_SHOP_SLUG,
      name: shopName,
      address: existingSettings?.address,
      phone: existingSettings?.phone,
      email: existingSettings?.email,
    },
  });
  console.log(`Default shop: ${shop.name} (${shop.id})`);

  const shopScopedModels: { name: string; model: { updateMany: (args: unknown) => Promise<{ count: number }> } }[] = [
    { name: 'customer', model: prisma.customer },
    { name: 'vehicle', model: prisma.vehicle },
    { name: 'technician', model: prisma.technician },
    { name: 'repairOrder', model: prisma.repairOrder },
    { name: 'jobLine', model: prisma.jobLine },
    { name: 'laborLine', model: prisma.laborLine },
    { name: 'partsLine', model: prisma.partsLine },
    { name: 'repairOrderTechnician', model: prisma.repairOrderTechnician },
    { name: 'rOStatusHistory', model: prisma.rOStatusHistory },
    { name: 'estimate', model: prisma.estimate },
    { name: 'invoice', model: prisma.invoice },
    { name: 'payment', model: prisma.payment },
    { name: 'inspection', model: prisma.inspection },
    { name: 'inspectionItem', model: prisma.inspectionItem },
    { name: 'part', model: prisma.part },
    { name: 'supplier', model: prisma.supplier },
  ];

  for (const { name, model } of shopScopedModels) {
    const result = await model.updateMany({
      where: { shopId: null },
      data: { shopId: shop.id },
    });
    console.log(`  ${name}: backfilled ${result.count} row(s)`);
  }

  const userResult = await prisma.user.updateMany({
    where: { shopId: null },
    data: { shopId: shop.id },
  });
  console.log(`  user: backfilled ${userResult.count} row(s)`);

  const roleResult = await prisma.user.updateMany({
    where: { role: 'ADMIN' },
    data: { role: 'SHOP_ADMIN' },
  });
  console.log(`  user: remapped ${roleResult.count} ADMIN -> SHOP_ADMIN`);

  const settingsResult = await prisma.shopSettings.updateMany({
    where: { shopId: null },
    data: { shopId: shop.id },
  });
  console.log(`  shopSettings: backfilled ${settingsResult.count} row(s)`);

  console.log('Backfill complete.');
  console.log('');
  console.log('Next: apply STAGE B in schema.prisma (shopId -> required, compound');
  console.log('unique constraints), then run `npx prisma db push` again.');
  console.log('After that, manually promote one user to GLOBAL_ADMIN — e.g.:');
  console.log(`  UPDATE "User" SET "role" = 'GLOBAL_ADMIN', "shopId" = NULL WHERE email = '<you>';`);
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
