import Redis from 'ioredis';
import { env } from '../config/env.js';

export const redis = new Redis.default({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  db: env.REDIS_DB,
  maxRetriesPerRequest: null,
});
