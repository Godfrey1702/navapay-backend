import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { env } from '../config/index.js';
import { logger } from '../utils/logger.js';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const createPrismaClient = () => {
    const pool = new pg.Pool({
        connectionString: env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });

    const adapter = new PrismaPg(pool);

    return new PrismaClient({
        adapter,
        log:
            env.NODE_ENV === 'development'
                ? ['query', 'error', 'warn']
                : ['error'],
    });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

export async function connectDatabase(): Promise<void> {
    try {
        // With adapters, the pool manages the connection. 
        // We can run a simple query to verify connectivity.
        await prisma.$queryRaw`SELECT 1`;
        logger.info('✅ Database connected successfully via Adapter');
    } catch (error) {
        logger.error({ error }, '❌ Failed to connect to database');
        throw error;
    }
}

export async function disconnectDatabase(): Promise<void> {
    try {
        await prisma.$disconnect();
        logger.info('Database disconnected');
    } catch (error) {
        logger.error({ error }, 'Error disconnecting from database');
    }
}
