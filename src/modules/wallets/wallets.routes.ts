import { Router } from 'express';
import * as walletController from './wallets.controller.js';
import { protect } from '../../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/me', walletController.getMyWallet);
router.post('/initialize-payment', walletController.initializePayment);
router.get('/verify-payment/:reference', walletController.verifyPayment);

export default router;
