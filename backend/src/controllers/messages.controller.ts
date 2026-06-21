import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import {
  getSystemMessages,
  markSystemMessageRead,
  markAllSystemMessagesRead,
  setSystemMessageSaved,
  deleteSystemMessage,
  SystemMessageType,
} from "../services/system-messages.service.js";

const VALID_TYPES: SystemMessageType[] = ["random", "levelup", "tutorial"];

async function resolveCharacterId(userId: number): Promise<number> {
  const character = await prisma.character.findUnique({ where: { userId }, select: { id: true } });
  if (!character) throw new Error("Postać nie znaleziona");
  return character.id;
}

// GET /api/messages/system?type=random&savedOnly=true&page=1&pageSize=20
export async function getSystemMessagesEndpoint(req: Request, res: Response) {
  try {
    const characterId = await resolveCharacterId(req.userId!);

    const type = req.query.type as string | undefined;
    if (type && !VALID_TYPES.includes(type as SystemMessageType)) {
      res.status(400).json({ error: `Nieznany typ wiadomości. Dostępne: ${VALID_TYPES.join(", ")}` });
      return;
    }

    const result = await getSystemMessages(characterId, {
      type: type as SystemMessageType | undefined,
      savedOnly: req.query.savedOnly === "true",
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

// PATCH /api/messages/system/:id/read
export async function markSystemMessageReadEndpoint(req: Request, res: Response) {
  try {
    const characterId = await resolveCharacterId(req.userId!);
    const messageId = parseInt(req.params.id as string, 10);
    const message = await markSystemMessageRead(characterId, messageId);
    res.json(message);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

// PATCH /api/messages/system/read-all
export async function markAllSystemMessagesReadEndpoint(req: Request, res: Response) {
  try {
    const characterId = await resolveCharacterId(req.userId!);
    await markAllSystemMessagesRead(characterId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

// PATCH /api/messages/system/:id/save  body: { isSaved: boolean }
export async function setSystemMessageSavedEndpoint(req: Request, res: Response) {
  try {
    const characterId = await resolveCharacterId(req.userId!);
    const messageId = parseInt(req.params.id as string, 10);
    const { isSaved } = req.body;

    if (typeof isSaved !== "boolean") {
      res.status(400).json({ error: "Pole 'isSaved' musi być wartością logiczną" });
      return;
    }

    const message = await setSystemMessageSaved(characterId, messageId, isSaved);
    res.json(message);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

// DELETE /api/messages/system/:id
export async function deleteSystemMessageEndpoint(req: Request, res: Response) {
  try {
    const characterId = await resolveCharacterId(req.userId!);
    const messageId = parseInt(req.params.id as string, 10);
    await deleteSystemMessage(characterId, messageId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}