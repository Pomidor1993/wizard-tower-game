import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getEquipmentEndpoint,
  equipItemEndpoint,
  unequipItemEndpoint,
  equipSpellEndpoint,
  unequipSpellEndpoint,
  equipSpellAutoEndpoint,
  savePresetEndpoint,
  getPresetsEndpoint,
  applyPresetEndpoint
} from "../controllers/equipment.controller.js";
import {
  getUtilityEquipmentEndpoint,
  equipUtilityEndpoint,
  unequipUtilityEndpoint,
} from "../controllers/utilityspell.controller.js";

const router = Router();

router.get("/",              requireAuth, getEquipmentEndpoint);
router.post("/item/equip",   requireAuth, equipItemEndpoint);
router.post("/item/unequip", requireAuth, unequipItemEndpoint);
router.post("/spell/equip",  requireAuth, equipSpellEndpoint);
router.post("/spell/unequip",requireAuth, unequipSpellEndpoint);
router.post("/spell/equip-auto", requireAuth, equipSpellAutoEndpoint);
router.get("/presets",        requireAuth, getPresetsEndpoint);
router.post("/presets/save",  requireAuth, savePresetEndpoint);
router.post("/presets/apply", requireAuth, applyPresetEndpoint);
router.get("/utility",          requireAuth, getUtilityEquipmentEndpoint);
router.post("/utility/equip",   requireAuth, equipUtilityEndpoint);
router.post("/utility/unequip", requireAuth, unequipUtilityEndpoint);

export default router;