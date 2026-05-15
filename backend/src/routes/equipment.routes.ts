import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getEquipmentEndpoint,
  equipItemEndpoint,
  unequipItemEndpoint,
  equipSpellEndpoint,
  unequipSpellEndpoint,
} from "../controllers/equipment.controller.js";

const router = Router();

router.get("/",              requireAuth, getEquipmentEndpoint);
router.post("/item/equip",   requireAuth, equipItemEndpoint);
router.post("/item/unequip", requireAuth, unequipItemEndpoint);
router.post("/spell/equip",  requireAuth, equipSpellEndpoint);
router.post("/spell/unequip",requireAuth, unequipSpellEndpoint);

export default router;