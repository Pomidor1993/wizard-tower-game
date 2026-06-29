import { Request, Response } from "express";
import {
  getTowerInfo,
  startTowerUpgrade, claimTowerUpgrade,
  startPowerCollectorUpgrade, claimPowerCollectorUpgrade,
  startLibraryUpgrade, claimLibraryUpgrade,
  startTrophyCabinetUpgrade, claimTrophyCabinetUpgrade,
  startMagicNotebookUpgrade, claimMagicNotebookUpgrade,
  startAltairUpgrade, claimAltairUpgrade,
  startChaosVaultUpgrade, claimChaosVaultUpgrade,
  startDisintegratorUpgrade, claimDisintegratorUpgrade,
} from "../services/tower.service.js";
import { getChaosVault } from "../services/chaos_vault.service.js";
import { previewDisintegrate, confirmDisintegrate } from "../services/disintegrator.service.js";
import { setAltairElement } from "../services/tower.service.js";

async function handle(res: Response, fn: () => Promise<any>) {
  try { res.json(await fn()); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
}

export const getTower                    = (req: Request, res: Response) => handle(res, () => getTowerInfo(req.userId!));
export const upgradeTower                = (req: Request, res: Response) => handle(res, () => startTowerUpgrade(req.userId!));
export const claimTower                  = (req: Request, res: Response) => handle(res, () => claimTowerUpgrade(req.userId!));
export const upgradePowerCollector       = (req: Request, res: Response) => handle(res, () => startPowerCollectorUpgrade(req.userId!));
export const claimPowerCollector         = (req: Request, res: Response) => handle(res, () => claimPowerCollectorUpgrade(req.userId!));
export const upgradeLibrary              = (req: Request, res: Response) => handle(res, () => startLibraryUpgrade(req.userId!));
export const claimLibrary                = (req: Request, res: Response) => handle(res, () => claimLibraryUpgrade(req.userId!));
export const upgradeTrophyCabinet           = (req: Request, res: Response) => handle(res, () => startTrophyCabinetUpgrade(req.userId!));
export const claimTrophyCabinet             = (req: Request, res: Response) => handle(res, () => claimTrophyCabinetUpgrade(req.userId!));
export const upgradeMagicNotebook        = (req: Request, res: Response) => handle(res, () => startMagicNotebookUpgrade(req.userId!));
export const claimMagicNotebook          = (req: Request, res: Response) => handle(res, () => claimMagicNotebookUpgrade(req.userId!));
export const upgradeAltair               = (req: Request, res: Response) => handle(res, () => startAltairUpgrade(req.userId!));
export const claimAltair                 = (req: Request, res: Response) => handle(res, () => claimAltairUpgrade(req.userId!));
export const selectAltairElement = (req: Request, res: Response) =>
  handle(res, () => setAltairElement(req.userId!, req.body.pairIndex, req.body.element));
export const upgradeChaosVault = (req: Request, res: Response) => handle(res, () => startChaosVaultUpgrade(req.userId!));
export const claimChaosVault   = (req: Request, res: Response) => handle(res, () => claimChaosVaultUpgrade(req.userId!));
export const getVault          = (req: Request, res: Response) => handle(res, () => getChaosVault(req.userId!));

export const upgradeDisintegrator = (req: Request, res: Response) =>
  handle(res, () => startDisintegratorUpgrade(req.userId!));
export const claimDisintegrator = (req: Request, res: Response) =>
  handle(res, () => claimDisintegratorUpgrade(req.userId!));
export const previewDisintegratorEndpoint = (req: Request, res: Response) =>
  handle(res, () => previewDisintegrate(req.userId!, req.body.targets, req.body.currency));
export const confirmDisintegratorEndpoint = (req: Request, res: Response) =>
  handle(res, () => confirmDisintegrate(req.userId!, req.body.targets, req.body.currency));