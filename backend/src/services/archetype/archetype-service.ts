import prisma from "../../lib/prisma.js";

import { archetypeTriggerService } from "./archetype-trigger.service.js";
import { archetypeEventService } from "./archetype-event.service.js";
import { archetypeScoreService } from "./archetype-score.service.js";
import { archetypeClassificationService } from "./archetype-classification.service.js";

/**
 * ARCHETYPE SERVICE
 * Główny orchestrator systemu charakteru
 */

export const archetypeService = {

  // ─────────────────────────────────────────────
  // 1. ENTRY POINT Z SYSTEMÓW GRY
  // ─────────────────────────────────────────────

  async handleGameEvent(
    characterId: number,
    triggerCode: string,
    payload = {}
  ) {

    const triggered =
      await archetypeTriggerService.checkTrigger(
        characterId,
        triggerCode,
        payload
      );

    if (!triggered) return;

    await archetypeEventService.scheduleEvent(
      characterId,
      triggerCode
    );
  },



  
  // ─────────────────────────────────────────────
  // 2. AKTYWNY EVENT
  // ─────────────────────────────────────────────

  async getPendingEvent(characterId: number) {

    return prisma.archetypeEventQueue.findFirst({
      where: {
        characterId,
        status: "pending",
        scheduledAt: {
          lte: new Date()
        }
      },

      orderBy: {
        scheduledAt: "asc"
      }
    });
  },

  // ─────────────────────────────────────────────
  // 3. WYBÓR OPCJI
  // ─────────────────────────────────────────────

  async chooseEventOption(
    characterId: number,
    eventId: number,
    optionId: number
  ) {

    const event =
      await prisma.archetypeEventQueue.findFirst({
        where: {
          id: eventId,
          characterId,
          status: "pending"
        }
      });

    if (!event) {
      throw new Error("Event nie istnieje");
    }

    const option =
      await archetypeEventService.getEventOption(
        optionId
      );

    if (!option) {
      throw new Error("Opcja nie istnieje");
    }

    // ─────────────────────────
    // zapis wyboru
    // ─────────────────────────

    await prisma.archetypeEventQueue.update({
      where: {
        id: eventId
      },

      data: {
        selectedOption: optionId,
        status: "completed",
        completedAt: new Date()
      }
    }
  );
    await prisma.archetypeProfile.update({
    where: { characterId },

    data: {
      currentEventCode: option.nextEventCode
  }
});
    // ─────────────────────────
    // dodanie punktów archetype
    // ─────────────────────────

await archetypeScoreService.applyDelta(
  characterId,
  {
    guardian: option.guardianDelta,
    ruler: option.rulerDelta,
    researcher: option.researcherDelta,
    prophet: option.prophetDelta,
    reaper: option.reaperDelta
  }
);

await prisma.archetypeProfile.update({
  where: { characterId },
  data: {
    chapterProgress: {
      increment: 1
    }
  }
});

const profile =
  await prisma.archetypeProfile.findUnique({
    where: { characterId }
  });

if (!profile) {
  throw new Error("Profile nie istnieje");
}

if (
  profile.chapter === 1 &&
  profile.chapterProgress >= 5 &&
  !profile.initialPath
) {

  const initialPath =
    archetypeClassificationService.calculateInitialPath(
      profile
    );

  await prisma.archetypeProfile.update({
    where: { characterId },
    data: {
      initialPath,
      chapter: 2,
      chapterProgress: 0
    }
  });
}

if (
  profile.chapter === 2 &&
  profile.chapterProgress >= 10 &&
  !profile.finalClass
) {

  const finalClass =
    archetypeClassificationService.calculateFinalClass(
      profile.initialPath as any,
      profile
    );

  await prisma.archetypeProfile.update({
    where: { characterId },
    data: {
      finalClass,
      chapter: 3,
      chapterProgress: 0
    }
  });
}

    return {
      success: true,
      option
    };
  },

  // ─────────────────────────────────────────────
  // 4. STAN ARCHETYPE
  // ─────────────────────────────────────────────

  async getArchetypeState(characterId: number) {

    const profile =
      await prisma.archetypeProfile.findUnique({
        where: {
          characterId
        }
      });

const character =
  await prisma.character.findUnique({
    where: {
      id: characterId
    },

    include: {
      archetypeProfile: true
    }
  });

return {

  profile,

  initialPath:
character?.archetypeProfile?.initialPath,

  finalClass:
character?.archetypeProfile?.finalClass};
  },

  // ─────────────────────────────────────────────
  // 5. DEBUG
  // ─────────────────────────────────────────────

  async forceTrigger(
    characterId: number,
    triggerCode: string
  ) {

    await this.handleGameEvent(
      characterId,
      triggerCode
    );
  }
};