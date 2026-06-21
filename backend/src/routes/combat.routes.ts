import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { challenge, battleHistory, getRanking } from "../controllers/combat.controller.js";
import {
  challengeMagicTournament,
  getTournamentHistory,
} from "../services/magic-tournament.service.js";

const router = Router();

router.post("/challenge", requireAuth, challenge);
router.get("/history",    requireAuth, battleHistory);
router.get("/ranking",    requireAuth, getRanking);

router.post("/tournament/:defenderCharacterId", requireAuth, async (req, res) => {
  try {
    const result = await challengeMagicTournament(
      req.userId!,
      Number(req.params.defenderCharacterId)
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/tournament/history", requireAuth, async (req, res) => {
  try {
    const history = await getTournamentHistory(req.userId!);
    res.json(history);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;