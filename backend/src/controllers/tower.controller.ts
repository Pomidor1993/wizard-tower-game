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
  startChaosVaultUpgrade, claimChaosVaultUpgrade,
  startDisintegratorUpgrade, claimDisintegratorUpgrade,
} from "../services/tower.service.js";
import { getChaosVault, moveSpellFromVault, moveItemFromVault, addToVaultFromInventory } from "../services/chaos_vault.service.js";
import { previewDisintegrate, confirmDisintegrate } from "../services/disintegrator.service.js";


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


export const upgradeChaosVault = (req: Request, res: Response) => handle(res, () => startChaosVaultUpgrade(req.userId!));
export const claimChaosVault   = (req: Request, res: Response) => handle(res, () => claimChaosVaultUpgrade(req.userId!));
export const getVault          = (req: Request, res: Response) => handle(res, () => getChaosVault(req.userId!));
export const moveSpell         = (req: Request, res: Response) => handle(res, () =>
  moveSpellFromVault(req.userId!, parseInt(req.body.vaultItemId), req.body.replaceSpellId ? parseInt(req.body.replaceSpellId) : undefined)
);
export const moveItem          = (req: Request, res: Response) => handle(res, () =>
  moveItemFromVault(req.userId!, parseInt(req.body.vaultItemId), req.body.replaceItemId ? parseInt(req.body.replaceItemId) : undefined)
);
export const addToVault = (req: Request, res: Response) => handle(res, () =>
  addToVaultFromInventory(req.userId!, req.body.type, parseInt(req.body.sourceId))
);

export const upgradeDisintegrator = (req: Request, res: Response) =>
  handle(res, () => startDisintegratorUpgrade(req.userId!));
export const claimDisintegrator = (req: Request, res: Response) =>
  handle(res, () => claimDisintegratorUpgrade(req.userId!));
export const previewDisintegratorEndpoint = (req: Request, res: Response) =>
  handle(res, () => previewDisintegrate(req.userId!, req.body.targets));
export const confirmDisintegratorEndpoint = (req: Request, res: Response) =>
  handle(res, () => confirmDisintegrate(req.userId!, req.body.targets));