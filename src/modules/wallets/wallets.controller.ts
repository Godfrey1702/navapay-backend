import { Request, Response, NextFunction } from 'express';
import * as walletService from './wallets.service.js';
import { sendSuccess } from '../../utils/response.js';
import { UnauthorizedError, BadRequestError } from '../../utils/errors.js';

export async function getMyWallet(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) throw new UnauthorizedError('User not authenticated');
        const wallet = await walletService.getWalletByUserId(req.user.id);
        sendSuccess(res, wallet, 'Wallet retrieved successfully');
    } catch (error) {
        next(error);
    }
}

export async function initializePayment(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) throw new UnauthorizedError('User not authenticated');

        const { amount } = req.body;
        if (typeof amount !== 'number' || amount <= 0) {
            throw new BadRequestError('A valid positive amount is required');
        }

        const result = await walletService.initializeWalletPayment(
            req.user.id,
            req.user.email,
            amount,
        );
        sendSuccess(res, result, 'Payment initialized');
    } catch (error) {
        next(error);
    }
}

export async function verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) throw new UnauthorizedError('User not authenticated');

        const { reference } = req.params;
        if (!reference) throw new BadRequestError('Payment reference is required');

        const wallet = await walletService.verifyAndCreditWallet(req.user.id, reference);
        sendSuccess(res, wallet, 'Payment verified and wallet credited');
    } catch (error) {
        next(error);
    }
}
