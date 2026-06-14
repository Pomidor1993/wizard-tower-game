import prisma from "../../lib/prisma.js";
import { TUTORIAL_STEPS, TUTORIAL_MESSAGES, HOME_REPAIR_TASKS, TutorialStep } from "./tutorial.constants.js";

// ── POBIERZ / UTWÓRZ STAN SAMOUCZKA ──────────────────

export async function getOrCreateTutorial(characterId: number) {
  const existing = await prisma.characterTutorial.findUnique({ where: { characterId } });
  if (existing) return existing;
  return prisma.characterTutorial.create({ data: { characterId } });
}

// Warunkowa zmiana kroku — działa tylko jeśli postać jest faktycznie na kroku `fromStep`.
// Zwraca true jeśli przejście się wykonało (czyli to "ten" moment, np. pierwsza eksploracja).
export async function advanceTutorialStep(
  characterId: number,
  fromStep: TutorialStep,
  toStep: TutorialStep
): Promise<boolean> {
  const result = await prisma.characterTutorial.updateMany({
    where: { characterId, step: fromStep },
    data: { step: toStep },
  });
  return result.count > 0;
}

// ── TABY WIDOCZNE NA DANYM KROKU ──────────────────────

function getVisibleTabs(step: string): string[] {
  switch (step) {
    case TUTORIAL_STEPS.INTRO:
      return ["character", "home", "exploration"];
    case TUTORIAL_STEPS.EXPLORATION_DONE:
      return ["character", "home", "exploration", "study"];
    case TUTORIAL_STEPS.STUDY_DONE:
      return ["character", "home", "exploration", "study", "spellbook"];
    case TUTORIAL_STEPS.SPELL_EQUIPPED:
    case TUTORIAL_STEPS.TOWER_READY:
      return ["character", "home", "exploration", "study", "spellbook", "training"];
    case TUTORIAL_STEPS.COMPLETED:
    default:
      return []; // pusta tablica = front pokazuje pełne, normalne menu (bez "home")
  }
}

// ── PEŁNY STAN SAMOUCZKA (dla frontu) ─────────────────

export async function getTutorialState(userId: number) {
  const character = await prisma.character.findUnique({ where: { userId }, include: { tower: true } });
  if (!character) throw new Error("Postać nie znaleziona");

  const tutorial = await getOrCreateTutorial(character.id);
  const towerLevel = character.tower?.level ?? 0;

  let pendingMessage: string | null = null;

  if (towerLevel >= 5 && !tutorial.duelUnlockShown) {
    pendingMessage = TUTORIAL_MESSAGES.DUEL_UNLOCKED;
    await prisma.characterTutorial.update({
      where: { characterId: character.id },
      data: { duelUnlockShown: true },
    });
  } else if (towerLevel >= 15 && !tutorial.schoolUnlockShown) {
    pendingMessage = TUTORIAL_MESSAGES.SCHOOL_UNLOCKED;
    await prisma.characterTutorial.update({
      where: { characterId: character.id },
      data: { schoolUnlockShown: true },
    });
  }

  return {
    step: tutorial.step,
    active: tutorial.step !== TUTORIAL_STEPS.COMPLETED,
    visibleTabs: getVisibleTabs(tutorial.step),
    homeRepairTasks: tutorial.step !== TUTORIAL_STEPS.COMPLETED
      ? await prisma.homeRepairTask.findMany({ where: { characterId: character.id }, orderBy: { id: "asc" } })
      : [],
    pendingMessage,
  };
}

// ── ZAKOŃCZENIE SAMOUCZKA ─────────────────────────────
// Wywoływane po kliknięciu "Wieża gotowa — możesz podziwiać swoje dzieło"

export async function completeTutorial(userId: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const advanced = await advanceTutorialStep(character.id, TUTORIAL_STEPS.TOWER_READY, TUTORIAL_STEPS.COMPLETED);
  if (!advanced) throw new Error("Samouczek nie jest jeszcze gotowy do zakończenia");

  return { step: TUTORIAL_STEPS.COMPLETED };
}