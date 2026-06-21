import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import {
  sendPrivateMessage,
  getConversations,
  getConversationMessages,
  setPrivateMessageSaved,
  deleteConversation,
  blockPlayer,
  unblockPlayer,
  getBlockedPlayers,
  getUnreadPrivateMessageCount,
} from "../services/private-messages.service.js";

async function resolveCharacterId(userId: number): Promise<number> {
  const character = await prisma.character.findUnique({ where: { userId }, select: { id: true } });
  if (!character) throw new Error("Postać nie znaleziona");
  return character.id;
}

// GET /api/messages/private — lista wątków
export async function getConversationsEndpoint(req: Request, res: Response) {
  try {
    const characterId = await resolveCharacterId(req.userId!);
    const conversations = await getConversations(characterId);
    res.json(conversations);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

// GET /api/messages/private/:characterId?page=1&pageSize=50 — wiadomości w wątku
export async function getConversationMessagesEndpoint(req: Request, res: Response) {
  try {
    const characterId = await resolveCharacterId(req.userId!);
    const otherCharacterId = parseInt(req.params.characterId as string, 10);

    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 50;

    const result = await getConversationMessages(characterId, otherCharacterId, page, pageSize);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

// POST /api/messages/private/:characterId  body: { content: string }
export async function sendPrivateMessageEndpoint(req: Request, res: Response) {
  try {
    const characterId = await resolveCharacterId(req.userId!);
    const receiverId = parseInt(req.params.characterId as string, 10);
    const { content } = req.body;

    if (typeof content !== "string") {
      res.status(400).json({ error: "Pole 'content' jest wymagane" });
      return;
    }

    const message = await sendPrivateMessage(characterId, receiverId, content);
    res.status(201).json(message);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

// PATCH /api/messages/private/:id/save  body: { isSaved: boolean }
export async function setPrivateMessageSavedEndpoint(req: Request, res: Response) {
  try {
    const characterId = await resolveCharacterId(req.userId!);
    const messageId = parseInt(req.params.id as string, 10);
    const { isSaved } = req.body;

    if (typeof isSaved !== "boolean") {
      res.status(400).json({ error: "Pole 'isSaved' musi być wartością logiczną" });
      return;
    }

    const message = await setPrivateMessageSaved(characterId, messageId, isSaved);
    res.json(message);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

// DELETE /api/messages/private/:characterId — usuwa cały wątek z danym graczem
export async function deleteConversationEndpoint(req: Request, res: Response) {
  try {
    const characterId = await resolveCharacterId(req.userId!);
    const otherCharacterId = parseInt(req.params.characterId as string, 10);
    await deleteConversation(characterId, otherCharacterId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

// GET /api/messages/private/unread-count
export async function getUnreadPrivateMessageCountEndpoint(req: Request, res: Response) {
  try {
    const characterId = await resolveCharacterId(req.userId!);
    const count = await getUnreadPrivateMessageCount(characterId);
    res.json({ unreadCount: count });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

// ── BLOKOWANIE ──────────────────────────────────────────────────────

// POST /api/messages/block/:characterId
export async function blockPlayerEndpoint(req: Request, res: Response) {
  try {
    const characterId = await resolveCharacterId(req.userId!);
    const targetId = parseInt(req.params.characterId as string, 10);
    const result = await blockPlayer(characterId, targetId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

// DELETE /api/messages/block/:characterId
export async function unblockPlayerEndpoint(req: Request, res: Response) {
  try {
    const characterId = await resolveCharacterId(req.userId!);
    const targetId = parseInt(req.params.characterId as string, 10);
    const result = await unblockPlayer(characterId, targetId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

// GET /api/messages/block
export async function getBlockedPlayersEndpoint(req: Request, res: Response) {
  try {
    const characterId = await resolveCharacterId(req.userId!);
    const blocked = await getBlockedPlayers(characterId);
    res.json(blocked);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}