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
      fireElement: 0, earthElement: 0, airElement: 0,
      waterElement: 0, chaos: 0, castSpeed: 0, endurance: 0,
    };

    if (itemIds.length > 0) {
      const items = await prisma.item.findMany({ where: { id: { in: itemIds } } });
      for (const item of items) {
        bonuses.fireElement  += item.bonusFire;
        bonuses.waterElement += item.bonusWater;
        bonuses.earthElement += item.bonusEarth;
        bonuses.airElement   += item.bonusAir;
        bonuses.chaos        += item.bonusChaos;
        bonuses.endurance    += item.bonusEndurance;
        bonuses.castSpeed    += item.bonusCastSpeed;
        bonuses.power        += item.bonusPower;
      }
    }

    res.json({
      base: {
        knowledge:    character.knowledge,
        intelligence: character.intelligence,
        power:        character.power,
        fireElement:  character.fireElement,
        earthElement: character.earthElement,
        airElement:   character.airElement,
        waterElement: character.waterElement,
        chaos:        character.chaos,
        castSpeed:    character.castSpeed,
        endurance:    character.endurance,
      },
      bonuses,
      effective: {
        knowledge:    character.knowledge    + bonuses.knowledge,
        intelligence: character.intelligence + bonuses.intelligence,
        power:        character.power        + bonuses.power,
        fireElement:  character.fireElement  + bonuses.fireElement,
        earthElement: character.earthElement + bonuses.earthElement,
        airElement:   character.airElement   + bonuses.airElement,
        waterElement: character.waterElement + bonuses.waterElement,
        chaos:        character.chaos        + bonuses.chaos,
        castSpeed:    character.castSpeed    + bonuses.castSpeed,
        endurance:    character.endurance    + bonuses.endurance,
      },
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}