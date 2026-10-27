import { jsPDF } from 'jspdf';

const COMPANY_NAME = process.env.COMPANY_NAME || 'Solar Maps';
const CURRENCY = 'LKR';
const BRAND = [254, 193, 5]; // #FEC105, the site's accent colour

const money = (n) =>
  `${CURRENCY} ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dateText = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const qtyText = (n) => String(Number(n)); // 2 → "2", 1.5 → "1.5"

/**
 * Renders a quotation to a PDF and returns it as a Buffer. Layout is simple and
 * paginates: a header, the client block, a line-item table that repeats its
 * header on each page, then totals, notes, and terms.
 */
export function buildQuotationPdf(quotation, items) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const right = pageWidth - margin;
  let y = margin;

  const ensureSpace = (needed) => {
    if (y + needed > pageHeight - 20) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // Header
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageWidth, 4, 'F');
  y = 18;
  doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(0);
  doc.text(COMPANY_NAME, margin, y);
  doc.setFontSize(16).text('QUOTATION', right, y, { align: 'right' });
  y += 8;
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(90);
  doc.text(`Quotation No: ${quotation.quotation_code}`, right, y, { align: 'right' });
  y += 5;
  doc.text(`Date: ${dateText(quotation.$createdAt)}`, right, y, { align: 'right' });
  y += 5;
  doc.text(`Valid until: ${dateText(quotation.valid_until)}`, right, y, { align: 'right' });

  // Client block
  y = 38;
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(120);
  doc.text('PREPARED FOR', margin, y);
  y += 5;
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(0);
  doc.text(quotation.client_name || '', margin, y);
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(60);
  for (const line of [quotation.client_address, quotation.client_phone, quotation.client_email].filter(Boolean)) {
    y += 5;
    doc.splitTextToSize(line, 90).forEach((part) => {
      doc.text(part, margin, y);
    });
  }
  y += 12;

  // Line-item table
  const col = { no: margin, desc: margin + 10, qty: 122, price: 147, total: right };
  const drawTableHeader = () => {
    doc.setFillColor(245, 245, 245).rect(margin, y - 5, right - margin, 8, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(40);
    doc.text('#', col.no + 1, y);
    doc.text('Description', col.desc, y);
    doc.text('Qty', col.qty, y, { align: 'right' });
    doc.text('Unit price', col.price, y, { align: 'right' });
    doc.text('Amount', col.total - 1, y, { align: 'right' });
    y += 8;
  };
  drawTableHeader();

  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(0);
  items.forEach((item, index) => {
    const lines = doc.splitTextToSize(item.description || '', col.qty - col.desc - 18);
    const unit = item.unit ? ` ${item.unit}` : '';
    const rowHeight = Math.max(6, lines.length * 4.5 + (item.discount > 0 ? 4.5 : 0) + 2);
    if (ensureSpace(rowHeight)) drawTableHeader();
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(0);
    doc.text(String(index + 1), col.no + 1, y);
    doc.text(lines, col.desc, y);
    doc.text(`${qtyText(item.quantity)}${unit}`, col.qty, y, { align: 'right' });
    doc.text(money(item.unit_price).replace(`${CURRENCY} `, ''), col.price, y, { align: 'right' });
    doc.text(money(item.line_total).replace(`${CURRENCY} `, ''), col.total - 1, y, { align: 'right' });
    if (item.discount > 0) {
      doc.setFontSize(8).setTextColor(120);
      doc.text(`Discount: -${money(item.discount)}`, col.desc, y + lines.length * 4.5);
    }
    y += rowHeight;
    doc.setDrawColor(230).line(margin, y - 3, right, y - 3);
  });

  // Totals
  ensureSpace(34);
  y += 4;
  const totalsLabelX = 140;
  const totalRow = (label, value, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(bold ? 11 : 10).setTextColor(bold ? 0 : 60);
    doc.text(label, totalsLabelX, y);
    doc.text(value, right, y, { align: 'right' });
    y += bold ? 7 : 5.5;
  };
  totalRow('Subtotal', money(quotation.subtotal));
  if (quotation.discount_total > 0) totalRow('Discount', `-${money(quotation.discount_total)}`);
  if (quotation.tax_total > 0) {
    totalRow(quotation.tax_rate ? `Tax (${qtyText(quotation.tax_rate)}%)` : 'Tax', money(quotation.tax_total));
  }
  doc.setDrawColor(...BRAND).setLineWidth(0.6).line(totalsLabelX, y - 3.5, right, y - 3.5);
  y += 2;
  totalRow('Total', money(quotation.grand_total), true);

  // Notes and terms
  for (const [title, text] of [['Notes', quotation.notes], ['Terms & Conditions', quotation.terms]]) {
    if (!text) continue;
    const lines = doc.splitTextToSize(text, right - margin);
    y += 6;
    ensureSpace(12);
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(0).text(title, margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(70);
    for (const line of lines) {
      ensureSpace(5);
      doc.text(line, margin, y);
      y += 4.5;
    }
  }

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(150);
    doc.text(`${COMPANY_NAME} — ${quotation.quotation_code}`, margin, pageHeight - 10);
    doc.text(`Page ${p} of ${pages}`, right, pageHeight - 10, { align: 'right' });
  }

  return Buffer.from(doc.output('arraybuffer'));
}
