import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getTower, upgradeTower, claimTower,
  upgradePowerCollector, claimPowerCollector,
  upgradeStorage, claimStorage,
  upgradeLibrary, claimLibrary,
  upgradeMagicHands, claimMagicHands,
  upgradeSpyOrb, claimSpyOrb,
  upgradeCandles, claimCandles,
} from "../controllers/tower.controller.js";

const router = Router();

router.get("/",                          requireAuth, getTower);
router.post("/upgrade/start",            requireAuth, upgradeTower);
router.post("/upgrade/claim",            requireAuth, claimTower);
router.post("/power-collector/start",    requireAuth, upgradePowerCollector);
router.post("/power-collector/claim",    requireAuth, claimPowerCollector);
router.post("/storage/start",            requireAuth, upgradeStorage);
router.post("/storage/claim",            requireAuth, claimStorage);
router.post("/library/start",            requireAuth, upgradeLibrary);
router.post("/library/claim",            requireAuth, claimLibrary);
router.post("/magic-hands/start",        requireAuth, upgradeMagicHands);
router.post("/magic-hands/claim",        requireAuth, claimMagicHands);
router.post("/spy-orb/start",            requireAuth, upgradeSpyOrb);
router.post("/spy-orb/claim",            requireAuth, claimSpyOrb);
router.post("/candles/start",            requireAuth, upgradeCandles);
router.post("/candles/claim",            requireAuth, claimCandles);

export default router;