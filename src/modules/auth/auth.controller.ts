import { Request, Response, NextFunction, CookieOptions } from 'express';
import { env } from '../../config/index.js';
import { sendSuccess } from '../../utils/response.js';
import * as authService from './auth.service.js';
import { logger } from '../../utils/logger.js';
import { UnauthorizedError } from '../../utils/errors.js';
import { sanitizeUser } from '../../utils/sanitize.js';
import bcrypt from 'bcryptjs';
import { prisma } from '../../database/prisma.js';
import { auditLog } from '../../lib/audit.js';

const COOKIE_OPTIONS: CookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function register(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await authService.register(req.body);
        await auditLog('REGISTER', req, { email: result.user.email }, result.user.id);

        // No tokens issued here — the account is unverified until the user clicks
        // the link in their verification email, then logs in via /auth/login.
        sendSuccess(res, { user: sanitizeUser(result.user) }, 'Registration successful. Please check your email to verify your account.', 201);
    } catch (error) {
        next(error);
    }
}

export async function login(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await authService.login(req.body);

        // Set refresh token in HTTP-only cookie (web clients read it this way)
        res.cookie('refreshToken', result.tokens.refreshToken, COOKIE_OPTIONS);

        await auditLog('LOGIN_SUCCESS', req, { email: result.user.email }, result.user.id);

        // React Native has no browser-style cookie jar, so a mobile client can't
        // rely on the httpOnly cookie above. Mobile identifies itself with
        // X-Client and gets the refresh token in the body instead, to persist
        // and send back explicitly on /auth/refresh.
        const responseData: Record<string, unknown> = {
            user: sanitizeUser(result.user),
            accessToken: result.tokens.accessToken,
        };
        if (req.get('X-Client') === 'mobile') {
            responseData.refreshToken = result.tokens.refreshToken;
        }

        sendSuccess(res, responseData, 'Login successful');
    } catch (error) {
        await auditLog('LOGIN_FAILED', req, { email: req.body?.email });
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

export async function getMe(req: Request, res: Response, next: NextFunction) {
    const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { id: true, email: true, fullName: true, role: true, createdAt: true },
    });
    sendSuccess(res, user ? sanitizeUser(user) : user, 'User retrieved successfully');
}

export async function updatePassword(req: Request, res: Response, next: NextFunction) {
    const { password } = req.body;
    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({
        where: { id: req.user!.id },
        data: { passwordHash: hashed },
    });
    sendSuccess(res, { message: "Password updated" }, 'Password updated successfully');
}
