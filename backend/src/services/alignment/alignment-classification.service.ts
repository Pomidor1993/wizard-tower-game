import prisma from "../../lib/prisma.js";
import {
  ALIGNMENT_PATHS,
  PATH_LOCKS
} from "./alignment.constants.js";
/**
 * ALIGNMENT CLASSIFICATION SERVICE
 * Zamienia wartości osi moralnych na finalną klasę postaci
 */

type MoralType = "GOOD" | "NEUTRAL" | "EVIL";
type OrderType = "LAWFUL" | "NEUTRAL" | "CHAOTIC";

export function classifyAlignmentPath(
  moralAlignment: string,
  orderAlignment: string
) {
  return ALIGNMENT_PATHS[
    moralAlignment as keyof typeof ALIGNMENT_PATHS
  ][
    orderAlignment as keyof typeof ALIGNMENT_PATHS.GOOD
  ];
}

export function isFinalClassAllowed(
  path: string,
  finalClass: string
) {
  const blocked = PATH_LOCKS[path] ?? [];

  return !blocked.includes(finalClass);
}

export const alignmentClassificationService = {

  // ─────────────────────────────────────────────
  // MAIN ENTRY
  // ─────────────────────────────────────────────

  async recalculate(characterId: number) {

    const profile = await prisma.alignmentProfile.findUnique({
      where: { characterId }
    });

    if (!profile) return null;

    const moral = this.getMoral(profile.moralAxis);
    const order = this.getOrder(profile.orderAxis);

    const finalClass = this.mapToClass(moral, order);

    await prisma.alignmentProfile.update({
      where: { characterId },
      data: {
        finalClass
      }
    });

    return {
      moral,
      order,
      finalClass
    };
  },


  
  // ─────────────────────────────────────────────
  // AXIS → CATEGORIES
  // ─────────────────────────────────────────────

  getMoral(value: number): MoralType {
    if (value >= 35) return "GOOD";
    if (value <= -35) return "EVIL";
    return "NEUTRAL";
  },

  getOrder(value: number): OrderType {
    if (value >= 35) return "LAWFUL";
    if (value <= -35) return "CHAOTIC";
    return "NEUTRAL";
  },

  // ─────────────────────────────────────────────
  // FINAL CLASS MAPPING
  // ─────────────────────────────────────────────

  mapToClass(moral: MoralType, order: OrderType) {

    const map = {

      GOOD: {
        LAWFUL: "LUMINARZY",
        NEUTRAL: "SZEPTACZE ŹRÓDEŁ",
        CHAOTIC: "BURZOWI WĘDROWCY"
      },

      NEUTRAL: {
        LAWFUL: "ARBITRZY RUN",
        NEUTRAL: "TKACZE ETERU",
        CHAOTIC: "GADERY"
      },

      EVIL: {
        LAWFUL: "EGZEKUTORZY WOLI",
        NEUTRAL: "POŻERACZE ECH",
        CHAOTIC: "SYNOWIE PUSTKI"
      }
    };

    return map[moral][order];
  }
};