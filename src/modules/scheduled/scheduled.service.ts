import { prisma } from "../../database/prisma.js";
import { calculateNextRun } from "../../lib/schedule.js";

export async function getScheduledTopUps(userId: string) {
  return prisma.scheduledTopUp.findMany({
    where: { userId, status: { not: "cancelled" } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createScheduledTopUp(
  userId: string,
  payload: {
    type: string;
    phoneNumber: string;
    network: string;
    amount: number;
    planId?: string;
    frequency: string;
    scheduledTime: string;
    scheduledDay?: number;
  }
) {
  const nextRunAt = calculateNextRun(
    payload.frequency,
    payload.scheduledTime,
    payload.scheduledDay
  );

  const schedule = await prisma.scheduledTopUp.create({
    data: { ...payload, userId, nextRunAt },
  });

  // TODO: Add BullMQ queue when Redis is upgraded to 5.0+
  // await scheduledTopUpQueue.add(
  //   "scheduled-topup",
  //   { scheduleId: schedule.id },
  //   { delay: nextRunAt.getTime() - Date.now(), jobId: schedule.id }
  // );

  return schedule;
}

export async function updateScheduledTopUp(
  id: string,
  userId: string,
  updates: Record<string, unknown>
) {
  return prisma.scheduledTopUp.update({
    where: { id, userId },
    data: updates,
  });
}

export async function cancelScheduledTopUp(id: string, userId: string) {
  // TODO: Remove from BullMQ queue when Redis is upgraded to 5.0+
  // await scheduledTopUpQueue.remove(id);
  return prisma.scheduledTopUp.update({
    where: { id, userId },
    data: { status: "cancelled" },
  });
}
