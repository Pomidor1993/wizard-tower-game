import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { getPlayerProfile } from "../services/profile.service.js";

async function resolveCharacterId(userId: number): Promise<number> {
  const character = await prisma.character.findUnique({ where: { userId }, select: { id: true } });
  if (!character) throw new Error("Postać nie znaleziona");
  return character.id;
}

// GET /api/profile/:characterId
export async function getPlayerProfileEndpoint(req: Request, res: Response) {
  try {
    const viewerCharacterId = await resolveCharacterId(req.userId!);
    const targetCharacterId = parseInt(req.params.characterId as string, 10);

    if (Number.isNaN(targetCharacterId)) {
      res.status(400).json({ error: "Nieprawidłowe ID postaci" });
      return;
    }

    const profile = await getPlayerProfile(viewerCharacterId, targetCharacterId);
    res.json(profile);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
}