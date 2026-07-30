import { Router } from 'express';
import { setPin, verifyPin, getPinStatus, forgotPin, resetPin } from './pin.controller.js';
import { protect } from '../../middleware/auth.js';

const router = Router();

// Public routes (no auth needed)
router.post('/forgot', forgotPin);
router.post('/reset', resetPin);

// Protected routes
router.get('/status', protect, getPinStatus);
router.post('/set', protect, setPin);
router.post('/verify', protect, verifyPin);

export default router;
