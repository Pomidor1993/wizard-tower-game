import { Request, Response } from "express";
import {
  getSpellbook,
  getSpellbookStats,
  learnBasicSpell,
} from "../services/spellbook.service.js";

export async function getSpellbookEndpoint(req: Request, res: Response) {
  try {
    const spells = await getSpellbook(req.userId!);
    res.json({ spells });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function getSpellbookStatsEndpoint(req: Request, res: Response) {
  try {
    const stats = await getSpellbookStats(req.userId!);
    res.json(stats);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function learnBasicSpellEndpoint(req: Request, res: Response) {
  try {
    const spellId = parseInt(req.body.spellId);
    if (!spellId) throw new Error("Brak spellId");
    const result = await learnBasicSpell(req.userId!, spellId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}