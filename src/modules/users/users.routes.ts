import { Router } from 'express';
import * as userController from './users.controller.js';
import { protect } from '../../middleware/auth.js';

const router = Router();

// All user routes are protected
router.use(protect);

router.get('/me', userController.getMe);
router.patch('/me', userController.updateMe);
router.get('/phone-numbers', userController.getPhoneNumbers);
router.post('/phone-numbers', userController.addPhoneNumber);
router.delete('/phone-numbers/:id', userController.deletePhoneNumber);

export default router;
