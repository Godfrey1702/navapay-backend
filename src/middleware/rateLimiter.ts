import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request } from 'express';
import { env } from '../config/index.js';

// express-rate-limit statically inspects a custom keyGenerator's source for the
// literal substring "ipKeyGenerator" and warns (ERR_ERL_KEY_GEN_IPV6) if a raw
// req.ip fallback is used without it — IPv6 clients can hold many addresses
// within one subnet, so the raw address must be normalized to a subnet key.
function userOrIpKey(req: Request): string {
    if (req.user?.id) return req.user.id;
    return ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? 'unknown');
}

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
    keyGenerator: userOrIpKey,
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
    keyGenerator: userOrIpKey,
});
