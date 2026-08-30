import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { getPlayerProfile } from "../services/profile.service.js";
import { updateAvatar } from "../services/profile.service.js";

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

export async function updateAvatarEndpoint(req: Request, res: Response) {
  const userId = req.userId; // zakładam, że req.user jest ustawiany przez auth middleware
  if (!userId) return res.status(401).json({ error: "Nie zalogowany" });

  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) return res.status(404).json({ error: "Postać nie znaleziona" });

  const { avatarIndex } = req.body;
  if (typeof avatarIndex !== "number" || avatarIndex < 0 || avatarIndex > 20) {
    return res.status(400).json({ error: "Nieprawidłowy numer awatara (0–20)" });
  }

  await updateAvatar(character.id, avatarIndex);
  res.json({ success: true, avatarIndex });
}