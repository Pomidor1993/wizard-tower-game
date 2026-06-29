// ═══════════════════════════════════════════════════════════════════
// RIFT CONTROLLER
// src/controllers/rift.controller.ts
// ═══════════════════════════════════════════════════════════════════

import { Request, Response } from "express";
import * as RiftService from "../services/rift.service.js";
import * as RiftGroupService from "../services/rift-group.service.js";

// ═══════════════════════════════════════════════════════════════════
// NIESTABILNE SZCZELINY (solo)
// ═══════════════════════════════════════════════════════════════════

// GET /rifts/unstable
export async function getUnstableRift(req: Request, res: Response) {
  try {
    const result = await RiftService.getUnstableRift(req.userId!);
    res.json(result ?? { rift: null });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

// DELETE /rifts/unstable
export async function dismissUnstableRift(req: Request, res: Response) {
  try {
    await RiftService.dismissUnstableRift(req.userId!);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

// POST /rifts/unstable/enter
export async function enterUnstableRift(req: Request, res: Response) {
  try {
    const result = await RiftService.enterUnstableRift(req.userId!);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

// GET /rifts/unstable/run/:runId
export async function getRiftRunState(req: Request, res: Response) {
  try {
    const runId = parseInt(req.params.runId);
    if (isNaN(runId)) { res.status(400).json({ error: "Nieprawidłowe ID wyprawy" }); return; }
    const result = await RiftService.getRiftRunState(req.userId!, runId);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

// POST /rifts/unstable/run/:runId/choose
export async function makeRiftChoice(req: Request, res: Response) {
  try {
    const runId = parseInt(req.params.runId);
    if (isNaN(runId)) { res.status(400).json({ error: "Nieprawidłowe ID wyprawy" }); return; }

    const { choiceKey } = req.body;
    if (!choiceKey || !["A", "B", "C"].includes(choiceKey)) {
      res.status(400).json({ error: "Podaj prawidłowy klucz wyboru: A, B lub C" });
      return;
    }

    const result = await RiftService.makeRiftChoice(req.userId!, runId, choiceKey);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

// GET /rifts/history
export async function getRiftHistory(req: Request, res: Response) {
  try {
    const result = await RiftService.getRiftHistory(req.userId!);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

// ═══════════════════════════════════════════════════════════════════
// STABILNE SZCZELINY (grupowe)
// ═══════════════════════════════════════════════════════════════════

// GET /rifts/stable/parties
export async function getSchoolRiftParties(req: Request, res: Response) {
  try {
    const result = await RiftGroupService.getSchoolRiftParties(req.userId!);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

// POST /rifts/stable/parties
export async function createParty(req: Request, res: Response) {
  try {
    const { riftKey } = req.body;
    if (!riftKey) { res.status(400).json({ error: "Podaj riftKey" }); return; }
    const result = await RiftGroupService.createStableRiftParty(req.userId!, riftKey);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

// GET /rifts/stable/parties/:partyId
export async function getParty(req: Request, res: Response) {
  try {
    const partyId = parseInt(req.params.partyId);
    if (isNaN(partyId)) { res.status(400).json({ error: "Nieprawidłowe ID drużyny" }); return; }
    const result = await RiftGroupService.getStableRiftParty(req.userId!, partyId);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

// POST /rifts/stable/parties/:partyId/join
export async function joinParty(req: Request, res: Response) {
  try {
    const partyId = parseInt(req.params.partyId);
    if (isNaN(partyId)) { res.status(400).json({ error: "Nieprawidłowe ID drużyny" }); return; }
    const result = await RiftGroupService.requestJoinParty(req.userId!, partyId);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

// PATCH /rifts/stable/parties/:partyId/members/:memberId
export async function reviewMember(req: Request, res: Response) {
  try {
    const partyId = parseInt(req.params.partyId);
    const memberId = parseInt(req.params.memberId);
    if (isNaN(partyId) || isNaN(memberId)) {
      res.status(400).json({ error: "Nieprawidłowe ID" });
      return;
    }

    const { action } = req.body;
    if (!action || !["accept", "reject"].includes(action)) {
      res.status(400).json({ error: "Podaj action: accept lub reject" });
      return;
    }

    const result = await RiftGroupService.reviewPartyMember(req.userId!, partyId, memberId, action);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

// POST /rifts/stable/parties/:partyId/launch
export async function launchParty(req: Request, res: Response) {
  try {
    const partyId = parseInt(req.params.partyId);
    if (isNaN(partyId)) { res.status(400).json({ error: "Nieprawidłowe ID drużyny" }); return; }
    const result = await RiftGroupService.launchStableRiftParty(req.userId!, partyId);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

export async function getRiftRunDetails(req: Request, res: Response) {
  try {
    const runId = parseInt(req.params.runId);
    if (isNaN(runId)) { res.status(400).json({ error: "Nieprawidłowe ID" }); return; }
    const result = await RiftService.getRiftRunDetails(req.userId!, runId);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}