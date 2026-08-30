import { Request, Response } from "express";
import {
  getNotebookMeta,
  getNotebookOverview,
  getNotebookEntities,
  getNotebookItems,
  getNotebookWorlds,
  getNotebookRankings,
} from "../services/notebook.service.js";

async function handle(res: Response, fn: () => Promise<any>) {
  try { res.json(await fn()); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
}

export const getMeta      = (req: Request, res: Response) => handle(res, () => getNotebookMeta(req.userId!));
export const getOverview  = (req: Request, res: Response) => handle(res, () => getNotebookOverview(req.userId!));
export const getEntities  = (req: Request, res: Response) => handle(res, () => getNotebookEntities(req.userId!));
export const getItems     = (req: Request, res: Response) => handle(res, () => {
  const tier = req.query.tier ? parseInt(req.query.tier as string, 10) : 1;
  return getNotebookItems(req.userId!, tier);
});
export const getWorlds    = (req: Request, res: Response) => handle(res, () => getNotebookWorlds(req.userId!));
export const getRankings  = (req: Request, res: Response) => handle(res, () => getNotebookRankings(req.userId!));