import { Request, Response, NextFunction } from 'express';
import * as transactionService from './transactions.service.js';
import { sendSuccess } from '../../utils/response.js';
import { UnauthorizedError } from '../../utils/errors.js';
import * as clubkonnect from '../../providers/clubkonnect.js';
import { prisma } from '../../database/prisma.js';
import { checkBudgetAlert } from '../budgets/budgets.service.js';
import { auditLog } from '../../lib/audit.js';
import { sendNotification } from '../../lib/notifications.js';

const MIN_AIRTIME = 50;
const MAX_AIRTIME = 50000;

// Admin-only: manually credit a wallet with no payment verification (support/refunds).
// Regular wallet funding must go through Paystack — see wallets.controller.ts / the
// Paystack webhook — which are payment-verified.
export async function adminDeposit(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) throw new UnauthorizedError('User not authenticated');

        const transaction = await transactionService.adminDeposit(req.user.id, req.body);
        sendSuccess(res, transaction, 'Wallet funded successfully', 201);
    } catch (error) {
        next(error);
    }
}

export async function purchase(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) throw new UnauthorizedError('User not authenticated');

        const transaction = await transactionService.purchase(req.user.id, req.body);
        sendSuccess(res, transaction, 'Purchase completed successfully', 201);
    } catch (error) {
        next(error);
    }
}

export async function purchaseAirtime(req: Request, res: Response, next: NextFunction) {
    try {
        const { phoneNumber, amount, network, idempotencyKey } = req.body;
        const userId = req.user!.id;
        const requestId = idempotencyKey || `AIR-${userId}-${Date.now()}`;

        const existing = await prisma.transaction.findFirst({ where: { reference: requestId, userId } });
        if (existing) {
            if (existing.status === 'PENDING' || existing.status === 'PROCESSING') {
                return res.status(409).json({
                    success: false,
                    message: 'A purchase with this reference is already in progress',
                    code: 'DUPLICATE_IN_PROGRESS',
                });
            }
            const providerResponse = (existing.metadata as Record<string, any> | null)?.providerResponse ?? existing;
            return sendSuccess(res, providerResponse, 'Airtime purchased successfully');
        }

        if (amount < MIN_AIRTIME || amount > MAX_AIRTIME) {
            return res.status(400).json({
                success: false,
                message: `Airtime amount must be between ₦${MIN_AIRTIME} and ₦${MAX_AIRTIME}`,
                code: 'INVALID_AMOUNT',
            });
        }

        const wallet = await prisma.wallet.findFirst({ where: { userId } });
        if (!wallet || Number(wallet.balance) < amount) {
            return res.status(400).json({ success: false, message: 'Insufficient balance' });
        }

        console.log('AIRTIME REQUEST BODY:', req.body);
        console.log('PURCHASE REQUEST:', { phoneNumber, amount, amountType: typeof amount, network, requestId });

        // 1. Create the transaction as PENDING before touching the provider
        const pendingTx = await prisma.transaction.create({
            data: {
                userId,
                walletId: wallet.id,
                type: 'PURCHASE',
                amount,
                totalAmount: amount,
                reference: requestId,
                description: `Airtime purchase - ${phoneNumber}`,
                status: 'PENDING',
                category: 'AIRTIME',
                metadata: { phoneNumber, network },
            },
        });

        // 2. Move to PROCESSING right before calling the provider
        await prisma.transaction.update({ where: { id: pendingTx.id }, data: { status: 'PROCESSING' } });

        // 3. Call Clubkonnect
        let result: any;
        try {
            result = await clubkonnect.purchaseAirtime(phoneNumber, amount, network, requestId);
            console.log('CLUBKONNECT AIRTIME RESPONSE:', JSON.stringify(result));
        } catch (err: any) {
            console.error('CLUBKONNECT AIRTIME ERROR:', err.message);
            await prisma.transaction.update({
                where: { id: pendingTx.id },
                data: { status: 'FAILED', metadata: { phoneNumber, network, error: err.message } },
            });
            return res.status(400).json({ success: false, message: err.message });
        }

        // 4. Provider succeeded — atomically deduct the wallet and mark SUCCESS
        try {
            await prisma.$transaction(async (tx) => {
                // Re-fetch inside the transaction so the balance/version check is against
                // the latest row, not the pre-provider-call snapshot read above.
                const lockedWallet = await tx.wallet.findFirst({ where: { userId } });
                if (!lockedWallet || Number(lockedWallet.balance) < amount) {
                    throw new Error('Insufficient balance');
                }

                let updatedWallet;
                try {
                    // Optimistic lock: only succeeds if version still matches what we just read.
                    // A concurrent debit that already bumped the version makes this match zero
                    // rows, which Prisma surfaces as a thrown error (P2025) instead of null.
                    updatedWallet = await tx.wallet.update({
                        where: { id: lockedWallet.id, version: lockedWallet.version },
                        data: { balance: { decrement: amount }, version: { increment: 1 } },
                    });
                } catch {
                    throw new Error('Wallet was modified concurrently. Please try again.');
                }

                await tx.transaction.update({
                    where: { id: pendingTx.id },
                    data: {
                        status: 'SUCCESS',
                        balanceSnapshot: Number(updatedWallet.balance),
                        metadata: { phoneNumber, network, providerResponse: result },
                    },
                });
            });
        } catch (err: any) {
            // 🔴 Critical: the provider already delivered the airtime but our DB update
            // failed (insufficient balance on re-check, concurrent modification, etc).
            // We cannot silently fail here — flag it for manual review instead.
            await prisma.transaction.update({
                where: { id: pendingTx.id },
                data: {
                    status: 'UNKNOWN',
                    metadata: {
                        phoneNumber,
                        network,
                        providerResponse: result,
                        error: err.message,
                        requiresManualReview: true,
                    },
                },
            });

            await sendNotification(
                userId,
                'PURCHASE_FAILED',
                'Purchase requires review',
                'Your airtime purchase was processed by the provider but we encountered an error recording it. Our team will resolve this within 24 hours.',
                { transactionId: pendingTx.id },
            );

            return res.status(500).json({
                success: false,
                message: 'Purchase processed but needs verification. Contact support.',
            });
        }

        await checkBudgetAlert(userId);
        await auditLog('PURCHASE_AIRTIME', req, { phoneNumber, network, amount }, userId);

        sendSuccess(res, result, 'Airtime purchased successfully');
    } catch (error) {
        next(error);
    }
}

export async function purchaseData(req: Request, res: Response, next: NextFunction) {
    try {
        const { phoneNumber, amount, network, planId, idempotencyKey } = req.body;
        const userId = req.user!.id;
        const requestId = idempotencyKey || `DATA-${userId}-${Date.now()}`;

        const existing = await prisma.transaction.findFirst({ where: { reference: requestId, userId } });
        if (existing) {
            if (existing.status === 'PENDING' || existing.status === 'PROCESSING') {
                return res.status(409).json({
                    success: false,
                    message: 'A purchase with this reference is already in progress',
                    code: 'DUPLICATE_IN_PROGRESS',
                });
            }
            const providerResponse = (existing.metadata as Record<string, any> | null)?.providerResponse ?? existing;
            return sendSuccess(res, providerResponse, 'Data purchased successfully');
        }

        const plan = await prisma.dataPlan.findUnique({ where: { id: planId } });
        if (!plan) {
            return res.status(400).json({ success: false, message: 'Invalid data plan selected' });
        }
        if (Number(plan.amount) !== Number(amount)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid purchase amount',
                code: 'PRICE_MISMATCH',
            });
        }
        // Use plan.amount as the authoritative amount going forward
        const verifiedAmount = Number(plan.amount);
        const planCode = plan.code;

        const wallet = await prisma.wallet.findFirst({ where: { userId } });
        if (!wallet || Number(wallet.balance) < verifiedAmount) {
            return res.status(400).json({ success: false, message: 'Insufficient balance' });
        }

        console.log('DATA PURCHASE BODY:', req.body);
        console.log('PLAN CODE BEING SENT:', planCode);
        console.log('PURCHASE REQUEST:', { phoneNumber, planCode, verifiedAmount, network, requestId });

        // 1. Create the transaction as PENDING before touching the provider
        const pendingTx = await prisma.transaction.create({
            data: {
                userId,
                walletId: wallet.id,
                type: 'PURCHASE',
                amount: verifiedAmount,
                totalAmount: verifiedAmount,
                reference: requestId,
                description: `Data purchase - ${plan.name} - ${phoneNumber}`,
                status: 'PENDING',
                category: 'DATA',
                metadata: { phoneNumber, network, planId, planCode },
            },
        });

        // 2. Move to PROCESSING right before calling the provider
        await prisma.transaction.update({ where: { id: pendingTx.id }, data: { status: 'PROCESSING' } });

        // 3. Call Clubkonnect
        let result: any;
        try {
            result = await clubkonnect.purchaseData(phoneNumber, planCode, network, requestId);
            console.log('CLUBKONNECT DATA RESPONSE:', JSON.stringify(result));
        } catch (err: any) {
            console.error('CLUBKONNECT DATA ERROR:', err.message);
            await prisma.transaction.update({
                where: { id: pendingTx.id },
                data: { status: 'FAILED', metadata: { phoneNumber, network, planId, planCode, error: err.message } },
            });
            return res.status(400).json({ success: false, message: err.message });
        }

        // 4. Provider succeeded — atomically deduct the wallet and mark SUCCESS
        try {
            await prisma.$transaction(async (tx) => {
                const lockedWallet = await tx.wallet.findFirst({ where: { userId } });
                if (!lockedWallet || Number(lockedWallet.balance) < verifiedAmount) {
                    throw new Error('Insufficient balance');
                }

                let updatedWallet;
                try {
                    updatedWallet = await tx.wallet.update({
                        where: { id: lockedWallet.id, version: lockedWallet.version },
                        data: { balance: { decrement: verifiedAmount }, version: { increment: 1 } },
                    });
                } catch {
                    throw new Error('Wallet was modified concurrently. Please try again.');
                }

                await tx.transaction.update({
                    where: { id: pendingTx.id },
                    data: {
                        status: 'SUCCESS',
                        balanceSnapshot: Number(updatedWallet.balance),
                        metadata: { phoneNumber, network, planId, planCode, providerResponse: result },
                    },
                });
            });
        } catch (err: any) {
            // 🔴 Critical: the provider already delivered the data bundle but our DB update
            // failed (insufficient balance on re-check, concurrent modification, etc).
            // We cannot silently fail here — flag it for manual review instead.
            await prisma.transaction.update({
                where: { id: pendingTx.id },
                data: {
                    status: 'UNKNOWN',
                    metadata: {
                        phoneNumber,
                        network,
                        planId,
                        planCode,
                        providerResponse: result,
                        error: err.message,
                        requiresManualReview: true,
                    },
                },
            });

            await sendNotification(
                userId,
                'PURCHASE_FAILED',
                'Purchase requires review',
                'Your data purchase was processed by the provider but we encountered an error recording it. Our team will resolve this within 24 hours.',
                { transactionId: pendingTx.id },
            );

            return res.status(500).json({
                success: false,
                message: 'Purchase processed but needs verification. Contact support.',
            });
        }

        await checkBudgetAlert(userId);
        await auditLog('PURCHASE_DATA', req, { phoneNumber, network, planId, amount: verifiedAmount }, userId);

        sendSuccess(res, result, 'Data purchased successfully');
    } catch (error) {
        next(error);
    }
}

export async function getDataPlans(req: Request, res: Response, next: NextFunction) {
    try {
        const network = String(req.params.network).toUpperCase();
        const plans = await prisma.dataPlan.findMany({
            where: { network, isActive: true },
            orderBy: { amount: 'asc' },
        });
        sendSuccess(res, plans, `Data plans for ${network}`);
    } catch (error) {
        next(error);
    }
}

export async function verifyTransaction(req: Request, res: Response, next: NextFunction) {
    try {
        const transactionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId, userId: req.user!.id },
        });
        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }
        sendSuccess(res, transaction, 'Transaction retrieved successfully');
    } catch (error) {
        next(error);
    }
}

export async function getTransactionHistory(req: Request, res: Response, next: NextFunction) {
    try {
        const { page = 1, limit = 50 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const transactions = await prisma.transaction.findMany({
            where: { userId: req.user!.id },
            orderBy: { createdAt: 'desc' },
            take: Number(limit),
            skip: offset,
        });
        sendSuccess(res, transactions, 'Transaction history retrieved successfully');
    } catch (error) {
        next(error);
    }
}
