import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
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

export async function getRanking(req: Request, res: Response) {
  try {
    const characters = await prisma.character.findMany({
      select: {
        id: true,
        name: true,
        prestige: true,
        userId: true,
      },
      orderBy: { prestige: "desc" },
    });

    // Znajdź z kim już walczyłem dziś
const myChar = await prisma.character.findUnique({ where: { userId: req.userId } });
if (!myChar) { res.status(404).json({ error: "Postać nie znaleziona" }); return; }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayBattles = await prisma.battle.findMany({
      where: {
        attackerId: myChar!.id,
        foughtAt: { gte: today },
      },
      select: { defenderId: true },
    });

    const foughtTodayIds = new Set(todayBattles.map(b => b.defenderId));

    const result = characters.map((c, i) => ({
      rank: i + 1,
      characterId: c.id,
      name: c.name,
      prestige: c.prestige,
      isMe: c.userId === req.userId,
      foughtToday: foughtTodayIds.has(c.id),
    }));

    res.json({ ranking: result, myCharacterId: myChar!.id });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}