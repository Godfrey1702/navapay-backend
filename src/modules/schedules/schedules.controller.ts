import { Request, Response, NextFunction } from 'express';
import * as schedulesService from './schedules.service.js';
import { sendSuccess } from '../../utils/response.js';
import { UnauthorizedError } from '../../utils/errors.js';

export async function createSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new UnauthorizedError('User not authenticated');

    const payload = req.body;
    const schedule = await schedulesService.createSchedule(req.user.id, payload);
    sendSuccess(res, schedule, 'Schedule created', 201);
  } catch (err) {
    next(err);
  }
}

export async function listSchedules(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new UnauthorizedError('User not authenticated');
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const result = await schedulesService.listSchedules(req.user.id, page, limit);
    sendSuccess(res, result, 'Schedules retrieved');
  } catch (err) {
    next(err);
  }
}

export async function getSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new UnauthorizedError('User not authenticated');
    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
    const schedule = await schedulesService.getScheduleById(req.user.id, id);
    sendSuccess(res, schedule, 'Schedule retrieved');
  } catch (err) {
    next(err);
  }
}

export async function updateSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new UnauthorizedError('User not authenticated');
    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
    const updated = await schedulesService.updateSchedule(req.user.id, id, req.body);
    sendSuccess(res, updated, 'Schedule updated');
  } catch (err) {
    next(err);
  }
}

export async function pauseSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new UnauthorizedError('User not authenticated');
    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
    const updated = await schedulesService.setPaused(req.user.id, id, true);
    sendSuccess(res, updated, 'Schedule paused');
  } catch (err) {
    next(err);
  }
}

export async function resumeSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new UnauthorizedError('User not authenticated');
    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
    const updated = await schedulesService.setPaused(req.user.id, id, false);
    sendSuccess(res, updated, 'Schedule resumed');
  } catch (err) {
    next(err);
  }
}

export async function runScheduleNow(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new UnauthorizedError('User not authenticated');
    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
    const run = await schedulesService.enqueueRun(req.user.id, id, req.headers['idempotency-key'] as string | undefined);
    sendSuccess(res, run, 'Run queued', 202);
  } catch (err) {
    next(err);
  }
}

export async function getRuns(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new UnauthorizedError('User not authenticated');
    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
    const runs = await schedulesService.getRuns(req.user.id, id);
    sendSuccess(res, runs, 'Runs retrieved');
  } catch (err) {
    next(err);
  }
}
