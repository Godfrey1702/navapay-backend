import { Router } from 'express';
import * as transactionController from './transactions.controller.js';
import { protect, restrictTo } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { requirePin } from '../../middleware/requirePin.js';
import { purchaseLimiter } from '../../middleware/rateLimiter.js';
import { createDepositSchema, createPurchaseSchema } from './transactions.schema.js';
import { UserRole } from '../../generated/prisma/enums.js';

const router = Router();

// Public — no auth required
router.get('/data-plans/:network', transactionController.getDataPlans);

// All routes below require authentication
router.use(protect);

// Admin-only: manual wallet credit with no payment verification (support/refunds).
router.post(
    '/deposit',
    restrictTo(UserRole.ADMIN),
    validate(createDepositSchema),
    transactionController.adminDeposit,
);
router.post('/purchase', validate(createPurchaseSchema), transactionController.purchase);
router.post('/airtime', purchaseLimiter, requirePin, transactionController.purchaseAirtime);
router.post('/data', purchaseLimiter, requirePin, transactionController.purchaseData);
router.get('/history', transactionController.getTransactionHistory);
router.get('/:id/verify', transactionController.verifyTransaction);

export default router;
