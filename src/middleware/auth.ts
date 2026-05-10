import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/jwt.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { prisma } from '../database/prisma.js';
import { UserRole } from '../generated/prisma/enums.js';

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: UserRole;
            };
        }
    }
}

/**
 * Middleware to protect routes and ensure user is authenticated
 */
export const protect = async (req: Request, _res: Response, next: NextFunction) => {
    try {
        let token: string | undefined;

        if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            throw new UnauthorizedError('Not authorized to access this route');
        }

        // 1. Verify token
        const decoded = verifyAccessToken(token);

        // 2. Check if user still exists and is active
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, role: true, isActive: true },
        });

        if (!user || !user.isActive) {
            throw new UnauthorizedError('The user belonging to this token no longer exists or is inactive');
        }

        // 3. Attach user to request
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role as UserRole,
        };

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware to restrict access based on roles
 */
export const restrictTo = (...roles: UserRole[]) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new ForbiddenError('You do not have permission to perform this action'));
        }
        next();
    };
};
