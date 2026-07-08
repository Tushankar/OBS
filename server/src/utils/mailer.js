import { getTransport, isMailerConfigured } from '../config/mailer.js';
import { env } from '../config/env.js';
import { EmailLog } from '../models/index.js';

// Send an email and record it in EmailLog. `type` must be one of EMAIL_TYPE.
// Writes a QUEUED row first, then flips to SENT (with providerMessageId) or
// FAILED (with error) so delivery is always auditable.
export async function sendMail({ to, subject, html, text, type, userId, orderId, eventId }) {
  const log = await EmailLog.create({ type, toEmail: to, subject, status: 'QUEUED', userId, orderId, eventId });
  try {
    const info = await getTransport().sendMail({ from: env.EMAIL_FROM, to, subject, html, text });
    log.status = 'SENT';
    log.providerMessageId = info.messageId;
    log.sentAt = new Date();
    await log.save();
    if (!isMailerConfigured()) console.log(`[DEV mailer] ${type} → ${to} · "${subject}" (jsonTransport, not delivered)`);
    return { info, log };
  } catch (err) {
    log.status = 'FAILED';
    log.error = err.message;
    await log.save();
    throw err;
  }
}
