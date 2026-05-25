import dotenv from 'dotenv';
dotenv.config();

export const config = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  PERSISTENCE_PATH: process.env.PERSISTENCE_PATH || 'data/monitors.json',
  DEFAULT_TIMEOUT: parseInt(process.env.DEFAULT_TIMEOUT || '60', 10),
  ESCALATION_MULTIPLIER: parseFloat(process.env.ESCALATION_MULTIPLIER || '2.0'),
  WEBHOOK_TIMEOUT_MS: parseInt(process.env.WEBHOOK_TIMEOUT_MS || '5000', 10),
  MAX_WEBHOOK_RETRIES: parseInt(process.env.MAX_WEBHOOK_RETRIES || '5', 10),
  API_KEY: process.env.API_KEY || 'sentinel-secure-key-2026',
};