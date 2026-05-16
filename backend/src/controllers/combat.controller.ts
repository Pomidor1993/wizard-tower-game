import { Request, Response } from "express";
import { challengePlayer, getBattleHistory } from "../services/combat.service.js";

export async function challenge(req: Request, res: Response) {
  const { defenderCharacterId } = req.body;
  if (!defenderCharacterId) {
    res.status(400).json({ error: "Podaj defenderCharacterId" });
    return;
  }
  try {
    const result = await challengePlayer(req.userId!, parseInt(defenderCharacterId));
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function battleHistory(req: Request, res: Response) {
  try {
    res.json(await getBattleHistory(req.userId!));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}