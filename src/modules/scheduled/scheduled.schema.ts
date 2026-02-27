import { z } from 'zod';

export const createScheduleSchema = {
  body: z.object({
    type: z.enum(['airtime', 'data']),
    network: z.string().min(1),
    amount: z.number().positive(),
    plan_id: z.string().optional(),
    schedule_type: z.enum(['one_time', 'daily', 'weekly', 'monthly']),
    scheduled_at: z.string().optional(),
    recurring_time: z.string().optional(),
    recurring_day_of_week: z.number().int().min(0).max(6).optional(),
    recurring_day_of_month: z.number().int().min(1).max(31).optional(),
    max_executions: z.number().int().positive().optional(),
    phone_number: z.string().min(1),
  }),
};

export const updateScheduleSchema = {
  body: z.object({
    status: z.enum(['active', 'paused', 'cancelled', 'completed']).optional(),
    amount: z.number().positive().optional(),
    network: z.string().optional(),
    plan_id: z.string().optional(),
    schedule_type: z.enum(['one_time', 'daily', 'weekly', 'monthly']).optional(),
    scheduled_at: z.string().optional(),
    recurring_time: z.string().optional(),
    recurring_day_of_week: z.number().int().min(0).max(6).optional(),
    recurring_day_of_month: z.number().int().min(1).max(31).optional(),
    max_executions: z.number().int().positive().optional(),
  }),
};
