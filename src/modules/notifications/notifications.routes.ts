import { Router } from 'express';
import * as notificationController from './notifications.controller.js';
import { protect } from '../../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/', notificationController.getMyNotifications);
router.patch('/:id/read', notificationController.markAsRead);

export default router;
