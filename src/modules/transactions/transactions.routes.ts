import { Router } from 'express';
import * as transactionController from './transactions.controller.js';
import { protect } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createDepositSchema, createPurchaseSchema } from './transactions.schema.js';

const router = Router();

// All transaction routes are protected
router.use(protect);

router.post('/deposit', validate(createDepositSchema), transactionController.deposit);
router.post('/purchase', validate(createPurchaseSchema), transactionController.purchase);
router.post('/airtime', transactionController.purchaseAirtime);
router.post('/data', transactionController.purchaseData);
router.get('/history', transactionController.getTransactionHistory);
router.get('/:id/verify', transactionController.verifyTransaction);

export default router;
