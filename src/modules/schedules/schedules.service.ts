import { prisma } from '../../database/prisma.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import type { CreateScheduleInput, UpdateScheduleInput, Frequency, DayOfWeek } from './schedules.schema.js';

const DAY_OF_WEEK_INDEX: Record<DayOfWeek, number> = {
    SUNDAY: 0,
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
};

interface NextRunOptions {
    dayOfWeek?: string | null;
    dayOfMonth?: number | null;
    scheduledDate?: string;
}

/**
 * ONCE fires on scheduledDate at timeOfDay; DAILY/WEEKLY/MONTHLY compute the next
 * upcoming occurrence from "now" (used both at creation and after a run advances the schedule).
 */
export function computeNextRunAt(frequency: Frequency, timeOfDay: string, options: NextRunOptions = {}): Date {
    const [hours, minutes] = timeOfDay.split(':').map(Number);
    const now = new Date();

    if (frequency === 'ONCE') {
        if (!options.scheduledDate) {
            throw new BadRequestError('scheduledDate is required for ONCE frequency');
        }
        const [year, month, day] = options.scheduledDate.split('-').map(Number);
        return new Date(year, month - 1, day, hours, minutes, 0, 0);
    }

    if (frequency === 'DAILY') {
        const next = new Date(now);
        next.setHours(hours, minutes, 0, 0);
        if (next <= now) next.setDate(next.getDate() + 1);
        return next;
    }

    if (frequency === 'WEEKLY') {
        const targetDay = DAY_OF_WEEK_INDEX[(options.dayOfWeek as DayOfWeek) ?? 'MONDAY'];
        const next = new Date(now);
        next.setHours(hours, minutes, 0, 0);
        let diff = (targetDay - now.getDay() + 7) % 7;
        if (diff === 0 && next <= now) diff = 7;
        next.setDate(now.getDate() + diff);
        return next;
    }

    // MONTHLY
    const day = options.dayOfMonth ?? 1;
    const next = new Date(now.getFullYear(), now.getMonth(), day, hours, minutes, 0, 0);
    if (next <= now) {
        next.setMonth(next.getMonth() + 1);
        next.setDate(day);
    }
    return next;
}

export async function listSchedules(userId: string) {
    return prisma.scheduledTopUp.findMany({
        where: { userId, status: { not: 'CANCELLED' } },
        orderBy: { createdAt: 'desc' },
    });
}

export async function createSchedule(userId: string, payload: CreateScheduleInput) {
    const nextRunAt = computeNextRunAt(payload.frequency as Frequency, payload.timeOfDay, {
        dayOfWeek: payload.dayOfWeek,
        dayOfMonth: payload.dayOfMonth,
        scheduledDate: payload.scheduledDate,
    });

    return prisma.scheduledTopUp.create({
        data: {
            userId,
            serviceType: payload.serviceType,
            phoneNumber: payload.phoneNumber,
            network: payload.network,
            planId: payload.planId,
            amount: payload.amount,
            frequency: payload.frequency,
            dayOfWeek: payload.dayOfWeek,
            dayOfMonth: payload.dayOfMonth,
            timeOfDay: payload.timeOfDay,
            label: payload.label,
            maxExecutions: payload.maxExecutions ?? null,
            endDate: payload.endDate ? new Date(payload.endDate) : null,
            nextRunAt,
        },
    });
}

export async function getScheduleById(userId: string, id: string) {
    const schedule = await prisma.scheduledTopUp.findUnique({ where: { id } });
    if (!schedule || schedule.userId !== userId) throw new NotFoundError('Schedule not found');
    return schedule;
}

export async function updateSchedule(userId: string, id: string, payload: UpdateScheduleInput) {
    const schedule = await getScheduleById(userId, id);

    const changesTiming =
        payload.frequency !== undefined ||
        payload.timeOfDay !== undefined ||
        payload.dayOfWeek !== undefined ||
        payload.dayOfMonth !== undefined ||
        payload.scheduledDate !== undefined;

    const { scheduledDate, ...rest } = payload;

    const nextRunAt = changesTiming
        ? computeNextRunAt((payload.frequency ?? schedule.frequency) as Frequency, payload.timeOfDay ?? schedule.timeOfDay, {
              dayOfWeek: payload.dayOfWeek ?? schedule.dayOfWeek,
              dayOfMonth: payload.dayOfMonth ?? schedule.dayOfMonth,
              scheduledDate,
          })
        : undefined;

    return prisma.scheduledTopUp.update({
        where: { id },
        data: {
            ...rest,
            ...(nextRunAt ? { nextRunAt, reminderSentAt: null } : {}),
        },
    });
}

export async function deleteSchedule(userId: string, id: string) {
    await getScheduleById(userId, id);
    return prisma.scheduledTopUp.update({ where: { id }, data: { status: 'CANCELLED' } });
}
