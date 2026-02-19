import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

declare global {
    namespace Express {
        interface Request {
            requestId: string;
            startTime: number;
        }
    }
}

export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
    req.requestId = (req.headers['x-request-id'] as string) || uuidv4();
    req.startTime = Date.now();
    next();
}

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
    res.on('finish', () => {
        const duration = Date.now() - req.startTime;
        const logData = {
            requestId: req.requestId,
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        };

        if (res.statusCode >= 500) {
            logger.error(logData, 'Request completed with server error');
        } else if (res.statusCode >= 400) {
            logger.warn(logData, 'Request completed with client error');
        } else {
            logger.info(logData, 'Request completed');
        }
    });

    next();
}
