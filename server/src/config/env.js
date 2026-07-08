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
  MONGODB_URI: process.env.MONGODB_URI || '',
};

export const isProd = env.NODE_ENV === 'production';
