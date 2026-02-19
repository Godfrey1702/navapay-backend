import { Router } from 'express';
import * as walletController from './wallets.controller.js';
import { protect } from '../../middleware/auth.js';

const router = Router();

// All wallet routes are protected
router.use(protect);

router.get('/me', walletController.getMyWallet);

export default router;
