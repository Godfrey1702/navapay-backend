import { Router } from "express";
import { protect } from "../../middleware/auth.js";

const router = Router();

router.get("/", protect, (req, res) => {
  const hour = new Date().getHours();
  let greeting = "Good morning";
  if (hour >= 12 && hour < 17) greeting = "Good afternoon";
  else if (hour >= 17) greeting = "Good evening";
  
  res.json({ 
    success: true, 
    data: { greeting, message: `${greeting}!` } 
  });
});

export default router;
