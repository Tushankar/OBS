import QRCode from 'qrcode';

// PNG buffer for a QR code (used on ticket PDFs). Content is the public
// validation URL ${APP_URL}/t/${qrToken}.
export function qrPng(text) {
  return QRCode.toBuffer(text, { type: 'png', width: 320, margin: 1, errorCorrectionLevel: 'M' });
}
