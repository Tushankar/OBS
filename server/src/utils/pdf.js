import PDFDocument from 'pdfkit';

// Brand palette
const GOLD = '#C99E25';
const GOLD_SOFT = '#F4EAD0';
const INK = '#1A1A1A';
const SUB = '#4A4A4A';
const MUTE = '#8A8A8A';
const LINE = '#E4E4E4';
const PANEL = '#F7F7F5';

// Locale used for number grouping per currency (falls back to en-US).
const CURRENCY_LOCALE = { INR: 'en-IN', AED: 'en-AE', USD: 'en-US', EUR: 'en-IE', GBP: 'en-GB' };

// Money is stored in minor units (fils / paise / cents). We render the ISO
// currency code + a grouped amount (e.g. "AED 1,298.00") rather than a symbol:
// PDFKit's built-in Helvetica has no glyph for ₹ and several other currency
// symbols, which previously rendered as a broken "¹". Codes always render and
// are unambiguous on an invoice.
function formatMoney(minor, currency = 'AED') {
  const amount = Number(minor || 0) / 100;
  const locale = CURRENCY_LOCALE[currency] || 'en-US';
  const num = amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${currency} ${num}`;
}

function fmtDateTime(d, tz = 'Asia/Dubai') {
  if (!d) return 'To be announced';
  try {
    return new Date(d).toLocaleString('en-GB', {
      timeZone: tz,
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch {
    return new Date(d).toUTCString();
  }
}

function pdfToBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

// Shared branded header. Returns the y-coordinate where body content begins.
function drawHeader(doc, kicker) {
  const m = doc.page.margins.left;
  const right = doc.page.width - m;
  doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(22).text('OBS EVENTS', m, 52);
  doc.fillColor(MUTE).font('Helvetica').fontSize(8.5)
    .text(String(kicker).toUpperCase(), m, 80, { characterSpacing: 2 });
  const y = 102;
  doc.moveTo(m, y).lineTo(right, y).lineWidth(2).strokeColor(GOLD).stroke();
  return y + 22;
}

function drawFooter(doc, text) {
  const m = doc.page.margins.left;
  const right = doc.page.width - m;
  const y = doc.page.height - doc.page.margins.bottom - 34;
  doc.moveTo(m, y).lineTo(right, y).lineWidth(1).strokeColor(LINE).stroke();
  doc.fillColor(MUTE).font('Helvetica').fontSize(7.5)
    .text(text, m, y + 10, { width: right - m, align: 'left', lineGap: 2 });
}

// ---------------------------------------------------------------------------
// E-TICKET — event details on the left, a bordered QR "stub" on the right,
// styled to read like a real admission ticket (§8.3.3).
// ---------------------------------------------------------------------------
export async function buildTicketPdf({ event, ticket, ticketTypeName, qrPng }) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const m = doc.page.margins.left;
  const right = doc.page.width - m;

  let y = drawHeader(doc, 'E-Ticket');

  // Event title
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(20).text(event?.title || 'Event', m, y, { width: right - m });
  y = doc.y + 18;

  const sectionTop = y;
  const leftW = 268;

  // Left column: detail rows
  const detail = (label, value) => {
    doc.fillColor(MUTE).font('Helvetica').fontSize(8).text(String(label).toUpperCase(), m, y, { width: leftW, characterSpacing: 1.2 });
    y = doc.y + 3;
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(12.5).text(value || '—', m, y, { width: leftW });
    y = doc.y + 14;
  };
  detail('When', fmtDateTime(event?.startAt, event?.timezone));
  detail('Where', event?.isOnline
    ? 'Online — link in your account'
    : [event?.venueName, event?.city, event?.country].filter(Boolean).join(', ') || 'Venue to be announced');
  detail('Attendee', ticket?.attendeeName);
  detail('Ticket type', ticketTypeName);

  // Ticket number highlighted in a soft gold chip
  doc.fillColor(MUTE).font('Helvetica').fontSize(8).text('TICKET NUMBER', m, y, { width: leftW, characterSpacing: 1.2 });
  y = doc.y + 4;
  const chipH = 24;
  const chipW = Math.min(leftW, 200);
  doc.roundedRect(m, y, chipW, chipH, 5).fill(GOLD_SOFT);
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(13)
    .text(ticket?.ticketNumber || '—', m + 10, y + 6, { width: chipW - 20 });
  y += chipH + 8;

  // Right column: QR inside a bordered card
  const boxW = 160;
  const boxH = 190;
  const boxX = right - boxW;
  const boxY = sectionTop;
  doc.roundedRect(boxX, boxY, boxW, boxH, 10).lineWidth(1).strokeColor(LINE).stroke();
  if (qrPng) {
    const qrW = boxW - 40;
    doc.image(qrPng, boxX + (boxW - qrW) / 2, boxY + 20, { width: qrW });
    doc.fillColor(SUB).font('Helvetica-Bold').fontSize(9)
      .text('Scan at the door', boxX, boxY + qrW + 34, { width: boxW, align: 'center' });
    doc.fillColor(MUTE).font('Helvetica').fontSize(8)
      .text('to check in', boxX, boxY + qrW + 46, { width: boxW, align: 'center' });
  }

  drawFooter(doc, 'This ticket is valid for one entry and is non-transferable except via OBS Events. Please present the QR code at the venue. Admission is subject to the organizer’s terms and the OBS Events Terms & Conditions.');

  return pdfToBuffer(doc);
}

// ---------------------------------------------------------------------------
// TAX INVOICE / RECEIPT — meta block, billed-to / event, an itemised table
// with aligned amounts, and a totals summary (§8.3.4).
// ---------------------------------------------------------------------------
export async function buildInvoicePdf({ order, event, user, invoiceNumber }) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const m = doc.page.margins.left;
  const right = doc.page.width - m;
  const cur = order.currency;

  let y = drawHeader(doc, 'Tax Invoice / Receipt');

  // Meta block: label column + aligned value column
  const metaTop = y;
  const metaValX = m + 58;
  const metaRow = (label, value) => {
    doc.fillColor(MUTE).font('Helvetica').fontSize(9).text(label, m, y, { width: metaValX - m });
    doc.fillColor(SUB).font('Helvetica-Bold').fontSize(9).text(value || '—', metaValX, y, { width: 260 });
    y = doc.y + 4;
  };
  metaRow('Invoice', invoiceNumber);
  metaRow('Order', order.orderNumber);
  metaRow('Date', fmtDateTime(order.paidAt || undefined, event?.timezone));
  metaRow('Gateway', order.gateway);

  // Billed-to & Event columns
  y = Math.max(y, metaTop) + 16;
  const colGap = 24;
  const colW = (right - m - colGap) / 2;
  const blockTop = y;

  doc.fillColor(MUTE).font('Helvetica').fontSize(8).text('BILLED TO', m, blockTop, { characterSpacing: 1.2 });
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text(user?.name || '—', m, blockTop + 12, { width: colW });
  doc.fillColor(SUB).font('Helvetica').fontSize(10).text(user?.email || '—', m, doc.y + 1, { width: colW });

  const evX = m + colW + colGap;
  doc.fillColor(MUTE).font('Helvetica').fontSize(8).text('EVENT', evX, blockTop, { characterSpacing: 1.2 });
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text(event?.title || '—', evX, blockTop + 12, { width: colW });
  if (event?.startAt) {
    doc.fillColor(SUB).font('Helvetica').fontSize(10).text(fmtDateTime(event.startAt, event?.timezone), evX, doc.y + 1, { width: colW });
  }

  y = doc.y + 26;

  // Itemised table
  // columns: Description | Qty (r) | Unit price (r) | Amount (r)
  const qtyX = 300, qtyW = 50;
  const unitX = 358, unitW = 92;
  const amtX = 455, amtW = right - 455; // ends flush at right margin

  // header band
  const headH = 22;
  doc.rect(m, y, right - m, headH).fill(PANEL);
  const hy = y + 7;
  doc.fillColor(MUTE).font('Helvetica-Bold').fontSize(8.5);
  doc.text('DESCRIPTION', m + 8, hy, { width: qtyX - m - 16, characterSpacing: 0.5 });
  doc.text('QTY', qtyX, hy, { width: qtyW, align: 'right', characterSpacing: 0.5 });
  doc.text('UNIT PRICE', unitX, hy, { width: unitW, align: 'right', characterSpacing: 0.5 });
  doc.text('AMOUNT', amtX, hy, { width: amtW - 8, align: 'right', characterSpacing: 0.5 });
  y += headH;

  // rows
  for (const it of order.items) {
    const rowTop = y + 8;
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(10.5).text(it.name, m + 8, rowTop, { width: qtyX - m - 16 });
    const rowH = Math.max(doc.y - rowTop, 12) + 16;
    doc.fillColor(SUB).font('Helvetica').fontSize(10.5);
    doc.text(String(it.quantity), qtyX, rowTop, { width: qtyW, align: 'right' });
    doc.text(formatMoney(it.unitPrice, cur), unitX, rowTop, { width: unitW, align: 'right' });
    doc.fillColor(INK).font('Helvetica-Bold').text(formatMoney(it.totalPrice, cur), amtX, rowTop, { width: amtW - 8, align: 'right' });
    y += rowH;
    doc.moveTo(m, y).lineTo(right, y).lineWidth(0.5).strokeColor(LINE).stroke();
  }

  // Totals summary (right-aligned block)
  y += 14;
  const labelX = unitX;
  const labelW = unitW;
  const valX = amtX;
  const valW = amtW - 8;
  const sumRow = (label, value, opts = {}) => {
    const { bold = false, gold = false, size = 10.5 } = opts;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
    doc.fillColor(bold ? MUTE : MUTE).text(label, labelX, y, { width: labelW, align: 'right' });
    doc.fillColor(gold ? GOLD : INK).font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .text(value, valX, y, { width: valW, align: 'right' });
    y = doc.y + 6;
  };
  sumRow('Subtotal', formatMoney(order.subtotal, cur));
  if (order.discountAmount > 0) sumRow('Discount', `− ${formatMoney(order.discountAmount, cur)}`);
  sumRow('Service fee', formatMoney(order.serviceFee, cur));

  y += 2;
  doc.moveTo(labelX, y).lineTo(right, y).lineWidth(1).strokeColor(GOLD).stroke();
  y += 8;
  sumRow('Total paid', formatMoney(order.totalAmount, cur), { bold: true, gold: true, size: 13 });

  drawFooter(doc, 'This is a computer-generated receipt from OBS Events. All amounts are shown in ' + cur + '. Thank you for your purchase.');

  return pdfToBuffer(doc);
}
