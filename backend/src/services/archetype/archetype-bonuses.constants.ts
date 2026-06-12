
import prisma from "../../lib/prisma.js";


// archetype-bonuses.service.ts
export async function getCharacterArchetypeBonus(
  characterId: number
): Promise<ArchetypeBonusConfig | null> {
  const profile = await prisma.archetypeProfile.findUnique({
    where: { characterId }
  });

  if (!profile?.finalClass) return null;

  return FINAL_ARCHETYPE_EFFECTS[profile.finalClass] ?? null;
}

export type MagicElement =
  | "fire"
  | "water"
  | "earth"
  | "air"
  | "life"
  | "death"
  | "chaos"
  | "harmony";

export type SpellArchetypeFlag =
  | "acolyte"
  | "seeker"
  | "abbot"
  | "guardian"
  | "ruler"
  | "researcher"
  | "prophet"
  | "reaper";

export interface ArchetypeBonusConfig {

  // bonusy do zadawanych obrażeń
  damageBonus?: Partial<Record<MagicElement, number>>;

  // bonusy do odporności
  resistanceBonus?: Partial<Record<MagicElement, number>>;

  // dostęp do spell pool
  allowedSpellFlags?: SpellArchetypeFlag[];

  // Dodatkowe sloty czarów aktywnych ponad domyślny limit (domyślnie 0)
  extraActiveSpellSlots?: number;

  // Czy klasa ma trzeci slot broni (offhand2)
  thirdWeaponHand?: boolean;

  // Elementy magii wyrzucone z puli losowania w walce
  bannedSpellElements?: MagicElement[];

  // Modyfikator wymagań statystyk czarów (np. -0.2 = -20%, +0.3 = +30%)
  spellReqModifier?: number;

  // Modyfikator ilości przyzywanych minionów
  minionCountModifier?: number;

  // TODO Modyfikator odporności na statusy - stun, miss, vulnerable, ujemny stat boost
  statusEffectResistanceModifier?: number;

  // TODO Modyfikator szansy na otrzymanie obrażeń
  damageChanceModifier?: number;

}

export const ARCHETYPE_BONUSES: Record<string, ArchetypeBonusConfig> = {

  // ─────────────────────────────────────────
  // ŚCIEŻKI POŚREDNIE
  // ─────────────────────────────────────────

  "POSZUKIWACZE": {

    damageBonus: {
      life: 25,
      chaos: 25,

      harmony: -50,
    },

    resistanceBonus: {
      chaos: 50,
    },

    allowedSpellFlags: ["seeker"],
  },

  "AKOLICI": {

    damageBonus: {
      water: 20,
      air: 20,
      earth: 20,
      fire: 20,
      life: 20,
      harmony: 20,

      death: -40,
      chaos: -40,
    },

    resistanceBonus: {
      death: 25,
      chaos: 25,
    },

    allowedSpellFlags: ["acolyte"],
  },

  "OPACI": {

    damageBonus: {
      fire: 10,
      water: 10,
      earth: 10,
      air: 10,
      life: 10,
      death: 10,
      chaos: 10,
      harmony: 10,
    },

    resistanceBonus: {
      fire: 10,
      water: 10,
      earth: 10,
      air: 10,
      life: 10,
      death: 10,
      chaos: 10,
      harmony: 10,
    },

    allowedSpellFlags: ["abbot"],
  },

 
};

// ─────────────────────────────────────────────
// KLASY FINALNE
// ─────────────────────────────────────────────

export const FINAL_ARCHETYPE_EFFECTS: Record<string, ArchetypeBonusConfig> = {

  // ── GOOD ─────────────────────────────

  "WŁADCY": {
    damageBonus: {
      life: 50,
      water: 50,
      harmony: 50,

      death: -50,
      fire: -50,
      chaos: -50,
    },

    resistanceBonus: {
      death: 50,
      chaos: 50,
    },

    allowedSpellFlags: ["seeker", "ruler"],
  },

  "BADACZE": {
    damageBonus: {
      water: 50,
      earth: 50,
      air: 50,
      fire: 50,

      death: -75,
    },

    resistanceBonus: {
      water: 20,
      earth: 20,
      air: 20,
      fire: 20,
    },

    allowedSpellFlags: ["seeker", "ruler"],
  },

  "STRAŻNICY": {
    damageBonus: {
      life: 75,
      chaos: 75,

      harmony: -75,
    },

    resistanceBonus: {
      chaos: 75,
    },

    allowedSpellFlags: ["seeker", "guardian"],
  },

  // ── NEUTRAL ─────────────────────────────

  "WYZNAWCY": {
    damageBonus: {
      water: 40,
      air: 40,
      earth: 40,
      fire: 40,
      life: 40,
      harmony: 40,

      death: -60,
      chaos: -60,
    },

    resistanceBonus: {
      death: 50,
      chaos: 50,
    },

    allowedSpellFlags: ["acolyte", "prophet"],
  },


  "ŻNIWIARZE": {
    damageBonus: {
      water: 40,
      air: 40,
      earth: 40,
      fire: 40,
      death: 40,
      chaos: 40,

      life: -60,
      harmony: -60,
    },

    resistanceBonus: {
      life: 50,
      harmony: 50,
    },

    allowedSpellFlags: ["acolyte", "reaper"],
  },

};