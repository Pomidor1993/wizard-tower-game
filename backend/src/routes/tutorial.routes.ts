import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getTutorialState, completeTutorial } from "../services/tutorial/tutorial.service.js";
import {
  getHomeRepairTasks,
  startHomeRepairTask,
  claimHomeRepairTask,
} from "../services/tutorial/home-repair.service.js";

async function handle(res: any, fn: () => Promise<any>) {
  try { res.json(await fn()); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
}

const router = Router();

router.get("/state", requireAuth, (req, res) => handle(res, () => getTutorialState(req.userId!)));
router.post("/complete", requireAuth, (req, res) => handle(res, () => completeTutorial(req.userId!)));

router.get("/home-repair", requireAuth, (req, res) => handle(res, () => getHomeRepairTasks(req.userId!)));
router.post("/home-repair/:taskCode/start", requireAuth, (req, res) =>
  handle(res, () => startHomeRepairTask(req.userId!, req.params.taskCode as any)));
router.post("/home-repair/:taskCode/claim", requireAuth, (req, res) =>
  handle(res, () => claimHomeRepairTask(req.userId!, req.params.taskCode as any)));

export default router;