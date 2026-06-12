import prisma from "../../lib/prisma.js";

/**
 * ARCHETYPE TRIGGER SERVICE
 * Odpowiada za wykrywanie momentów, które generują eventy
 */

export const archetypeTriggerService = {

  // ─────────────────────────────────────────────
  // MAIN ENTRY
  // ─────────────────────────────────────────────

  async checkTrigger(characterId: number, triggerCode: string, payload = {}) {
    const alreadyTriggered = await this.wasTriggered(characterId, triggerCode);

    if (alreadyTriggered) return false;

    const result = await this.evaluateTrigger(
      characterId,
      triggerCode,
      payload
    );

    if (result) {
      await this.markTriggered(characterId, triggerCode);
    }

    return result;
  },

  // ─────────────────────────────────────────────
  // CORE DISPATCHER
  // ─────────────────────────────────────────────

  async evaluateTrigger(characterId: number, triggerCode: string, payload: any) {

    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: {
        id: true,
        tower: true,
        knowledge: true,
        intelligence: true,
        power: true,
        elementalMagic: true,
        astralMagic: true,
        bloodMagic: true,
        gold: true,
        powerShards: true
      }
    });

    if (!character) return false;

    switch (triggerCode) {

      // ─────────────────────────────
      // COMBAT / EXPLORATION
      // ─────────────────────────────

      case "FIRST_ENEMY_KILLED":
        return payload.enemyCount >= 1;

      case "TEN_ENEMIES_KILLED":
        return payload.enemyCount >= 10;

      case "FIRST_PVE_BOSS":
        return payload.isBoss === true;

      // ─────────────────────────────
      // TOWER PROGRESSION
      // ─────────────────────────────

      case "TOWER_LEVEL_5":
        return (character.tower?.level ?? 0) >= 5;
        
      case "TOWER_LEVEL_15":
        return (character.tower?.level ?? 0) >= 15;

      case "TOWER_LEVEL_50":
        return (character.tower?.level ?? 0) >= 50;

      // ─────────────────────────────
      // ITEMS / ECONOMY
      // ─────────────────────────────

      case "FIRST_ITEM_DESTROYED":
        return payload.destroyed === true;

      case "GOLD_20000":
        return character.gold >= 20000;

      case "SHARDS_10000":
        return character.powerShards >= 10000;

      // ─────────────────────────────
      // SKILLS
      // ─────────────────────────────

      case "ANY_MAGIC_LEVEL_20":
        return (
          character.elementalMagic >= 20 ||
          character.astralMagic >= 20 ||
          character.bloodMagic >= 20
        );

      case "KNOWLEDGE_INTEL_30":
        return (
          character.knowledge >= 30 &&
          character.intelligence >= 30
        );

      // ─────────────────────────────
      // STUDIES
      // ─────────────────────────────

      case "CRAZY_STUDIES_ALL":
        return payload.allStudiesDone === true;

      // ─────────────────────────────
      // PVP
      // ─────────────────────────────

      case "PVP_50_DUELS":
        return payload.duelCount >= 50;

      // ─────────────────────────────
      // SPELLS
      // ─────────────────────────────

      case "SPELLS_100_DISCOVERED":
        return payload.spellCount >= 100;

      // ─────────────────────────────
      // SOCIAL / META
      // ─────────────────────────────

      case "JOINED_SCHOOL":
        return payload.joinedSchool === true;

      default:
        return false;
    }
  },

  // ─────────────────────────────────────────────
  // DATABASE HELPERS
  // ─────────────────────────────────────────────

  async wasTriggered(characterId: number, triggerCode: string) {
    const record = await prisma.archetypeTriggerProgress.findUnique({
      where: {
        characterId_triggerCode: {
          characterId,
          triggerCode
        }
      }
    });

    return !!record;
  },

  async markTriggered(characterId: number, triggerCode: string) {
    await prisma.archetypeTriggerProgress.create({
      data: {
        characterId,
        triggerCode
      }
    });
  }
};