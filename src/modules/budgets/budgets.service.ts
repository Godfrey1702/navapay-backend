import { prisma } from '../../database/prisma.js';
import {
    ServiceCategory,
    TransactionStatus,
    TransactionType
} from '../../generated/prisma/enums.js';
import { SetBudgetInput } from './budgets.schema.js';

/**
 * Create or update a budget for a category and period.
 */
export async function upsertBudget(userId: string, input: SetBudgetInput) {
    return await prisma.budget.upsert({
        where: {
            userId_category_month_year: {
                userId,
                category: input.category,
                month: input.month,
                year: input.year,
            },
        },
        update: {
            amountLimit: input.amountLimit,
            alertThresholdPercent: input.alertThresholdPercent || 80,
        },
        create: {
            userId,
            category: input.category,
            amountLimit: input.amountLimit,
            month: input.month,
            year: input.year,
            alertThresholdPercent: input.alertThresholdPercent || 80,
        },
    });
}

/**
 * Get budgets with spending analytics.
 */
export async function getBudgetsWithAnalytics(userId: string, month?: number, year?: number) {
    const budgets = await prisma.budget.findMany({
        where: month && year ? { userId, month, year } : { userId },
    });

    // For each budget, calculate current spending
    const analytics = await Promise.all(
        budgets.map(async (budget: any) => {
            // Calculate total spent in this category and month
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth() + 1;
            const useYear = year || currentYear;
            const useMonth = month || currentMonth;
            
            const startOfMonth = new Date(useYear, useMonth - 1, 1);
            const endOfMonth = new Date(useYear, useMonth, 0, 23, 59, 59);

            const aggregate = await prisma.transaction.aggregate({
                _sum: { amount: true },
                where: {
                    userId,
                    category: budget.category,
                    type: TransactionType.PURCHASE,
                    status: TransactionStatus.SUCCESS,
                    createdAt: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
            });

            const spentAmount = Number(aggregate._sum.amount || 0);
            const limitAmount = Number(budget.amountLimit);
            const percentUsed = (spentAmount / limitAmount) * 100;

            return {
                ...budget,
                spentAmount,
                remainingAmount: limitAmount - spentAmount,
                percentUsed: parseFloat(percentUsed.toFixed(2)),
            };
        })
    );

    return analytics;
}
