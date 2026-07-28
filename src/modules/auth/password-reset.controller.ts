import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../database/prisma.js';
import { sendPasswordResetEmail } from '../../lib/email.js';

// POST /api/v1/auth/forgot-password
export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

        const user = await prisma.user.findUnique({ where: { email } });

        // Always return success even if user not found (security best practice)
        if (!user) {
            return res.status(200).json({ success: true, message: 'If that email exists, a reset link has been sent' });
        }

        // Generate secure token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordResetToken: resetToken,
                passwordResetExpiry: resetExpiry,
            },
        });

        await sendPasswordResetEmail(user.email, resetToken);

        res.status(200).json({ success: true, message: 'If that email exists, a reset link has been sent' });
    } catch (error) {
        next(error);
    }
}

// POST /api/v1/auth/reset-password
export async function resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ success: false, message: 'Token and password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }

        const user = await prisma.user.findFirst({
            where: {
                passwordResetToken: token,
                passwordResetExpiry: { gt: new Date() },
            },
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset link' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash: hashedPassword,
                passwordResetToken: null,
                passwordResetExpiry: null,
            },
        });

        res.status(200).json({ success: true, message: 'Password reset successful. You can now log in.' });
    } catch (error) {
        next(error);
    }
}
