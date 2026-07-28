import { prisma } from '../database/prisma.js';
import { logger } from '../utils/logger.js';
import * as clubkonnect from '../providers/clubkonnect.js';
import { computeNextRunAt } from '../modules/schedules/schedules.service.js';
import type { ScheduledTopUp } from '../generated/prisma/client.js';
import type { Frequency } from '../modules/schedules/schedules.schema.js';

const POLL_INTERVAL_MS = 60_000;
const FAILURE_BACKOFF_MS = 5 * 60_000;

let intervalHandle: NodeJS.Timeout | null = null;

async function rescheduleAfterFailure(scheduleId: string): Promise<void> {
    await prisma.scheduledTopUp.update({
        where: { id: scheduleId },
        data: { nextRunAt: new Date(Date.now() + FAILURE_BACKOFF_MS) },
    });
}

async function executeSchedule(schedule: ScheduledTopUp): Promise<void> {
    const wallet = await prisma.wallet.findUnique({ where: { userId: schedule.userId } });
    if (!wallet || Number(wallet.balance) < Number(schedule.amount)) {
        logger.warn({ scheduleId: schedule.id }, 'Skipping scheduled top-up: insufficient wallet balance');
        await rescheduleAfterFailure(schedule.id);
        return;
    }

    const requestId = `SCHED-${schedule.id}-${Date.now()}`;
    let providerResult: Awaited<ReturnType<typeof clubkonnect.purchaseAirtime>>;
    let planCode: string | undefined;
    let planName: string | undefined;

    try {
        if (schedule.serviceType === 'DATA') {
            if (!schedule.planId) throw new Error('Missing planId for DATA schedule');
            const plan = await prisma.dataPlan.findUnique({ where: { id: schedule.planId } });
            if (!plan) throw new Error(`Data plan ${schedule.planId} not found`);
            planCode = plan.code;
            planName = plan.name;
            providerResult = await clubkonnect.purchaseData(schedule.phoneNumber, planCode, schedule.network, requestId);
        } else if (schedule.serviceType === 'AIRTIME') {
            providerResult = await clubkonnect.purchaseAirtime(
                schedule.phoneNumber,
                Number(schedule.amount),
                schedule.network,
                requestId,
            );
        } else {
            throw new Error(`Unsupported serviceType for scheduled run: ${schedule.serviceType}`);
        }
    } catch (error) {
        logger.error({ scheduleId: schedule.id, error }, 'Scheduled top-up purchase failed');
        await rescheduleAfterFailure(schedule.id);
        return;
    }

    await prisma.$transaction(async (tx) => {
        await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: { decrement: schedule.amount } },
        });

        await tx.transaction.create({
            data: {
                userId: schedule.userId,
                walletId: wallet.id,
                type: 'PURCHASE',
                amount: schedule.amount,
                totalAmount: schedule.amount,
                balanceSnapshot: Number(wallet.balance) - Number(schedule.amount),
                reference: requestId,
                description:
                    schedule.serviceType === 'DATA'
                        ? `Scheduled data purchase - ${planName} - ${schedule.phoneNumber}`
                        : `Scheduled airtime purchase - ${schedule.phoneNumber}`,
                status: 'SUCCESS',
                metadata: {
                    phoneNumber: schedule.phoneNumber,
                    network: schedule.network,
                    planId: schedule.planId,
                    planCode,
                    scheduleId: schedule.id,
                    providerResponse: providerResult,
                },
            },
        });

        const now = new Date();
        if (schedule.frequency === 'ONCE') {
            await tx.scheduledTopUp.update({
                where: { id: schedule.id },
                data: { lastRunAt: now, status: 'COMPLETED', nextRunAt: null },
            });
        } else {
            const nextRunAt = computeNextRunAt(schedule.frequency as Frequency, schedule.timeOfDay, {
                dayOfWeek: schedule.dayOfWeek,
                dayOfMonth: schedule.dayOfMonth,
            });
            await tx.scheduledTopUp.update({
                where: { id: schedule.id },
                data: { lastRunAt: now, nextRunAt },
            });
        }
    });

    logger.info({ scheduleId: schedule.id }, 'Scheduled top-up executed successfully');
}

async function runDueSchedules(): Promise<void> {
    const due = await prisma.scheduledTopUp.findMany({
        where: { status: 'ACTIVE', nextRunAt: { lte: new Date() } },
    });

    for (const schedule of due) {
        try {
            await executeSchedule(schedule);
        } catch (error) {
            logger.error({ scheduleId: schedule.id, error }, 'Unexpected error running scheduled top-up');
        }
    }
}

export function startScheduleRunner(): void {
    if (intervalHandle) return;

    logger.info({ intervalMs: POLL_INTERVAL_MS }, 'Starting scheduled top-up runner (DB polling)');

    intervalHandle = setInterval(() => {
        runDueSchedules().catch((error) => logger.error({ error }, 'Schedule runner tick failed'));
    }, POLL_INTERVAL_MS);

    runDueSchedules().catch((error) => logger.error({ error }, 'Initial schedule runner tick failed'));
}

export function stopScheduleRunner(): void {
    if (intervalHandle) {
        clearInterval(intervalHandle);
        intervalHandle = null;
    }
}
