import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../../database/prisma.js';
import { sendVerificationEmail } from '../../lib/email.js';

// GET /api/v1/auth/verify-email?token=xxx
export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
        const { token } = req.query;
        if (!token || typeof token !== 'string') {
            return res.status(400).json({ success: false, message: 'Invalid verification link' });
        }

        const user = await prisma.user.findFirst({
            where: {
                emailVerificationToken: token,
                emailVerificationExpiry: { gt: new Date() },
            },
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification link',
            });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                isEmailVerified: true,
                emailVerificationToken: null,
                emailVerificationExpiry: null,
            },
        });

        res.status(200).json({
            success: true,
            message: 'Email verified successfully. You can now log in.',
        });
    } catch (error) {
        next(error);
    }
}

// POST /api/v1/auth/resend-verification
export async function resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const user = await prisma.user.findUnique({ where: { email } });

        // Always return success for security
        if (!user || user.isEmailVerified) {
            return res.status(200).json({
                success: true,
                message: 'If that email exists and is unverified, a new link has been sent',
            });
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerificationToken: verificationToken,
                emailVerificationExpiry: verificationExpiry,
            },
        });

        await sendVerificationEmail(user.email, verificationToken);

        res.status(200).json({
            success: true,
            message: 'If that email exists and is unverified, a new link has been sent',
        });
    } catch (error) {
        next(error);
    }
}
