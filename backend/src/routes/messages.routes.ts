import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getSystemMessagesEndpoint,
  markSystemMessageReadEndpoint,
  markAllSystemMessagesReadEndpoint,
  setSystemMessageSavedEndpoint,
  deleteSystemMessageEndpoint,
  markSystemMessageUnreadEndpoint,
} from "../controllers/messages.controller.js";

const router = Router();

// GET /api/messages/system?type=random|levelup|tutorial&savedOnly=true&page=1&pageSize=20
router.get("/", requireAuth, getSystemMessagesEndpoint);

// PATCH /api/messages/system/read-all
router.patch("/read-all", requireAuth, markAllSystemMessagesReadEndpoint);

// PATCH /api/messages/system/:id/read
router.patch("/:id/read", requireAuth, markSystemMessageReadEndpoint);

// PATCH /api/messages/system/:id/save  body: { isSaved: boolean }
router.patch("/:id/save", requireAuth, setSystemMessageSavedEndpoint);

router.patch("/:id/unread", requireAuth, markSystemMessageUnreadEndpoint);

// DELETE /api/messages/system/:id
router.delete("/:id", requireAuth, deleteSystemMessageEndpoint);


export default router;