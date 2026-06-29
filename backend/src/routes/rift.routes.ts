// ═══════════════════════════════════════════════════════════════════
// RIFT ROUTER
// src/routes/rift.routes.ts
// ═══════════════════════════════════════════════════════════════════

import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import * as C from "../controllers/rift.controller.js";

const router = Router();

// ── Historia wypraw ──────────────────────────────────────────────
router.get("/history",                                    requireAuth, C.getRiftHistory);
router.get("/history/:runId", requireAuth, C.getRiftRunDetails);

// ── Niestabilne (solo) ───────────────────────────────────────────
router.get("/unstable",                                   requireAuth, C.getUnstableRift);
router.delete("/unstable",                                requireAuth, C.dismissUnstableRift);
router.post("/unstable/enter",                            requireAuth, C.enterUnstableRift);
router.get("/unstable/run/:runId",                        requireAuth, C.getRiftRunState);
router.post("/unstable/run/:runId/choose",                requireAuth, C.makeRiftChoice);

// ── Stabilne (grupowe) ───────────────────────────────────────────
router.get("/stable/parties",                             requireAuth, C.getSchoolRiftParties);
router.post("/stable/parties",                            requireAuth, C.createParty);
router.get("/stable/parties/:partyId",                    requireAuth, C.getParty);
router.post("/stable/parties/:partyId/join",              requireAuth, C.joinParty);
router.patch("/stable/parties/:partyId/members/:memberId", requireAuth, C.reviewMember);
router.post("/stable/parties/:partyId/launch",            requireAuth, C.launchParty);

export default router;