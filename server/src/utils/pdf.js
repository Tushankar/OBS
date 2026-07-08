import PDFDocument from 'pdfkit';

const GOLD = '#C99E25';
const INK = '#333333';
const MUTE = '#999999';

const money = (paise, currency = 'INR') => {
  const sym = currency === 'INR' ? '₹' : `${currency} `;
  return sym + (Number(paise) / 100).toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const fmtDateTime = (d, tz) => {
  if (!d) return 'Date to be announced';
  try {
    return new Date(d).toLocaleString('en-IN', { timeZone: tz || 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return new Date(d).toUTCString();
  }
};

function pdfToBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

// One ticket PDF: OBS wordmark, event title, date/time (event tz), venue/online,
// attendee, ticket type, ticket number, QR (~140px), T&C footer (§8.3.3).
export async function buildTicketPdf({ event, ticket, ticketTypeName, qrPng }) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.fillColor(GOLD).fontSize(26).font('Helvetica-Bold').text('OBS EVENTS');
  doc.moveDown(0.2);
  doc.fillColor(MUTE).fontSize(10).font('Helvetica').text('E-TICKET');
  doc.moveDown(1);

  doc.fillColor(INK).fontSize(20).font('Helvetica-Bold').text(event?.title || 'Event');
  doc.moveDown(0.8);

  const row = (label, value) => {
    doc.fillColor(MUTE).fontSize(10).font('Helvetica').text(label);
    doc.fillColor(INK).fontSize(13).font('Helvetica-Bold').text(value || '—');
    doc.moveDown(0.5);
  };
  row('When', fmtDateTime(event?.startAt, event?.timezone));
  row('Where', event?.isOnline ? 'Online — link in your account' : [event?.venueName, event?.city, event?.country].filter(Boolean).join(', ') || 'Venue to be announced');
  row('Attendee', ticket?.attendeeName);
  row('Ticket type', ticketTypeName);
  row('Ticket number', ticket?.ticketNumber);

  if (qrPng) {
    doc.moveDown(0.5);
    doc.image(qrPng, { width: 140 });
    doc.fillColor(MUTE).fontSize(9).font('Helvetica').text('Scan at the door to check in.');
  }

  doc.moveDown(2);
  doc.fillColor(MUTE).fontSize(8).font('Helvetica').text('This ticket is valid for one entry. Non-transferable except via OBS Events. Present the QR code at the venue. Subject to the organizer’s terms and OBS Events’ Terms & Conditions.', { align: 'left' });

  return pdfToBuffer(doc);
}

// Invoice PDF: number, buyer, line items, discount, service fee, total, gateway
// reference (§8.3.4).
export async function buildInvoicePdf({ order, event, user, invoiceNumber }) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const cur = order.currency;

  doc.fillColor(GOLD).fontSize(24).font('Helvetica-Bold').text('OBS EVENTS');
  doc.fillColor(MUTE).fontSize(10).font('Helvetica').text('TAX INVOICE / RECEIPT');
  doc.moveDown(1);

  doc.fillColor(INK).fontSize(11).font('Helvetica');
  doc.text(`Invoice: ${invoiceNumber}`);
  doc.text(`Order: ${order.orderNumber}`);
  doc.text(`Date: ${fmtDateTime(order.paidAt || new Date(), 'Asia/Kolkata')}`);
  doc.text(`Gateway: ${order.gateway}`);
  doc.moveDown(0.8);

  doc.font('Helvetica-Bold').text('Billed to');
  doc.font('Helvetica').text(user?.name || '—');
  doc.text(user?.email || '—');
  doc.moveDown(0.8);

  doc.font('Helvetica-Bold').text('Event');
  doc.font('Helvetica').text(event?.title || '—');
  doc.moveDown(0.8);

  doc.font('Helvetica-Bold').text('Items');
  doc.font('Helvetica');
  for (const it of order.items) {
    doc.text(`${it.name}  ×${it.quantity}  @ ${money(it.unitPrice, cur)}`, { continued: true });
    doc.text(`   ${money(it.totalPrice, cur)}`, { align: 'right' });
  }
  doc.moveDown(0.6);

  const totalRow = (label, value, bold) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 13 : 11);
    doc.text(label, { continued: true });
    doc.text(value, { align: 'right' });
  };
  totalRow('Subtotal', money(order.subtotal, cur));
  if (order.discountAmount > 0) totalRow('Discount', `− ${money(order.discountAmount, cur)}`);
  totalRow('Service fee', money(order.serviceFee, cur));
  doc.moveDown(0.2);
  totalRow('Total paid', money(order.totalAmount, cur), true);

  doc.moveDown(2);
  doc.fillColor(MUTE).fontSize(8).font('Helvetica').text('This is a computer-generated receipt from OBS Events.');

  return pdfToBuffer(doc);
}
