// ═══════════════════════════════════════════════════════════════════════════════
// EXPLORATION SERVICE — akcja eksploracji z mechaniką spotkań PvE
// ═══════════════════════════════════════════════════════════════════════════════

import prisma from "../lib/prisma.js";
import { calculateRegenActions } from "./action.service.js";
import {
  rollEncounter,
  rollElementForLocation,
  getRandomEntityForElement,
} from "../data/minor-entities.js";
import { buildEntityFighter } from "./pve-engine.js";
import { recordSpellbookEntries } from "./spellbook.service.js";
import { simulateBattle, buildFighter, Fighter } from "./combat.service.js";
import { archetypeService } from "./archetype/archetype-service.js";
import { addExperience } from "./character.service.js";

// ── KONFIGURACJA ──────────────────────────────────────────────────────────────

const EXPLORATION_CONFIG = [
  { level: 1, durationSeconds: 5, minPoints: 10, maxPoints: 20 },
  { level: 2, durationSeconds: 240, minPoints: 20, maxPoints: 40 },
  { level: 3, durationSeconds: 360, minPoints: 40, maxPoints: 60 },
  { level: 4, durationSeconds: 480, minPoints: 60, maxPoints: 80 },
  { level: 5, durationSeconds: 600, minPoints: 70, maxPoints: 90 },
];

const EXPLORATION_ACTION_MAX = 15;
const EXPLORATION_REGEN_SECONDS = 60 * 60; // 1 godzina

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROZPOCZĘCIE EKSPLORACJI
// ═══════════════════════════════════════════════════════════════════════════════

export async function startExploration(userId: number, level: number) {
  const config = EXPLORATION_CONFIG[level - 1];
  if (!config) throw new Error("Nieprawidłowy poziom eksploracji");

  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  // Regeneracja akcji
  const { newActions, newLastRegen } = calculateRegenActions(
    character.explorationActions,
    character.lastExploreRegen,
    EXPLORATION_ACTION_MAX,
    EXPLORATION_REGEN_SECONDS
  );

  if (newActions <= 0) throw new Error("Brak dostępnych akcji eksploracji. Poczekaj na odnowienie.");

  // Sprawdź aktywną akcję
  const activeAction = await prisma.characterAction.findFirst({
    where: { characterId: character.id, status: "in_progress" },
  });

  if (activeAction) {
    const typeLabel = activeAction.actionType === "study" ? "studiów" : "eksploracji";
    throw new Error(`Masz już aktywną akcję ${typeLabel}. Poczekaj na jej zakończenie.`);
  }

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

// ═══════════════════════════════════════════════════════════════════════════════
// ODEBRANIE WYNIKU EKSPLORACJI
// ═══════════════════════════════════════════════════════════════════════════════

export async function claimExploration(userId: number, actionId: number) {
  const character = await prisma.character.findUnique({
    where: { userId },
    include: {
      spells: true,
      tower: { include: { buildings: true } },
    },
  });

  if (!character) throw new Error("Postać nie znaleziona");

  const action = await prisma.characterAction.findFirst({
    where: { id: actionId, characterId: character.id },
  });

  if (!action) throw new Error("Akcja nie znaleziona");
  if (action.status === "claimed") throw new Error("Akcja już odebrana");
  if (action.status === "in_progress" && new Date() < action.finishesAt) {
    throw new Error("Akcja jeszcze nie zakończona");
  }

  const config = EXPLORATION_CONFIG[action.actionLevel - 1]!;
  const skillPointsEarned = randomInt(config.minPoints, config.maxPoints);
  const levelResult = await addExperience(character.id, skillPointsEarned);

  const messages: string[] = [];
messages.push(`Eksploracja zakończona! Zdobyłeś ${skillPointsEarned} punktów doświadczenia.`);
if (levelResult.levelsGained > 0) {
  messages.push(`Awans! Twoja postać osiągnęła poziom ${levelResult.level} i zdobyła ${levelResult.skillPointsGained} pkt rozwoju.`);
}
  // ── PRZEDMIOT (placeholder — rozbudować osobno) ───────────────────────────
  // Tu możesz dodać losowanie przedmiotu z itemChance, analogicznie do seeda

  // ── SPOTKANIE ─────────────────────────────────────────────────────────────
  let encounterResult: EncounterResult | null = null;

  if (rollEncounter(action.actionLevel)) {
    encounterResult = await resolveEncounter(character.id, action.actionLevel);

    if (encounterResult.fought) {
      if (encounterResult.playerWon) {
        messages.push(
          `Podczas eksploracji napotkałeś: ${encounterResult.entityName}! ` +
          `Po krótkiej, ale zaciekłej walce — pokonałeś go! ` +
          `${encounterResult.entity?.reward.description ?? ""} ` +
          `(+${encounterResult.runicShardsEarned} okruchów kamienia runicznego)`
        );
      } else {
        messages.push(
          `Podczas eksploracji napotkałeś: ${encounterResult.entityName}! ` +
          `Walczyłeś dzielnie, ale tym razem wróg wziął górę. ` +
          `${encounterResult.entity?.victoryFlavorText ?? ""}`
        );
      }
    }
  }

  // ── ZAPIS ─────────────────────────────────────────────────────────────────
  const runicShardsEarned = encounterResult?.runicShardsEarned ?? 0;

await prisma.$transaction([
  prisma.characterAction.update({
    where: { id: action.id },
    data: {
      status: "claimed",
      skillPointsEarned,
      report: JSON.stringify({
        skillPointsEarned,
        messages,
        encounter: encounterResult
          ? {
              fought: encounterResult.fought,
              entityId: encounterResult.entityId,
              entityName: encounterResult.entityName,
              playerWon: encounterResult.playerWon,
              runicShardsEarned: encounterResult.runicShardsEarned,
              battleLog: encounterResult.battleLog,
              summary: encounterResult.summary,
            }
          : null,
      }),
    },
  }),
  prisma.character.update({
    where: { id: character.id },
    data: {
      runicStoneShards: { increment: runicShardsEarned },
    },
  }),
]);


return {
  messages,
  experienceEarned: skillPointsEarned,
  level: levelResult.level,
  experience: levelResult.experience,
  xpToNextLevel: levelResult.xpToNextLevel,
  levelsGained: levelResult.levelsGained,
  skillPointsGained: levelResult.skillPointsGained,
  encounter: encounterResult
    ? {
        fought: encounterResult.fought,
        entityName: encounterResult.entityName,
        entityDescription: encounterResult.entity?.description,
        playerWon: encounterResult.playerWon,
        runicShardsEarned: encounterResult.runicShardsEarned,
        battleLog: encounterResult.battleLog,
        summary: encounterResult.summary,
        flavorText: encounterResult.playerWon
          ? encounterResult.entity?.defeatFlavorText
          : encounterResult.entity?.victoryFlavorText,
      }
    : null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MECHANIKA SPOTKANIA
// ═══════════════════════════════════════════════════════════════════════════════

interface EncounterResult {
  fought: boolean;
  entityId: string | null;
  entityName: string | null;
  entity: ReturnType<typeof getRandomEntityForElement> | null;
  playerWon: boolean;
  runicShardsEarned: number;
  battleLog: object[] | null;
  summary: string | null;
}

async function resolveEncounter(characterId: number, locationLevel: number): Promise<EncounterResult> {
  // 1. Losuj żywioł dla lokacji
  const element = rollElementForLocation(locationLevel);
  if (!element) {
    return noEncounter();
  }

  // 2. Losuj konkretny byt z puli żywiołu
  const entity = getRandomEntityForElement(element);
  if (!entity) {
    return noEncounter();
  }

  // 3. Zbuduj fightera gracza
  console.log("build player");
  const playerFighter = await buildFighter(characterId);

  // 4. Zbuduj fightera bytu
  console.log("build entity");
  const entityFighter = buildEntityFighter(entity);

console.log("before battle");


  // 5. Symuluj walkę
  console.log("before simulate");

  const battleResult = simulateBattle([playerFighter], [entityFighter as unknown as Fighter]);

console.log("after battle");
console.log("battle log size:", battleResult.log.length);

console.log(
  "battle json size MB:",
  JSON.stringify(battleResult.log).length / 1024 / 1024
);


const playerCastSpellIds = battleResult.castSpellsByFighter.get(playerFighter.name) ?? [];
await recordSpellbookEntries(characterId, playerCastSpellIds, "battle_cast");

  // 6. Ustal wynik
  const playerWon = battleResult.winnerId === playerFighter.id;
  const runicShardsEarned = playerWon ? entity.reward.runicShards : 0;

  // 7. Zapisz encounter w historii (opcjonalnie — tabela PveEncounter)
  await prisma.pveEncounter.create({

    
    data: {
      characterId,
      locationLevel,
      entityId: entity.id,
      entityName: entity.name,
      playerWon,
      runicShardsEarned,
      battleLog: JSON.stringify(battleResult.log),
      summary: battleResult.summary,
    },
  });

  // ── ARCHETYPE TRIGGERS ───────────────────────────

  if (playerWon) {

    const totalKills = await prisma.pveEncounter.count({
      where: {
        characterId,
        playerWon: true,
      },
    });

    await archetypeService.handleGameEvent(
      characterId,
      "FIRST_ENEMY_KILLED",
      {
        enemyCount: totalKills,
      }
    );

    await archetypeService.handleGameEvent(
      characterId,
      "TEN_ENEMIES_KILLED",
      {
        enemyCount: totalKills,
      }
    );

if (playerWon && entity.isBoss) {
  await archetypeService.handleGameEvent(characterId, "FIRST_PVE_BOSS", { isBoss: true });
}
  }

  return {
    fought: true,
    entityId: entity.id,
    entityName: entity.name,
    entity,
    playerWon,
    runicShardsEarned,
    battleLog: battleResult.log,
    summary: battleResult.summary,
  };
}

function noEncounter(): EncounterResult {
  return {
    fought: false,
    entityId: null,
    entityName: null,
    entity: null,
    playerWon: false,
    runicShardsEarned: 0,
    battleLog: null,
    summary: null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORIA SPOTKAŃ GRACZA
// ═══════════════════════════════════════════════════════════════════════════════

export async function getEncounterHistory(userId: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const encounters = await prisma.pveEncounter.findMany({
    where: { characterId: character.id },
    orderBy: { foughtAt: "desc" },
    take: 20,
  });

  return encounters.map(e => ({
    id: e.id,
    locationLevel: e.locationLevel,
    entityId: e.entityId,
    entityName: e.entityName,
    playerWon: e.playerWon,
    runicShardsEarned: e.runicShardsEarned,
    summary: e.summary,
    foughtAt: e.foughtAt,
    log: JSON.parse(e.battleLog),
  }));
}