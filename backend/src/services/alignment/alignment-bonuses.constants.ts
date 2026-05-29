
import prisma from "../../lib/prisma.js";


// alignment-bonuses.service.ts
export async function getCharacterAlignmentBonus(
  characterId: number
): Promise<AlignmentBonusConfig | null> {
  const profile = await prisma.alignmentProfile.findUnique({
    where: { characterId }
  });

  if (!profile?.finalClass) return null;

  return FINAL_ALIGNMENT_EFFECTS[profile.finalClass] ?? null;
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

export type SpellAlignmentFlag =
  | "good"
  | "neutral"
  | "evil"
  | "luminar"
  | "whisper"
  | "storm"
  | "runic"
  | "etheric"
  | "gader"
  | "egzekutor"
  | "echo"
  | "void";

export interface AlignmentBonusConfig {

  // bonusy do zadawanych obrażeń
  damageBonus?: Partial<Record<MagicElement, number>>;

  // bonusy do odporności
  resistanceBonus?: Partial<Record<MagicElement, number>>;

  // dostęp do spell pool
  allowedSpellFlags?: SpellAlignmentFlag[];

    // Dodatkowe sloty czarów aktywnych ponad domyślny limit (domyślnie 0)
  extraActiveSpellSlots?: number;

  // Czy klasa ma trzeci slot broni (offhand2)
  thirdWeaponHand?: boolean;

  // Elementy magii wyrzucone z puli losowania w walce
  bannedSpellElements?: MagicElement[];

  // Modyfikator wymagań statystyk czarów (np. -0.2 = -20%, +0.3 = +30%)
  spellReqModifier?: number;

}

export const ALIGNMENT_BONUSES: Record<string, AlignmentBonusConfig> = {

  // ─────────────────────────────────────────
  // ŚCIEŻKI POŚREDNIE
  // ─────────────────────────────────────────

  "STRAŻNICY ŚWITU": {

    damageBonus: {
      life: 25,
      water: 25,
      harmony: 25,

      death: -25,
      fire: -25,
      chaos: -25,
    },

    resistanceBonus: {
      death: 25,
      chaos: 25,
    },

    allowedSpellFlags: ["good"],
  },

  "WĘDROWCY ŹRÓDEŁ": {

    damageBonus: {
      water: 25,
      earth: 25,
      air: 25,
      fire: 25,

      life: -25,
      death: -25,
    },

    resistanceBonus: {
      water: 10,
      earth: 10,
      air: 10,
      fire: 10,
    },

    allowedSpellFlags: ["good"],
  },

  "BURZOWI PIELGRZYMI": {

    damageBonus: {
      life: 25,
      chaos: 25,

      harmony: -50,
    },

    resistanceBonus: {
      chaos: 50,
    },

    allowedSpellFlags: ["good"],
  },

  "RUNICZNI SĘDZIOWIE": {

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

    allowedSpellFlags: ["neutral"],
  },

  "TKACZE MGŁY": {

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

    allowedSpellFlags: ["neutral"],
  },

  "ROZDARCI": {

    damageBonus: {
      water: 20,
      air: 20,
      earth: 20,
      fire: 20,
      death: 20,
      chaos: 20,

      life: -40,
      harmony: -40,
    },

    resistanceBonus: {
      life: 25,
      harmony: 25,
    },

    allowedSpellFlags: ["neutral"],
  },

  "ŻELAZNE WIDMA": {

    damageBonus: {
      death: 25,
      harmony: 25,

      chaos: -50,
    },

    resistanceBonus: {
      air: 15,
      water: 15,
      earth: 15,
      fire: 15,
    },

    allowedSpellFlags: ["evil"],
    extraActiveSpellSlots: 1, // dodatkowy slot aktywny ponad limit z biblioteki
  },

  "POŻERACZE SZEPTÓW": {

    damageBonus: {
      water: 20,
      air: 20,
      earth: 20,
      fire: 20,
      death: 20,

      life: -50,
    },

    resistanceBonus: {
      water: 10,
      air: 10,
      earth: 10,
      fire: 10,
    },

    allowedSpellFlags: ["evil"],
  },

  "DZIECI OTCHŁANI": {

    damageBonus: {
      death: 35,
      fire: 35,
      chaos: 35,

      life: -50,
      harmony: -50,
    },

    resistanceBonus: {
      death: 35,
      fire: 35,
      chaos: 35,
    },

    allowedSpellFlags: ["evil"],
  },

  
};

// ─────────────────────────────────────────────
// KLASY FINALNE
// ─────────────────────────────────────────────

export const FINAL_ALIGNMENT_EFFECTS: Record<string, AlignmentBonusConfig> = {

  // ── GOOD ─────────────────────────────

  "LUMINARZY": {
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

    allowedSpellFlags: ["good", "luminar"],
  },

  "SZEPTACZE ŹRÓDEŁ": {
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

    allowedSpellFlags: ["good", "whisper"],
  },

  "BURZOWI WĘDROWCY": {
    damageBonus: {
      life: 75,
      chaos: 75,

      harmony: -75,
    },

    resistanceBonus: {
      chaos: 75,
    },

    allowedSpellFlags: ["good", "storm"],
  },

  // ── NEUTRAL ─────────────────────────────

  "ARBITRZY RUN": {
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

    allowedSpellFlags: ["neutral", "runic"],
  },

  "TKACZE ETERU": {
    damageBonus: {
      fire: 25,
      water: 25,
      earth: 25,
      air: 25,
      life: 25,
      death: 25,
      chaos: 25,
      harmony: 25,
    },

    resistanceBonus: {
      fire: 25,
      water: 25,
      earth: 25,
      air: 25,
      life: 25,
      death: 25,
      chaos: 25,
      harmony: 25,
    },

    allowedSpellFlags: ["neutral", "etheric"],
  },

  "GADERY": {
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

    allowedSpellFlags: ["neutral", "gader"],
  },

  // ── EVIL ─────────────────────────────

  "EGZEKUTORZY WOLI": {
    damageBonus: {
      death: 50,
      harmony: 50,

      chaos: -75,
    },

    resistanceBonus: {
      air: 30,
      water: 30,
      earth: 30,
      fire: 30,
    },

    allowedSpellFlags: ["evil", "egzekutor"],
  },

  "POŻERACZE ECH": {
    damageBonus: {
      water: 50,
      air: 50,
      earth: 50,
      fire: 50,
      death: 50,

      life: -75,
    },

    resistanceBonus: {
      water: 25,
      air: 25,
      earth: 25,
      fire: 25,
    },

    allowedSpellFlags: ["evil", "echo"],
  },

  "SYNOWIE PUSTKI": {
    damageBonus: {
      death: 60,
      fire: 60,
      chaos: 60,

      life: -75,
      harmony: -75,
    },

    resistanceBonus: {
      death: 60,
      fire: 60,
      chaos: 60,
    },

    allowedSpellFlags: ["evil", "void"],
  },
};