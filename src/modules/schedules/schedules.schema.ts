import { z } from 'zod';

export const createScheduleSchema = {
  body: z.object({
    amount: z.number().positive(),
    category: z.enum(['DATA', 'AIRTIME', 'CABLE_TV', 'ELECTRICITY', 'OTHER']),
    provider: z.string().min(1),
    phoneNumber: z.string().min(1),
    frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    pauseOnInsufficientFunds: z.boolean().optional(),
  }),
};

export const updateScheduleSchema = {
  body: z.object({
    amount: z.number().positive().optional(),
    provider: z.string().optional(),
    phoneNumber: z.string().optional(),
    frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    paused: z.boolean().optional(),
    active: z.boolean().optional(),
  }),
};

export type CreateScheduleInput = z.infer<typeof createScheduleSchema.body>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema.body>;
