import { Request, Response, NextFunction } from 'express';
import * as transactionService from './transactions.service.js';
import { sendSuccess } from '../../utils/response.js';
import { UnauthorizedError } from '../../utils/errors.js';
import * as clubkonnect from '../../providers/clubkonnect.js';
import { prisma } from '../../database/prisma.js';
import { checkBudgetAlert } from '../budgets/budgets.service.js';

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
            const providerResponse = (existing.metadata as Record<string, any> | null)?.providerResponse ?? existing;
            return sendSuccess(res, providerResponse, 'Airtime purchased successfully');
        }

        const wallet = await prisma.wallet.findFirst({ where: { userId } });
        if (!wallet || wallet.balance < amount) {
            return res.status(400).json({ success: false, message: 'Insufficient balance' });
        }

        console.log('AIRTIME REQUEST BODY:', req.body);
        console.log('PURCHASE REQUEST:', { phoneNumber, amount, amountType: typeof amount, network, requestId });

        let result: any;
        try {
            result = await clubkonnect.purchaseAirtime(phoneNumber, amount, network, requestId);
            console.log('CLUBKONNECT AIRTIME RESPONSE:', JSON.stringify(result));
        } catch (err: any) {
            console.error('CLUBKONNECT AIRTIME ERROR:', err.message);
            return res.status(400).json({ success: false, message: err.message });
        }

        await prisma.wallet.update({
            where: { id: wallet.id },
            data: { balance: { decrement: amount } },
        });

        await prisma.transaction.create({
            data: {
                userId,
                walletId: wallet.id,
                type: 'PURCHASE',
                amount,
                totalAmount: amount,
                balanceSnapshot: Number(wallet.balance.toString()) - Number(amount),
                reference: requestId,
                description: `Airtime purchase - ${phoneNumber}`,
                status: 'SUCCESS',
                category: 'AIRTIME',
                metadata: { phoneNumber, network, providerResponse: result },
            },
        });

        await checkBudgetAlert(userId, 'AIRTIME');

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
            const providerResponse = (existing.metadata as Record<string, any> | null)?.providerResponse ?? existing;
            return sendSuccess(res, providerResponse, 'Data purchased successfully');
        }

        const wallet = await prisma.wallet.findFirst({ where: { userId } });
        if (!wallet || wallet.balance < amount) {
            return res.status(400).json({ success: false, message: 'Insufficient balance' });
        }

        const plan = await prisma.dataPlan.findUnique({ where: { id: planId } });
        if (!plan) {
            return res.status(400).json({ success: false, message: 'Invalid data plan selected' });
        }
        const planCode = plan.code;

        console.log('DATA PURCHASE BODY:', req.body);
        console.log('PLAN CODE BEING SENT:', planCode);
        console.log('PURCHASE REQUEST:', { phoneNumber, planCode, amount, network, requestId });

        let result: any;
        try {
            result = await clubkonnect.purchaseData(phoneNumber, planCode, network, requestId);
            console.log('CLUBKONNECT DATA RESPONSE:', JSON.stringify(result));
        } catch (err: any) {
            console.error('CLUBKONNECT DATA ERROR:', err.message);
            return res.status(400).json({ success: false, message: err.message });
        }

        await prisma.wallet.update({
            where: { id: wallet.id },
            data: { balance: { decrement: amount } },
        });

        await prisma.transaction.create({
            data: {
                userId,
                walletId: wallet.id,
                type: 'PURCHASE',
                amount,
                totalAmount: amount,
                balanceSnapshot: Number(wallet.balance.toString()) - Number(amount),
                reference: requestId,
                description: `Data purchase - ${plan.name} - ${phoneNumber}`,
                status: 'SUCCESS',
                category: 'DATA',
                metadata: { phoneNumber, network, planId, planCode, providerResponse: result },
            },
        });

        await checkBudgetAlert(userId, 'DATA');

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
