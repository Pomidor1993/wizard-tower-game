import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getConversationsEndpoint,
  getConversationMessagesEndpoint,
  sendPrivateMessageEndpoint,
  setPrivateMessageSavedEndpoint,
  deleteConversationEndpoint,
  getUnreadPrivateMessageCountEndpoint,
  blockPlayerEndpoint,
  unblockPlayerEndpoint,
  getBlockedPlayersEndpoint,
} from "../controllers/private-messages.controller.js";

const router = Router();

// GET /api/messages/private — lista wątków (skrzynka odbiorcza)
router.get("/", requireAuth, getConversationsEndpoint);

// GET /api/messages/private/unread-count
router.get("/unread-count", requireAuth, getUnreadPrivateMessageCountEndpoint);

// ── Blokowanie — przed routami z :characterId, żeby "block" nie był brany za ID
router.get("/block", requireAuth, getBlockedPlayersEndpoint);
router.post("/block/:characterId", requireAuth, blockPlayerEndpoint);
router.delete("/block/:characterId", requireAuth, unblockPlayerEndpoint);

// GET /api/messages/private/:characterId?page=1&pageSize=50 — wiadomości w wątku z graczem
router.get("/:characterId", requireAuth, getConversationMessagesEndpoint);

// POST /api/messages/private/:characterId  body: { content: string }
router.post("/:characterId", requireAuth, sendPrivateMessageEndpoint);

// DELETE /api/messages/private/:characterId — usuwa cały wątek
router.delete("/:characterId", requireAuth, deleteConversationEndpoint);

// PATCH /api/messages/private/message/:id/save  body: { isSaved: boolean }
router.patch("/message/:id/save", requireAuth, setPrivateMessageSavedEndpoint);

export default router;