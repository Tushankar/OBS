import nodemailer from 'nodemailer';
import { env } from './env.js';

let transporter;

// Provider-agnostic SMTP transport (Gmail/Workspace, SES, Mailgun, …). When no
// SMTP host is configured (local dev) we fall back to nodemailer's jsonTransport,
// which serializes the message instead of sending — so flows work end to end
// without real credentials.
export function getTransport() {
  if (transporter) return transporter;
  if (env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  } else {
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }
  return transporter;
}

export const isMailerConfigured = () => Boolean(env.SMTP_HOST);
