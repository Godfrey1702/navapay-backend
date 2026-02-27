import { prisma } from '../../database/prisma.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';

export async function listSchedules(userId: string) {
  return prisma.scheduledTopUp.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

export async function getSchedule(userId: string, id: string) {
  const schedule = await prisma.scheduledTopUp.findUnique({ where: { id } });
  if (!schedule || schedule.userId !== userId) throw new NotFoundError('Schedule not found');
  return schedule;
}

export async function createSchedule(userId: string, input: any) {
  // Basic business checks
  if (input.amount <= 0) throw new BadRequestError('Amount must be > 0');

  const data = await prisma.scheduledTopUp.create({
    data: {
      userId,
      phoneNumber: input.phone_number,
      phoneNumberId: input.phone_number_id || null,
      type: input.type,
      network: input.network,
      amount: input.amount,
      planId: input.plan_id || null,
      scheduleType: input.schedule_type,
      scheduledAt: input.scheduled_at ? new Date(input.scheduled_at) : null,
      recurringTime: input.recurring_time || null,
      recurringDayOfWeek: input.recurring_day_of_week ?? null,
      recurringDayOfMonth: input.recurring_day_of_month ?? null,
      maxExecutions: input.max_executions ?? null,
      totalExecutions: 0,
      status: 'active',
      nextExecutionAt: input.scheduled_at ? new Date(input.scheduled_at) : null,
    },
  });

  return data;
}

export async function updateSchedule(userId: string, id: string, updates: any) {
  const schedule = await prisma.scheduledTopUp.findUnique({ where: { id } });
  if (!schedule || schedule.userId !== userId) throw new NotFoundError('Schedule not found');

  const payload: any = {};
  if (updates.status) payload.status = updates.status;
  if (updates.amount) payload.amount = updates.amount;
  if (updates.network) payload.network = updates.network;
  if (updates.plan_id !== undefined) payload.planId = updates.plan_id;
  if (updates.schedule_type) payload.scheduleType = updates.schedule_type;
  if (updates.scheduled_at) payload.scheduledAt = new Date(updates.scheduled_at);
  if (updates.recurring_time) payload.recurringTime = updates.recurring_time;
  if (updates.recurring_day_of_week !== undefined) payload.recurringDayOfWeek = updates.recurring_day_of_week;
  if (updates.recurring_day_of_month !== undefined) payload.recurringDayOfMonth = updates.recurring_day_of_month;
  if (updates.max_executions !== undefined) payload.maxExecutions = updates.max_executions;

  const updated = await prisma.scheduledTopUp.update({ where: { id }, data: payload });
  return updated;
}

export async function deleteSchedule(userId: string, id: string) {
  const schedule = await prisma.scheduledTopUp.findUnique({ where: { id } });
  if (!schedule || schedule.userId !== userId) throw new NotFoundError('Schedule not found');

  await prisma.scheduledTopUp.delete({ where: { id } });
  return { success: true };
}
