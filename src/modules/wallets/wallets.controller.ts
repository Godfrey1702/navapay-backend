import { Request, Response, NextFunction } from 'express';
import * as walletService from './wallets.service.js';
import { sendSuccess } from '../../utils/response.js';
import { UnauthorizedError } from '../../utils/errors.js';

/**
 * Fetch the authenticated user's wallet.
 */
export async function getMyWallet(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) {
            throw new UnauthorizedError('User not authenticated');
        }

        const wallet = await walletService.getWalletByUserId(req.user.id);
        sendSuccess(res, wallet, 'Wallet retrieved successfully');
    } catch (error) {
        next(error);
    }
}
