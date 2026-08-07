import { prisma } from '../database/prisma.js';
import { logger } from '../utils/logger.js';
import * as clubkonnect from '../providers/clubkonnect.js';
import { computeNextRunAt } from '../modules/schedules/schedules.service.js';
import { sendNotification } from '../lib/notifications.js';
import type { ScheduledTopUp } from '../generated/prisma/client.js';
import type { Frequency } from '../modules/schedules/schedules.schema.js';

const POLL_INTERVAL_MS = 60_000;
const REMINDER_POLL_INTERVAL_MS = 5 * 60_000;
const FAILURE_BACKOFF_MS = 5 * 60_000;

let intervalHandle: NodeJS.Timeout | null = null;
let reminderIntervalHandle: NodeJS.Timeout | null = null;

async function rescheduleAfterFailure(scheduleId: string): Promise<void> {
    await prisma.scheduledTopUp.update({
        where: { id: scheduleId },
        data: { nextRunAt: new Date(Date.now() + FAILURE_BACKOFF_MS), reminderSentAt: null },
    });
}

async function executeSchedule(schedule: ScheduledTopUp): Promise<void> {
    const wallet = await prisma.wallet.findUnique({ where: { userId: schedule.userId } });
    if (!wallet || Number(wallet.balance) < Number(schedule.amount)) {
        logger.warn({ scheduleId: schedule.id }, 'Skipping scheduled top-up: insufficient wallet balance');
        await sendNotification(
            schedule.userId,
            'SCHEDULE_FAILED',
            'Scheduled top-up failed ⚠️',
            `Your wallet balance is too low to complete the scheduled top-up for ${schedule.phoneNumber}. Please fund your wallet.`,
            { scheduleId: schedule.id, amount: schedule.amount, phoneNumber: schedule.phoneNumber },
        );
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
        await sendNotification(
            schedule.userId,
            'SCHEDULE_FAILED',
            'Scheduled top-up failed ⚠️',
            `We couldn't complete your scheduled top-up for ${schedule.phoneNumber}. We'll retry shortly.`,
            { scheduleId: schedule.id, error: error instanceof Error ? error.message : String(error) },
        );
        await rescheduleAfterFailure(schedule.id);
        return;
    }

    await prisma.$transaction(async (tx) => {
        const lockedWallet = await tx.wallet.findUnique({ where: { id: wallet.id } });
        if (!lockedWallet || Number(lockedWallet.balance) < Number(schedule.amount)) {
            throw new Error('Insufficient balance');
        }

        let updatedWallet;
        try {
            // Optimistic lock: fails (throws) if version no longer matches what we just read.
            updatedWallet = await tx.wallet.update({
                where: { id: lockedWallet.id, version: lockedWallet.version },
                data: { balance: { decrement: schedule.amount }, version: { increment: 1 } },
            });
        } catch {
            throw new Error('Wallet was modified concurrently. Please try again.');
        }

        await tx.transaction.create({
            data: {
                userId: schedule.userId,
                walletId: lockedWallet.id,
                type: 'PURCHASE',
                amount: schedule.amount,
                totalAmount: schedule.amount,
                balanceSnapshot: Number(updatedWallet.balance),
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
                data: {
                    lastRunAt: now,
                    status: 'COMPLETED',
                    nextRunAt: null,
                    executionCount: { increment: 1 },
                },
            });
        } else {
            const updatedCount = schedule.executionCount + 1;
            const nextRunAt = computeNextRunAt(schedule.frequency as Frequency, schedule.timeOfDay, {
                dayOfWeek: schedule.dayOfWeek,
                dayOfMonth: schedule.dayOfMonth,
            });

            if (schedule.maxExecutions && updatedCount >= schedule.maxExecutions) {
                await tx.scheduledTopUp.update({
                    where: { id: schedule.id },
                    data: { status: 'COMPLETED', executionCount: updatedCount, lastRunAt: now },
                });
                logger.info({ scheduleId: schedule.id }, 'Schedule completed — max executions reached');
            } else if (schedule.endDate && nextRunAt > schedule.endDate) {
                await tx.scheduledTopUp.update({
                    where: { id: schedule.id },
                    data: { status: 'COMPLETED', executionCount: updatedCount, lastRunAt: now },
                });
                logger.info({ scheduleId: schedule.id }, 'Schedule completed — end date reached');
            } else {
                await tx.scheduledTopUp.update({
                    where: { id: schedule.id },
                    data: { executionCount: updatedCount, lastRunAt: now, nextRunAt, reminderSentAt: null },
                });
            }
        }
    });

    logger.info({ scheduleId: schedule.id }, 'Scheduled top-up executed successfully');

    await sendNotification(
        schedule.userId,
        'SCHEDULE_SUCCESS',
        'Top-up successful ✅',
        `${schedule.serviceType === 'DATA' ? planName : `₦${schedule.amount}`} sent to ${schedule.phoneNumber}`,
        { scheduleId: schedule.id, amount: schedule.amount, phoneNumber: schedule.phoneNumber },
    );
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

async function checkUpcomingSchedules(): Promise<void> {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60_000);
    const sixtyFiveMinFromNow = new Date(now.getTime() + 65 * 60_000);

    const upcoming = await prisma.scheduledTopUp.findMany({
        where: {
            status: 'ACTIVE',
            nextRunAt: { gte: oneHourFromNow, lte: sixtyFiveMinFromNow },
            reminderSentAt: null,
        },
    });

    for (const schedule of upcoming) {
        try {
            await sendNotification(
                schedule.userId,
                'SCHEDULE_REMINDER',
                'Upcoming top-up reminder ⏰',
                `Your scheduled top-up for ${schedule.phoneNumber} will run in about 1 hour.`,
                { scheduleId: schedule.id },
            );

            await prisma.scheduledTopUp.update({
                where: { id: schedule.id },
                data: { reminderSentAt: new Date() },
            });
        } catch (error) {
            logger.error({ scheduleId: schedule.id, error }, 'Unexpected error sending schedule reminder');
        }
    }
}

export function startScheduleRunner(): void {
    if (intervalHandle) return;

    logger.info({ intervalMs: POLL_INTERVAL_MS }, 'Starting scheduled top-up runner (DB polling)');

    intervalHandle = setInterval(() => {
        runDueSchedules().catch((error) => logger.error({ error }, 'Schedule runner tick failed'));
    }, POLL_INTERVAL_MS);

    reminderIntervalHandle = setInterval(() => {
        checkUpcomingSchedules().catch((error) => logger.error({ error }, 'Schedule reminder tick failed'));
    }, REMINDER_POLL_INTERVAL_MS);

    runDueSchedules().catch((error) => logger.error({ error }, 'Initial schedule runner tick failed'));
    checkUpcomingSchedules().catch((error) => logger.error({ error }, 'Initial schedule reminder tick failed'));
}

export function stopScheduleRunner(): void {
    if (intervalHandle) {
        clearInterval(intervalHandle);
        intervalHandle = null;
    }
    if (reminderIntervalHandle) {
        clearInterval(reminderIntervalHandle);
        reminderIntervalHandle = null;
    }
}
