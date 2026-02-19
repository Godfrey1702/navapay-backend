import pino from 'pino';
import { env } from '../config/index.js';

export const logger = pino({
    level: env.LOG_LEVEL,
    transport:
        env.NODE_ENV === 'development'
            ? {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
                    ignore: 'pid,hostname',
                    singleLine: false,
                },
            }
            : undefined,
    base: {
        env: env.NODE_ENV,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    serializers: {
        err: pino.stdSerializers.err,
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res,
    },
    redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token'],
        censor: '[REDACTED]',
    },
});
