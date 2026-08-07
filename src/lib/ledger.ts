import { prisma } from '../database/prisma.js';

// Compute true balance from the transaction ledger: deposits minus purchases.
export async function computeWalletBalance(walletId: string): Promise<number> {
    const deposits = await prisma.transaction.aggregate({
        where: { walletId, type: 'DEPOSIT', status: 'SUCCESS' },
        _sum: { amount: true },
    });

    const purchases = await prisma.transaction.aggregate({
        where: { walletId, type: 'PURCHASE', status: 'SUCCESS' },
        _sum: { amount: true },
    });

    const computed = Number(deposits._sum.amount ?? 0) - Number(purchases._sum.amount ?? 0);
    return Math.max(0, computed);
}

// Reconcile wallet balance against ledger — returns drift amount
export async function reconcileWallet(walletId: string): Promise<{
    storedBalance: number;
    computedBalance: number;
    drift: number;
    hasDiscrepancy: boolean;
}> {
    const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new Error('Wallet not found');

    const computedBalance = await computeWalletBalance(walletId);
    const storedBalance = Number(wallet.balance);
    const drift = storedBalance - computedBalance;

    return {
        storedBalance,
        computedBalance,
        drift,
        hasDiscrepancy: Math.abs(drift) > 0.01, // tolerance for floating point
    };
}
