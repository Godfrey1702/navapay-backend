import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../database/prisma.js';
import { withTransaction } from '../../database/transaction.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, TokenPayload } from '../../services/jwt.js';
import { AppError, ConflictError, UnauthorizedError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { LoginInput, RegisterInput } from './auth.schema.js';
import { sendVerificationEmail } from '../../lib/email.js';

const SALT_ROUNDS = 10;
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Register a new user and create their wallet transactionally.
 * The account starts unverified — no tokens are issued here. The user must
 * verify their email (see email-verification.controller.ts) before they can
 * log in; see the isEmailVerified check in login() below.
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
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

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
                emailVerificationToken: verificationToken,
                emailVerificationExpiry: verificationExpiry,
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

    // Don't await, don't fail registration if the email fails to send.
    sendVerificationEmail(user.email, verificationToken).catch((err: unknown) =>
        logger.error({ err, userId: user.id }, 'Failed to send verification email'),
    );

    return {
        user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
        },
    };
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

    if (!user.isEmailVerified) {
        throw new AppError('Please verify your email before logging in.', 403, 'EMAIL_NOT_VERIFIED');
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
