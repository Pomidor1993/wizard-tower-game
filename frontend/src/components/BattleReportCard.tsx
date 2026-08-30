// src/components/BattleReportCard.tsx
import { useEffect, useState } from "react";
import { getPlayerAvatarUrl, getPveAvatarUrl } from "../utils/avatarPaths";

const COLORS = {
  bg: "#161d38", panel: "#372b5d", border: "rgba(245,196,81,0.12)",
  borderSoft: "rgba(247,240,221,0.08)", gold: "#F5C451", teal: "#59D4D0",
  red: "#F46A4E", purple: "#A78BFA", text: "#F7F0DD",
  textDim: "rgba(247,240,221,0.55)", textFaint: "rgba(247,240,221,0.35)",
};

export interface BattleSideInfo {
  name: string;
  isPlayer: boolean;
  avatarIndex?: number;   // dla graczy
  imageKey?: string;      // dla PVE
  mirror?: boolean;       // odbij avatar (np. obrońca w pojedynku)
}

// znormalizowana "klatka" paska na danej rundzie/turze
interface BarFrame {
  leftValue: number;
  rightValue: number;
  leftRoundEffectiveness?: number;
  rightRoundEffectiveness?: number;
}

interface BattleReportCardProps {
  left: BattleSideInfo;
  right: BattleSideInfo;
  leftMax: number;
  rightMax: number;
  frameIntervalMs?: number;
  frames: BarFrame[];       // jedna klatka per tura/runda, wartość = HP lub punkty rundy
  mode: "hp" | "tournament";
  renderTurnDetail: (frameIndex: number) => React.ReactNode; // pełny log danej tury/rundy
}


function AvatarBox({ side }: { side: BattleSideInfo }) {
  const url = side.isPlayer
    ? getPlayerAvatarUrl(side.avatarIndex ?? 0)
    : getPveAvatarUrl(side.imageKey);

  return (
    <div style={{
      width: 72, height: 72, borderRadius: "50%", overflow: "hidden",
      border: `2px solid ${side.isPlayer ? COLORS.teal : COLORS.red}`,
      background: COLORS.panel, flexShrink: 0,
      transform: side.mirror ? "scaleX(-1)" : "none",
    }}>
      {url
        ? <img src={url} alt={side.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.textFaint, fontSize: 24 }}>?</div>}
    </div>
  );
}

function Bar({ value, max, color, mode }: { value: number; max: number; color: string; mode: "hp" | "tournament" }) {
  const pct = mode === "hp"
    ? Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))
    : max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div style={{ position: "relative", height: 18, borderRadius: 9, background: "rgba(0,0,0,0.35)", overflow: "hidden", border: `1px solid ${COLORS.borderSoft}` }}>
      <div style={{ position: "absolute", inset: 0, width: `${pct}%`, background: color, transition: "width 0.5s ease" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: COLORS.text, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>
        {mode === "hp" ? `${Math.max(0, Math.round(value))} / ${max}` : `${value} pkt`}
      </div>
    </div>
  );
}

export default function BattleReportCard({
  left, right, leftMax, rightMax, frames, mode, renderTurnDetail, frameIntervalMs = 700
}: BattleReportCardProps) {
  const [frameIdx, setFrameIdx] = useState(0);
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    setFrameIdx(0);
    if (frames.length <= 1) return;
    const id = setInterval(() => {
      setFrameIdx(i => (i + 1 < frames.length ? i + 1 : i));
    }, frameIntervalMs);
    return () => clearInterval(id);
  }, [frames, frameIntervalMs]);

  const frame = frames[frameIdx] ?? frames[frames.length - 1] ?? { leftValue: 0, rightValue: 0 };

  // efekty specjalne dla turnieju przy 0 lub 5
const leftCrit  = mode === "tournament" && (frame.leftRoundEffectiveness ?? -1) >= 5;
const leftFail  = mode === "tournament" && frame.leftRoundEffectiveness === 0;
const rightCrit = mode === "tournament" && (frame.rightRoundEffectiveness ?? -1) >= 5;
const rightFail = mode === "tournament" && frame.rightRoundEffectiveness === 0;
  const tournamentLeader = mode === "tournament" ? Math.max(frame.leftValue, frame.rightValue, 1) : 0;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
          <AvatarBox side={left} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, margin: "0 0 6px" }}>{left.name}</p>
<Bar value={frame.leftValue} max={mode === "hp" ? leftMax : tournamentLeader} mode={mode}
  color={leftFail ? COLORS.textFaint : leftCrit ? COLORS.gold : COLORS.teal} />
  </div>
        </div>

        <span style={{ fontFamily: "Cinzel, serif", fontSize: 18, fontWeight: 700, color: COLORS.textFaint, flexShrink: 0 }}>VS</span>

        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, flexDirection: "row-reverse" }}>
          <AvatarBox side={right} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, margin: "0 0 6px", textAlign: "right" }}>{right.name}</p>
<Bar value={frame.rightValue} max={mode === "hp" ? rightMax : tournamentLeader} mode={mode}
  color={rightFail ? COLORS.textFaint : rightCrit ? COLORS.gold : COLORS.red} />
  </div>
        </div>
      </div>

      <button
        onClick={() => setShowLog(s => !s)}
        style={{
          width: "100%", padding: "8px 0", borderRadius: 8,
          border: `1px solid ${COLORS.borderSoft}`, background: "rgba(0,0,0,0.15)",
          color: COLORS.textDim, fontSize: 11, fontFamily: "Cinzel, serif", fontWeight: 600,
          cursor: "pointer", letterSpacing: "0.04em",
        }}
      >
        {showLog ? "Ukryj pełny log walki ▲" : "Pokaż pełny log walki ▼"}
      </button>

      {showLog && (
        <div style={{
          marginTop: 10, display: "flex", flexDirection: "column", gap: 12,
          background: COLORS.bg, borderRadius: 8, padding: 12, border: `1px solid ${COLORS.borderSoft}`,
        }}>
          {frames.map((_, i) => <div key={i}>{renderTurnDetail(i)}</div>)}
        </div>
      )}
    </div>
  );
}