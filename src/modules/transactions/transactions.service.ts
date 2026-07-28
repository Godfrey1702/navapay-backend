import { prisma } from '../../database/prisma.js';
import { withTransaction } from '../../database/transaction.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { v4 as uuidv4 } from 'uuid';
import {
    TransactionStatus,
    TransactionType,
    ServiceCategory
} from '../../generated/prisma/enums.js';
import { CreateDepositInput, CreatePurchaseInput } from './transactions.schema.js';
import { logger } from '../../utils/logger.js';

/**
 * Admin-only manual wallet credit — no payment verification. Support/refunds use only.
 */
export async function adminDeposit(userId: string, input: CreateDepositInput) {
    return await withTransaction(async (tx) => {
        // 1. Get and lock wallet (simple find for now, usually we use queryRaw for FOR UPDATE)
        const wallet = await tx.wallet.findUnique({
            where: { userId },
        });

        if (!wallet) throw new NotFoundError('Wallet not found');

        // 2. Create transaction record
        const transaction = await tx.transaction.create({
            data: {
                reference: `DEP-${uuidv4().split('-')[0].toUpperCase()}-${Date.now()}`,
                userId,
                walletId: wallet.id,
                amount: input.amount,
                totalAmount: input.amount,
                type: TransactionType.DEPOSIT,
                status: TransactionStatus.SUCCESS,
                description: input.description || 'Wallet funding',
                balanceSnapshot: Number(wallet.balance) + input.amount,
            },
        });

        // 3. Update wallet balance
        await tx.wallet.update({
            where: { id: wallet.id },
            data: {
                balance: { increment: input.amount },
            },
        });

        logger.info({ userId, amount: input.amount }, 'Wallet funded successfully');
        return transaction;
    });
}

/**
 * Handle service purchase (Purchase).
 */
export async function purchase(userId: string, input: CreatePurchaseInput) {
    return await withTransaction(async (tx) => {
        // 1. Get and verify wallet balance
        const wallet = await tx.wallet.findUnique({
            where: { userId },
        });

        if (!wallet) throw new NotFoundError('Wallet not found');
        if (Number(wallet.balance) < input.amount) {
            throw new BadRequestError('Insufficient wallet balance');
        }

        // 2. Create transaction record (PENDING)
        const reference = `PUR-${uuidv4().split('-')[0].toUpperCase()}-${Date.now()}`;
        const transaction = await tx.transaction.create({
            data: {
                reference,
                userId,
                walletId: wallet.id,
                amount: input.amount,
                totalAmount: input.amount,
                type: TransactionType.PURCHASE,
                status: TransactionStatus.SUCCESS, // Simulation: assuming 3rd party API succeeds instantly
                category: input.category,
                description: input.description || `${input.category} purchase for ${input.phoneNumber}`,
                metadata: {
                    provider: input.provider,
                    phoneNumber: input.phoneNumber,
                    ...input.metadata,
                },
                balanceSnapshot: Number(wallet.balance) - input.amount,
            },
        });

        // 3. Update wallet balance
        await tx.wallet.update({
            where: { id: wallet.id },
            data: {
                balance: { decrement: input.amount },
            },
        });

        logger.info({ userId, amount: input.amount, category: input.category }, 'Purchase successful');
        return transaction;
    });
}

/**
 * Get user transaction history.
 */
export async function getHistory(userId: string, limit = 20, page = 1) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
        prisma.transaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip,
        }),
        prisma.transaction.count({ where: { userId } }),
    ]);

    return {
        data,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
}
