import { Request, Response, NextFunction, CookieOptions } from 'express';
import { env } from '../../config/index.js';
import { sendSuccess } from '../../utils/response.js';
import * as authService from './auth.service.js';
import { logger } from '../../utils/logger.js';
import { UnauthorizedError } from '../../utils/errors.js';

const COOKIE_OPTIONS: CookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function register(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await authService.register(req.body);

        // Set refresh token in HTTP-only cookie
        res.cookie('refreshToken', result.tokens.refreshToken, COOKIE_OPTIONS);

        sendSuccess(res, { user: result.user, accessToken: result.tokens.accessToken }, 'Registration successful', 201);
    } catch (error) {
        next(error);
    }
}

export async function login(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await authService.login(req.body);

        // Set refresh token in HTTP-only cookie
        res.cookie('refreshToken', result.tokens.refreshToken, COOKIE_OPTIONS);

        sendSuccess(res, { user: result.user, accessToken: result.tokens.accessToken }, 'Login successful');
    } catch (error) {
        next(error);
    }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
    try {
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: env.NODE_ENV === 'production',
            sameSite: 'lax',
        } as CookieOptions);
        sendSuccess(res, null, 'Logged out successfully');
    } catch (error) {
        next(error);
    }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
    try {
        const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

        if (!refreshToken) {
            throw new UnauthorizedError('Refresh token is required');
        }

        const result = await authService.refreshAccessToken(refreshToken);

        // Send new access token
        sendSuccess(res, result, 'Token refreshed successfully');
    } catch (error) {
        next(error);
    }
}
