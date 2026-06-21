import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getSpellbookEndpoint,
  getSpellbookStatsEndpoint,
} from "../controllers/spellbook.controller.js";
import { getUtilitySpellbookEndpoint } from "../controllers/utilityspell.controller.js";

const router = Router();

router.get("/",        requireAuth, getSpellbookEndpoint);
router.get("/stats",   requireAuth, getSpellbookStatsEndpoint);
router.get("/utility", requireAuth, getUtilitySpellbookEndpoint);

export default router;