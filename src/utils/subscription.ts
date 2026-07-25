export type SubStatus = 'PENDING_VERIFICATION' | 'SUSPENDED' | 'TRIAL' | 'ACTIVE' | 'EXPIRED';

export interface ShopSubscriptionFields {
  isActive: boolean;
  deletedAt: Date | null;
  isVerified: boolean;
  planType: string | null;
  trialEndsAt: Date | null;
  paidUntil: Date | null;
}

export interface SubscriptionState {
  status: SubStatus;
  daysLeft?: number;
}

function daysUntil(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

export function getSubscriptionState(shop: ShopSubscriptionFields): SubscriptionState {
  if (!shop.isActive || shop.deletedAt) {
    return { status: 'SUSPENDED' };
  }
  if (!shop.isVerified) {
    return { status: 'PENDING_VERIFICATION' };
  }
  if (shop.planType === 'LIFETIME_FREE') {
    return { status: 'ACTIVE' };
  }
  if (shop.trialEndsAt && shop.trialEndsAt.getTime() > Date.now()) {
    return { status: 'TRIAL', daysLeft: daysUntil(shop.trialEndsAt) };
  }
  if (shop.paidUntil && shop.paidUntil.getTime() > Date.now()) {
    return { status: 'ACTIVE', daysLeft: daysUntil(shop.paidUntil) };
  }
  return { status: 'EXPIRED' };
}

export function isAllowedToOperate(status: SubStatus): boolean {
  return status === 'TRIAL' || status === 'ACTIVE';
}
