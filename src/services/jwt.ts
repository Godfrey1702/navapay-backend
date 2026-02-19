import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/index.js';
import { UnauthorizedError } from '../utils/errors.js';

export interface TokenPayload extends jwt.JwtPayload {
    userId: string;
    email: string;
    role?: string;
}

export function signAccessToken(payload: TokenPayload): string {
    const options: SignOptions = {
        expiresIn: env.JWT_ACCESS_EXPIRY as any,
    };
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function signRefreshToken(payload: TokenPayload): string {
    const options: SignOptions = {
        expiresIn: env.JWT_REFRESH_EXPIRY as any,
    };
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
}

export function verifyAccessToken(token: string): TokenPayload {
    try {
        return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
    } catch (error) {
        throw new UnauthorizedError('Invalid or expired access token');
    }
}

export function verifyRefreshToken(token: string): TokenPayload {
    try {
        return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
    } catch (error) {
        throw new UnauthorizedError('Invalid or expired refresh token');
    }
}
