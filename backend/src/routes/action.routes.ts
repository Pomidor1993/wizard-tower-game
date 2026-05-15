import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  startStudy,
  claimStudy,
  getActions,
  startExplorationAction,
  claimExplorationAction,
} from "../controllers/action.controller.js";

const router = Router();

router.get("/", requireAuth, getActions);
router.post("/study/start", requireAuth, startStudy);
router.post("/study/claim/:actionId", requireAuth, claimStudy);
router.post("/exploration/start", requireAuth, startExplorationAction);
router.post("/exploration/claim/:actionId", requireAuth, claimExplorationAction);

export default router;