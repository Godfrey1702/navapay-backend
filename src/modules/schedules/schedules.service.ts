import { prisma } from '../../database/prisma.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { CreateScheduleInput, UpdateScheduleInput } from './schedules.schema.js';

export async function createSchedule(userId: string, payload: CreateScheduleInput) {
  // compute nextRunAt = startDate or now
  const start = payload.startDate ? new Date(payload.startDate) : new Date();
  const schedule = await prisma.scheduledTopUp.create({
    data: {
      userId,
      amount: payload.amount,
      category: payload.category,
      provider: payload.provider,
      phoneNumber: payload.phoneNumber,
      frequency: payload.frequency,
      startDate: start,
      endDate: payload.endDate ? new Date(payload.endDate) : undefined,
      nextRunAt: start,
      retryPolicy: payload.pauseOnInsufficientFunds === undefined ? {} : { pauseOnInsufficientFunds: payload.pauseOnInsufficientFunds },
      pauseOnInsufficientFunds: payload.pauseOnInsufficientFunds ?? true,
    },
  });

  return schedule;
}

export async function listSchedules(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.scheduledTopUp.findMany({ where: { userId }, take: limit, skip, orderBy: { nextRunAt: 'asc' } }),
    prisma.scheduledTopUp.count({ where: { userId } }),
  ]);
  return { data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function getScheduleById(userId: string, id: string) {
  const schedule = await prisma.scheduledTopUp.findUnique({ where: { id } });
  if (!schedule || schedule.userId !== userId) throw new NotFoundError('Schedule not found');
  return schedule;
}

export async function updateSchedule(userId: string, id: string, payload: UpdateScheduleInput) {
  const schedule = await prisma.scheduledTopUp.findUnique({ where: { id } });
  if (!schedule || schedule.userId !== userId) throw new NotFoundError('Schedule not found');

  const updated = await prisma.scheduledTopUp.update({ where: { id }, data: { ...payload } });
  return updated;
}

export async function setPaused(userId: string, id: string, paused: boolean) {
  const schedule = await prisma.scheduledTopUp.findUnique({ where: { id } });
  if (!schedule || schedule.userId !== userId) throw new NotFoundError('Schedule not found');

  const updated = await prisma.scheduledTopUp.update({ where: { id }, data: { paused } });
  return updated;
}

export async function enqueueRun(userId: string, id: string, idempotencyKey?: string) {
  const schedule = await prisma.scheduledTopUp.findUnique({ where: { id } });
  if (!schedule || schedule.userId !== userId) throw new NotFoundError('Schedule not found');
  if (!schedule.active) throw new BadRequestError('Schedule is not active');
  if (schedule.paused) throw new BadRequestError('Schedule is paused');

  // create a run record with PENDING status
  const now = new Date();
  const run = await prisma.scheduledJobRun.create({
    data: {
      scheduleId: id,
      runAt: now,
      status: 'PENDING',
      attempts: 0,
    },
  });

  // NOTE: actual worker will pick up PENDING runs — for testing, we return the run object
  return run;
}

export async function getRuns(userId: string, scheduleId: string) {
  const schedule = await prisma.scheduledTopUp.findUnique({ where: { id: scheduleId } });
  if (!schedule || schedule.userId !== userId) throw new NotFoundError('Schedule not found');

  const runs = await prisma.scheduledJobRun.findMany({ where: { scheduleId }, orderBy: { runAt: 'desc' } });
  return runs;
}
