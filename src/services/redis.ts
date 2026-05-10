import Redis from 'ioredis';
import { env } from '../config/index.js';
import { logger } from '../utils/logger.js';

let redis: any = null;

export function getRedisClient(): any {
    if (!redis) {
        redis = new (Redis as any)({
            host: env.REDIS_HOST,
            port: env.REDIS_PORT,
            password: env.REDIS_PASSWORD || undefined,
            db: env.REDIS_DB,
            tls: env.REDIS_HOST.includes('upstash') ? {} : undefined,
            maxRetriesPerRequest: 3,
            retryStrategy(times: number) {
                if (times > 10) {
                    logger.error('Redis: max retries reached, giving up');
                    return null;
                }
                const delay = Math.min(times * 200, 5000);
                logger.warn({ attempt: times, delay }, 'Redis: retrying connection');
                return delay;
            },
            lazyConnect: true,
        });

        redis.on('connect', () => {
            logger.info('✅ Redis connected successfully');
        });

        redis.on('error', (error: Error) => {
            logger.error({ error: error.message }, '❌ Redis connection error');
        });

        redis.on('close', () => {
            logger.warn('Redis connection closed');
        });

        redis.on('reconnecting', (delay: number) => {
            logger.info({ delay }, 'Redis reconnecting');
        });
    }

    return redis;
}

export async function connectRedis(): Promise<void> {
    const client = getRedisClient();
    try {
        await client.connect();
    } catch (error) {
        logger.error({ error }, '❌ Failed to connect to Redis');
        throw error;
    }
}

export async function disconnectRedis(): Promise<void> {
    if (redis) {
        try {
            await redis.quit();
            redis = null;
            logger.info('Redis disconnected');
        } catch (error) {
            logger.error({ error }, 'Error disconnecting from Redis');
            if (redis) {
                redis.disconnect();
                redis = null;
            }
        }
    }
}

export async function pingRedis(): Promise<boolean> {
    try {
        const client = getRedisClient();
        const result = await client.ping();
        return result === 'PONG';
    } catch {
        return false;
    }
}
