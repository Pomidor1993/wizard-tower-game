import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getMyCharacter, upgradeStatEndpoint, getUpgradeCostsEndpoint, getEffectiveStats, upgradeElementEndpoint } from "../controllers/character.controller.js";


const router = Router();

router.get("/me", requireAuth, getMyCharacter);
router.get("/upgrade-costs", requireAuth, getUpgradeCostsEndpoint);
router.post("/upgrade", requireAuth, upgradeStatEndpoint);
router.get("/effective-stats", requireAuth, getEffectiveStats);
router.post("/upgrade-element", requireAuth, upgradeElementEndpoint);

export default router;