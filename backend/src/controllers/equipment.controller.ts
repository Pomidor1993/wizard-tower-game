import { Request, Response } from "express";
import {
  getEquipment,
  equipItem,
  unequipItem,
  equipSpell,
  unequipSpell,
  equipSpellAuto,
} from "../services/equipment.service.js";

export async function getEquipmentEndpoint(req: Request, res: Response) {
  try {
    res.json(await getEquipment(req.userId!));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function equipItemEndpoint(req: Request, res: Response) {
  const { itemId } = req.body;
  if (!itemId) { res.status(400).json({ error: "Podaj itemId" }); return; }
  try {
    res.json(await equipItem(req.userId!, parseInt(itemId)));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

// equipment.controller.ts
export async function equipSpellAutoEndpoint(req: Request, res: Response) {
  const { spellId } = req.body;
  if (spellId === undefined) { res.status(400).json({ error: "Podaj spellId" }); return; }
  try {
    res.json(await equipSpellAuto(req.userId!, parseInt(spellId)));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function unequipItemEndpoint(req: Request, res: Response) {
  const { slot } = req.body;
  if (!slot) { res.status(400).json({ error: "Podaj slot" }); return; }
  try {
    res.json(await unequipItem(req.userId!, slot));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function equipSpellEndpoint(req: Request, res: Response) {
  const { spellId, slotIndex } = req.body;
  if (spellId === undefined || slotIndex === undefined) {
    res.status(400).json({ error: "Podaj spellId i slotIndex" }); return;
  }
  try {
    res.json(await equipSpell(req.userId!, parseInt(spellId), parseInt(slotIndex)));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function unequipSpellEndpoint(req: Request, res: Response) {
  const { slotIndex } = req.body;
  if (slotIndex === undefined) {
    res.status(400).json({ error: "Podaj slotIndex" }); return;
  }
  try {
    res.json(await unequipSpell(req.userId!, parseInt(slotIndex)));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}