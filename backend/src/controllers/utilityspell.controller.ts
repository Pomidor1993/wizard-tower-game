import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import {
  getUtilitySlots,
  equipUtilitySpell,
  unequipUtilitySpell,
  getUnlockedUtilitySlots,
  getUtilitySpellbook,
} from "../services/utility-spell.service.js";
import { getCharacterSchoolBonuses } from "../services/magic-school.service.js";

// ── GET /equipment/utility ────────────────────────────────────────────────────
// Zwraca aktywne sloty czarów użytkowych + maksymalną liczbę odblokowanych slotów
export async function getUtilityEquipmentEndpoint(req: Request, res: Response) {
  try {
    const character = await prisma.character.findUnique({
      where: { userId: req.userId! },
      include: { tower: { include: { buildings: true } } },
    });
    if (!character) { res.status(400).json({ error: "Postać nie znaleziona" }); return; }

    const library = character.tower?.buildings.find(b => b.buildingType === "library");
    const libraryLevel = library?.level ?? 0;
    const schoolBonuses = await getCharacterSchoolBonuses(character.id);
    const extraUtilitySlots = schoolBonuses?.utility_slot ?? 0;
    const maxSlots = getUnlockedUtilitySlots(libraryLevel, extraUtilitySlots);

    const rawSlots = await getUtilitySlots(character.id);
    const utilitySlots = rawSlots.map(s => ({
      slotIndex: s.slotIndex,
      spell: {
        id: s.spell.id,
        name: s.spell.name,
        element: s.spell.element,
        rarity: s.spell.rarity,
      },
    }));

    res.json({ utilitySlots, maxSlots });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

// ── POST /equipment/utility/equip ─────────────────────────────────────────────
export async function equipUtilityEndpoint(req: Request, res: Response) {
  const { spellId, slotIndex } = req.body;
  if (spellId === undefined || slotIndex === undefined) {
    res.status(400).json({ error: "Podaj spellId i slotIndex" }); return;
  }
  try {
    const character = await prisma.character.findUnique({ where: { userId: req.userId! } });
    if (!character) { res.status(400).json({ error: "Postać nie znaleziona" }); return; }

    await equipUtilitySpell(character.id, parseInt(spellId), parseInt(slotIndex));
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

// ── POST /equipment/utility/unequip ───────────────────────────────────────────
export async function unequipUtilityEndpoint(req: Request, res: Response) {
  const { slotIndex } = req.body;
  if (slotIndex === undefined) {
    res.status(400).json({ error: "Podaj slotIndex" }); return;
  }
  try {
    const character = await prisma.character.findUnique({ where: { userId: req.userId! } });
    if (!character) { res.status(400).json({ error: "Postać nie znaleziona" }); return; }

    await unequipUtilitySpell(character.id, parseInt(slotIndex));
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function getUtilitySpellbookEndpoint(req: Request, res: Response) {
  try {
    const spells = await getUtilitySpellbook(req.userId!);
    res.json({ spells });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}