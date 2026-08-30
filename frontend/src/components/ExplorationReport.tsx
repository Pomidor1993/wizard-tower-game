// src/components/ExplorationReport.tsx
import BattleReportCard from "./BattleReportCard";
import { TurnLogView, ColorLegend } from "../pages/Combat";
import { PVE_LOSS_OR_DRAFT_SUMMARY_MESSAGE, PVE_WIN_SUMMARY_MESSAGE } from "../data/shared-messages";

const C = {
  gold: "#F5C451", teal: "#59D4D0", red: "#F46A4E",
  text: "#F7F0DD", textDim: "rgba(247,240,221,0.55)", textFaint: "rgba(247,240,221,0.35)",
};

interface ExplorationSummary {
  xpEarned: number;
  item: { name: string; rarity: string; message: string } | null;
  encounterOutcome: "won" | "lost" | null;
  entityName: string | null;
  runicShardsEarned: number;
  levelUp: { newLevel: number; skillPointsGained: number } | null;
}

function buildSummaryText(summary: ExplorationSummary): string {
  if (summary.encounterOutcome === "lost") return PVE_LOSS_OR_DRAFT_SUMMARY_MESSAGE;

  const parts: string[] = [`Zdobyłeś ${summary.xpEarned} doświadczenia`];
  if (summary.encounterOutcome === "won" && summary.runicShardsEarned > 0) {
    parts[0] += ` oraz ${summary.runicShardsEarned} okruchów runicznych`;
  }
  if (summary.item) {
    parts.push(`znalazłeś przedmiot: ${summary.item.name} (${summary.item.rarity})`);
  }
  let text = parts.join(" i ") + ".";
  if (summary.encounterOutcome === "won") {
    text += ` ${PVE_WIN_SUMMARY_MESSAGE}`;
  }
  return text;
}

export function ExplorationReport({ payload, viewerCharacterId }: { payload: any; viewerCharacterId: number }) {
  const { locationName, narrative, avatarIndex, encounter, summary } = payload;
  const hasBattle = !!encounter && Array.isArray(encounter.log) && encounter.log.length > 0;

  const frames = hasBattle
    ? encounter.log.map((turn: any) => ({
        leftValue:  turn.sideAFighterHps?.[0]?.hp ?? 0,
        rightValue: turn.sideBFighterHps?.[0]?.hp ?? 0,
      }))
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* 1. Wstęp / walka */}
      <div>
        <p style={{ fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: 13, color: C.gold, marginBottom: 8 }}>
          Eksploracja — {locationName}
        </p>
        {narrative && (
          <p style={{ fontSize: 13, color: C.textDim, fontStyle: "italic", margin: 0 }}>{narrative}</p>
        )}
      </div>

      {hasBattle && (
        <BattleReportCard
          mode="hp"
          left={{ name: "Ty", isPlayer: true, avatarIndex: avatarIndex ?? 0 }}
          right={{ name: encounter.entityName, isPlayer: false, imageKey: encounter.entityImageKey }}
          leftMax={encounter.playerMaxHp ?? 100}
          rightMax={encounter.entityMaxHp ?? 100}
          frames={frames}
          renderTurnDetail={(i) => (
            <>
              <ColorLegend />
              <TurnLogView
                turn={encounter.log[i]}
                metadata={encounter.metadata}
                myCharacterId={viewerCharacterId}
                isFreshResult
              />
            </>
          )}
        />
      )}

      {/* 2. Podsumowanie */}
      <div style={{ borderTop: "1px solid rgba(247,240,221,0.08)", paddingTop: 12 }}>
        <p style={{ fontFamily: "Cinzel, serif", fontSize: 11, color: C.textFaint, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 6px" }}>
          Podsumowanie
        </p>
        <p style={{ fontSize: 13, color: summary.encounterOutcome === "lost" ? C.red : C.text, margin: 0, lineHeight: 1.6 }}>
          {buildSummaryText(summary)}
        </p>
        {summary.levelUp && (
          <p style={{ fontSize: 12, color: C.gold, margin: "6px 0 0" }}>
            ⬆ Awans na poziom {summary.levelUp.newLevel}! +{summary.levelUp.skillPointsGained} pkt rozwoju
          </p>
        )}
      </div>
    </div>
  );
}