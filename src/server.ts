import app from './app.js';
import { env } from './config/index.js';
import { logger } from './utils/logger.js';
import { connectDatabase, disconnectDatabase } from './database/index.js';
import { connectRedis, disconnectRedis } from './services/index.js';
import { startScheduleRunner, stopScheduleRunner } from './jobs/scheduleRunner.js';
import { runReconciliation } from './jobs/reconciliationJob.js';
import http from 'http';

const RECONCILIATION_INTERVAL_MS = 24 * 60 * 60 * 1000; // daily
let reconciliationIntervalHandle: NodeJS.Timeout | null = null;

const server = http.createServer(app);

async function startServer(): Promise<void> {
    try {
        // Connect to database
        await connectDatabase();

        // Connect to Redis
        await connectRedis();

        // Start the scheduled top-up polling runner
        startScheduleRunner();

        // Run wallet reconciliation daily, plus once on startup
        reconciliationIntervalHandle = setInterval(() => {
            runReconciliation().catch((error) => logger.error({ error }, 'Reconciliation tick failed'));
        }, RECONCILIATION_INTERVAL_MS);
        runReconciliation().catch((error) => logger.error({ error }, 'Initial reconciliation run failed'));

        // Start HTTP server
        server.listen(env.PORT, () => {
            logger.info(
                {
                    port: env.PORT,
                    env: env.NODE_ENV,
                    prefix: env.API_PREFIX,
                },
                `🚀 Godfray Wallet API is running on port ${env.PORT}`,
            );
            logger.info(`📍 Health check: http://localhost:${env.PORT}${env.API_PREFIX}/health`);
        });
    } catch (error) {
        logger.fatal({ error }, 'Failed to start server');
        process.exit(1);
    }
}

// ─── Graceful Shutdown ──────────────────────────────────────────────────────
async function gracefulShutdown(signal: string): Promise<void> {
    logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown...');

    stopScheduleRunner();
    if (reconciliationIntervalHandle) {
        clearInterval(reconciliationIntervalHandle);
        reconciliationIntervalHandle = null;
    }

    server.close(async () => {
        logger.info('HTTP server closed');

        try {
            await Promise.allSettled([disconnectDatabase(), disconnectRedis()]);
            logger.info('All connections closed. Exiting...');
            process.exit(0);
        } catch (error) {
            logger.error({ error }, 'Error during graceful shutdown');
            process.exit(1);
        }
    });

    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 30000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error: Error) => {
    logger.fatal({ error }, 'Uncaught exception');
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason: unknown) => {
    logger.fatal({ reason }, 'Unhandled rejection');
    gracefulShutdown('unhandledRejection');
});

startServer();
