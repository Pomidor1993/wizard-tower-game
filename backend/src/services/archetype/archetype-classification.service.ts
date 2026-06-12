import prisma from "../../lib/prisma.js";

export type InitialPath =
  | "ACOLYTE"
  | "SEEKER"
  | "ABBOT";

export type FinalClass =
  | "GUARDIAN"
  | "RULER"
  | "RESEARCHER"
  | "PROPHET"
  | "REAPER";

const INITIAL_PATHS: Record<
  InitialPath,
  FinalClass[]
> = {
  ACOLYTE: [
    "GUARDIAN",
    "RULER",
    "RESEARCHER"
  ],

  SEEKER: [
    "RULER",
    "RESEARCHER",
    "PROPHET"
  ],

  ABBOT: [
    "RESEARCHER",
    "PROPHET",
    "REAPER"
  ]
};

export const archetypeClassificationService = {

  calculateInitialPath(
    profile: any
  ): InitialPath {

    const acolyteScore =
      profile.guardianPoints +
      profile.rulerPoints;

    const seekerScore =
      profile.researcherPoints +
      profile.prophetPoints;

    const abbotScore =
      profile.prophetPoints +
      profile.reaperPoints;

    const scores = {
      ACOLYTE: acolyteScore,
      SEEKER: seekerScore,
      ABBOT: abbotScore
    };

    return Object.entries(scores)
      .sort((a, b) => b[1] - a[1])[0][0] as InitialPath;
  },

  calculateFinalClass(
    initialPath: InitialPath,
    profile: any
  ): FinalClass {

    const availableClasses =
      INITIAL_PATHS[initialPath];

    const archetypeScores = {
      GUARDIAN:
        profile.guardianPoints,

      RULER:
        profile.rulerPoints,

      RESEARCHER:
        profile.researcherPoints,

      PROPHET:
        profile.prophetPoints,

      REAPER:
        profile.reaperPoints
    };

    const filtered =
      Object.entries(archetypeScores)

        .filter(([key]) =>
          availableClasses.includes(
            key as FinalClass
          )
        )

        .sort((a, b) =>
          b[1] - a[1]
        );

    return filtered[0][0] as FinalClass;
  },

  isFinalClassAllowed(
    initialPath: InitialPath,
    finalClass: FinalClass
  ) {
    return INITIAL_PATHS[
      initialPath
    ].includes(finalClass);
  }
};