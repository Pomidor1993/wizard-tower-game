import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getMyCharacter,
  upgradeStatEndpoint,
  getUpgradeCostsEndpoint,
} from "../controllers/character.controller.js";

const router = Router();

router.get("/me", requireAuth, getMyCharacter);
router.get("/upgrade-costs", requireAuth, getUpgradeCostsEndpoint);
router.post("/upgrade", requireAuth, upgradeStatEndpoint);

export default router;