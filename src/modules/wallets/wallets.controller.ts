import { Request, Response, NextFunction } from 'express';
import * as walletService from './wallets.service.js';
import * as clubkonnect from '../../providers/clubkonnect.js';
import { sendSuccess } from '../../utils/response.js';
import { UnauthorizedError, BadRequestError } from '../../utils/errors.js';
import { auditLog } from '../../lib/audit.js';
import { MIN_TOPUP, MAX_WALLET_BALANCE } from './wallets.constants.js';

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
        console.log('[initializePayment] req.body:', req.body, 'typeof amount:', typeof amount);

        if (typeof amount !== 'number' || amount <= 0) {
            throw new BadRequestError('A valid positive amount is required');
        }

        if (amount < MIN_TOPUP) {
            return res.status(400).json({
                success: false,
                message: `Minimum top-up amount is ₦${MIN_TOPUP.toLocaleString()}`,
            });
        }

        const wallet = await walletService.getWalletByUserId(req.user.id);
        const currentBalance = Number(wallet.balance);

        if (currentBalance + amount > MAX_WALLET_BALANCE) {
            const allowedAmount = MAX_WALLET_BALANCE - currentBalance;
            return res.status(400).json({
                success: false,
                message: `Maximum wallet balance is ₦${MAX_WALLET_BALANCE.toLocaleString()}. You can only add ₦${allowedAmount.toLocaleString()} more.`,
            });
        }

        const result = await walletService.initializeWalletPayment(
            req.user.id,
            req.user.email,
            amount,
        );
        sendSuccess(res, result, 'Payment initialized');
    } catch (error) {
        console.error('[initializePayment] error:', error);
        next(error);
    }
}

export async function verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) throw new UnauthorizedError('User not authenticated');

        const reference = String(req.params.reference);
        console.log('[verifyPayment] reference:', reference, 'userId:', req.user.id);

        if (!reference) throw new BadRequestError('Payment reference is required');

        const wallet = await walletService.verifyAndCreditWallet(req.user.id, reference);
        await auditLog('WALLET_FUNDED', req, { reference }, req.user.id);
        sendSuccess(res, wallet, 'Payment verified and wallet credited');
    } catch (error) {
        console.error('[verifyPayment] error:', error);
        next(error);
    }
}

export async function getClubkonnectBalance(req: Request, res: Response, next: NextFunction) {
    try {
        const balance = await clubkonnect.checkBalance();
        sendSuccess(res, { balance }, 'Clubkonnect float balance retrieved');
    } catch (error) {
        next(error);
    }
}
