import { Router } from 'express';
import * as scheduledController from './scheduled.controller.js';
import { protect } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createScheduleSchema, updateScheduleSchema } from './scheduled.schema.js';

const router = Router();

// protected routes
router.use(protect);

router.get('/', scheduledController.listSchedules);
router.post('/', validate(createScheduleSchema), scheduledController.createSchedule);
router.put('/:id', validate(updateScheduleSchema), scheduledController.updateSchedule);
router.delete('/:id', scheduledController.deleteSchedule);

export default router;
