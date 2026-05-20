import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { upgradeStat, getUpgradeCosts } from "../services/character.service.js";

export async function getMyCharacter(req: Request, res: Response) {
  const character = await prisma.character.findUnique({
    where: { userId: req.userId },
    include: {
      tower: { include: { buildings: true } },
    },
  });

  if (!character) {
    res.status(404).json({ error: "Postać nie znaleziona" });
    return;
  }

  res.json(character);
}

export async function upgradeStatEndpoint(req: Request, res: Response) {
  const { stat } = req.body;

  if (!stat) {
    res.status(400).json({ error: "Podaj nazwę statystyki" });
    return;
  }

  try {
    const result = await upgradeStat(req.userId!, stat);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function getUpgradeCostsEndpoint(req: Request, res: Response) {
  try {
    const result = await getUpgradeCosts(req.userId!);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function getEffectiveStats(req: Request, res: Response) {
  try {
    const character = await prisma.character.findUnique({
      where: { userId: req.userId },
      include: {
        equipment: true,
      },
    });

    if (!character) { res.status(404).json({ error: "Postać nie znaleziona" }); return; }

    // Zbierz id założonych przedmiotów
    const eq = character.equipment;
    const itemIds = [
      eq?.robeId, eq?.bootsId, eq?.hatId,
      eq?.amuletId, eq?.mainHandId, eq?.offHandId,
    ].filter(Boolean) as number[];

    // Pobierz bonusy z przedmiotów
    let bonuses = {
      knowledge: 0, intelligence: 0, power: 0,
      endurance: 0, resistance: 0, initiative: 0,
      fireMagic: 0, earthMagic: 0, airMagic: 0,
      waterMagic: 0, chaosMagic: 0, energyMagic: 0, 
      lifeMagic: 0, deathMagic: 0,
    };

    if (itemIds.length > 0) {
      const items = await prisma.item.findMany({ where: { id: { in: itemIds } } });
      for (const item of items) {
        bonuses.knowledge  += item.bonusKnowledge;
        bonuses.intelligence += item.bonusIntelligence;
        bonuses.power      += item.bonusPower;
        bonuses.endurance  += item.bonusEndurance;
        bonuses.resistance += item.bonusResistance;
        bonuses.initiative += item.bonusInitiative;
        bonuses.fireMagic += item.bonusFireMagic;
        bonuses.waterMagic += item.bonusWaterMagic;
        bonuses.earthMagic += item.bonusEarthMagic;
        bonuses.airMagic   += item.bonusAirMagic;
        bonuses.lifeMagic   += item.bonusLifeMagic;
        bonuses.deathMagic  += item.bonusDeathMagic;
        bonuses.chaosMagic  += item.bonusChaosMagic;
        bonuses.energyMagic += item.bonusEnergyMagic;

      }
    }

    res.json({
      base: {
        knowledge:    character.knowledge,
        intelligence: character.intelligence,
        power:        character.power,
        endurance:    character.endurance,
        resistance:   character.resistance,
        initiative:   character.initiative,
        fireMagic:    character.fireMagic,
        waterMagic:   character.waterMagic,
        earthMagic:   character.earthMagic,
        airMagic:     character.airMagic,
        lifeMagic:    character.lifeMagic,
        deathMagic:   character.deathMagic,
        chaosMagic:   character.chaosMagic,
        energyMagic:  character.energyMagic,
      },
      bonuses,
      effective: {
        knowledge:    character.knowledge    + bonuses.knowledge,
        intelligence: character.intelligence + bonuses.intelligence,
        power:        character.power        + bonuses.power,
        endurance:    character.endurance    + bonuses.endurance,
        resistance:   character.resistance   + bonuses.resistance,
        initiative:   character.initiative   + bonuses.initiative,
        fireMagic:    character.fireMagic    + bonuses.fireMagic,
        waterMagic:   character.waterMagic   + bonuses.waterMagic,
        earthMagic:   character.earthMagic   + bonuses.earthMagic,
        airMagic:     character.airMagic     + bonuses.airMagic,
        lifeMagic:    character.lifeMagic    + bonuses.lifeMagic,
        deathMagic:   character.deathMagic   + bonuses.deathMagic,
        chaosMagic:   character.chaosMagic   + bonuses.chaosMagic,
        energyMagic:  character.energyMagic  + bonuses.energyMagic,
      },
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}