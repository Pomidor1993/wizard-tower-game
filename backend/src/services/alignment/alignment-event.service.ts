import prisma from "../../lib/prisma.js";

/**
 * ALIGNMENT EVENT SERVICE
 * Odpowiada za tworzenie i zarządzanie eventami moralnymi
 */

export const alignmentEventService = {

  // ─────────────────────────────────────────────
  // MAIN ENTRY
  // ─────────────────────────────────────────────

  async scheduleEvent(characterId: number, triggerCode: string) {

    const eventCode = this.mapTriggerToEvent(triggerCode);
    if (!eventCode) return;

    const delayMs = this.randomDelay(1, 6);

    const scheduledAt = new Date(Date.now() + delayMs);

    await prisma.alignmentEventQueue.create({
      data: {
        characterId,
        eventCode,
        scheduledAt,
        status: "pending"
      }
    });
  },

  // ─────────────────────────────────────────────
  // TRIGGER → EVENT MAPPING
  // ─────────────────────────────────────────────

  mapTriggerToEvent(triggerCode: string) {

    switch (triggerCode) {

      case "FIRST_ENEMY_KILLED":
        return "FIRST_BLOOD_CHOICE";

      case "TEN_ENEMIES_KILLED":
        return "WAR_ECHO_DECISION";

      case "FIRST_ITEM_DESTROYED":
        return "DESTRUCTION_CURSE_EVENT";

      case "TOWER_LEVEL_5":
        return "FOUNDATION_OF_POWER_EVENT";

      case "TOWER_LEVEL_15":
        return "AMBITION_ASCENSION_EVENT";

      case "TOWER_LEVEL_50":
        return "TRANSCENDENCE_EVENT";

      case "GOLD_20000":
        return "WEALTH_CORRUPTION_EVENT";

      case "SHARDS_10000":
        return "POWER_OVERFLOW_EVENT";

      case "ANY_MAGIC_LEVEL_20":
        return "MAGICAL_AWAKENING_EVENT";

      case "KNOWLEDGE_INTEL_30":
        return "ARCANE_REVELATION_EVENT";

      case "EXPLORATION_200":
        return "ENDLESS_JOURNEY_EVENT";

      case "PVP_50_DUELS":
        return "BLOOD_TRIAL_EVENT";

      case "SPELLS_100_DISCOVERED":
        return "FORBIDDEN_KNOWLEDGE_EVENT";

      case "JOINED_SCHOOL":
        return "INITIATION_EVENT";

      case "FIRST_PVE_BOSS":
        return "BOSS_ENCOUNTER_EVENT";

      case "CRAZY_STUDIES_ALL":
        return "OBSESSION_EVENT";

      default:
        return null;
    }
  },

  // ─────────────────────────────────────────────
  // OPTIONS FETCHING
  // ─────────────────────────────────────────────

  async getEventOptions(eventCode: string) {
    return prisma.alignmentEventChoice.findMany({
      where: { eventCode },
      orderBy: { optionIndex: "asc" }
    });
  },

  async getEventOption(optionId: number) {
    return prisma.alignmentEventChoice.findUnique({
      where: { id: optionId }
    });
  },

  // ─────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────

  randomDelay(minHours: number, maxHours: number) {
    const min = minHours * 60 * 60 * 1000;
    const max = maxHours * 60 * 60 * 1000;

    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
};