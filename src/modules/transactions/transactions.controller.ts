import { Request, Response, NextFunction } from 'express';
import * as transactionService from './transactions.service.js';
import { sendSuccess } from '../../utils/response.js';
import { UnauthorizedError } from '../../utils/errors.js';

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

export async function getHistory(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) throw new UnauthorizedError('User not authenticated');

        const limit = parseInt(req.query.limit as string) || 20;
        const page = parseInt(req.query.page as string) || 1;

        const result = await transactionService.getHistory(req.user.id, limit, page);
        sendSuccess(res, result, 'Transaction history retrieved');
    } catch (error) {
        next(error);
    }
}
