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
    securityHeaders,
} from './middleware/index.js';
import routes from './routes.js';
import webhooksRouter from './modules/webhooks/webhooks.routes.js';
import { NotFoundError } from './utils/errors.js';

const app = express();

// ─── Security ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(securityHeaders);
// Explicit allow-list, read from env so prod domains can be added without a
// code change. credentials:true requires an explicit origin (never "*") —
// the cors package reflects the actual request Origin back when the
// callback passes `true`, it does not emit "*", so this is safe to combine
// with credentials.
const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            // Dev convenience only: lets a phone/browser on the same LAN hit a
            // teammate's machine by IP instead of localhost. Never active in
            // production — prod must be listed explicitly in CORS_ORIGIN.
            if (
                env.NODE_ENV !== 'production' &&
                (/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:(8080|8081|8082|8083|5173|3000)$/.test(origin) ||
                    /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:(8080|8081|8082|8083|5173|3000)$/.test(origin))
            ) {
                return callback(null, true);
            }

            return callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Client'],
    }),
);

// ─── Webhooks ───────────────────────────────────────────────────────────────
// Must be mounted before express.json() — signature verification needs the raw body.
app.use(`${env.API_PREFIX}/webhooks`, webhooksRouter);

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
