import bcrypt from 'bcryptjs';
import { prisma } from '../../database/prisma.js';
import { withTransaction } from '../../database/transaction.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, TokenPayload } from '../../services/jwt.js';
import { ConflictError, UnauthorizedError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { LoginInput, RegisterInput } from './auth.schema.js';

const SALT_ROUNDS = 10;

/**
 * Register a new user and create their wallet transactionally.
 */
export async function register(input: RegisterInput) {
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [{ email: input.email }, { phoneNumber: input.phoneNumber }],
        },
    });

    if (existingUser) {
        throw new ConflictError('User already exists');
    }

    const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

    // Transactionally Create User & Wallet
    const user = await withTransaction(async (tx) => {
        // 1. Create User
        const newUser = await tx.user.create({
            data: {
                email: input.email,
                passwordHash: hashedPassword,
                fullName: input.fullName,
                phoneNumber: input.phoneNumber,
                role: 'USER',
                isActive: true,
            },
        });

        // 2. Create Wallet
        await tx.wallet.create({
            data: {
                userId: newUser.id,
                balance: 0.0,
                currency: 'NGN',
                status: 'ACTIVE',
            },
        });

        return newUser;
    });

    logger.info({ userId: user.id }, 'User registered successfully');

    return generateAuthResponse(user);
}

/**
 * Authenticate user and issue tokens.
 */
export async function login(input: LoginInput) {
    const user = await prisma.user.findUnique({
        where: { email: input.email },
    });

    if (!user || !user.isActive) {
        throw new UnauthorizedError('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);

    if (!isValidPassword) {
        throw new UnauthorizedError('Invalid credentials');
    }

    // Update last login timestamp asynchronously
    prisma.user
        .update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        })
        .catch((err: unknown) => logger.error({ err }, 'Failed to update last login'));

    return generateAuthResponse(user);
}

/**
 * Generate new access token using valid refresh token.
 */
export async function refreshAccessToken(refreshToken: string) {
    try {
        const payload = verifyRefreshToken(refreshToken);

        // Check if user still exists/active (optional security check)
        const user = await prisma.user.findUnique({ where: { id: payload.userId } });

        if (!user || !user.isActive) {
            throw new UnauthorizedError('User is no longer active');
        }

        // Issue NEW access token
        const newAccessToken = signAccessToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        return { accessToken: newAccessToken };
    } catch (error) {
        throw new UnauthorizedError('Invalid refresh token');
    }
}

/**
 * Helper to generate tokens and user object
 */
function generateAuthResponse(user: any) {
    const payload: TokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return {
        user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
        },
        tokens: {
            accessToken,
            refreshToken,
        },
    };
}
