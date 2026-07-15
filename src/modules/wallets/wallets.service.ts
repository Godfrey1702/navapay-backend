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
    const result = await paystackProvider.initializePayment({ email, amount, reference });
    return {
        authorization_url: result.authorization_url as string,
        reference: result.reference as string,
        access_code: result.access_code as string,
    };
}

export async function verifyAndCreditWallet(userId: string, reference: string) {
    const verification = await paystackProvider.verifyPayment(reference);

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
