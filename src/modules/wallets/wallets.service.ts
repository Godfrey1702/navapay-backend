import { prisma } from '../../database/prisma.js';
import { withTransaction } from '../../database/transaction.js';
import { NotFoundError } from '../../utils/errors.js';
import { TransactionType, TransactionStatus } from '../../generated/prisma/enums.js';
import { v4 as uuidv4 } from 'uuid';
import * as paystackProvider from '../../providers/paystack.js';
import { logger } from '../../utils/logger.js';

export async function getWalletByUserId(userId: string) {
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundError('Wallet not found');
    return wallet;
}

export async function initializeWalletPayment(userId: string, email: string, amount: number) {
    const reference = `DEP-${uuidv4().split('-')[0].toUpperCase()}-${Date.now()}`;

    console.log('[initializeWalletPayment] amount:', amount, 'kobo will be sent:', amount * 100);
    console.log('[initializeWalletPayment] email:', email, 'reference:', reference);

    let result: any;
    try {
        result = await paystackProvider.initializePayment({
            email,
            amount,
            reference,
            metadata: { userId },
        });
        console.log('[initializeWalletPayment] Paystack response:', JSON.stringify(result, null, 2));
    } catch (err: any) {
        console.error('[initializeWalletPayment] Paystack error:', err?.response?.status, JSON.stringify(err?.response?.data ?? err?.message));
        throw err;
    }

    return {
        authorization_url: result.authorization_url as string,
        reference: result.reference as string,
        access_code: result.access_code as string,
    };
}

export async function verifyAndCreditWallet(userId: string, reference: string) {
    console.log('[verifyAndCreditWallet] verifying reference:', reference);

    let verification: any;
    try {
        verification = await paystackProvider.verifyPayment(reference);
        console.log('[verifyAndCreditWallet] Paystack verify status:', verification?.status, 'gateway_response:', verification?.gateway_response);
        console.log('[verifyAndCreditWallet] full verify response:', JSON.stringify(verification, null, 2));
    } catch (err: any) {
        console.error('[verifyAndCreditWallet] Paystack verify error:', err?.response?.status, JSON.stringify(err?.response?.data ?? err?.message));
        throw err;
    }

    if (verification.status !== 'success') {
        throw new Error(`Payment not successful: ${verification.gateway_response}`);
    }

    const amountInNaira = verification.amount / 100;

    return await withTransaction(async (tx) => {
        const wallet = await tx.wallet.findUnique({ where: { userId } });
        if (!wallet) throw new NotFoundError('Wallet not found');

        // Idempotency: skip if this reference was already processed
        const existing = await tx.transaction.findUnique({ where: { reference } });
        if (existing) {
            console.log('[verifyAndCreditWallet] reference already processed, returning current wallet');
            return tx.wallet.findUnique({ where: { userId } });
        }

        await tx.transaction.create({
            data: {
                reference,
                userId,
                walletId: wallet.id,
                amount: amountInNaira,
                totalAmount: amountInNaira,
                type: TransactionType.DEPOSIT,
                status: TransactionStatus.SUCCESS,
                description: 'Wallet funded via Paystack',
                balanceSnapshot: Number(wallet.balance) + amountInNaira,
                metadata: { channel: (verification.channel as string) ?? 'paystack' },
            },
        });

        const updatedWallet = await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: amountInNaira } },
        });

        logger.info({ userId, amount: amountInNaira }, 'Wallet funded via Paystack');
        return updatedWallet;
    });
}
