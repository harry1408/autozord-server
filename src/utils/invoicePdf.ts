import PDFDocument from 'pdfkit';
import { logger } from './logger';

const fmt = (val: number) => `$${val.toFixed(2)}`;

interface ShopLike {
  shopName?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  gstNumber?: string | null;
  pstNumber?: string | null;
  gstRate?: number | null;
  pstRate?: number | null;
}

async function fetchLogoBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    logger.error('Failed to fetch shop logo for invoice PDF', err);
    return null;
  }
}

// Renders a self-contained invoice PDF for emailing to a customer. Mirrors
// the on-screen/print layout (client/src/components/InvoicePrint.tsx) at a
// simpler fidelity, since that view is React/CSS and can't be reused
// server-side without a headless browser.
export async function generateInvoicePdf(invoice: any, shop: ShopLike): Promise<Buffer> {
  const ro = invoice.repairOrder;
  const customer = invoice.customer;
  const vehicle = ro?.vehicle;
  const laborLines = ro?.laborLines ?? [];
  const partsLines = ro?.partsLines ?? [];
  const payments = invoice.payments ?? [];

  const laborTotal = laborLines.reduce((s: number, l: any) => s + l.subtotal, 0);
  const partsTotal = partsLines.reduce((s: number, p: any) => s + p.subtotal, 0);

  const logoBuffer = shop.logoUrl ? await fetchLogoBuffer(shop.logoUrl) : null;

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  // ── Header ──────────────────────────────────────────────────────
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, doc.page.width / 2 - 50, 40, { width: 100 });
      doc.y = 150;
    } catch (err) {
      logger.error('Failed to embed shop logo in invoice PDF', err);
    }
  }

  doc.fontSize(14).font('Helvetica-Bold').text(shop.shopName ?? 'Auto Shop', { align: 'center' });
  doc.font('Helvetica').fontSize(9);
  if (shop.address) doc.text(shop.address, { align: 'center' });
  const contactLine = [shop.phone, shop.email].filter(Boolean).join(' • ');
  if (contactLine) doc.text(contactLine, { align: 'center' });
  doc.moveDown(1.5);

  // ── Invoice / RO reference ─────────────────────────────────────
  doc.fontSize(10).font('Helvetica-Bold').text(`Invoice #: ${invoice.invoiceNumber}`);
  doc.font('Helvetica');
  doc.text(`Invoice Date: ${new Date(invoice.createdAt).toLocaleDateString()}`);
  if (ro?.roNumber) doc.text(`RO #: ${ro.roNumber}`);
  doc.moveDown(1);

  // ── Customer / Vehicle ──────────────────────────────────────────
  doc.font('Helvetica-Bold').text('Customer');
  doc.font('Helvetica').fontSize(9);
  doc.text(`${customer?.firstName ?? ''} ${customer?.lastName ?? ''}`.trim());
  if (customer?.phone) doc.text(customer.phone);
  if (customer?.email) doc.text(customer.email);
  doc.moveDown(0.5);

  if (vehicle) {
    doc.fontSize(10).font('Helvetica-Bold').text('Vehicle');
    doc.font('Helvetica').fontSize(9);
    doc.text(`${vehicle.year ?? ''} ${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim());
    if (vehicle.vin) doc.text(`VIN: ${vehicle.vin}`);
    if (vehicle.licensePlate) doc.text(`License Plate: ${vehicle.licensePlate}`);
  }
  doc.moveDown(1);

  // ── Line items ───────────────────────────────────────────────────
  doc.fontSize(10).font('Helvetica-Bold');
  const colX = { desc: 40, qty: 340, price: 400, total: 470 };
  doc.text('Description', colX.desc, doc.y, { continued: false });
  doc.text('Qty', colX.qty, doc.y - doc.currentLineHeight(), { width: 50, align: 'right' });
  doc.text('Price', colX.price, doc.y - doc.currentLineHeight(), { width: 60, align: 'right' });
  doc.text('Total', colX.total, doc.y - doc.currentLineHeight(), { width: 80, align: 'right' });
  doc.moveTo(40, doc.y + 2).lineTo(555, doc.y + 2).strokeColor('#aaaaaa').stroke();
  doc.moveDown(0.5);

  doc.font('Helvetica').fontSize(9);
  const allItems = [
    ...laborLines.map((l: any) => ({ description: l.description, qty: `${l.hours} hrs`, price: l.rate, total: l.subtotal })),
    ...partsLines.map((p: any) => ({ description: `${p.name}${p.partNumber ? ` (${p.partNumber})` : ''}`, qty: `${p.quantity}`, price: p.sellingPrice, total: p.subtotal })),
  ];
  for (const item of allItems) {
    const y = doc.y;
    doc.text(item.description, colX.desc, y, { width: 290 });
    doc.text(item.qty, colX.qty, y, { width: 50, align: 'right' });
    doc.text(fmt(item.price), colX.price, y, { width: 60, align: 'right' });
    doc.text(fmt(item.total), colX.total, y, { width: 80, align: 'right' });
    doc.moveDown(0.3);
  }
  if (allItems.length === 0) {
    doc.fillColor('#888888').text('No line items', colX.desc);
    doc.fillColor('#000000');
  }

  doc.moveTo(40, doc.y + 4).lineTo(555, doc.y + 4).strokeColor('#aaaaaa').stroke();
  doc.moveDown(0.8);

  // ── Totals ────────────────────────────────────────────────────────
  const totalTaxRate = (shop.gstRate ?? 5) + (shop.pstRate ?? 7);
  const gstAmount = totalTaxRate > 0 ? invoice.taxAmount * ((shop.gstRate ?? 5) / totalTaxRate) : 0;
  const pstAmount = invoice.taxAmount - gstAmount;

  const totalsRows: [string, string][] = [
    ['Labor', fmt(laborTotal)],
    ['Parts & Supplies', fmt(partsTotal)],
    ['Discount', `-${fmt(invoice.discount)}`],
    [shop.gstNumber ? `GST #${shop.gstNumber}` : 'GST', fmt(gstAmount)],
    [shop.pstNumber ? `PST #${shop.pstNumber}` : 'PST', fmt(pstAmount)],
  ];
  for (const [label, val] of totalsRows) {
    const y = doc.y;
    doc.font('Helvetica').fillColor('#555555').text(label, 380, y, { width: 100 });
    doc.fillColor('#000000').text(val, colX.total, y, { width: 80, align: 'right' });
    doc.moveDown(0.3);
  }
  doc.font('Helvetica-Bold').fontSize(10);
  const grandY = doc.y;
  doc.text('Grand Total', 380, grandY, { width: 100 });
  doc.text(fmt(invoice.total), colX.total, grandY, { width: 80, align: 'right' });
  doc.moveDown(0.3);

  doc.font('Helvetica').fontSize(9);
  const paidY = doc.y;
  doc.fillColor('#166534').text('Paid', 380, paidY, { width: 100 });
  doc.text(fmt(invoice.amountPaid), colX.total, paidY, { width: 80, align: 'right' });
  doc.moveDown(0.3);

  doc.font('Helvetica-Bold');
  const balY = doc.y;
  doc.fillColor(invoice.balance > 0 ? '#991b1b' : '#166534').text('Balance Due', 380, balY, { width: 100 });
  doc.text(fmt(invoice.balance), colX.total, balY, { width: 80, align: 'right' });
  doc.fillColor('#000000');
  doc.moveDown(1.2);

  // ── Payment history ──────────────────────────────────────────────
  if (payments.length > 0) {
    doc.font('Helvetica-Bold').fontSize(10).text('Payment History');
    doc.font('Helvetica').fontSize(9);
    for (const p of payments) {
      doc.text(`${new Date(p.paidAt).toLocaleDateString()} — ${p.method} — ${fmt(p.amount)}${p.referenceNumber ? ` (${p.referenceNumber})` : ''}`);
    }
  }

  doc.end();
  return done;
}
