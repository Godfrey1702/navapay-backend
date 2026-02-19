import { prisma } from '../../database/prisma.js';
import { NotFoundError } from '../../utils/errors.js';

/**
 * Get a user's wallet details.
 */
export async function getWalletByUserId(userId: string) {
    const wallet = await prisma.wallet.findUnique({
        where: { userId },
    });

    if (!wallet) {
        throw new NotFoundError('Wallet not found');
    }

    return wallet;
}
