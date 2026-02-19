import rateLimit from 'express-rate-limit';
import { env } from '../config/index.js';

export const rateLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    // We use the default key generator which correctly handles req.ip
    // especially since app.set('trust proxy', 1) is already configured in app.ts
    message: {
        success: false,
        message: 'Too many requests, please try again later',
        error: {
            code: 'TOO_MANY_REQUESTS',
        },
    },
});

export const strictRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many attempts, please try again later',
        error: {
            code: 'TOO_MANY_REQUESTS',
        },
    },
});
