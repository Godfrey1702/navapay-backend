import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../database/prisma.js';
import { withTransaction } from '../../database/transaction.js';
import { sendSuccess } from '../../utils/response.js';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors.js';
import { auditLog } from '../../lib/audit.js';

export async function getDashboardMetrics(_req: Request, res: Response, next: NextFunction) {
    try {
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const [totalUsers, totalWalletBalance, totalTransactions, activeSchedules, totalRevenue, recentTransactions, recentTransactionsList] =
            await Promise.all([
                prisma.user.count(),
                prisma.wallet.aggregate({ _sum: { balance: true } }),
                prisma.transaction.count(),
                prisma.scheduledTopUp.count({ where: { status: 'ACTIVE' } }),
                prisma.transaction.aggregate({
                    where: { type: 'PURCHASE', status: 'SUCCESS' },
                    _sum: { amount: true },
                }),
                prisma.transaction.count({
                    where: { createdAt: { gte: last24Hours } },
                }),
                prisma.transaction.findMany({
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    include: { user: { select: { email: true, fullName: true } } },
                }),
            ]);

        sendSuccess(res, {
            totalUsers,
            totalWalletBalance: Number(totalWalletBalance._sum.balance ?? 0),
            totalTransactions,
            activeSchedules,
            totalRevenue: Number(totalRevenue._sum.amount ?? 0),
            recentTransactions,
            recentTransactionsList,
        }, 'Dashboard metrics retrieved');
    } catch (err) { next(err); }
}

export async function getUsers(req: Request, res: Response, next: NextFunction) {
    try {
        const { page = '1', limit = '20', search } = req.query;

        const where = search
            ? {
                  OR: [
                      { email: { contains: String(search), mode: 'insensitive' as const } },
                      { fullName: { contains: String(search), mode: 'insensitive' as const } },
                  ],
              }
            : {};

        const take = Number(limit);
        const skip = (Number(page) - 1) * take;

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true, email: true, fullName: true, phoneNumber: true,
                    role: true, isEmailVerified: true, isActive: true,
                    createdAt: true, lastLoginAt: true,
                    wallet: { select: { balance: true } },
                },
                orderBy: { createdAt: 'desc' },
                take,
                skip,
            }),
            prisma.user.count({ where }),
        ]);

        sendSuccess(res, users, 'Users retrieved', 200, {
            page: Number(page),
            limit: take,
            total,
            totalPages: Math.ceil(total / take),
        });
    } catch (err) { next(err); }
}

export async function getUserDetails(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = String(req.params.userId);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true, email: true, fullName: true, phoneNumber: true,
                role: true, isEmailVerified: true, isActive: true,
                createdAt: true, lastLoginAt: true,
                wallet: { select: { balance: true, currency: true } },
                transactions: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    select: { id: true, type: true, amount: true, status: true, createdAt: true, description: true },
                },
            },
        });
        if (!user) throw new NotFoundError('User not found');
        sendSuccess(res, user, 'User details retrieved');
    } catch (err) { next(err); }
}

export async function getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
        const { page = '1', limit = '20', status, type, userId, from, to } = req.query;

        const where: Record<string, any> = {};
        if (status) where.status = String(status);
        if (type) where.type = String(type);
        if (userId) where.userId = String(userId);
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(String(from));
            if (to) where.createdAt.lte = new Date(String(to));
        }

        const take = Number(limit);
        const skip = (Number(page) - 1) * take;

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                include: { user: { select: { email: true, fullName: true } } },
                orderBy: { createdAt: 'desc' },
                take,
                skip,
            }),
            prisma.transaction.count({ where }),
        ]);

        sendSuccess(res, transactions, 'Transactions retrieved', 200, {
            page: Number(page),
            limit: take,
            total,
            totalPages: Math.ceil(total / take),
        });
    } catch (err) { next(err); }
}

export async function getWallets(req: Request, res: Response, next: NextFunction) {
    try {
        const { page = '1', limit = '20', search } = req.query;

        const userWhere = search
            ? {
                  OR: [
                      { email: { contains: String(search), mode: 'insensitive' as const } },
                      { fullName: { contains: String(search), mode: 'insensitive' as const } },
                  ],
              }
            : {};

        const take = Number(limit);
        const skip = (Number(page) - 1) * take;

        const [wallets, total] = await Promise.all([
            prisma.wallet.findMany({
                where: { user: userWhere },
                include: { user: { select: { email: true, fullName: true } } },
                orderBy: { balance: 'desc' },
                take,
                skip,
            }),
            prisma.wallet.count({ where: { user: userWhere } }),
        ]);

        sendSuccess(res, wallets, 'Wallets retrieved', 200, {
            page: Number(page),
            limit: take,
            total,
            totalPages: Math.ceil(total / take),
        });
    } catch (err) { next(err); }
}

export async function adjustWallet(req: Request, res: Response, next: NextFunction) {
    try {
        const { userId, amount, type, reason } = req.body;

        if (!userId || typeof amount !== 'number' || amount <= 0 || !type || !reason) {
            throw new ValidationError('userId, a positive amount, type, and reason are required');
        }

        const adjustmentType = String(type).toUpperCase();
        if (adjustmentType !== 'CREDIT' && adjustmentType !== 'DEBIT') {
            throw new ValidationError('type must be "credit" or "debit"');
        }

        const wallet = await prisma.wallet.findFirst({ where: { userId } });
        if (!wallet) throw new NotFoundError('Wallet not found');

        const reference = `ADMIN-${uuidv4().split('-')[0].toUpperCase()}-${Date.now()}`;

        await withTransaction(async (tx) => {
            // Re-fetch inside the transaction so the version check is against the
            // latest row, not the pre-transaction snapshot read above.
            const lockedWallet = await tx.wallet.findFirst({ where: { userId } });
            if (!lockedWallet) throw new NotFoundError('Wallet not found');

            if (adjustmentType === 'DEBIT' && Number(lockedWallet.balance) < amount) {
                throw new ValidationError('Insufficient wallet balance for debit');
            }

            let updatedWallet;
            try {
                updatedWallet = await tx.wallet.update({
                    where: { id: lockedWallet.id, version: lockedWallet.version },
                    data: {
                        balance: adjustmentType === 'CREDIT' ? { increment: amount } : { decrement: amount },
                        version: { increment: 1 },
                    },
                });
            } catch {
                throw new ConflictError('Wallet was modified concurrently. Please try again.');
            }

            await tx.transaction.create({
                data: {
                    userId,
                    walletId: lockedWallet.id,
                    type: adjustmentType === 'CREDIT' ? 'DEPOSIT' : 'PURCHASE',
                    amount,
                    totalAmount: amount,
                    balanceSnapshot: Number(updatedWallet.balance),
                    reference,
                    description: `Admin adjustment: ${reason}`,
                    status: 'SUCCESS',
                    metadata: { adminId: req.user!.id, reason, adjustmentType },
                },
            });
        });

        await auditLog('ADMIN_WALLET_ADJUST', req, { userId, amount, type: adjustmentType, reason });

        sendSuccess(res, { message: `Wallet ${adjustmentType.toLowerCase()}ed successfully` }, 'Wallet adjusted successfully');
    } catch (err) { next(err); }
}

export async function getScheduledTopUps(req: Request, res: Response, next: NextFunction) {
    try {
        const { page = '1', limit = '20', status, userId } = req.query;

        const where: Record<string, any> = {};
        if (status) where.status = String(status);
        if (userId) where.userId = String(userId);

        const take = Number(limit);
        const skip = (Number(page) - 1) * take;

        const [schedules, total] = await Promise.all([
            prisma.scheduledTopUp.findMany({
                where,
                include: { user: { select: { email: true, fullName: true } } },
                orderBy: { createdAt: 'desc' },
                take,
                skip,
            }),
            prisma.scheduledTopUp.count({ where }),
        ]);

        sendSuccess(res, schedules, 'Scheduled top-ups retrieved', 200, {
            page: Number(page),
            limit: take,
            total,
            totalPages: Math.ceil(total / take),
        });
    } catch (err) { next(err); }
}

export async function getAnalytics(_req: Request, res: Response, next: NextFunction) {
    try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const [thisMonthRevenue, lastMonthRevenue, thisMonthUsers, spendByNetwork, monthlyTrend] = await Promise.all([
            prisma.transaction.aggregate({
                where: { type: 'PURCHASE', status: 'SUCCESS', createdAt: { gte: monthStart } },
                _sum: { amount: true },
            }),
            prisma.transaction.aggregate({
                where: { type: 'PURCHASE', status: 'SUCCESS', createdAt: { gte: lastMonthStart, lt: monthStart } },
                _sum: { amount: true },
            }),
            prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
            // Grouping by the raw `metadata` JSON column would produce one bucket per
            // transaction (each blob embeds a unique provider order id), not per network —
            // so pull the network out of the JSON and aggregate on that instead.
            prisma.$queryRaw<Array<{ network: string; total: string }>>`
                SELECT metadata->>'network' as network, SUM(amount) as total
                FROM transactions
                WHERE type = 'PURCHASE' AND status = 'SUCCESS' AND metadata->>'network' IS NOT NULL
                GROUP BY metadata->>'network'
                ORDER BY total DESC
            `,
            prisma.$queryRaw<Array<{ month: Date; total: string }>>`
                SELECT
                    DATE_TRUNC('month', created_at) as month,
                    SUM(amount) as total
                FROM transactions
                WHERE type = 'PURCHASE' AND status = 'SUCCESS'
                AND created_at >= NOW() - INTERVAL '6 months'
                GROUP BY DATE_TRUNC('month', created_at)
                ORDER BY month ASC
            `,
        ]);

        sendSuccess(res, {
            thisMonthRevenue: Number(thisMonthRevenue._sum.amount ?? 0),
            lastMonthRevenue: Number(lastMonthRevenue._sum.amount ?? 0),
            newUsersThisMonth: thisMonthUsers,
            spendByNetwork,
            monthlyTrend,
        }, 'Analytics retrieved');
    } catch (err) { next(err); }
}
