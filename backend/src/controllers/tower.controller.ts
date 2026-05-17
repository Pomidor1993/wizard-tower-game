import { Request, Response } from "express";
import {
  getTowerInfo,
  startTowerUpgrade, claimTowerUpgrade,
  startPowerCollectorUpgrade, claimPowerCollectorUpgrade,
  startStorageUpgrade, claimStorageUpgrade,
  startLibraryUpgrade, claimLibraryUpgrade,
  startMagicHandsUpgrade, claimMagicHandsUpgrade,
  startSpyOrbUpgrade, claimSpyOrbUpgrade,
  startCandlesUpgrade, claimCandlesUpgrade,
} from "../services/tower.service.js";

async function handle(res: Response, fn: () => Promise<any>) {
  try { res.json(await fn()); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
}

export const getTower                    = (req: Request, res: Response) => handle(res, () => getTowerInfo(req.userId!));
export const upgradeTower                = (req: Request, res: Response) => handle(res, () => startTowerUpgrade(req.userId!));
export const claimTower                  = (req: Request, res: Response) => handle(res, () => claimTowerUpgrade(req.userId!));
export const upgradePowerCollector       = (req: Request, res: Response) => handle(res, () => startPowerCollectorUpgrade(req.userId!));
export const claimPowerCollector         = (req: Request, res: Response) => handle(res, () => claimPowerCollectorUpgrade(req.userId!));
export const upgradeStorage              = (req: Request, res: Response) => handle(res, () => startStorageUpgrade(req.userId!));
export const claimStorage                = (req: Request, res: Response) => handle(res, () => claimStorageUpgrade(req.userId!));
export const upgradeLibrary              = (req: Request, res: Response) => handle(res, () => startLibraryUpgrade(req.userId!));
export const claimLibrary                = (req: Request, res: Response) => handle(res, () => claimLibraryUpgrade(req.userId!));
export const upgradeMagicHands           = (req: Request, res: Response) => handle(res, () => startMagicHandsUpgrade(req.userId!));
export const claimMagicHands             = (req: Request, res: Response) => handle(res, () => claimMagicHandsUpgrade(req.userId!));
export const upgradeSpyOrb               = (req: Request, res: Response) => handle(res, () => startSpyOrbUpgrade(req.userId!));
export const claimSpyOrb                 = (req: Request, res: Response) => handle(res, () => claimSpyOrbUpgrade(req.userId!));
export const upgradeCandles              = (req: Request, res: Response) => handle(res, () => startCandlesUpgrade(req.userId!));
export const claimCandles                = (req: Request, res: Response) => handle(res, () => claimCandlesUpgrade(req.userId!));