import { Router } from 'express';
import * as budgetController from './budgets.controller.js';
import { protect } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { setBudgetSchema } from './budgets.schema.js';

const router = Router();

// All budget routes are protected
router.use(protect);

router.get('/', budgetController.getBudgets);
router.post('/', validate(setBudgetSchema), budgetController.setBudget);
router.get('/analytics', budgetController.getAnalytics);

export default router;
