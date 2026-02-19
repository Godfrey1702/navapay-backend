import { Router, Request, Response } from 'express';
import { env } from './config/index.js';
import { prisma } from './database/index.js';
import { pingRedis } from './services/index.js';
import { sendSuccess } from './utils/response.js';
import { authRoutes } from './modules/auth/index.js';
import { usersRoutes } from './modules/users/index.js';
import { walletsRoutes } from './modules/wallets/index.js';
import { transactionsRoutes } from './modules/transactions/index.js';
import { budgetsRoutes } from './modules/budgets/index.js';
import { notificationsRoutes } from './modules/notifications/index.js';

const router = Router();

// ─── Health Check ───────────────────────────────────────────────────────────
router.get('/health', async (_req: Request, res: Response) => {
    const startTime = Date.now();

    let dbStatus = 'disconnected';
    let redisStatus = 'disconnected';

    try {
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = 'connected';
    } catch {
        dbStatus = 'error';
    }

    try {
        const redisPing = await pingRedis();
        redisStatus = redisPing ? 'connected' : 'error';
    } catch {
        redisStatus = 'error';
    }

    const healthData = {
        status: dbStatus === 'connected' && redisStatus === 'connected' ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        responseTime: `${Date.now() - startTime}ms`,
        services: {
            database: dbStatus,
            redis: redisStatus,
        },
        environment: env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
    };

    const statusCode = healthData.status === 'healthy' ? 200 : 503;
    sendSuccess(res, healthData, 'Health check', statusCode);
});

// ─── API Routes ─────────────────────────────────────────────────────────────
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/wallets', walletsRoutes);
router.use('/transactions', transactionsRoutes);
router.use('/budgets', budgetsRoutes);
router.use('/notifications', notificationsRoutes);

export default router;
