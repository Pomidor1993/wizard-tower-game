import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getMyCharacter } from "../controllers/character.controller.js";

const router = Router();

// requireAuth działa jak bramka — bez tokenu nie przejdziesz dalej
router.get("/me", requireAuth, getMyCharacter);

export default router;