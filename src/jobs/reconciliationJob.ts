import { prisma } from '../database/prisma.js';
import { reconcileWallet } from '../lib/ledger.js';
import { logger } from '../utils/logger.js';

export async function runReconciliation() {
    try {
        const wallets = await prisma.wallet.findMany({
            select: { id: true, userId: true },
        });

        let discrepancies = 0;

        for (const wallet of wallets) {
            const result = await reconcileWallet(wallet.id);
            if (result.hasDiscrepancy) {
                discrepancies++;
                logger.warn(
                    { walletId: wallet.id, userId: wallet.userId, ...result },
                    'Wallet discrepancy detected',
                );
            }
        }

        logger.info({ totalWallets: wallets.length, discrepancies }, 'Reconciliation complete');
    } catch (error) {
        logger.error({ error }, 'Reconciliation job failed');
    }
}
