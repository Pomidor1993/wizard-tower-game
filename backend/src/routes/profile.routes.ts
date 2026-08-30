import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getPlayerProfileEndpoint, updateAvatarEndpoint } from "../controllers/profile.controller.js";

const router = Router();

// GET /api/profile/:characterId
router.get("/:characterId", requireAuth, getPlayerProfileEndpoint);

// PATCH /api/profile/avatar
router.patch("/avatar", requireAuth, updateAvatarEndpoint);

export default router;