import { Request, Response, NextFunction } from 'express';
import * as scheduledService from './scheduled.service.js';
import { sendSuccess } from '../../utils/response.js';

export async function listSchedules(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new Error('Not authenticated');
    const data = await scheduledService.listSchedules(req.user.id);
    sendSuccess(res, data, 'Schedules retrieved');
  } catch (err) {
    next(err);
  }
}

export async function createSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new Error('Not authenticated');
    const data = await scheduledService.createSchedule(req.user.id, req.body);
    sendSuccess(res, data, 'Schedule created', 201);
  } catch (err) {
    next(err);
  }
}

export async function updateSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new Error('Not authenticated');
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await scheduledService.updateSchedule(req.user.id, id, req.body);
    sendSuccess(res, data, 'Schedule updated');
  } catch (err) {
    next(err);
  }
}

export async function deleteSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new Error('Not authenticated');
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await scheduledService.deleteSchedule(req.user.id, id);
    sendSuccess(res, data, 'Schedule deleted');
  } catch (err) {
    next(err);
  }
}
