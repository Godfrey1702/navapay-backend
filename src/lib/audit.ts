import { prisma } from '../database/prisma.js';
import { Request } from 'express';

export type AuditAction =
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'LOGOUT'
    | 'REGISTER'
    | 'PASSWORD_RESET_REQUEST'
    | 'PASSWORD_RESET_SUCCESS'
    | 'PIN_SET'
    | 'PIN_RESET'
    | 'PURCHASE_AIRTIME'
    | 'PURCHASE_DATA'
    | 'WALLET_FUNDED'
    | 'SCHEDULE_CREATED'
    | 'SCHEDULE_CANCELLED'
    | 'SCHEDULE_EXECUTED'
    | 'BUDGET_SET'
    | 'ADMIN_WALLET_ADJUST'
    | 'ADMIN_USER_VIEW'
    | 'WALLET_RECONCILIATION';

export async function auditLog(
    action: AuditAction,
    req: Request,
    metadata: Record<string, any> = {},
    userId?: string,
) {
    try {
        await prisma.auditLog.create({
            data: {
                userId: userId || req.user?.id,
                action,
                metadata,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
            },
        });
    } catch (error) {
        // Never let audit logging break the main flow
        console.error('[auditLog] Failed to write audit log:', error);
    }
}
