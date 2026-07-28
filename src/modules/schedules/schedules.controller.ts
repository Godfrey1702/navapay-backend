import { Request, Response, NextFunction } from 'express';
import * as schedulesService from './schedules.service.js';
import { sendSuccess } from '../../utils/response.js';
import { UnauthorizedError } from '../../utils/errors.js';

export async function listSchedules(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) throw new UnauthorizedError('User not authenticated');
        const schedules = await schedulesService.listSchedules(req.user.id);
        sendSuccess(res, schedules, 'Schedules retrieved');
    } catch (err) {
        next(err);
    }
}

export async function createSchedule(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) throw new UnauthorizedError('User not authenticated');
        const schedule = await schedulesService.createSchedule(req.user.id, req.body);
        sendSuccess(res, schedule, 'Schedule created', 201);
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

export async function deleteSchedule(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) throw new UnauthorizedError('User not authenticated');
        const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
        await schedulesService.deleteSchedule(req.user.id, id);
        sendSuccess(res, null, 'Schedule cancelled');
    } catch (err) {
        next(err);
    }
}
