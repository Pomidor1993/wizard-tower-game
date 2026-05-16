import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { challenge, battleHistory } from "../controllers/combat.controller.js";

const router = Router();

router.post("/challenge", requireAuth, challenge);
router.get("/history",    requireAuth, battleHistory);

export default router;