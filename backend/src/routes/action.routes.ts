import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  startStudy,
  claimStudy,
  getActions,
  startExplorationAction,
  claimExplorationAction,
} from "../controllers/action.controller.js";
import { getEncounterHistory } from "../services/exploration.service.js";

const router = Router();

router.get("/", requireAuth, getActions);
router.post("/study/start", requireAuth, startStudy);
router.post("/study/claim/:actionId", requireAuth, claimStudy);
router.post("/exploration/start", requireAuth, startExplorationAction);
router.post("/exploration/claim/:actionId", requireAuth, claimExplorationAction);

router.get("/exploration/encounters", requireAuth, async (req, res) => {
try {
const result = await getEncounterHistory(req.userId!);
res.json(result);
} catch (error: any) {
res.status(400).json({ error: error.message });
}
});

export default router;