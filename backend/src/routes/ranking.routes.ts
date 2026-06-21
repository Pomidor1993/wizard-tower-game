import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getRankingEndpoint } from "../controllers/ranking.controller.js";

const router = Router();

// GET /api/rankings/:category?page=1&pageSize=25
// category: level | prestige | builders | warriors | showoffs | collectors
router.get("/:category", requireAuth, getRankingEndpoint);

export default router;