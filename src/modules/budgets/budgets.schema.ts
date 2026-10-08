import { z } from 'zod';

export const setBudgetSchema = {
    body: z.object({
        amountLimit: z.number().positive('Budget limit must be greater than zero'),
        month: z.number().int().min(1).max(12),
        year: z.number().int().min(2024),
        alertThresholdPercent: z.number().int().min(1).max(100).optional(),
    }),
};

export type SetBudgetInput = z.infer<typeof setBudgetSchema.body>;
