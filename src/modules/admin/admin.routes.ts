import { Router, Request, Response, NextFunction } from 'express';
import { protect, restrictTo } from '../../middleware/auth.js';
import { prisma } from '../../database/prisma.js';
import { sendSuccess } from '../../utils/response.js';
import { UserRole } from '../../generated/prisma/enums.js';

const router = Router();

router.use(protect);

// ─── Role check ──────────────────────────────────────────────────────────────
router.get('/check-role', (req: Request, res: Response) => {
    res.json({
        success: true,
        data: { role: req.user!.role, isAdmin: req.user!.role === 'ADMIN' },
    });
});

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

export default router;
