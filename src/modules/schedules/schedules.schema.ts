import { z } from 'zod';

const SERVICE_TYPES = ['AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE'] as const;
const FREQUENCIES = ['ONCE', 'DAILY', 'WEEKLY', 'MONTHLY'] as const;
const DAYS_OF_WEEK = [
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
] as const;
const TIME_OF_DAY_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const SCHEDULED_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const createScheduleSchema = {
    body: z
        .object({
            serviceType: z.enum(SERVICE_TYPES),
            phoneNumber: z.string().min(10),
            network: z.string().min(1),
            planId: z.string().optional(),
            amount: z.number().positive(),
            frequency: z.enum(FREQUENCIES),
            dayOfWeek: z.enum(DAYS_OF_WEEK).optional(),
            dayOfMonth: z.number().int().min(1).max(28).optional(),
            timeOfDay: z.string().regex(TIME_OF_DAY_REGEX, 'timeOfDay must be in HH:mm format'),
            scheduledDate: z
                .string()
                .regex(SCHEDULED_DATE_REGEX, 'scheduledDate must be in YYYY-MM-DD format')
                .optional(),
            label: z.string().optional(),
            maxExecutions: z.number().int().positive().optional(),
            endDate: z
                .string()
                .refine((val) => !isNaN(Date.parse(val)), 'endDate must be a valid date')
                .optional(),
        })
        .refine((data) => data.serviceType !== 'DATA' || !!data.planId, {
            message: 'planId is required when serviceType is DATA',
            path: ['planId'],
        })
        .refine((data) => data.frequency !== 'ONCE' || !!data.scheduledDate, {
            message: 'scheduledDate is required when frequency is ONCE',
            path: ['scheduledDate'],
        })
        .refine((data) => data.frequency !== 'WEEKLY' || !!data.dayOfWeek, {
            message: 'dayOfWeek is required when frequency is WEEKLY',
            path: ['dayOfWeek'],
        })
        .refine((data) => data.frequency !== 'MONTHLY' || !!data.dayOfMonth, {
            message: 'dayOfMonth is required when frequency is MONTHLY',
            path: ['dayOfMonth'],
        }),
};

export const updateScheduleSchema = {
    body: z.object({
        status: z.enum(['ACTIVE', 'PAUSED', 'CANCELLED', 'COMPLETED']).optional(),
        amount: z.number().positive().optional(),
        frequency: z.enum(FREQUENCIES).optional(),
        timeOfDay: z.string().regex(TIME_OF_DAY_REGEX, 'timeOfDay must be in HH:mm format').optional(),
        dayOfWeek: z.enum(DAYS_OF_WEEK).optional(),
        dayOfMonth: z.number().int().min(1).max(28).optional(),
        scheduledDate: z
            .string()
            .regex(SCHEDULED_DATE_REGEX, 'scheduledDate must be in YYYY-MM-DD format')
            .optional(),
        label: z.string().optional(),
    }),
};

export type ServiceType = (typeof SERVICE_TYPES)[number];
export type Frequency = (typeof FREQUENCIES)[number];
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];
export type CreateScheduleInput = z.infer<typeof createScheduleSchema.body>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema.body>;
