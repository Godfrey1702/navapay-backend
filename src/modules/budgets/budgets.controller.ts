import { Request, Response, NextFunction } from 'express';
import * as budgetService from './budgets.service.js';
import { sendSuccess } from '../../utils/response.js';
import { UnauthorizedError } from '../../utils/errors.js';

export async function setBudget(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) throw new UnauthorizedError('User not authenticated');

        const budget = await budgetService.upsertBudget(req.user.id, req.body);
        sendSuccess(res, budget, 'Budget set successfully');
    } catch (error) {
        next(error);
    }
}

export async function getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user) throw new UnauthorizedError('User not authenticated');

        const now = new Date();
        const month = parseInt(req.query.month as string) || (now.getMonth() + 1);
        const year = parseInt(req.query.year as string) || now.getFullYear();

        const analytics = await budgetService.getBudgetsWithAnalytics(req.user.id, month, year);
        sendSuccess(res, analytics, 'Budget analytics retrieved');
    } catch (error) {
        next(error);
    }
}
