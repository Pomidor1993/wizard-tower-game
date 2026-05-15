import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { upgradeStat, getUpgradeCosts } from "../services/character.service.js";

export async function getMyCharacter(req: Request, res: Response) {
  const character = await prisma.character.findUnique({
    where: { userId: req.userId },
    include: {
      tower: { include: { buildings: true } },
    },
  });

  if (!character) {
    res.status(404).json({ error: "Postać nie znaleziona" });
    return;
  }

  res.json(character);
}

export async function upgradeStatEndpoint(req: Request, res: Response) {
  const { stat } = req.body;

  if (!stat) {
    res.status(400).json({ error: "Podaj nazwę statystyki" });
    return;
  }

  try {
    const result = await upgradeStat(req.userId!, stat);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function getUpgradeCostsEndpoint(req: Request, res: Response) {
  try {
    const result = await getUpgradeCosts(req.userId!);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}