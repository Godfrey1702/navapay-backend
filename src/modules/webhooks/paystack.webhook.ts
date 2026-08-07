import crypto from 'crypto';
import { Request, Response } from 'express';
import { prisma } from '../../database/prisma.js';
import { withTransaction } from '../../database/transaction.js';
import { TransactionType, TransactionStatus } from '../../generated/prisma/enums.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export async function paystackWebhook(req: Request, res: Response) {
    // req.body is a raw Buffer here — see webhooks.routes.ts, which uses express.raw()
    // instead of express.json() so the signature can be verified over the exact bytes sent.
    const rawBody = req.body as Buffer;

    // 1. Verify webhook signature over the raw request body
    const hash = crypto.createHmac('sha512', env.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
        return res.status(401).json({ message: 'Invalid signature' });
    }

    // 2. Acknowledge immediately (Paystack needs 200 fast)
    res.status(200).json({ message: 'Webhook received' });

    // 3. Process event asynchronously
    const event = JSON.parse(rawBody.toString('utf8'));

    if (event.event !== 'charge.success') return;

    const { reference, amount, metadata } = event.data;
    // amount from Paystack is in kobo — convert to naira
    const amountNaira = amount / 100;
    const userId = metadata?.userId;

    if (!userId) {
        logger.error({ reference }, '[paystackWebhook] No userId in metadata');
        return;
    }

    try {
        // 4. Idempotency check — prevent double crediting (reference is also @unique in the DB
        // as a second line of defense against a race between concurrent webhook deliveries)
        const existing = await prisma.transaction.findUnique({ where: { reference } });
        if (existing) {
            logger.info({ reference }, '[paystackWebhook] Already processed');
            return;
        }

        // 5. Credit wallet
        const wallet = await prisma.wallet.findUnique({ where: { userId } });
        if (!wallet) {
            logger.error({ userId }, '[paystackWebhook] Wallet not found for user');
            return;
        }

        await withTransaction(async (tx) => {
            const lockedWallet = await tx.wallet.findUnique({ where: { id: wallet.id } });
            if (!lockedWallet) throw new Error('Wallet not found');

            let updatedWallet;
            try {
                // Optimistic lock: fails (throws) if version no longer matches what we just read.
                updatedWallet = await tx.wallet.update({
                    where: { id: lockedWallet.id, version: lockedWallet.version },
                    data: { balance: { increment: amountNaira }, version: { increment: 1 } },
                });
            } catch {
                throw new Error('Wallet was modified concurrently. Please try again.');
            }

            await tx.transaction.create({
                data: {
                    userId,
                    walletId: lockedWallet.id,
                    type: TransactionType.DEPOSIT,
                    amount: amountNaira,
                    totalAmount: amountNaira,
                    balanceSnapshot: Number(updatedWallet.balance),
                    reference,
                    description: 'Wallet funding via Paystack',
                    status: TransactionStatus.SUCCESS,
                    metadata: event.data,
                },
            });
        });

        logger.info({ userId, amount: amountNaira }, '[paystackWebhook] Wallet credited');
    } catch (error) {
        logger.error({ error, reference }, '[paystackWebhook] Error processing webhook');
    }
}
