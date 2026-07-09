import dotenv from 'dotenv';

dotenv.config();

// Central, typed access to environment. Values are read once at boot.
// Later phases (0.3 auth, 0.4 utils, Phase 2 payments, §8.7 maps) add and
// enforce more keys here; Phase 0.1 only needs enough to boot the API.
export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 4000,
  APP_URL: process.env.APP_URL || 'http://localhost:5173',
  API_URL: process.env.API_URL || 'http://localhost:4000',
  // CORS allowlist (Phase 4.3). Comma-separated; defaults to APP_URL. Requests
  // with no Origin (curl, server-to-server, gateway webhooks) are always allowed.
  CORS_ORIGINS: (process.env.CORS_ORIGINS || process.env.APP_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  MONGODB_URI: process.env.MONGODB_URI || '',
  // Seed (Phase 0.2)
  SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL || '',
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD || '',
  // Optional dev-only DNS override (comma-separated). Some routers refuse TCP
  // DNS on :53, which breaks Node's c-ares SRV lookups for mongodb+srv:// URIs.
  // Leave empty in production.
  DNS_SERVERS: (process.env.DNS_SERVERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  // Auth (Phase 0.3)
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || '',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || '',
  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL || '15m',
  REFRESH_TOKEN_TTL: process.env.REFRESH_TOKEN_TTL || '30d',
  REFRESH_TOKEN_TTL_MS: 30 * 24 * 60 * 60 * 1000, // 30d, for cookie maxAge + session expiry
  RESET_TOKEN_TTL: process.env.RESET_TOKEN_TTL || '30m',
  REFRESH_COOKIE_NAME: 'obs_rt',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  // Google Maps Platform server key — Geocoding API (§8.7 manual-address
  // fallback). Never sent to the client; the browser uses VITE_GOOGLE_MAPS_API_KEY.
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '',
  // Storage: AWS S3 (Phase 0.4)
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  AWS_REGION: process.env.AWS_REGION || 'ap-south-1',
  S3_BUCKET: process.env.S3_BUCKET || 'obs-events',
  // Checkout / payments (Phase 2). Money is integer paise; the fee percent is
  // applied to (subtotal − discount) and rounded.
  SERVICE_FEE_PERCENT: Number(process.env.SERVICE_FEE_PERCENT) || 0,
  ORDER_HOLD_MINUTES: Number(process.env.ORDER_HOLD_MINUTES) || 15,
  REFUND_CUTOFF_HOURS: Number(process.env.REFUND_CUTOFF_HOURS) || 24,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  // Email: Nodemailer SMTP (Phase 0.4)
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'OBS Events <tickets@obs.business>',
};

export const isProd = env.NODE_ENV === 'production';
