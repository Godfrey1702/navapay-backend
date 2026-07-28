import { Router } from 'express';
import * as schedulesController from './schedules.controller.js';
import { validate } from '../../middleware/validate.js';
import { protect } from '../../middleware/auth.js';
import { createScheduleSchema, updateScheduleSchema } from './schedules.schema.js';

const router = Router();

// All schedule routes are protected
router.use(protect);

router.get('/', schedulesController.listSchedules);
router.post('/', validate(createScheduleSchema), schedulesController.createSchedule);
router.patch('/:id', validate(updateScheduleSchema), schedulesController.updateSchedule);
router.delete('/:id', schedulesController.deleteSchedule);

export default router;
