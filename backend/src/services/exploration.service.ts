import prisma from "../lib/prisma.js";
import { calculateRegenActions } from "./action.service.js";

// ── KONFIGURACJA ─────────────────────────────────────
const EXPLORATION_CONFIG = [
  { level: 1, durationSeconds: 5, minPoints: 10, maxPoints: 20,  itemChance: 0.90, encounterChance: 0.05, requiredStat: 0  },
  { level: 2, durationSeconds: 240, minPoints: 20, maxPoints: 40,  itemChance: 0.20, encounterChance: 0.10, requiredStat: 5  },
  { level: 3, durationSeconds: 360, minPoints: 40, maxPoints: 60,  itemChance: 0.30, encounterChance: 0.00, requiredStat: 10 },
  { level: 4, durationSeconds: 480, minPoints: 60, maxPoints: 80,  itemChance: 0.20, encounterChance: 0.40, requiredStat: 20 },
  { level: 5, durationSeconds: 600, minPoints: 70, maxPoints: 90,  itemChance: 0.40, encounterChance: 0.50, requiredStat: 35 },
];

const EXPLORATION_MAX = 15;
const EXPLORATION_REGEN_SECONDS = 60 * 60; // 60 minut

// Siła przeciwnika zależna od poziomu eksploracji
const ENCOUNTER_ENEMY_POWER = [10, 25, 0, 60, 100];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChance(chance: number): boolean {
  return Math.random() < chance;
}

// ── ROZPOCZĘCIE EKSPLORACJI ──────────────────────────
export async function startExploration(userId: number, level: number) {
  const config = EXPLORATION_CONFIG[level - 1];
  if (!config) throw new Error("Nieprawidłowy poziom eksploracji");

  const character = await prisma.character.findUnique({
    where: { userId },
  });

  if (!character) throw new Error("Postać nie znaleziona");

  // Sprawdź wymagania statystyk (suma wszystkich żywiołów)
  const totalElements =
    character.fireMagic +
    character.earthMagic +
    character.airMagic +
    character.waterMagic +
    character.chaosMagic +
    character.energyMagic +
    character.lifeMagic +
    character.deathMagic;

  if (totalElements < config.requiredStat) {
    throw new Error(
      `Wymagana suma żywiołów: ${config.requiredStat} (masz: ${totalElements})`
    );
  }

  // Przelicz regenerację
  const { newActions, newLastRegen } = calculateRegenActions(
    character.explorationActions,
    character.lastExploreRegen,
    EXPLORATION_MAX,
    EXPLORATION_REGEN_SECONDS
  );

  if (newActions <= 0) {
    throw new Error("Brak dostępnych akcji eksploracji. Poczekaj na odnowienie.");
  }

  // Sprawdź czy nie ma aktywnej dowolnej akcji
const activeAction = await prisma.characterAction.findFirst({
  where: {
    characterId: character.id,
    status: "in_progress",
  },
});

if (activeAction) {
  const typeLabel = activeAction.actionType === "study" ? "studiów" : "eksploracji";
  throw new Error(`Masz już aktywną akcję ${typeLabel}. Poczekaj na jej zakończenie.`);
}

  if (activeAction) throw new Error("Masz już aktywną eksplorację");

  const finishesAt = new Date(Date.now() + config.durationSeconds * 1000);

  const [action] = await prisma.$transaction([
    prisma.characterAction.create({
      data: {
        characterId: character.id,
        actionType: "exploration",
        actionLevel: level,
        status: "in_progress",
        finishesAt,
      },
    }),
    prisma.character.update({
      where: { id: character.id },
      data: {
        explorationActions: newActions - 1,
        lastExploreRegen: newLastRegen,
      },
    }),
  ]);

  return {
    actionId: action.id,
    level,
    finishesAt,
    actionsRemaining: newActions - 1,
  };
}

// ── ZAKOŃCZENIE EKSPLORACJI ──────────────────────────
export async function claimExploration(userId: number, actionId: number) {
  const character = await prisma.character.findUnique({
    where: { userId },
  });

  if (!character) throw new Error("Postać nie znaleziona");

  const action = await prisma.characterAction.findFirst({
    where: { id: actionId, characterId: character.id },
  });

  if (!action) throw new Error("Akcja nie znaleziona");
  if (action.status === "claimed") throw new Error("Akcja już odebrana");
  if (action.status === "in_progress" && new Date() < action.finishesAt) {
    throw new Error("Eksploracja jeszcze trwa");
  }

  const config = EXPLORATION_CONFIG[action.actionLevel - 1];
  const skillPointsEarned = randomInt(config.minPoints, config.maxPoints);

  // Losuj przedmiot
  let foundItem = null;
  if (randomChance(config.itemChance)) {
    const items = await prisma.item.findMany({
      where: { reqKnowledge: { lte: character.knowledge } },
    });
    if (items.length > 0) {
      foundItem = items[randomInt(0, items.length - 1)];
    }
  }

  // Losuj spotkanie
  let encounter = null;
  if (randomChance(config.encounterChance)) {
    const enemyPower = ENCOUNTER_ENEMY_POWER[action.actionLevel - 1];
    const playerPower =
      character.endurance +
      character.resistance +
      character.initiative +
      character.power +
      character.fireMagic +
      character.earthMagic +
      character.airMagic +
      character.waterMagic +
      character.chaosMagic +
      character.energyMagic +
      character.lifeMagic +
      character.deathMagic;

    const playerWon = playerPower >= enemyPower || randomChance(0.3);

    encounter = {
      enemyPower,
      playerPower,
      playerWon,
      result: playerWon
        ? "Pokonałeś magiczne stworzenie!"
        : "Stworzenie okazało się zbyt silne...",
    };
  }

  // Oblicz nagrody i kary
  const powerShardPenalty =
    encounter && !encounter.playerWon
      ? Math.floor(character.powerShards * 0.05) // -5% okruchów za przegraną
      : 0;

  const bonusPoints =
    encounter && encounter.playerWon
      ? randomInt(5, 15) // bonus za wygraną walkę
      : 0;

  const totalSkillPoints = skillPointsEarned + bonusPoints;

  // Zapisz przedmiot do ekwipunku gracza (jeśli nie ma już tego przedmiotu)
  if (foundItem) {
    await prisma.characterItem.upsert({
      where: {
        characterId_itemId: {
          characterId: character.id,
          itemId: foundItem.id,
        },
      },
      update: {},
      create: {
        characterId: character.id,
        itemId: foundItem.id,
      },
    });
  }

  // Zbuduj raport
  const report = {
    skillPointsEarned: totalSkillPoints,
    foundItem: foundItem ? { name: foundItem.name, rarity: foundItem.rarity } : null,
    encounter,
    powerShardPenalty,
    messages: [
      `Zdobyłeś ${skillPointsEarned} pkt umiejętności.`,
      bonusPoints > 0 ? `Bonus za walkę: +${bonusPoints} pkt!` : null,
      foundItem ? `Znaleziono: ${foundItem.name} (${foundItem.rarity})!` : null,
      encounter ? encounter.result : null,
      powerShardPenalty > 0 ? `Straciłeś ${powerShardPenalty} okruchów mocy.` : null,
    ].filter(Boolean),
  };

  // Zapisz wyniki w transakcji
  await prisma.$transaction([
    prisma.characterAction.update({
      where: { id: action.id },
      data: {
        status: "claimed",
        skillPointsEarned: totalSkillPoints,
        report: JSON.stringify(report),
      },
    }),
    prisma.character.update({
      where: { id: character.id },
      data: {
        skillPoints: { increment: totalSkillPoints },
        powerShards: { decrement: powerShardPenalty },
      },
    }),
  ]);

  return report;
}