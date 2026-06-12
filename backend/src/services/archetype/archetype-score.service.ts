import prisma from "../../lib/prisma.js";

export const archetypeScoreService = {

  async applyDelta(
    characterId: number,

    delta: {

      guardian?: number;
      ruler?: number;
      researcher?: number;
      prophet?: number;
      reaper?: number;

    }
  ) {

    const profile =
      await this.getOrCreateProfile(
        characterId
      );

    const data = {

      guardianPoints: this.clamp(
        profile.guardianPoints +
        (delta.guardian ?? 0)
      ),

      rulerPoints: this.clamp(
        profile.rulerPoints +
        (delta.ruler ?? 0)
      ),

      researcherPoints: this.clamp(
        profile.researcherPoints +
        (delta.researcher ?? 0)
      ),

      prophetPoints: this.clamp(
        profile.prophetPoints +
        (delta.prophet ?? 0)
      ),

      reaperPoints: this.clamp(
        profile.reaperPoints +
        (delta.reaper ?? 0)
      )
    };

    await prisma.archetypeProfile.update({
      where: { characterId },
      data
    });

    return data;
  },

  async getOrCreateProfile(
    characterId: number
  ) {

    let profile =
      await prisma.archetypeProfile.findUnique({
        where: { characterId }
      });

    if (!profile) {

      profile =
        await prisma.archetypeProfile.create({

          data: {

            characterId,

            guardianPoints: 0,
            rulerPoints: 0,
            researcherPoints: 0,
            prophetPoints: 0,
            reaperPoints: 0
          }
        });
    }

    return profile;
  },

  clamp(value: number) {

    if (value > 100) return 100;
    if (value < 0) return 0;

    return value;
  }
};