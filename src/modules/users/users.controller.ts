import { Request, Response, NextFunction } from 'express';
import * as userService from './users.service.js';
import { sendSuccess } from '../../utils/response.js';
import { UnauthorizedError } from '../../utils/errors.js';

export async function getMe(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) throw new UnauthorizedError('User not authenticated');

        const user = await userService.getUserById(req.user.id);
        sendSuccess(res, user, 'User profile retrieved');
    } catch (error) {
        next(error);
    }
}
