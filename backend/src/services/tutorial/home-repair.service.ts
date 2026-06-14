import prisma from "../../lib/prisma.js";
import { HOME_REPAIR_TASKS, HomeRepairTaskCode, TUTORIAL_STEPS } from "./tutorial.constants.js";
import { advanceTutorialStep } from "./tutorial.service.js";

function getTaskConfig(taskCode: string) {
  const cfg = HOME_REPAIR_TASKS.find(t => t.code === taskCode);
  if (!cfg) throw new Error(`Nieznane zadanie: ${taskCode}`);
  return cfg;
}

// ── LISTA ZADAŃ ───────────────────────────────────────

export async function getHomeRepairTasks(userId: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const tasks = await prisma.homeRepairTask.findMany({
    where: { characterId: character.id },
    orderBy: { id: "asc" },
  });

  return tasks.map(task => {
    const cfg = getTaskConfig(task.taskCode);
    const unmet: string[] = [];
    if (character.knowledge < cfg.reqKnowledge) unmet.push(`Wiedza ${cfg.reqKnowledge} (masz ${character.knowledge})`);
    if (character.intelligence < cfg.reqIntelligence) unmet.push(`Inteligencja ${cfg.reqIntelligence} (masz ${character.intelligence})`);

    return {
      ...task,
      name: cfg.name,
      durationSeconds: cfg.durationSeconds,
      unmetReqs: unmet,
      canStart: task.status === "available" && unmet.length === 0,
    };
  });
}

// ── START ZADANIA ─────────────────────────────────────

export async function startHomeRepairTask(userId: number, taskCode: HomeRepairTaskCode) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const cfg = getTaskConfig(taskCode);

  const task = await prisma.homeRepairTask.findUnique({
    where: { characterId_taskCode: { characterId: character.id, taskCode } },
  });
  if (!task) throw new Error("Zadanie nie istnieje");
  if (task.status !== "available") throw new Error("To zadanie nie jest dostępne");

  if (character.knowledge < cfg.reqKnowledge || character.intelligence < cfg.reqIntelligence) {
    throw new Error(`Nie spełniasz wymagań: Wiedza ${cfg.reqKnowledge}, Inteligencja ${cfg.reqIntelligence}`);
  }

  const finishesAt = new Date(Date.now() + cfg.durationSeconds * 1000);

  await prisma.homeRepairTask.update({
    where: { id: task.id },
    data: { status: "in_progress", startedAt: new Date(), finishesAt },
  });

  return { finishesAt };
}

// ── ODBIÓR ZADANIA ─────────────────────────────────────

export async function claimHomeRepairTask(userId: number, taskCode: HomeRepairTaskCode) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const task = await prisma.homeRepairTask.findUnique({
    where: { characterId_taskCode: { characterId: character.id, taskCode } },
  });
  if (!task) throw new Error("Zadanie nie istnieje");
  if (task.status !== "in_progress") throw new Error("Zadanie nie jest w trakcie realizacji");
  if (task.finishesAt && new Date() < task.finishesAt) throw new Error("Zadanie jeszcze trwa");

  await prisma.homeRepairTask.update({
    where: { id: task.id },
    data: { status: "completed", completedAt: new Date() },
  });

  // Odblokuj następne zadanie w sekwencji
  const order = HOME_REPAIR_TASKS.map(t => t.code);
  const currentIndex = order.indexOf(taskCode);
  const nextCode = order[currentIndex + 1];

  let tutorialMessage: string | null = null;

  if (nextCode) {
    await prisma.homeRepairTask.update({
      where: { characterId_taskCode: { characterId: character.id, taskCode: nextCode } },
      data: { status: "available" },
    });
  } else {
    // To było ostatnie zadanie — wieża gotowa do podziwiania
    const advanced = await advanceTutorialStep(
      character.id,
      TUTORIAL_STEPS.SPELL_EQUIPPED,
      TUTORIAL_STEPS.TOWER_READY
    );
    if (advanced) {
      tutorialMessage = "Wszystkie prace przygotowawcze zakończone! Twoja wieża jest gotowa, by ją podziwiać.";
    }
  }

  return { completed: taskCode, nextUnlocked: nextCode ?? null, tutorialMessage };
}