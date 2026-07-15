import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env } from './config/index.js';
import {
    globalErrorHandler,
    requestIdMiddleware,
    requestLoggerMiddleware,
    rateLimiter,
} from './middleware/index.js';
import routes from './routes.js';
import { NotFoundError } from './utils/errors.js';

const app = express();

// ─── Security ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
    cors({
        origin: [
            "http://localhost:8080",
            "http://localhost:8081",
            "http://localhost:8082",
            "http://localhost:8083",
            "http://localhost:5173",
            "http://192.168.182.58:8080",
            "http://192.168.182.58:5173",
            "http://192.168.33.128:8080",
            "http://192.168.33.128:5173",
            "http://192.168.33.128:8081",
            "http://192.168.33.128:8082",
            "http://192.168.33.128:8083",
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    }),
);

// ─── Parsing ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

// ─── Request Tracing & Logging ──────────────────────────────────────────────
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);

// ─── Rate Limiting ──────────────────────────────────────────────────────────
app.use(rateLimiter);

// ─── Trust Proxy (for rate limiting behind reverse proxy) ───────────────────
app.set('trust proxy', 1);

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use(env.API_PREFIX, routes);

// ─── Root Endpoint ──────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
    res.json({
        name: 'Godfray Wallet API',
        version: '1.0.0',
        documentation: `${env.API_PREFIX}/docs`,
    });
});

// ─── 404 Handler ────────────────────────────────────────────────────────────
app.use((_req, _res, next) => {
    next(new NotFoundError('The requested endpoint does not exist'));
});

// ─── Global Error Handler ───────────────────────────────────────────────────
app.use(globalErrorHandler);

export default app;
