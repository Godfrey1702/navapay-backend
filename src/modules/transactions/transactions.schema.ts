import { z } from 'zod';
import { ServiceCategory } from '../../generated/prisma/enums.js';

export const createDepositSchema = {
    body: z.object({
        amount: z.number().positive('Amount must be greater than zero'),
        description: z.string().optional(),
    }),
};

export const createPurchaseSchema = {
    body: z.object({
        amount: z.number().positive('Amount must be greater than zero'),
        category: z.nativeEnum(ServiceCategory),
        provider: z.string().min(1, 'Provider is required'),
        phoneNumber: z.string().min(1, 'Target phone number is required'),
        description: z.string().optional(),
        metadata: z.record(z.string(), z.any()).optional(),
    }),
};

export type CreateDepositInput = z.infer<typeof createDepositSchema.body>;
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema.body>;
