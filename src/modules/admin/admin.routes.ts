import { Router } from 'express';
import { protect } from '../../middleware/auth.js';

const router = Router();

// All admin routes are protected
router.use(protect);

router.get('/check-role', (req, res) => {
  res.json({ 
    success: true, 
    data: { role: req.user!.role, isAdmin: req.user!.role === 'ADMIN' } 
  });
});

export default router;
