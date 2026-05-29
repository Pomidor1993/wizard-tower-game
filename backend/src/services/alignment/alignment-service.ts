import prisma from "../../lib/prisma.js";

import { alignmentTriggerService } from "./alignment-trigger.service.js";
import { alignmentEventService } from "./alignment-event.service.js";
import { alignmentScoreService } from "./alignment-score.service.js";
import { alignmentClassificationService } from "./alignment-classification.service.js";

/**
 * ALIGNMENT SERVICE
 * Główny orchestrator systemu charakteru
 */

export const alignmentService = {

  // ─────────────────────────────────────────────
  // 1. ENTRY POINT Z SYSTEMÓW GRY
  // ─────────────────────────────────────────────

  async handleGameEvent(
    characterId: number,
    triggerCode: string,
    payload = {}
  ) {

    const triggered =
      await alignmentTriggerService.checkTrigger(
        characterId,
        triggerCode,
        payload
      );

    if (!triggered) return;

    await alignmentEventService.scheduleEvent(
      characterId,
      triggerCode
    );
  },

  // ─────────────────────────────────────────────
  // 2. AKTYWNY EVENT
  // ─────────────────────────────────────────────

  async getPendingEvent(characterId: number) {

    return prisma.alignmentEventQueue.findFirst({
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
      await prisma.alignmentEventQueue.findFirst({
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
      await alignmentEventService.getEventOption(
        optionId
      );

    if (!option) {
      throw new Error("Opcja nie istnieje");
    }

    // ─────────────────────────
    // zapis wyboru
    // ─────────────────────────

    await prisma.alignmentEventQueue.update({
      where: {
        id: eventId
      },

      data: {
        selectedOption: optionId,
        status: "completed",
        completedAt: new Date()
      }
    });

    // ─────────────────────────
    // dodanie punktów alignment
    // ─────────────────────────

    await alignmentScoreService.applyDelta(
      characterId,
      option.moralDelta,
      option.orderDelta
    );

    // ─────────────────────────
    // przelicz klasy
    // ─────────────────────────

    await alignmentClassificationService.recalculate(
      characterId
    );

    return {
      success: true,
      option
    };
  },

  // ─────────────────────────────────────────────
  // 4. STAN ALIGNMENT
  // ─────────────────────────────────────────────

  async getAlignmentState(characterId: number) {

    const profile =
      await prisma.alignmentProfile.findUnique({
        where: {
          characterId
        }
      });

    const character =
      await prisma.character.findUnique({
        where: {
          id: characterId
        },

        select: {
          alignmentPath: true,
          alignmentClass: true
        }
      });

    return {
      profile,
      alignmentPath: character?.alignmentPath,
      alignmentClass: character?.alignmentClass
    };
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