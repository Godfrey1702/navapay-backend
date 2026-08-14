import { Router, Request, Response, NextFunction } from 'express';
import { protect, restrictTo } from '../../middleware/auth.js';
import { prisma } from '../../database/prisma.js';
import { sendSuccess } from '../../utils/response.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { reconcileWallet } from '../../lib/ledger.js';
import { auditLog } from '../../lib/audit.js';
import * as adminController from './admin.controller.js';

const router = Router();

router.use(protect);

// ─── Role check ──────────────────────────────────────────────────────────────
router.get('/check-role', (req: Request, res: Response) => {
    res.json({
        success: true,
        data: { role: req.user!.role, isAdmin: req.user!.role === 'ADMIN' },
    });
});

// ─── Dashboard (ADMIN only) ───────────────────────────────────────────────────
router.get('/dashboard-metrics', restrictTo(UserRole.ADMIN), adminController.getDashboardMetrics);
router.get('/analytics', restrictTo(UserRole.ADMIN), adminController.getAnalytics);

// ─── User management (ADMIN only) ────────────────────────────────────────────
router.get('/users', restrictTo(UserRole.ADMIN), adminController.getUsers);
router.get('/users/:userId', restrictTo(UserRole.ADMIN), adminController.getUserDetails);

// ─── Transaction & wallet oversight (ADMIN only) ─────────────────────────────
router.get('/transactions', restrictTo(UserRole.ADMIN), adminController.getTransactions);
router.get('/wallets', restrictTo(UserRole.ADMIN), adminController.getWallets);
router.post('/wallets/adjust', restrictTo(UserRole.ADMIN), adminController.adjustWallet);

// ─── Scheduled top-ups (ADMIN only) ───────────────────────────────────────────
router.get('/scheduled-topups', restrictTo(UserRole.ADMIN), adminController.getScheduledTopUps);

// ─── Data plan management (ADMIN only) ───────────────────────────────────────
router.use('/data-plans', restrictTo(UserRole.ADMIN));

router.get('/data-plans', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const plans = await prisma.dataPlan.findMany({ orderBy: [{ network: 'asc' }, { amount: 'asc' }] });
        sendSuccess(res, plans, 'All data plans');
    } catch (err) { next(err); }
});

router.post('/data-plans', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { network, name, code, amount, validity, provider } = req.body;
        const plan = await prisma.dataPlan.create({
            data: { network: network.toUpperCase(), name, code, amount: Number(amount), validity, provider: provider ?? 'clubkonnect' },
        });
        sendSuccess(res, plan, 'Data plan created', 201);
    } catch (err) { next(err); }
});

router.patch('/data-plans/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = String(req.params.id);
        const { network, name, code, amount, validity, provider, isActive } = req.body;
        const plan = await prisma.dataPlan.update({
            where: { id },
            data: {
                ...(network   !== undefined && { network: network.toUpperCase() }),
                ...(name      !== undefined && { name }),
                ...(code      !== undefined && { code }),
                ...(amount    !== undefined && { amount: Number(amount) }),
                ...(validity  !== undefined && { validity }),
                ...(provider  !== undefined && { provider }),
                ...(isActive  !== undefined && { isActive }),
            },
        });
        sendSuccess(res, plan, 'Data plan updated');
    } catch (err) { next(err); }
});

router.delete('/data-plans/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = String(req.params.id);
        const plan = await prisma.dataPlan.update({
            where: { id },
            data: { isActive: false },
        });
        sendSuccess(res, plan, 'Data plan deactivated');
    } catch (err) { next(err); }
});

// ─── Audit log viewer (ADMIN only) ───────────────────────────────────────────
router.get('/audit-logs', restrictTo(UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId, action, from, to, page = '1', limit = '50' } = req.query;

        const where: Record<string, any> = {};
        if (userId) where.userId = String(userId);
        if (action) where.action = String(action);
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(String(from));
            if (to) where.createdAt.lte = new Date(String(to));
        }

        const take = Number(limit);
        const skip = (Number(page) - 1) * take;

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take,
                skip,
            }),
            prisma.auditLog.count({ where }),
        ]);

        sendSuccess(res, logs, 'Audit logs retrieved', 200, {
            page: Number(page),
            limit: take,
            total,
            totalPages: Math.ceil(total / take),
        });
    } catch (err) { next(err); }
});

// ─── Transactions requiring manual review (ADMIN only) ───────────────────────
router.get('/transactions/unknown', restrictTo(UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page = '1', limit = '50' } = req.query;
        const take = Number(limit);
        const skip = (Number(page) - 1) * take;

        const where = { status: 'UNKNOWN' as const };

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take,
                skip,
            }),
            prisma.transaction.count({ where }),
        ]);

        sendSuccess(res, transactions, 'Transactions requiring manual review', 200, {
            page: Number(page),
            limit: take,
            total,
            totalPages: Math.ceil(total / take),
        });
    } catch (err) { next(err); }
});

// ─── Wallet reconciliation (ADMIN only) ──────────────────────────────────────
router.get('/wallets/:userId/reconcile', restrictTo(UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = String(req.params.userId);
        const wallet = await prisma.wallet.findFirst({ where: { userId } });
        if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });

        const result = await reconcileWallet(wallet.id);

        if (result.hasDiscrepancy) {
            await auditLog('WALLET_RECONCILIATION', req, { userId, ...result });
        }

        sendSuccess(res, result, 'Wallet reconciliation complete');
    } catch (err) { next(err); }
});

export default router;
