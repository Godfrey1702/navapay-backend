import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    API_PREFIX: z.string().default('/api/v1'),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().int().positive().default(6379),
    REDIS_PASSWORD: z.string().optional().default(''),
    REDIS_DB: z.coerce.number().int().min(0).default(0),

    JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),
    JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars'),
    JWT_ACCESS_EXPIRY: z.string().default('15m'),
    JWT_REFRESH_EXPIRY: z.string().default('7d'),

    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),

    LOG_LEVEL: z
        .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
        .default('info'),

    CORS_ORIGIN: z.string().default('*'),

    // Payment provider settings
    PAYFLEX_API_KEY: z.string().optional().default(''),
    PAYFLEX_BASE_URL: z.string().default('https://api.payflex.com.ng/v1'),
    PAYSTACK_SECRET_KEY: z.string().min(1, 'PAYSTACK_SECRET_KEY is required'),

    // VTU provider — Clubkonnect (Nellobyte Systems)
    CLUBKONNECT_USER_ID: z.string().optional().default(''),
    CLUBKONNECT_API_KEY: z.string().optional().default(''),
    CLUBKONNECT_BASE_URL: z.string().default('https://www.nellobytesystems.com'),

    // Email — Resend
    RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
    FRONTEND_URL: z.string().min(1, 'FRONTEND_URL is required'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    const formatted = parsed.error.format();
    // eslint-disable-next-line no-console
    console.error('❌ Invalid environment variables:');
    // eslint-disable-next-line no-console
    console.error(JSON.stringify(formatted, null, 2));
    process.exit(1);
}

export const env = parsed.data;

export type Env = z.infer<typeof envSchema>;
