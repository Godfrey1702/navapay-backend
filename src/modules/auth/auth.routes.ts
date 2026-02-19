import { Router } from 'express';
import * as authController from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { loginSchema, registerSchema, refreshTokenSchema } from './auth.schema.js';
import { strictRateLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

// Apply strict rate limiting to auth routes to prevent brute force
router.use(strictRateLimiter);

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);

// Refresh endpoint - validation optional as it might come from cookie
router.post('/refresh', authController.refresh);

export default router;
