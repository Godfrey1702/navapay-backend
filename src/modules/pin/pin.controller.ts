import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../database/prisma.js';
import { sendPinResetEmail } from '../../lib/email.js';

// POST /api/v1/pin/set
// Sets PIN for first time OR after reset
export async function setPin(req: Request, res: Response, next: NextFunction) {
    try {
        const { pin } = req.body;
        const userId = req.user!.id;

        if (!pin || !/^\d{4}$/.test(pin)) {
            return res.status(400).json({
                success: false,
                message: 'PIN must be exactly 4 digits',
            });
        }

        const hashedPin = await bcrypt.hash(pin, 12);

        await prisma.user.update({
            where: { id: userId },
            data: { transactionPin: hashedPin },
        });

        res.status(200).json({
            success: true,
            message: 'Transaction PIN set successfully',
        });
    } catch (error) {
        next(error);
    }
}

// POST /api/v1/pin/verify
// Verifies PIN before a transaction — returns 200 if correct, 401 if wrong
export async function verifyPin(req: Request, res: Response, next: NextFunction) {
    try {
        const { pin } = req.body;
        const userId = req.user!.id;

        if (!pin || !/^\d{4}$/.test(pin)) {
            return res.status(400).json({
                success: false,
                message: 'PIN must be exactly 4 digits',
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { transactionPin: true },
        });

        if (!user?.transactionPin) {
            return res.status(400).json({
                success: false,
                message: 'No PIN set',
                code: 'PIN_NOT_SET',
            });
        }

        const isValid = await bcrypt.compare(pin, user.transactionPin);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: 'Incorrect PIN',
                code: 'PIN_INCORRECT',
            });
        }

        res.status(200).json({ success: true, message: 'PIN verified' });
    } catch (error) {
        next(error);
    }
}

// GET /api/v1/pin/status
// Returns whether user has set a PIN — frontend uses this to decide whether to show set-PIN or enter-PIN flow
export async function getPinStatus(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { transactionPin: true },
        });

        res.status(200).json({
            success: true,
            data: { hasPin: !!user?.transactionPin },
        });
    } catch (error) {
        next(error);
    }
}

// POST /api/v1/pin/forgot
// Sends PIN reset email
export async function forgotPin(req: Request, res: Response, next: NextFunction) {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(200).json({
                success: true,
                message: 'If that email exists, a PIN reset link has been sent',
            });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await prisma.user.update({
            where: { id: user.id },
            data: {
                transactionPinResetToken: resetToken,
                transactionPinResetExpiry: resetExpiry,
            },
        });

        await sendPinResetEmail(user.email, resetToken);

        res.status(200).json({
            success: true,
            message: 'If that email exists, a PIN reset link has been sent',
        });
    } catch (error) {
        next(error);
    }
}

// POST /api/v1/pin/reset
// Resets PIN using token from email
export async function resetPin(req: Request, res: Response, next: NextFunction) {
    try {
        const { token, pin } = req.body;

        if (!token || !pin || !/^\d{4}$/.test(pin)) {
            return res.status(400).json({
                success: false,
                message: 'Valid token and 4-digit PIN are required',
            });
        }

        const user = await prisma.user.findFirst({
            where: {
                transactionPinResetToken: token,
                transactionPinResetExpiry: { gt: new Date() },
            },
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset link',
            });
        }

        const hashedPin = await bcrypt.hash(pin, 12);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                transactionPin: hashedPin,
                transactionPinResetToken: null,
                transactionPinResetExpiry: null,
            },
        });

        res.status(200).json({
            success: true,
            message: 'Transaction PIN reset successfully',
        });
    } catch (error) {
        next(error);
    }
}
