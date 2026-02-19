import { Request, Response, NextFunction } from 'express';
import * as notificationService from './notifications.service.js';
import { sendSuccess } from '../../utils/response.js';
import { UnauthorizedError } from '../../utils/errors.js';

export async function getMyNotifications(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) throw new UnauthorizedError('User not authenticated');

        const notifications = await notificationService.getMyNotifications(req.user.id);
        sendSuccess(res, notifications, 'Notifications retrieved');
    } catch (error) {
        next(error);
    }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) throw new UnauthorizedError('User not authenticated');

        const id = req.params.id as string;
        await notificationService.markAsRead(id, req.user.id);
        sendSuccess(res, null, 'Notification marked as read');
    } catch (error) {
        next(error);
    }
}
