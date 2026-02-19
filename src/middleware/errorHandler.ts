import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/index.js';

export function globalErrorHandler(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void {
    if (err instanceof AppError) {
        if (!err.isOperational) {
            logger.error({ err, stack: err.stack }, 'Non-operational error occurred');
        } else {
            logger.warn({ err, code: err.code, statusCode: err.statusCode }, err.message);
        }

        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            error: {
                code: err.code,
                details: env.NODE_ENV === 'development' ? err.details : undefined,
            },
        });
        return;
    }

    logger.error({ err, stack: err.stack }, 'Unhandled error');

    res.status(500).json({
        success: false,
        message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        error: {
            code: 'INTERNAL_ERROR',
            details: env.NODE_ENV === 'development' ? err.stack : undefined,
        },
    });
}
