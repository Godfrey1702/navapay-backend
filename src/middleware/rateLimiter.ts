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
    windowMs: 1 * 60 * 1000, // 1 minute window
    max: 100, // increase from default
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

export const purchaseLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // max 10 purchases per minute per user
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many purchase attempts. Please wait a moment.',
        code: 'RATE_LIMIT_EXCEEDED',
    },
    keyGenerator: (req) => req.user?.id || req.ip || 'unknown',
});

export const scheduleLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // max 20 schedules per hour per user
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many schedule creation attempts.',
        code: 'RATE_LIMIT_EXCEEDED',
    },
    keyGenerator: (req) => req.user?.id || req.ip || 'unknown',
});
