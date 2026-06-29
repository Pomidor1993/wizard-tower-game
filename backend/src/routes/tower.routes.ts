import { Router } from "express";
import { upgradeChaosVault, claimChaosVault, getVault, selectAltairElement} from "../controllers/tower.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getTower, upgradeTower, claimTower,
  upgradePowerCollector, claimPowerCollector,
  upgradeLibrary, claimLibrary,
  upgradeTrophyCabinet, claimTrophyCabinet,
  upgradeMagicNotebook, claimMagicNotebook,
  upgradeAltair, claimAltair,
  upgradeDisintegrator, claimDisintegrator,
  previewDisintegratorEndpoint, confirmDisintegratorEndpoint,  
} from "../controllers/tower.controller.js";

const router = Router();

router.get("/",                          requireAuth, getTower);
router.post("/upgrade/start",            requireAuth, upgradeTower);
router.post("/upgrade/claim",            requireAuth, claimTower);
router.post("/power-collector/start",    requireAuth, upgradePowerCollector);
router.post("/power-collector/claim",    requireAuth, claimPowerCollector);
router.post("/library/start",            requireAuth, upgradeLibrary);
router.post("/library/claim",            requireAuth, claimLibrary);
router.post("/trophy-cabinet/start",        requireAuth, upgradeTrophyCabinet);
router.post("/trophy-cabinet/claim",        requireAuth, claimTrophyCabinet);
router.post("/magic-notebook/start",     requireAuth, upgradeMagicNotebook);
router.post("/magic-notebook/claim",     requireAuth, claimMagicNotebook);
router.post("/altair/start",             requireAuth, upgradeAltair);
router.post("/altair/claim",             requireAuth, claimAltair);
router.post("/chaos-vault/start",        requireAuth, upgradeChaosVault);
router.post("/chaos-vault/claim",        requireAuth, claimChaosVault);
router.get("/chaos-vault",               requireAuth, getVault);
router.post("/altair/select-element", requireAuth, selectAltairElement);
router.post("/disintegrator/start",   requireAuth, upgradeDisintegrator);
router.post("/disintegrator/claim",   requireAuth, claimDisintegrator);
router.post("/disintegrator/preview", requireAuth, previewDisintegratorEndpoint);
router.post("/disintegrator/confirm", requireAuth, confirmDisintegratorEndpoint);


export default router;