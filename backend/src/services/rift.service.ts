// ═══════════════════════════════════════════════════════════════════
// RIFT SERVICE — niestabilne szczeliny (solo)
// src/services/rift.service.ts
// ═══════════════════════════════════════════════════════════════════

import prisma from "../lib/prisma.js";
import { getRiftByKey, rollWorldKey, rollRiftTrigger, canTriggerRift, RiftColor, ActionTrigger } from "../data/rifts.js";
import { getRiftWorldByKey, getNode, RiftWorldDef, RiftChoiceEffect, ENTITY_TROPHY_MAP } from "../data/rift-worlds.js";
import { buildFighter, simulateBattle, Fighter } from "./combat.service.js";
import { buildEntityFighter } from "./pve-engine.js";
import { ENTITY_MAP } from "../data/minor-entities.js";
import { addItemToChaosVaultWithMessage } from "./chaos_vault.service.js";
import { addExperience } from "./character.service.js";
import { createSystemMessage } from "./system-messages.service.js";
import { getRiftTrophyBonuses } from "./rift-trophy-bonus.service.js";

// ── HELPERY ──────────────────────────────────────────────────────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickEntityFromPool(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)]!;
}

// ── HISTORIA KRAIN — anty-powielanie ─────────────────────────────

async function getRecentWorldKeys(characterId: number, riftKey: string): Promise<string[]> {
  const history = await prisma.riftWorldHistory.findMany({
    where: { characterId, riftKey },
    orderBy: { visitedAt: "desc" },
    take: 5,
  });
  return history.map(h => h.worldKey);
}

async function recordWorldVisit(characterId: number, riftKey: string, worldKey: string): Promise<void> {
  await prisma.riftWorldHistory.create({
    data: { characterId, riftKey, worldKey },
  });
}

// ── TRIGGER SZCZELINY ─────────────────────────────────────────────
// Wywoływane z action.service / exploration.service po claimie akcji.
// Zwraca true jeśli szczelina się otworzyła (i wysyła wiadomość).

export async function tryTriggerUnstableRift(
  characterId: number,
  action: ActionTrigger
): Promise<{ triggered: boolean; riftKey?: string }> {
  const existing = await prisma.unstableRift.findUnique({
    where: { characterId },
  });
  if (existing && (existing.status === "open" || existing.status === "active")) {
    return { triggered: false };
  }

  const { getUnstableRifts } = await import("../data/rifts.js");
  const unstableRifts = getUnstableRifts();
  const eligible = unstableRifts.filter(r => canTriggerRift(r, action));
  if (eligible.length === 0) return { triggered: false };

  // Dla każdej kwalifikującej się szczeliny — pobierz jej progress i sprawdź szansę
  let triggeredRift: (typeof eligible)[0] | null = null;
  let triggeredProgress: { id: number; actionCount: number } | null = null;

  for (const rift of eligible) {
    const progress = await prisma.riftTriggerProgress.upsert({
      where: { characterId_riftKey: { characterId, riftKey: rift.key } },
      create: { characterId, riftKey: rift.key, actionCount: 1 },
      update: { actionCount: { increment: 1 } },
    });

    const effectiveChance = rift.trigger!.chance + rift.trigger!.chancePerAction * progress.actionCount;
    if (Math.random() < effectiveChance) {
      triggeredRift = rift;
      triggeredProgress = progress;
      break;
    }
  }

  if (!triggeredRift || !triggeredProgress) return { triggered: false };

  // Reset progressu tej szczeliny
  await prisma.riftTriggerProgress.update({
    where: { characterId_riftKey: { characterId, riftKey: triggeredRift.key } },
    data: { actionCount: 0 },
  });

  const recentWorlds = await getRecentWorldKeys(characterId, triggeredRift.key);
  const worldKey = rollWorldKey(triggeredRift, recentWorlds);

  const riftData = {
    riftKey: triggeredRift.key,
    worldKey,
    status: "open" as const,
    openedAt: new Date(),
    enteredAt: null,
    finishedAt: null,
  };

  if (existing) {
    await prisma.unstableRift.update({
      where: { id: existing.id },
      data: riftData,
    });
  } else {
    await prisma.unstableRift.create({
      data: { characterId, ...riftData },
    });
  }

  const actionLabel = action.startsWith("study") ? "studiów" : "eksploracji";
  await createSystemMessage(characterId, {
    type: "rift",
    title: "Szczelina!",
    content: `W trakcie ${actionLabel} przypadkowo otworzyłeś bramę do innego świata! Jest dostępna w zakładce [SZCZELINY].`,
  });

  return { triggered: true, riftKey: triggeredRift.key };
}

// ── POBIERZ AKTYWNĄ SZCZELINĘ NIESTABILNĄ ────────────────────────

export async function getUnstableRift(userId: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

const rift = await prisma.unstableRift.findUnique({
    where: { characterId: character.id },
    include: { runs: { where: { status: "in_progress" }, include: { steps: true }, take: 1 } },
  });

  if (!rift || rift.status === "dismissed" || rift.status === "completed") {
    return null;
  }

  const riftDef = getRiftByKey(rift.riftKey as RiftColor);
  const worldDef = getRiftWorldByKey(rift.worldKey);

  return {
    id: rift.id,
    riftKey: rift.riftKey,
    worldKey: rift.worldKey,
    riftName: riftDef?.name ?? rift.riftKey,
    worldName: worldDef?.name ?? rift.worldKey,
    status: rift.status,
    openedAt: rift.openedAt,
    run: rift.runs[0] ?? null,
  };
}

// ── USUŃ SZCZELINĘ ────────────────────────────────────────────────

export async function dismissUnstableRift(userId: number): Promise<void> {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const rift = await prisma.unstableRift.findUnique({ where: { characterId: character.id } });
  if (!rift) throw new Error("Brak aktywnej szczeliny");
if (rift.status !== "open" && rift.status !== "active") throw new Error("Szczelina nie może być usunięta w tym stanie");
  await prisma.unstableRift.update({
    where: { id: rift.id },
    data: { status: "dismissed", finishedAt: new Date() },
  });
}

// ── WEJDŹ DO SZCZELINY ────────────────────────────────────────────

export async function enterUnstableRift(userId: number): Promise<{
  riftId: number;
  runId: number;
  worldKey: string;
  worldName: string;
  currentNode: object;
}> {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const rift = await prisma.unstableRift.findUnique({ where: { characterId: character.id } });
  if (!rift) throw new Error("Brak aktywnej szczeliny");
  if (rift.status === "active") {
    const existingRun = await prisma.riftRun.findFirst({
      where: { riftId: rift.id, status: "in_progress" },
      include: { steps: { orderBy: { stepIndex: "asc" } } },
    });
    if (!existingRun) throw new Error("Nie znaleziono aktywnej wyprawy");

    const worldDef = getRiftWorldByKey(rift.worldKey);
    if (!worldDef) throw new Error("Nieznana kraina");

    const currentNodeKey = resolveCurrentNodeKey(existingRun.steps, worldDef);
    const currentNode = getNode(worldDef, currentNodeKey);
    if (!currentNode) throw new Error("Węzeł nie znaleziony");

    return {
      riftId: rift.id,
      runId: existingRun.id,
      worldKey: rift.worldKey,
      worldName: worldDef.name,
      currentNode: buildNodeResponse(currentNode, character, worldDef),
    };
  }

  if (rift.status !== "open") throw new Error("Ta szczelina jest już zakończona");
  const worldDef = getRiftWorldByKey(rift.worldKey);
  if (!worldDef) throw new Error("Nieznana kraina szczeliny");

  await recordWorldVisit(character.id, rift.riftKey, rift.worldKey);

  await prisma.unstableRift.update({
    where: { id: rift.id },
    data: { status: "active", enteredAt: new Date() },
  });

  const run = await prisma.riftRun.create({
    data: {
      riftId: rift.id,
      characterId: character.id,
      worldKey: rift.worldKey,
      status: "in_progress",
    },
  });

  const startNode = getNode(worldDef, worldDef.startNodeKey);
  if (!startNode) throw new Error("Brak węzła startowego w krainie");

  return {
    riftId: rift.id,
    runId: run.id,
    worldKey: rift.worldKey,
    worldName: worldDef.name,
    currentNode: buildNodeResponse(startNode, character, worldDef),
  };
}

// ── POBIERZ AKTUALNY STAN WYPRAWY ────────────────────────────────

export async function getRiftRunState(userId: number, runId: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const run = await prisma.riftRun.findFirst({
    where: { id: runId, characterId: character.id },
    include: { steps: { orderBy: { stepIndex: "asc" } } },
  });
  if (!run) throw new Error("Wyprawa nie znaleziona");

  if (run.status === "completed") {
    return { status: "completed", run };
  }

  const worldDef = getRiftWorldByKey(run.worldKey);
  if (!worldDef) throw new Error("Nieznana kraina");

  // Odtwórz aktualny węzeł na podstawie kroków
  const currentNodeKey = resolveCurrentNodeKey(run.steps, worldDef);
  const currentNode = getNode(worldDef, currentNodeKey);
  if (!currentNode) throw new Error("Węzeł nie znaleziony");

  return {
    status: "in_progress",
    runId: run.id,
    worldKey: run.worldKey,
    steps: run.steps,
    currentNode: buildNodeResponse(currentNode, character, worldDef),
  };
}

// ── WYKONAJ WYBÓR ─────────────────────────────────────────────────

export async function makeRiftChoice(
  userId: number,
  runId: number,
  choiceKey: "A" | "B" | "C"
): Promise<object> {
  const character = await prisma.character.findUnique({
    where: { userId },
    include: { utilitySlots: { include: { spell: true } } },
  });
  if (!character) throw new Error("Postać nie znaleziona");

  const run = await prisma.riftRun.findFirst({
    where: { id: runId, characterId: character.id },
    include: { steps: { orderBy: { stepIndex: "asc" } }, rift: true },
  });
  if (!run) throw new Error("Wyprawa nie znaleziona");
  if (run.status === "completed") throw new Error("Wyprawa już zakończona");

  const worldDef = getRiftWorldByKey(run.worldKey);
  if (!worldDef) throw new Error("Nieznana kraina");

  const currentNodeKey = resolveCurrentNodeKey(run.steps, worldDef);
  const currentNode = getNode(worldDef, currentNodeKey);
  if (!currentNode) throw new Error("Węzeł nie znaleziony");

  const choice = currentNode.choices?.find(c => c.key === choiceKey);
  if (!choice) throw new Error("Nieprawidłowy wybór");

  // Sprawdź wymagany czar
  if (choice.requiredSpellName) {
    const hasSpell = character.utilitySlots.some(
      s => s.spell.name === choice.requiredSpellName
    );
    if (!hasSpell) throw new Error(`Ta opcja wymaga czaru: ${choice.requiredSpellName}`);
  }

  const stepIndex = run.steps.length;
  const result = await resolveEffect(choice.effect, character, run, worldDef, stepIndex, choiceKey);

  return result;
}

// ═══════════════════════════════════════════════════════════════════
// SILNIK ROZWIĄZYWANIA EFEKTÓW
// ═══════════════════════════════════════════════════════════════════

async function resolveEffect(
  effect: RiftChoiceEffect,
  character: any,
  run: any,
  worldDef: RiftWorldDef,
  stepIndex: number,
  choiceKey: string
): Promise<object> {

  switch (effect.type) {

    case "goto": {
      await prisma.riftRunStep.create({
        data: {
          runId: run.id,
          stepIndex,
          nodeKey: resolveCurrentNodeKey(run.steps, worldDef),
          choiceKey,
        },
      });

      const nextNode = getNode(worldDef, effect.nextNodeKey!);
      if (!nextNode) throw new Error("Węzeł docelowy nie znaleziony");

      return {
        type: "goto",
        nextNode: buildNodeResponse(nextNode, character, worldDef),
      };
    }

    case "test": {
      const success = Math.random() < (effect.testChance ?? 0.5);

      await prisma.riftRunStep.create({
        data: {
          runId: run.id,
          stepIndex,
          nodeKey: resolveCurrentNodeKey(run.steps, worldDef),
          choiceKey,
          testRolled: true,
          testSuccess: success,
        },
      });

      // Aktualizuj modyfikator XP
      const xpMod = success ? 20 : -20;
      await prisma.riftRun.update({
        where: { id: run.id },
        data: { xpModifier: { increment: xpMod } },
      });

      const nextEffect = success ? effect.onSuccess! : effect.onFailure!;

      // Odśwież run z zaktualizowanymi stepami
const updatedRun = await prisma.riftRun.findUnique({
  where: { id: run.id },
  include: {
    steps: { orderBy: { stepIndex: "asc" } },
    rift: true,
  },
});

      return {
        type: "test",
        success,
        testChance: Math.round((effect.testChance ?? 0.5) * 100),
        ...(await resolveEffect(nextEffect, character, updatedRun, worldDef, stepIndex + 1, choiceKey)),
      };
    }

    case "fight": {
      // Wybierz przeciwnika
      const entityId = effect.entityPool
        ? pickEntityFromPool(effect.entityPool)
        : effect.entityId!;

const entityDef = ENTITY_MAP.get(entityId);
      if (!entityDef) throw new Error(`Brak definicji przeciwnika: ${entityId}`);

      const playerFighter = await buildFighter(character.id);
      const entityFighter = buildEntityFighter(entityDef);
      const battleResult = simulateBattle([playerFighter], [entityFighter as unknown as Fighter]);

      const playerWon = battleResult.winnerId === playerFighter.id;

      await prisma.riftRunStep.create({
        data: {
          runId: run.id,
          stepIndex,
          nodeKey: resolveCurrentNodeKey(run.steps, worldDef),
          choiceKey,
          fightOccurred: true,
          fightWon: playerWon,
          fightLog: JSON.stringify(battleResult.log),
        },
      });

      // Modyfikator XP za walkę
      const xpMod = playerWon ? 30 : -30;
      await prisma.riftRun.update({
        where: { id: run.id },
        data: { xpModifier: { increment: xpMod } },
      });

const updatedRun = await prisma.riftRun.findUnique({
  where: { id: run.id },
  include: {
    steps: { orderBy: { stepIndex: "asc" } },
    rift: true,
  },
});
      const nextEffect = playerWon ? effect.onWin! : effect.onLose!;

      return {
        type: "fight",
        playerWon,
        entityName: entityDef.name,
        entityId,
        battleLog: battleResult.log,
        summary: battleResult.summary,
        ...(await resolveEffect(nextEffect, character, updatedRun, worldDef, stepIndex + 1, choiceKey)),
      };
    }

    case "end": {
      // Losowy modyfikator końcowy ±10%
      const finalRandomMod = randomInt(-10, 10);

      const currentRun = await prisma.riftRun.findUnique({ where: { id: run.id } });
      const totalXpMod = (currentRun?.xpModifier ?? 0) + finalRandomMod;

      const riftDef = getRiftByKey(run.rift.riftKey as RiftColor);
      if (!riftDef) throw new Error("Nieznana szczelina");

      const baseXp = randomInt(riftDef.baseXpMin, riftDef.baseXpMax);
      const finalXp = Math.max(1, Math.round(baseXp * (1 + totalXpMod / 100)));

      const reward = effect.reward ?? {};
      let prestigeEarned = 0;
      let prestigeLost = 0;
      let trophyEarned: { key: string; name: string } | null = null;
      let itemEarned: object | null = null;

      // Prestiż za walkę
      if (reward.prestige) {
        prestigeEarned = riftDef.basePrestigeGain;
        await prisma.character.update({
          where: { id: character.id },
          data: { prestige: { increment: prestigeEarned } },
        });
      }

      // Utrata prestiżu
      if (reward.prestigeLoss) {
        prestigeLost = randomInt(riftDef.prestigeLossMin, riftDef.prestigeLossMax);
        await prisma.character.update({
          where: { id: character.id },
          data: { prestige: { decrement: prestigeLost } },
        });
      }

      // Trofeum
      if (reward.trophy) {
        trophyEarned = await awardTrophy(character.id, reward.trophy, run.rift.riftKey, run.worldKey);
      }

      // Przedmiot
      if (reward.item) {
        const { rarity, tierMin, tierMax } = reward.item;
        const pool = await prisma.item.findMany({ where: { rarity } });
        if (pool.length > 0) {
          const chosen = pool[randomInt(0, pool.length - 1)]!;
          const trophyBonuses = await getRiftTrophyBonuses(character.id);
          const effectiveMaxTier = Math.min(tierMax + trophyBonuses.itemTierBonus, 10);
          const result = await addItemToChaosVaultWithMessage(
            character.id, chosen.id, chosen.name, tierMin, effectiveMaxTier
          );
          itemEarned = {
            name: chosen.name,
            rarity: chosen.rarity,
            tier: result.tier,
            message: result.message,
          };
        }
      }

      // XP
      const levelResult = await addExperience(character.id, finalXp);

      // Zamknij run i szczelinę
      await prisma.riftRunStep.create({
        data: {
          runId: run.id,
          stepIndex,
          nodeKey: resolveCurrentNodeKey(run.steps, worldDef),
          choiceKey,
        },
      });

      await prisma.riftRun.update({
        where: { id: run.id },
        data: {
          status: "completed",
          xpEarned: finalXp,
          prestigeEarned,
          finishedAt: new Date(),
        },
      });

      await prisma.unstableRift.update({
        where: { id: run.rift.id },
        data: { status: "completed", finishedAt: new Date() },
      });

      return {
        type: "end",
        description: effect.description ?? "Wyprawa zakończona.",
        xpEarned: finalXp,
        xpModifier: totalXpMod,
        levelResult: {
          level: levelResult.level,
          levelsGained: levelResult.levelsGained,
        },
        prestigeEarned,
        prestigeLost,
        trophy: trophyEarned,
        item: itemEarned,
      };
    }
  }
}

// ── PRZYZNAJ TROFEUM ─────────────────────────────────────────────

async function awardTrophy(
  characterId: number,
  trophyKey: string,
  riftKey: string,
  worldKey: string
): Promise<{ key: string; name: string } | null> {
  const trophy = await prisma.riftTrophy.findUnique({ where: { key: trophyKey } });
  if (!trophy) return null;

  const existing = await prisma.characterRiftTrophy.findUnique({
    where: { characterId_trophyId: { characterId, trophyId: trophy.id } },
  });
  if (existing) return null; // już ma

  await prisma.characterRiftTrophy.create({
    data: { characterId, trophyId: trophy.id, earnedInRiftKey: riftKey, earnedInWorldKey: worldKey },
  });

  return { key: trophy.key, name: trophy.name };
}

// ── HELPERY WĘZŁÓW ────────────────────────────────────────────────

function resolveCurrentNodeKey(steps: any[], worldDef: RiftWorldDef): string {
  if (steps.length === 0) return worldDef.startNodeKey;

  const lastStep = steps[steps.length - 1];
  const node = getNode(worldDef, lastStep.nodeKey);
  if (!node) return worldDef.startNodeKey;

  const choice = node.choices?.find((c: any) => c.key === lastStep.choiceKey);
  if (!choice) return worldDef.startNodeKey;

  const nextKey = extractNextNodeKey(choice.effect);

  // Jeśli efekt nie prowadzi do żadnego węzła (kończy się na "end"),
  // zostajemy w bieżącym węźle — run powinien być już completed
  if (!nextKey) return lastStep.nodeKey;

  return nextKey;
}

function extractNextNodeKey(effect: RiftChoiceEffect): string | null {
  if (effect.type === "goto") return effect.nextNodeKey ?? null;

  if (effect.type === "test") {
    const fromSuccess = effect.onSuccess ? extractNextNodeKey(effect.onSuccess) : null;
    const fromFailure = effect.onFailure ? extractNextNodeKey(effect.onFailure) : null;
    return fromSuccess ?? fromFailure ?? null;
  }

  if (effect.type === "fight") {
    const fromWin  = effect.onWin  ? extractNextNodeKey(effect.onWin)  : null;
    const fromLose = effect.onLose ? extractNextNodeKey(effect.onLose) : null;
    return fromWin ?? fromLose ?? null;
  }

  return null;
}

function buildNodeResponse(node: any, character: any, worldDef: RiftWorldDef): object {
  // Dla każdej opcji sprawdź czy jest zablokowana (brak czaru)
  const characterSpellNames = new Set<string>();
  // spellSlots z relacji — ale mamy tylko character.utilitySlots tutaj
  // Pobieramy przez utilitySlots jeśli dostępne
  if (character.utilitySlots) {
    for (const slot of character.utilitySlots) {
      characterSpellNames.add(slot.spell.name);
    }
  }

  return {
    key: node.key,
    description: node.description,
    isEnd: node.isEnd ?? false,
    choices: (node.choices ?? []).map((c: any) => ({
      key: c.key,
      label: c.label,
      locked: c.requiredSpellName ? !characterSpellNames.has(c.requiredSpellName) : false,
      requiredSpellName: c.requiredSpellName ?? null,
    })),
  };
}

// ── HISTORIA WYPRAW ───────────────────────────────────────────────

export async function getRiftHistory(userId: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const runs = await prisma.riftRun.findMany({
    where: { characterId: character.id, status: "completed" },
    orderBy: { finishedAt: "desc" },
    take: 20,
    include: {
      rift: true,
      steps: { orderBy: { stepIndex: "asc" } },
    },
  });

  return runs.map(r => ({
    id: r.id,
    riftKey: r.rift.riftKey,
    worldKey: r.worldKey,
    xpEarned: r.xpEarned,
    prestigeEarned: r.prestigeEarned,
    finishedAt: r.finishedAt,
    steps: r.steps.map(s => ({
      stepIndex: s.stepIndex,
      nodeKey: s.nodeKey,
      choiceKey: s.choiceKey,
      testRolled: s.testRolled,
      testSuccess: s.testSuccess,
      fightOccurred: s.fightOccurred,
      fightWon: s.fightWon,
    })),
  }));
}

export async function getRiftRunDetails(userId: number, runId: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const run = await prisma.riftRun.findFirst({
    where: { id: runId, characterId: character.id, status: "completed" },
    include: {
      rift: true,
      steps: { orderBy: { stepIndex: "asc" } },
    },
  });
  if (!run) throw new Error("Wyprawa nie znaleziona");

  return {
    id: run.id,
    riftKey: run.rift.riftKey,
    worldKey: run.worldKey,
    xpEarned: run.xpEarned,
    prestigeEarned: run.prestigeEarned,
    finishedAt: run.finishedAt,
    steps: run.steps,
  };
}