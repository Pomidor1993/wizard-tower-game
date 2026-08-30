import { Request, Response } from "express";
import {
  startStudyAction,
  claimStudyAction,
  getActiveActions,
} from "../services/study.service.js";
import { startExploration, claimExploration } from "../services/exploration.service.js";



export async function startStudy(req: Request, res: Response) {
  const level = parseInt(req.body.level) || 1;
  const subcategory = parseInt(req.body.subcategory) || 1; // ← dodaj

  try {
    const result = await startStudyAction(req.userId!, level, subcategory as 1 | 2 | 3); // ← dodaj subcategory
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function claimStudy(req: Request, res: Response) {
  const actionId = parseInt(req.params.actionId);
  try {
    const result = await claimStudyAction(req.userId!, actionId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function getActions(req: Request, res: Response) {
  try {
    const result = await getActiveActions(req.userId!);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function startExplorationAction(req: Request, res: Response) {
  const level = parseInt(req.body.level) || 1;
  const location = (req.body.location ?? "A") as "A" | "B" | "C";  // ← nowy parametr

  try {
    const result = await startExploration(req.userId!, level, location);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function claimExplorationAction(req: Request, res: Response) {
  const actionId = parseInt(req.params.actionId);
  try {
    const result = await claimExploration(req.userId!, actionId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}