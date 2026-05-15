import { Request, Response } from "express";
import prisma from "../lib/prisma.js";

export async function getMyCharacter(req: Request, res: Response) {
  const character = await prisma.character.findUnique({
    where: { userId: req.userId },
    include: {
      tower: {
        include: { buildings: true },
      },
    },
  });

  if (!character) {
    res.status(404).json({ error: "Postać nie znaleziona" });
    return;
  }

  res.json(character);
}