import prisma from "../../lib/prisma.js";

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

  // dostęp do spell pool / księgi
  allowedSpellFlags?: SpellArchetypeFlag[];

  // Dodatkowe sloty czarów aktywnych ponad domyślny limit
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

// ─────────────────────────────────────────────
// ŚCIEŻKI POŚREDNIE (chapter 1-2, profile.initialPath)
// ─────────────────────────────────────────────
export const INITIAL_PATH_BONUSES: Record<string, ArchetypeBonusConfig> = {

  SEEKER: {
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

  ACOLYTE: {
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

  ABBOT: {
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
// KLASY FINALNE (chapter 3+, profile.finalClass)
// ─────────────────────────────────────────────
export const FINAL_CLASS_BONUSES: Record<string, ArchetypeBonusConfig> = {

  RULER: {
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

  RESEARCHER: {
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
    allowedSpellFlags: ["seeker", "acolyte", "abbot", "researcher"],
  },

  GUARDIAN: {
    damageBonus: {
      life: 75,
      chaos: 75,
      harmony: -75,
    },
    resistanceBonus: {
      chaos: 75,
    },
    allowedSpellFlags: ["acolyte", "guardian"],
  },

  PROPHET: {
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

  REAPER: {
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
    allowedSpellFlags: ["abbot", "reaper"],
  },
};

// ─────────────────────────────────────────────
// AKTYWNA KONFIGURACJA — zależna od aktualnej klasy postaci
// ─────────────────────────────────────────────
function getActiveBonusConfig(
  profile: { initialPath: string | null; finalClass: string | null }
): ArchetypeBonusConfig | null {
  if (profile.finalClass) {
    return FINAL_CLASS_BONUSES[profile.finalClass] ?? null;
  }
  if (profile.initialPath) {
    return INITIAL_PATH_BONUSES[profile.initialPath] ?? null;
  }
  return null;
}

// ── BONUSY BOJOWE ──────────────────────────────────────────────────────────────
export async function getCharacterArchetypeBonus(
  characterId: number
): Promise<ArchetypeBonusConfig | null> {
  const profile = await prisma.archetypeProfile.findUnique({ where: { characterId } });
  if (!profile) return null;
  return getActiveBonusConfig(profile);
}

// ── FLAGI CZARÓW DOSTĘPNE W KSIĘDZE ──────────────────────────────────────────────
export async function getAccessibleSpellFlags(
  characterId: number
): Promise<SpellArchetypeFlag[]> {
  const profile = await prisma.archetypeProfile.findUnique({ where: { characterId } });
  if (!profile) return [];
  return getActiveBonusConfig(profile)?.allowedSpellFlags ?? [];
}