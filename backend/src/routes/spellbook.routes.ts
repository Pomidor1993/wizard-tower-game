import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getSpellbookEndpoint,
  getSpellbookStatsEndpoint,
  learnBasicSpellEndpoint,
} from "../controllers/spellbook.controller.js";

const router = Router();

router.get("/",              requireAuth, getSpellbookEndpoint);
router.get("/stats",         requireAuth, getSpellbookStatsEndpoint);
router.post("/learn-basic",  requireAuth, learnBasicSpellEndpoint);

export default router;