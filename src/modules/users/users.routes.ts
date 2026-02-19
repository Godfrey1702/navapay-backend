import { Router } from 'express';
import * as userController from './users.controller.js';
import { protect } from '../../middleware/auth.js';

const router = Router();

// All user routes are protected
router.use(protect);

router.get('/me', userController.getMe);

export default router;
