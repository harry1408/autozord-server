export type Region = 'CA' | 'US' | 'IN';

export const REGIONS: Region[] = ['CA', 'US', 'IN'];

interface RegionPricing {
  currency: string;
  monthly: number;
  yearly: number;
}

// Prices for self-serve signup. Canada is the original market's rate; US
// and India were set independently, not derived by conversion - India in
// particular is deliberately priced lower for that market.
export const REGION_PRICING: Record<Region, RegionPricing> = {
  CA: { currency: 'CAD', monthly: 50, yearly: 400 },
  US: { currency: 'USD', monthly: 40, yearly: 300 },
  IN: { currency: 'INR', monthly: 1000, yearly: 10000 },
};

export function isValidRegion(value: unknown): value is Region {
  return typeof value === 'string' && (REGIONS as string[]).includes(value);
}

export function getSubscriptionPrice(region: Region, planType: 'MONTHLY' | 'YEARLY'): { currency: string; amount: number } {
  const pricing = REGION_PRICING[region];
  const amount = planType === 'YEARLY' ? pricing.yearly : pricing.monthly;
  return { currency: pricing.currency, amount };
}
