import { Router } from 'express';
import * as walletController from './wallets.controller.js';
import { protect, restrictTo } from '../../middleware/auth.js';
import { UserRole } from '../../generated/prisma/enums.js';

const router = Router();

router.use(protect);

router.get('/me', walletController.getMyWallet);
router.post('/initialize-payment', walletController.initializePayment);
router.get('/verify-payment/:reference', walletController.verifyPayment);
router.get('/balance', restrictTo(UserRole.ADMIN), walletController.getClubkonnectBalance);

export default router;
