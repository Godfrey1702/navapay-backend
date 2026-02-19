import { prisma } from '../../database/prisma.js';
import { NotFoundError } from '../../utils/errors.js';

export async function getUserById(id: string) {
    const user = await prisma.user.findUnique({
        where: { id },
        include: {
            wallet: {
                select: {
                    balance: true,
                    currency: true,
                    status: true,
                },
            },
        },
    });

    if (!user) throw new NotFoundError('User not found');

    // Remove sensitive info
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
}
