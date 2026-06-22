import { z } from 'zod';

export const createScheduleSchema = {
  body: z.object({
    type: z.string().min(1),
    phoneNumber: z.string().min(1),
    network: z.string().min(1),
    amount: z.number().positive(),
    planId: z.string().optional(),
    frequency: z.string().min(1),
    scheduledTime: z.string().min(1),
    scheduledDay: z.number().int().min(1).max(31).optional(),
  }),
};

export const updateScheduleSchema = {
  body: z.object({
    amount: z.number().positive().optional(),
    phoneNumber: z.string().optional(),
    network: z.string().optional(),
    frequency: z.string().optional(),
    scheduledTime: z.string().optional(),
    scheduledDay: z.number().int().min(1).max(31).optional(),
    status: z.enum(['active', 'paused', 'cancelled']).optional(),
  }),
};

export type CreateScheduleInput = z.infer<typeof createScheduleSchema.body>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema.body>;
