import { prisma } from './prisma.js';
import { logger } from '../utils/logger.js';
import type { Prisma } from '../generated/prisma/client.js';

interface TransactionOptions {
    maxWait?: number;
    timeout?: number;
    isolationLevel?: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable';
}

export async function withTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: TransactionOptions,
): Promise<T> {
    const startTime = Date.now();

    try {
        const result = await prisma.$transaction(
            async (tx: Prisma.TransactionClient) => {
                return callback(tx);
            },
            {
                maxWait: options?.maxWait ?? 5000,
                timeout: options?.timeout ?? 10000,
                isolationLevel: options?.isolationLevel,
            },
        );

        const duration = Date.now() - startTime;
        logger.debug({ duration: `${duration}ms` }, 'Transaction completed successfully');

        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error({ error, duration: `${duration}ms` }, 'Transaction failed');
        throw error;
    }
}
