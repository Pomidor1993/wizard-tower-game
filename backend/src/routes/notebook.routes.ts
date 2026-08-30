import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getMeta, getOverview, getEntities, getItems, getWorlds, getRankings,
} from "../controllers/notebook.controller.js";

const router = Router();

router.get("/meta",      requireAuth, getMeta);
router.get("/overview",  requireAuth, getOverview);
router.get("/entities",  requireAuth, getEntities);
router.get("/items",     requireAuth, getItems);   // ?tier=1..10
router.get("/worlds",    requireAuth, getWorlds);
router.get("/rankings",  requireAuth, getRankings);

export default router;