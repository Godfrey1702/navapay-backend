import { Router } from 'express';
import * as schedulesController from './schedules.controller.js';
import { validate } from '../../middleware/validate.js';
import { protect } from '../../middleware/auth.js';
import { createScheduleSchema, updateScheduleSchema } from './schedules.schema.js';

const router = Router();

// All schedule routes are protected
router.use(protect);

router.post('/', validate(createScheduleSchema), schedulesController.createSchedule);
router.get('/', schedulesController.listSchedules);
router.get('/:id', schedulesController.getSchedule);
router.patch('/:id', validate(updateScheduleSchema), schedulesController.updateSchedule);
router.patch('/:id/pause', schedulesController.pauseSchedule);
router.patch('/:id/resume', schedulesController.resumeSchedule);
router.post('/:id/run', schedulesController.runScheduleNow);
router.get('/:id/runs', schedulesController.getRuns);

export default router;
