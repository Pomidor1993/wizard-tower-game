// src/components/RiftReport.tsx
import BattleReportCard from "./BattleReportCard";
import { TurnLogView, ColorLegend } from "../pages/Combat";
import { PVE_LOSS_OR_DRAFT_SUMMARY_MESSAGE, PVE_WIN_SUMMARY_MESSAGE, RIFT_NO_FIGHT_MESSAGE } from "../data/shared-messages";

const C = {
  gold: "#F5C451", red: "#F46A4E", purple: "#A78BFA", teal: "#59D4D0",
  text: "#F7F0DD", textDim: "rgba(247,240,221,0.55)", textFaint: "rgba(247,240,221,0.35)",
};

const RARITY_COLORS: Record<string, string> = {
  common: "#aaa", uncommon: "#59D4D0", rare: "#A78BFA", unique: "#F5C451",
};

interface RiftEncounter {
  entityName: string;
  entityImageKey: string | null;
  playerWon: boolean;
  playerMaxHp: number;
  entityMaxHp: number;
  log: any[];
  metadata: any;
}

interface RiftSummary {
  xpEarned: number;
  xpModifier: number;
  outcomeDescription: string | null;
  prestigeEarned: number;
  prestigeLost: number;
  trophy: { key: string; name: string } | null;
  item: { name: string; rarity: string; tier: number; message: string } | null;
  levelUp: { newLevel: number; skillPointsGained: number } | null;
}

export function RiftReport({ payload, viewerCharacterId }: { payload: any; viewerCharacterId: number }) {
  const { riftName, worldName, avatarIndex, narrative, encounters, summary } = payload as {
    riftName: string; worldName: string; avatarIndex: number;
    narrative: string; encounters: RiftEncounter[]; summary: RiftSummary;
  };

  const anyLoss = (encounters ?? []).some(e => !e.playerWon);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* 1. Wstęp */}
      <div>
        <p style={{ fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: 13, color: C.purple, marginBottom: 8 }}>
          Szczelina — {riftName} ({worldName})
        </p>
        {narrative && (
          <p style={{ fontSize: 13, color: C.textDim, fontStyle: "italic", margin: 0 }}>{narrative}</p>
        )}
      </div>

{/* 2. Walki — sekwencyjnie, w kolejności wystąpienia */}
{encounters && encounters.length > 0 ? (
  encounters.map((enc, i) => {
    const frames = (enc.log ?? []).map((turn: any) => ({
      leftValue:  turn.sideAFighterHps?.[0]?.hp ?? 0,
      rightValue: turn.sideBFighterHps?.[0]?.hp ?? 0,
    }));
    return (
      <div key={i}>
        <p style={{ fontSize: 12, color: C.textFaint, marginBottom: 10 }}>
          Starcie {i + 1}: <strong style={{ color: enc.playerWon ? C.teal : C.red }}>{enc.entityName}</strong>
        </p>
        <BattleReportCard
          mode="hp"
          left={{ name: "Ty", isPlayer: true, avatarIndex: avatarIndex ?? 0 }}
          right={{ name: enc.entityName, isPlayer: false, imageKey: enc.entityImageKey ?? undefined }}
          leftMax={enc.playerMaxHp ?? 100}
          rightMax={enc.entityMaxHp ?? 100}
          frames={frames}
          renderTurnDetail={(idx) => (
            <>
              <ColorLegend />
              <TurnLogView
                turn={enc.log[idx]}
                metadata={enc.metadata}
                myCharacterId={viewerCharacterId}
                isFreshResult
              />
            </>
          )}
        />
      </div>
    );
  })
) : (
  <p style={{ fontSize: 13, color: C.textDim, fontStyle: "italic", margin: 0 }}>
    {RIFT_NO_FIGHT_MESSAGE}
  </p>
)}

      {/* 3. Podsumowanie */}
{/* 3. Podsumowanie */}
<div style={{ borderTop: "1px solid rgba(247,240,221,0.08)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
  <p style={{ fontFamily: "Cinzel, serif", fontSize: 11, color: C.textFaint, letterSpacing: "0.06em", textTransform: "uppercase", margin: 0 }}>
    Podsumowanie
  </p>

  <p style={{ fontSize: 13, color: anyLoss ? C.red : C.text, margin: 0, lineHeight: 1.6 }}>
    {anyLoss
      ? PVE_LOSS_OR_DRAFT_SUMMARY_MESSAGE
      : `Zdobyłeś ${summary.xpEarned} doświadczenia. ${PVE_WIN_SUMMARY_MESSAGE}`}
  </p>

  {summary.prestigeEarned > 0 && (
    <p style={{ fontSize: 12, color: C.purple, margin: 0 }}>+{summary.prestigeEarned} prestiżu</p>
  )}
  {summary.prestigeLost > 0 && (
    <p style={{ fontSize: 12, color: C.red, margin: 0 }}>-{summary.prestigeLost} prestiżu</p>
  )}
  {summary.trophy && (
    <p style={{ fontSize: 12, color: C.gold, margin: 0 }}>
      🏆 Zdobyte trofeum: <strong>{summary.trophy.name}</strong>
    </p>
  )}
  {summary.item && (
    <p style={{ fontSize: 12, color: RARITY_COLORS[summary.item.rarity] ?? C.gold, margin: 0 }}>
      📦 Znaleziony przedmiot: <strong>{summary.item.name}</strong> (tier {summary.item.tier})
    </p>
  )}
  {summary.levelUp && (
    <p style={{ fontSize: 12, color: C.gold, margin: 0 }}>
      ⬆ Awans na poziom {summary.levelUp.newLevel}! +{summary.levelUp.skillPointsGained} pkt rozwoju
    </p>
  )}
</div>
    </div>
  );
}