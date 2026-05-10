import { Request, Response, NextFunction } from 'express';
import * as transactionService from './transactions.service.js';
import { sendSuccess } from '../../utils/response.js';
import { UnauthorizedError } from '../../utils/errors.js';
import * as payflex from '../../providers/payflex.js';
import { prisma } from '../../database/prisma.js';

export async function deposit(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) throw new UnauthorizedError('User not authenticated');

        const transaction = await transactionService.deposit(req.user.id, req.body);
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

        const wallet = await prisma.wallet.findFirst({ where: { userId } });
        if (!wallet || wallet.balance < amount) {
            return res.status(400).json({ success: false, message: "Insufficient balance" });
        }

        const reference = idempotencyKey || `AIR-${userId}-${Date.now()}`;

        const result = await payflex.purchaseAirtime({ phoneNumber, amount, network, reference });

        await prisma.wallet.update({
            where: { id: wallet.id },
            data: { balance: { decrement: amount } },
        });

        await prisma.transaction.create({
            data: {
                userId,
                walletId: wallet.id,
                type: "PURCHASE",
                amount,
                totalAmount: amount,
                balanceSnapshot: Number(wallet.balance.toString()) - Number(amount),
                reference,
                description: `Airtime purchase - ${phoneNumber}`,
                status: "SUCCESS",
                metadata: { phoneNumber, network, providerResponse: result },
            },
        });

        sendSuccess(res, result, 'Airtime purchased successfully');
    } catch (error) {
        next(error);
    }
}

export async function purchaseData(req: Request, res: Response, next: NextFunction) {
    try {
        const { phoneNumber, amount, network, planId, idempotencyKey } = req.body;
        const userId = req.user!.id;

        const wallet = await prisma.wallet.findFirst({ where: { userId } });
        if (!wallet || wallet.balance < amount) {
            return res.status(400).json({ success: false, message: "Insufficient balance" });
        }

        const reference = idempotencyKey || `DATA-${userId}-${Date.now()}`;

        const result = await payflex.purchaseData({ phoneNumber, planId, network, reference });

        await prisma.wallet.update({
            where: { id: wallet.id },
            data: { balance: { decrement: amount } },
        });

        await prisma.transaction.create({
            data: {
                userId,
                walletId: wallet.id,
                type: "PURCHASE",
                amount,
                totalAmount: amount,
                balanceSnapshot: Number(wallet.balance.toString()) - Number(amount),
                reference,
                description: `Data purchase - ${phoneNumber}`,
                status: "SUCCESS",
                metadata: { phoneNumber, network, planId, providerResponse: result },
            },
        });

        sendSuccess(res, result, 'Data purchased successfully');
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
            return res.status(404).json({ success: false, message: "Transaction not found" });
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
            orderBy: { createdAt: "desc" },
            take: Number(limit),
            skip: offset,
        });
        sendSuccess(res, transactions, 'Transaction history retrieved successfully');
    } catch (error) {
        next(error);
    }
}
