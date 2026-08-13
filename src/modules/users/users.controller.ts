import { Request, Response, NextFunction } from 'express';
import * as userService from './users.service.js';
import { sendSuccess } from '../../utils/response.js';
import { UnauthorizedError } from '../../utils/errors.js';
import { sanitizeUser } from '../../utils/sanitize.js';
import { prisma } from '../../database/prisma.js';

export async function getMe(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) throw new UnauthorizedError('User not authenticated');

        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                createdAt: true,
            },
        });
        res.json({ success: true, data: user ? sanitizeUser(user) : user });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
}

export async function getPhoneNumbers(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) throw new UnauthorizedError('User not authenticated');

        const data = await prisma.phoneNumber.findMany({
            where: { userId: req.user!.id },
            orderBy: { createdAt: "asc" },
        });
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
}

export async function addPhoneNumber(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) throw new UnauthorizedError('User not authenticated');

        const {
            phoneNumber: phoneNumberCamel,
            phone_number,
            network,
            network_provider,
            label,
            isDefault,
        } = req.body;

        const phoneNumber = phoneNumberCamel || phone_number;
        const resolvedNetwork = network || network_provider;

        const data = await prisma.phoneNumber.create({
            data: {
                userId: req.user!.id,
                phoneNumber,
                network: resolvedNetwork,
                label: label || null,
                isDefault: isDefault || false,
                isVerified: false,
            },
        });
        res.status(201).json({ success: true, data });
    } catch (err: any) {
        console.error("Phone number error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
}

export async function updateMe(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) throw new UnauthorizedError('User not authenticated');

        const { fullName, email } = req.body;
        const user = await prisma.user.update({
            where: { id: req.user!.id },
            data: {
                ...(fullName && { fullName }),
                ...(email && { email }),
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                createdAt: true,
            },
        });
        res.json({ success: true, data: sanitizeUser(user) });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
}

export async function deletePhoneNumber(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) throw new UnauthorizedError('User not authenticated');

        const phoneNumberId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await prisma.phoneNumber.delete({
            where: { id: phoneNumberId, userId: req.user!.id },
        });
        res.json({ success: true, data: { message: "Phone number deleted" } });
    } catch (error) {
        next(error);
    }
}
