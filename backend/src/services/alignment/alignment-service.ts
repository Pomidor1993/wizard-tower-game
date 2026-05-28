import prisma from "../../lib/prisma.js";
import { alignmentTriggerService } from "./alignment-trigger.service.js";
import { alignmentEventService } from "./alignment-event.service.js";
import { alignmentScoreService } from "./alignment-score.service.js";
import { alignmentClassificationService } from "./alignment-classification.service.js";

/**
 * ALIGNMENT SERVICE
 * Centralny orchestrator systemu charakteru postaci
 */

export const alignmentService = {

  // ─────────────────────────────────────────────
  // 1. ENTRY POINT Z GRY
  // ─────────────────────────────────────────────

  async handleGameEvent(characterId: number, triggerCode: string, payload = {}) {
    const triggered = await alignmentTriggerService.checkTrigger(
      characterId,
      triggerCode,
      payload
    );

    if (!triggered) return;

    await alignmentEventService.scheduleEvent(characterId, triggerCode);
  },

  // ─────────────────────────────────────────────
  // 2. POBIERANIE AKTYWNEGO EVENTU
  // ─────────────────────────────────────────────

  async getPendingEvent(characterId: number) {
    return prisma.alignmentEventQueue.findFirst({
      where: {
        characterId,
        status: "pending",
        scheduledAt: { lte: new Date() }
      },
      orderBy: { scheduledAt: "asc" }
    });
  },

  // ─────────────────────────────────────────────
  // 3. WYBÓR OPCJI PRZEZ GRACZA
  // ─────────────────────────────────────────────

  async chooseEventOption(characterId: number, eventId: number, optionId: number) {
    const event = await prisma.alignmentEventQueue.findFirst({
      where: {
        id: eventId,
        characterId,
        status: "pending"
      }
    });

    if (!event) return null;

    const option = await alignmentEventService.getEventOption(optionId);
    if (!option) return null;

    // zapis wyboru
    await prisma.alignmentEventQueue.update({
      where: { id: eventId },
      data: {
        selectedOption: optionId,
        status: "completed",
        completedAt: new Date()
      }
    });

    // aktualizacja punktów
    await alignmentScoreService.applyDelta(
      characterId,
      option.moralDelta,
      option.orderDelta
    );

    // sprawdzenie finalnej klasy
    await alignmentClassificationService.recalculate(characterId);

    return {
      success: true,
      result: option
    };
  },

  // ─────────────────────────────────────────────
  // 4. POBIERANIE STANU ALIGNMENT
  // ─────────────────────────────────────────────

  async getAlignmentState(characterId: number) {
    const profile = await prisma.alignmentProfile.findUnique({
      where: { characterId }
    });

    return profile;
  },

  // ─────────────────────────────────────────────
  // 5. DEBUG / ADMIN
  // ─────────────────────────────────────────────

  async forceTrigger(characterId: number, triggerCode: string) {
    await this.handleGameEvent(characterId, triggerCode);
  }
};

/* ─────────────────────────────────────────────
   HELPER SECTION (jeśli kiedyś potrzebne)
   ───────────────────────────────────────────── */