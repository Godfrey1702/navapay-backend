import type { Request, Response } from "express";
import * as service from "./scheduled.service.js";

export async function getScheduled(req: Request, res: Response) {
  const data = await service.getScheduledTopUps(req.user!.id);
  res.json({ success: true, data });
}

export async function createScheduled(req: Request, res: Response) {
  const data = await service.createScheduledTopUp(req.user!.id, req.body);
  res.status(201).json({ success: true, data });
}

export async function updateScheduled(req: Request, res: Response) {
  const data = await service.updateScheduledTopUp(
    req.params.id,
    req.user!.id,
    req.body
  );
  res.json({ success: true, data });
}

export async function cancelScheduled(req: Request, res: Response) {
  await service.cancelScheduledTopUp(req.params.id, req.user!.id);
  res.json({ success: true, data: { message: "Schedule cancelled" } });
}
