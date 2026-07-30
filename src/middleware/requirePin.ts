import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../database/prisma.js';

export async function requirePin(req: Request, res: Response, next: NextFunction) {
    try {
        const { transactionPin } = req.body;
        const userId = req.user!.id;

        if (!transactionPin) {
            return res.status(400).json({
                success: false,
                message: 'Transaction PIN is required',
                code: 'PIN_REQUIRED',
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { transactionPin: true },
        });

        if (!user?.transactionPin) {
            return res.status(400).json({
                success: false,
                message: 'Please set a transaction PIN first',
                code: 'PIN_NOT_SET',
            });
        }

        const isValid = await bcrypt.compare(transactionPin, user.transactionPin);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: 'Incorrect transaction PIN',
                code: 'PIN_INCORRECT',
            });
        }

        next();
    } catch (error) {
        next(error);
    }
}
