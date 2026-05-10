import { Router } from "express";
import { protect } from "../../middleware/auth.js";
import * as controller from "./scheduled.controller.js";

const router = Router();

router.use(protect);

router.get("/", controller.getScheduled);
router.post("/", controller.createScheduled);
router.put("/:id", controller.updateScheduled);
router.delete("/:id", controller.cancelScheduled);

export default router;
