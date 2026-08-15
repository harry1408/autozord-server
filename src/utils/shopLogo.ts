import { prisma } from './prisma';

// Called right before ShopSettings.logoUrl is overwritten, from either the
// shop's own Settings page or the admin panel - archives whatever was
// current so a past logo is never actually lost, only ever superseded.
// No-ops if logoUrl isn't part of this update, isn't actually changing, or
// there was nothing set yet to archive.
export async function archiveCurrentLogo(shopId: string, newLogoUrl: string | undefined): Promise<void> {
  if (newLogoUrl === undefined) return;

  const current = await prisma.shopSettings.findUnique({ where: { shopId } });
  const oldLogoUrl = current?.logoUrl;
  if (!oldLogoUrl || oldLogoUrl === newLogoUrl) return;

  await prisma.shopLogoHistory.create({ data: { shopId, logoUrl: oldLogoUrl } });
}
