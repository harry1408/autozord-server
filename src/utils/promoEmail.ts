import { wrapEmailHtml } from './email';

export type PromoRegion = 'US' | 'CA' | 'IN';

// Generic trial-offer copy, no pricing mentioned - only the closing line
// differs by region. Keep this in sync with the client's PromotionsPage
// preview (autozord-client/src/pages/admin/PromotionsPage.tsx), which
// renders its own copy of this same content for the on-screen preview.
const GREETING = 'Hi there,';
const HEADLINE = 'Give your shop a system it deserves.';
const INTRO = "Running a repair shop on spreadsheets, sticky notes, and group texts gets harder every month. Autozord brings repair orders, estimates, invoices, inspections, inventory, and your whole team into one place, built specifically for auto repair shops.";
const FEATURES: [string, string][] = [
  ['Job Board & Repair Orders', 'track every vehicle from intake to pickup'],
  ['Estimates & Invoices', 'professional and branded, sent in seconds'],
  ['Digital Vehicle Inspections', 'photos, notes, and one-tap customer approvals'],
  ['Technician Scheduling', 'assign jobs and track hours without a whiteboard'],
  ['Inventory & Parts', 'always know what is in stock'],
  ['Reports & Insights', 'your shop numbers, at a glance'],
];
const CTA_LABEL = 'Start your free 30-day trial';
const CTA_NOTE = 'No credit card required.';
const CTA_URL = 'https://autozord.com/signup';
const SIGNOFF = 'Talk soon,<br/>The Autozord Team<br/>info@autozord.com';

const REGION_COPY: Record<PromoRegion, { subject: string; regionLine: string }> = {
  US: {
    subject: 'Give your shop a system it deserves - try Autozord free for 30 days',
    regionLine: 'Join repair shops across the United States already running their day on Autozord.',
  },
  CA: {
    subject: 'Give your shop a system it deserves - try Autozord free for 30 days',
    regionLine: 'Join repair shops across Canada, from coast to coast, already running their day on Autozord.',
  },
  IN: {
    subject: 'Give your shop a system it deserves - try Autozord free for 30 days',
    regionLine: 'Join repair shops across India already running their day on Autozord.',
  },
};

export function isValidPromoRegion(value: unknown): value is PromoRegion {
  return value === 'US' || value === 'CA' || value === 'IN';
}

export function buildPromoEmail(region: PromoRegion): { subject: string; html: string } {
  const { subject, regionLine } = REGION_COPY[region];

  const featureRows = FEATURES
    .map(([title, detail]) =>
      `<tr><td width='22' style='vertical-align:top;padding:7px 0;'><span style='display:inline-block;width:8px;height:8px;border-radius:2px;background:#e60000;margin-top:6px;'></span></td><td style='vertical-align:top;padding:7px 0;font-size:13.5px;'><b style='color:#18181b;'>${title}</b> &mdash; ${detail}</td></tr>`
    )
    .join('');

  const html = wrapEmailHtml(
    `<p style='margin:0 0 16px;'>${GREETING}</p>` +
    `<h2 style='font-size:21px;margin:6px 0 10px;line-height:1.25;color:#18181b;letter-spacing:-0.01em;'>${HEADLINE}</h2>` +
    `<p style='margin:0 0 16px;'>${INTRO}</p>` +
    `<table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='margin:4px 0 22px;'>${featureRows}</table>` +
    `<p style='margin:0 0 16px;'>${regionLine}</p>` +
    `<table role='presentation' cellpadding='0' cellspacing='0' style='margin:8px auto 8px;'><tr><td bgcolor='#e60000' style='border-radius:8px;background-color:#e60000;'><a href='${CTA_URL}' style='display:inline-block;padding:13px 30px;color:#ffffff;font-weight:bold;text-decoration:none;font-size:14px;border-radius:8px;'>${CTA_LABEL}</a></td></tr></table>` +
    `<p style='margin:0 0 4px;text-align:center;color:#71717a;font-size:12px;'>${CTA_NOTE}</p>` +
    `<p style='margin:18px 0 0;color:#3f3f46;font-size:13.5px;'>${SIGNOFF}</p>`
  );

  return { subject, html };
}
