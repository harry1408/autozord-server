import geoip from 'geoip-lite';
import { Region } from './pricing';

const COUNTRY_TO_REGION: Record<string, Region> = {
  CA: 'CA',
  US: 'US',
  IN: 'IN',
};

// Default for any visitor outside the three priced markets (or when the IP
// can't be resolved at all, e.g. localhost during development) - CA is the
// original market this app was built for.
const DEFAULT_REGION: Region = 'CA';

// Server-authoritative region detection from the request's IP (geoip-lite
// ships its own offline database - no external API call, no rate limits,
// no visitor IP sent to a third party). Signup deliberately ignores any
// client-supplied region and always re-derives it here, so it can't be
// spoofed by editing request state in devtools.
export function detectRegion(ip: string | undefined): Region {
  if (!ip) return DEFAULT_REGION;
  const lookup = geoip.lookup(ip);
  const country = lookup?.country;
  if (country && country in COUNTRY_TO_REGION) {
    return COUNTRY_TO_REGION[country];
  }
  return DEFAULT_REGION;
}
