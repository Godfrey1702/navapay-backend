import { Router } from 'express';
import * as authController from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { loginSchema, registerSchema, refreshTokenSchema } from './auth.schema.js';
import { strictRateLimiter } from '../../middleware/rateLimiter.js';
import { protect } from '../../middleware/auth.js';

const router = Router();

// Apply strict rate limiting to auth routes to prevent brute force
router.use(strictRateLimiter);

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);

// Refresh endpoint - validation optional as it might come from cookie
router.post('/refresh', authController.refresh);

// Protected routes
router.get('/me', protect, authController.getMe);
router.patch('/password', protect, authController.updatePassword);

export default router;
