import prisma from "../../lib/prisma.js";

/**
 * ALIGNMENT SCORE SERVICE
 * Odpowiada za aktualizację ukrytych osi moralności i porządku
 */

export const alignmentScoreService = {

  // ─────────────────────────────────────────────
  // MAIN ENTRY
  // ─────────────────────────────────────────────

  async applyDelta(characterId: number, moralDelta: number, orderDelta: number) {

    const profile = await this.getOrCreateProfile(characterId);

    const newMoral = this.clamp(profile.moralAxis + moralDelta);
    const newOrder = this.clamp(profile.orderAxis + orderDelta);

    await prisma.alignmentProfile.update({
      where: { characterId },
      data: {
        moralAxis: newMoral,
        orderAxis: newOrder
      }
    });

    return {
      moralAxis: newMoral,
      orderAxis: newOrder
    };
  },

  // ─────────────────────────────────────────────
  // PROFILE HANDLING
  // ─────────────────────────────────────────────

  async getOrCreateProfile(characterId: number) {

    let profile = await prisma.alignmentProfile.findUnique({
      where: { characterId }
    });

    if (!profile) {
      profile = await prisma.alignmentProfile.create({
        data: {
          characterId,
          moralAxis: 0,
          orderAxis: 0
        }
      });
    }

    return profile;
  },

  // ─────────────────────────────────────────────
  // UTILS
  // ─────────────────────────────────────────────

  clamp(value: number) {
    if (value > 100) return 100;
    if (value < -100) return -100;
    return value;
  }
};