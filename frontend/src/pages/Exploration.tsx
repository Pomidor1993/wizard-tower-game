import { useEffect, useState, useCallback } from "react";
import api from "../api/client";
import { useCharacter } from "../contexts/CharacterContext";

// ═══════════════════════════════════════════════════════════════════════════════
// STAŁE
// ═══════════════════════════════════════════════════════════════════════════════

const EXPLORATION_LEVELS = [
  { level: 1, name: "Spacerek wokół wieży",         description: "Niedaleko, niegroźnie. Idealne na rozgrzewkę.",                          duration: "2 min",  points: "10–20 pkt", itemChance: "10%", encounterChance: "5%",  availableFrom: null,          requiredTowerLevel: 1   },
  { level: 2, name: "Spacerek po włościach",          description: "Trochę dalej od wieży. Może coś ciekawego się trafi.",                   duration: "4 min",  points: "20–40 pkt", itemChance: "20%", encounterChance: "10%", availableFrom: "Poziom wieży: 10",  requiredTowerLevel: 10  },
  { level: 3, name: "Wycieczka do magicznego miasta", description: "Tłoczno, głośno i pełno dziwnych stworzeń. Brzmi jak plan.",             duration: "6 min",  points: "40–60 pkt", itemChance: "30%", encounterChance: "0%",  availableFrom: "Poziom wieży: 25",  requiredTowerLevel: 25  },
  { level: 4, name: "Wycieczka w smutne góry",        description: "Zimno, mgliście i pełno niebezpieczeństw. Dla odważnych.",              duration: "8 min",  points: "60–80 pkt", itemChance: "20%", encounterChance: "40%", availableFrom: "Poziom wieży: 50",  requiredTowerLevel: 50  },
  { level: 5, name: "Magiczna podróż morska",         description: "Nieznane wody, nieznane stworzenia. Tylko dla najdzielniejszych magów.", duration: "10 min", points: "70–90 pkt", itemChance: "40%", encounterChance: "50%", availableFrom: "Poziom wieży: 100", requiredTowerLevel: 100 },
];

const ARCHIVE_KEY = "exploration_archive";

// Statystyki do wyświetlenia w panelu — etykiety
const STAT_LABELS: Record<string, string> = {
  hp:          "HP",
  resistance:  "Odporność",
  initiative:  "Inicjatywa",
  power:       "Moc",
  fireMagic:   "Ogień",
  waterMagic:  "Woda",
  earthMagic:  "Ziemia",
  airMagic:    "Powietrze",
  lifeMagic:   "Życie",
  deathMagic:  "Śmierć",
  chaosMagic:  "Chaos",
  energyMagic: "Energia",
};

// ── PALETA (zgodna z Training.tsx) ───────────────────────────────────────────
const COLORS = {
  bg:        "#161d38",
  panel:     "#372b5d",
  panelAlt:  "rgba(0,0,0,0.15)",
  border:    "rgba(245,196,81,0.12)",
  borderSoft:"rgba(247,240,221,0.08)",
  gold:      "#F5C451",
  teal:      "#59D4D0",
  red:       "#F46A4E",
  text:      "#F7F0DD",
  textDim:   "rgba(247,240,221,0.55)",
  textFaint: "rgba(247,240,221,0.35)",
  textGhost: "rgba(247,240,221,0.2)",
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPY
// ═══════════════════════════════════════════════════════════════════════════════

interface FighterStats {
  hp: number;
  resistance: number;
  initiative: number;
  power: number;
  fireMagic: number;
  waterMagic: number;
  earthMagic: number;
  airMagic: number;
  lifeMagic: number;
  deathMagic: number;
  chaosMagic: number;
  energyMagic: number;
}

interface EncounterData {
  fought: boolean;
  entityName?: string;
  entityDescription?: string;
  playerWon?: boolean;
  runicShardsEarned?: number;
  battleLog?: any[];
  summary?: string;
  flavorText?: string;
  playerStats?: FighterStats;
  entityStats?: FighterStats;
}

interface ExplorationReport {
  id: string;
  savedAt: string;
  locationLevel: number;
  locationName: string;
  skillPointsEarned: number;
  messages: string[];
  encounter: EncounterData | null;
}

interface HistoryEntry {
  id: number;
  locationLevel: number;
  entityId: string | null;
  entityName: string | null;
  playerWon: boolean;
  runicShardsEarned: number;
  summary: string;
  foughtAt: string;
  log: any[];
  playerStats?: FighterStats;
  entityStats?: FighterStats;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARCHIWUM — localStorage
// ═══════════════════════════════════════════════════════════════════════════════

function loadArchive(): ExplorationReport[] {
  try { return JSON.parse(localStorage.getItem(ARCHIVE_KEY) ?? "[]"); }
  catch { return []; }
}

function saveToArchive(report: ExplorationReport) {
  const archive = loadArchive();
  archive.unshift(report);
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED — Panel / SectionTitle (jak w Training.tsx)
// ═══════════════════════════════════════════════════════════════════════════════

function Panel({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: COLORS.panel,
      borderRadius: 12,
      border: `1px solid ${COLORS.border}`,
      padding: 20,
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{
      fontFamily: "Cinzel, serif",
      fontSize: 13,
      color: COLORS.gold,
      letterSpacing: "0.08em",
      marginBottom: 16,
      ...style,
    }}>
      {children}
    </p>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIMER
// ═══════════════════════════════════════════════════════════════════════════════

function Timer({ finishesAt, onDone }: { finishesAt: string; onDone: () => void }) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = new Date(finishesAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Gotowe!"); clearInterval(interval); setTimeout(onDone, 500); }
      else { const m = Math.floor(diff / 60000); const s = Math.floor((diff % 60000) / 1000); setTimeLeft(`${m}:${s.toString().padStart(2, "0")}`); }
    }, 1000);
    return () => clearInterval(interval);
  }, [finishesAt, onDone]);
  return (
    <span style={{ fontFamily: "Cinzel, serif", fontWeight: 700, color: COLORS.gold, fontSize: 14 }}>
      {timeLeft}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PANEL STATYSTYK — dwie kolumny na górze raportu
// ═══════════════════════════════════════════════════════════════════════════════

function StatsPanel({
  playerName,
  entityName,
  playerStats,
  entityStats,
  playerWon,
}: {
  playerName: string;
  entityName: string;
  playerStats?: FighterStats;
  entityStats?: FighterStats;
  playerWon?: boolean;
}) {
  if (!playerStats && !entityStats) return null;

  function StatColumn({ name, stats, side }: { name: string; stats?: FighterStats; side: "player" | "entity" }) {
    if (!stats) return <div style={{ flex: 1 }} />;
    const isPlayer = side === "player";
    const accent   = isPlayer ? COLORS.teal : COLORS.red;
    const bg       = isPlayer ? "rgba(89,212,208,0.08)" : "rgba(244,106,78,0.08)";
    const border   = isPlayer ? "rgba(89,212,208,0.25)" : "rgba(244,106,78,0.25)";

    const visibleStats = Object.entries(STAT_LABELS).filter(([key]) => {
      const val = stats[key as keyof FighterStats];
      return val != null && val > 0;
    });

    return (
      <div style={{ flex: 1, borderRadius: 10, border: `1px solid ${border}`, background: bg, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{
            width: 26, height: 26, borderRadius: "50%",
            background: accent, color: COLORS.bg,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, flexShrink: 0, fontFamily: "Cinzel, serif",
          }}>
            {name[0]}
          </div>
          <p style={{ fontFamily: "Cinzel, serif", fontSize: 12, fontWeight: 700, color: COLORS.text, flex: 1, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {name}
          </p>
          {playerWon !== undefined && (
            <span style={{ fontSize: 15, flexShrink: 0 }}>
              {isPlayer ? (playerWon ? "⚔️" : "💀") : (playerWon ? "💀" : "⚔️")}
            </span>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 14px" }}>
          {visibleStats.map(([key, label]) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: COLORS.textFaint }}>{label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.text }}>{stats[key as keyof FighterStats]}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 12, padding: "16px 24px", borderBottom: `1px solid ${COLORS.borderSoft}` }}>
      <StatColumn name={playerName} stats={playerStats} side="player" />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, flexShrink: 0 }}>
        <span style={{ color: COLORS.textGhost, fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: 12 }}>VS</span>
      </div>
      <StatColumn name={entityName} stats={entityStats} side="entity" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOG WALKI — widok jednej tury
// Kolorowanie: turkus = gracz, czerwony = byt, złoty = minion, szary = system
// ═══════════════════════════════════════════════════════════════════════════════

function TurnLogView({
  turn,
  playerName,
  entityName,
}: {
  turn: any;
  playerName: string;
  entityName: string;
}) {
  const hpA = turn.sideAFighterHps?.[0]?.hp ?? "?";
  const hpB = turn.sideBFighterHps?.[0]?.hp ?? "?";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        color: COLORS.textFaint, paddingBottom: 4, borderBottom: `1px solid ${COLORS.borderSoft}`,
      }}>
        <span style={{ fontFamily: "Cinzel, serif", fontWeight: 700, color: COLORS.textDim }}>Tura {turn.turn}</span>
        <span>•</span>
        <span style={{ color: COLORS.teal, fontWeight: 600 }}>{playerName}: {hpA} HP</span>
        <span>•</span>
        <span style={{ color: COLORS.red, fontWeight: 600 }}>{entityName}: {hpB} HP</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {turn.events?.map((event: any, i: number) => {
          const isSystem = !event.attacker || event.attacker === "System" || event.attacker === "Wszyscy";
          const isPlayer = event.attacker === playerName;
          const isKnownActor = isPlayer || event.attacker === entityName;
          const isMinion = !isSystem && !isKnownActor;

          let color: string;
          if (isSystem) color = COLORS.textFaint;
          else if (isPlayer) color = COLORS.teal;
          else if (isMinion) color = COLORS.gold;
          else color = COLORS.red;

          return (
            <p key={i} style={{ color, margin: 0 }}>{event.description}</p>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL LOGU WALKI
// ═══════════════════════════════════════════════════════════════════════════════

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(10,8,24,0.65)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: COLORS.panel,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 14,
          width: "100%", maxWidth: 640, maxHeight: "88vh",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ModalCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      style={{
        background: "none", border: "none", color: COLORS.textFaint,
        fontSize: 22, lineHeight: 1, cursor: "pointer", padding: 0,
      }}
      onMouseEnter={e => (e.currentTarget.style.color = COLORS.red)}
      onMouseLeave={e => (e.currentTarget.style.color = COLORS.textFaint)}
    >
      ×
    </button>
  );
}

function pillButtonStyle(active = true): React.CSSProperties {
  return {
    fontSize: 11, padding: "6px 12px", borderRadius: 8,
    background: "rgba(0,0,0,0.2)",
    border: `1px solid ${COLORS.border}`,
    color: active ? COLORS.textDim : COLORS.textGhost,
    cursor: active ? "pointer" : "default",
    fontFamily: "Inter, sans-serif",
    transition: "border-color 0.15s, color 0.15s",
  };
}

function BattleLogModal({
  encounter,
  playerName,
  locationName,
  onClose,
  onSave,
  alreadySaved,
}: {
  encounter: EncounterData;
  playerName: string;
  locationName: string;
  onClose: () => void;
  onSave?: () => void;
  alreadySaved?: boolean;
}) {
  const won = encounter.playerWon;
  const headerBg = won ? "rgba(89,212,208,0.08)" : "rgba(244,106,78,0.08)";
  const headerBorder = won ? "rgba(89,212,208,0.2)" : "rgba(244,106,78,0.2)";
  const headerColor = won ? COLORS.teal : COLORS.red;

  return (
    <ModalShell onClose={onClose}>
      {/* Nagłówek */}
      <div style={{
        padding: "18px 24px",
        background: headerBg,
        borderBottom: `1px solid ${headerBorder}`,
        display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>{won ? "⚔️" : "💀"}</span>
            <p style={{ fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: 14, color: headerColor, margin: 0, letterSpacing: "0.04em" }}>
              {won ? "Zwycięstwo!" : "Porażka"} — {encounter.entityName}
            </p>
          </div>
          <p style={{ fontSize: 11, color: COLORS.textFaint, margin: 0 }}>{locationName}</p>
          {encounter.summary && <p style={{ fontSize: 12, color: COLORS.textDim, marginTop: 6, marginBottom: 0 }}>{encounter.summary}</p>}
          {won && (encounter.runicShardsEarned ?? 0) > 0 && (
            <p style={{ fontSize: 12, fontWeight: 700, color: COLORS.gold, marginTop: 6, marginBottom: 0 }}>
              +{encounter.runicShardsEarned} okruchów kamienia runicznego
            </p>
          )}
          {encounter.flavorText && (
            <p style={{ fontSize: 11, color: COLORS.textFaint, fontStyle: "italic", marginTop: 6, marginBottom: 0 }}>
              „{encounter.flavorText}"
            </p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {onSave && !alreadySaved && (
            <button onClick={onSave} style={pillButtonStyle()}>Zapisz raport</button>
          )}
          {alreadySaved && <span style={{ fontSize: 11, color: COLORS.textFaint }}>✓ zapisano</span>}
          <ModalCloseButton onClose={onClose} />
        </div>
      </div>

      {/* Panel statystyk */}
      <StatsPanel
        playerName={playerName}
        entityName={encounter.entityName ?? "Byt"}
        playerStats={encounter.playerStats}
        entityStats={encounter.entityStats}
        playerWon={encounter.playerWon}
      />

      {/* Log tur */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        {encounter.battleLog && encounter.battleLog.length > 0
          ? encounter.battleLog.map((turn: any) => (
              <TurnLogView
                key={turn.turn}
                turn={turn}
                playerName={playerName}
                entityName={encounter.entityName ?? "Byt"}
              />
            ))
          : <p style={{ fontSize: 13, color: COLORS.textFaint, textAlign: "center", padding: "32px 0" }}>Brak logu walki.</p>
        }
      </div>
    </ModalShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORIA EKSPLORACJI (dane z API)
// ═══════════════════════════════════════════════════════════════════════════════

function EncounterHistoryPanel({ playerName }: { playerName: string }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    api.get("/actions/exploration/encounters")
      .then(r => setHistory(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ fontSize: 12, color: COLORS.textFaint, padding: "8px 0" }}>Ładowanie historii...</p>;
  if (history.length === 0) return (
    <p style={{ fontSize: 13, color: COLORS.textFaint, textAlign: "center", padding: "24px 0" }}>
      Brak spotkań w historii. Eksploruj więcej!
    </p>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {history.slice(0, 20).map(entry => {
        const loc = EXPLORATION_LEVELS[entry.locationLevel - 1];
        const isOpen = expanded === entry.id;
        return (
          <div key={entry.id} style={{ border: `1px solid ${COLORS.borderSoft}`, borderRadius: 10, overflow: "hidden", background: COLORS.panelAlt }}>
            <div
              onClick={() => setExpanded(isOpen ? null : entry.id)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: 16, color: entry.playerWon ? COLORS.teal : COLORS.red, flexShrink: 0 }}>
                {entry.playerWon ? "⚔️" : "💀"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, color: COLORS.text, margin: 0 }}>
                  <span style={{ fontWeight: 600 }}>{entry.entityName ?? "Nieznany byt"}</span>
                  <span style={{ color: COLORS.textFaint, fontSize: 11, marginLeft: 8 }}>— {loc?.name ?? `Poziom ${entry.locationLevel}`}</span>
                </p>
                <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "2px 0 0" }}>{new Date(entry.foughtAt).toLocaleString("pl-PL")}</p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: entry.playerWon ? COLORS.gold : COLORS.textFaint, margin: 0 }}>
                  {entry.playerWon ? `+${entry.runicShardsEarned} okruchów` : "Porażka"}
                </p>
              </div>
              <span style={{
                color: COLORS.textGhost, fontSize: 11, marginLeft: 4,
                transition: "transform 0.15s", display: "inline-block",
                transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
              }}>▶</span>
            </div>

            {isOpen && (
              <div style={{ borderTop: `1px solid ${COLORS.borderSoft}`, background: "rgba(0,0,0,0.15)" }}>
                {(entry.playerStats || entry.entityStats) && (
                  <StatsPanel
                    playerName={playerName}
                    entityName={entry.entityName ?? "Byt"}
                    playerStats={entry.playerStats}
                    entityStats={entry.entityStats}
                    playerWon={entry.playerWon}
                  />
                )}
                <div style={{ padding: "12px 14px" }}>
                  {entry.summary && <p style={{ fontSize: 12, color: COLORS.textDim, fontStyle: "italic", marginTop: 0, marginBottom: 10 }}>{entry.summary}</p>}
                  <div style={{
                    display: "flex", flexDirection: "column", gap: 12,
                    maxHeight: 256, overflowY: "auto",
                    background: COLORS.bg, borderRadius: 8, padding: 12,
                    border: `1px solid ${COLORS.borderSoft}`,
                  }}>
                    {entry.log?.length > 0
                      ? entry.log.map((turn: any) => (
                          <TurnLogView
                            key={turn.turn}
                            turn={turn}
                            playerName={playerName}
                            entityName={entry.entityName ?? "Byt"}
                          />
                        ))
                      : <p style={{ fontSize: 11, color: COLORS.textFaint, margin: 0 }}>Brak logu.</p>
                    }
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARCHIWUM (localStorage)
// ═══════════════════════════════════════════════════════════════════════════════

function ArchivePanel({ playerName, onClose }: { playerName: string; onClose: () => void }) {
  const [archive, setArchive] = useState<ExplorationReport[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ExplorationReport | null>(null);

  useEffect(() => { setArchive(loadArchive()); }, []);

  function handleDelete(id: string) {
    const updated = archive.filter(r => r.id !== id);
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(updated));
    setArchive(updated);
  }

  return (
    <>
      <ModalShell onClose={onClose}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 24px", borderBottom: `1px solid ${COLORS.borderSoft}`,
        }}>
          <div>
            <h2 style={{ fontFamily: "Cinzel, serif", fontSize: 14, color: COLORS.gold, letterSpacing: "0.06em", margin: 0 }}>
              Archiwum raportów
            </h2>
            <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "4px 0 0" }}>{archive.length} zapisanych raportów</p>
          </div>
          <ModalCloseButton onClose={onClose} />
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {archive.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <p style={{ fontSize: 13, color: COLORS.textFaint, margin: 0 }}>Brak zapisanych raportów.</p>
              <p style={{ fontSize: 11, color: COLORS.textGhost, marginTop: 4 }}>
                Po walce z bytem kliknij „Zapisz raport" żeby zachować log.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {archive.map(report => {
                const enc = report.encounter;
                const isOpen = expanded === report.id;
                const icon = enc?.fought ? (enc.playerWon ? "⚔️" : "💀") : "🗺️";
                const iconColor = enc?.fought ? (enc.playerWon ? COLORS.teal : COLORS.red) : COLORS.textGhost;
                return (
                  <div key={report.id} style={{ border: `1px solid ${COLORS.borderSoft}`, borderRadius: 10, overflow: "hidden", background: COLORS.panelAlt }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
                      <span style={{ fontSize: 16, color: iconColor, flexShrink: 0 }}>{icon}</span>
                      <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => setExpanded(isOpen ? null : report.id)}>
                        <p style={{ fontSize: 13, color: COLORS.text, margin: 0 }}>
                          {enc?.fought
                            ? <><span style={{ fontWeight: 600 }}>{enc.entityName}</span><span style={{ color: COLORS.textFaint, fontSize: 11, marginLeft: 8 }}>— {report.locationName}</span></>
                            : <span style={{ fontWeight: 600 }}>{report.locationName}</span>
                          }
                        </p>
                        <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "2px 0 0" }}>
                          Zapisano: {new Date(report.savedAt).toLocaleString("pl-PL")} · +{report.skillPointsEarned} pkt umiej.
                          {enc?.fought && enc.playerWon && enc.runicShardsEarned ? ` · +${enc.runicShardsEarned} okruchów` : ""}
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        {enc?.fought && (
                          <button onClick={() => setActiveModal(report)} style={pillButtonStyle()}>
                            Log walki
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(report.id)}
                          title="Usuń"
                          style={{
                            background: "none", border: "none", color: COLORS.textGhost,
                            fontSize: 16, cursor: "pointer", padding: "0 4px", lineHeight: 1,
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = COLORS.red)}
                          onMouseLeave={e => (e.currentTarget.style.color = COLORS.textGhost)}
                        >×</button>
                      </div>
                    </div>

                    {isOpen && (
                      <div style={{ borderTop: `1px solid ${COLORS.borderSoft}`, padding: "10px 14px", background: "rgba(0,0,0,0.15)" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {report.messages?.map((msg, i) => (
                            <p key={i} style={{ fontSize: 12, color: COLORS.textDim, margin: 0 }}>• {msg}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ModalShell>

      {activeModal?.encounter?.fought && (
        <BattleLogModal
          encounter={activeModal.encounter}
          playerName={playerName}
          locationName={activeModal.locationName}
          onClose={() => setActiveModal(null)}
        />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GŁÓWNY KOMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function ExplorationPanel({
  onRefresh,
  playerName = "Ty",
  towerLevel = 1,
}: {
  onRefresh?: () => void;
  playerName?: string;
  towerLevel?: number;
}) {
  const { refresh: refreshCharacter } = useCharacter();

  const [selected, setSelected] = useState(1);
  const [actions, setActions] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [battleModalOpen, setBattleModalOpen] = useState(false);
  const [reportSaved, setReportSaved] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  const fetchActions = useCallback(async () => {
    try { const res = await api.get("/actions"); setActions(res.data); } catch {}
  }, []);

  useEffect(() => { fetchActions(); }, [fetchActions]);

  // Odśwież dane postaci (pasek nick/poziom/XP w AppLayout) po każdej akcji.
  // Wywołujemy zarówno kontekstowy refresh, jak i opcjonalny onRefresh od rodzica.
  const syncCharacter = useCallback(async () => {
    await refreshCharacter();
    onRefresh?.();
  }, [refreshCharacter, onRefresh]);

  const activeExploration = actions?.activeActions?.find((a: any) => a.actionType === "exploration" && a.status === "in_progress");
  const completedExploration = actions?.activeActions?.find((a: any) => a.actionType === "exploration" && a.status === "completed");
  const explorationActions = actions?.explorationActionsAvailable ?? 0;
  const currentLoc = EXPLORATION_LEVELS[selected - 1]!;
  const locLocked = towerLevel < currentLoc.requiredTowerLevel;

  async function handleStart() {
    setLoading(true);
    try {
      await api.post("/actions/exploration/start", { level: selected });
      await fetchActions();
      await syncCharacter();
    }
    catch (err: any) { alert(err.response?.data?.error ?? "Błąd"); }
    finally { setLoading(false); }
  }

  async function handleClaim(actionId: number) {
    setClaiming(true);
    setReport(null);
    setReportSaved(false);
    try {
      const res = await api.post(`/actions/exploration/claim/${actionId}`);
      setReport(res.data);
      if (res.data.encounter?.fought) setBattleModalOpen(true);
      await fetchActions();
      await syncCharacter();
    } catch (err: any) { alert(err.response?.data?.error ?? "Błąd"); }
    finally { setClaiming(false); }
  }

  function handleSaveReport() {
    if (!report) return;
    const toSave: ExplorationReport = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      savedAt: new Date().toISOString(),
      locationLevel: selected,
      locationName: currentLoc.name,
      skillPointsEarned: report.skillPointsEarned ?? 0,
      messages: report.messages ?? [],
      encounter: report.encounter ?? null,
    };
    saveToArchive(toSave);
    setReportSaved(true);
  }

  return (
    <div>
      <h1 style={{ fontFamily: "Cinzel, serif", color: COLORS.gold, fontSize: 22, marginBottom: 24, letterSpacing: "0.06em" }}>
        Eksploracja
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Pasek wyniku */}
        {report && !battleModalOpen && (
          <Panel>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <SectionTitle style={{ marginBottom: 0 }}>Wynik eksploracji</SectionTitle>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {report.encounter?.fought && (
                  <button onClick={() => setBattleModalOpen(true)} style={pillButtonStyle()}>
                    Zobacz log walki
                  </button>
                )}
                {!reportSaved
                  ? <button onClick={handleSaveReport} style={pillButtonStyle()}>Zapisz raport</button>
                  : <span style={{ fontSize: 11, color: COLORS.textFaint }}>✓ zapisano</span>
                }
                <button
                  onClick={() => setReport(null)}
                  style={{ background: "none", border: "none", color: COLORS.textGhost, fontSize: 18, lineHeight: 1, cursor: "pointer", padding: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.color = COLORS.red)}
                  onMouseLeave={e => (e.currentTarget.style.color = COLORS.textGhost)}
                >×</button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {report.messages?.map((msg: string, i: number) => (
                <p key={i} style={{ fontSize: 13, color: COLORS.textDim, margin: 0 }}>• {msg}</p>
              ))}
            </div>
          </Panel>
        )}

        {/* Aktywna eksploracja */}
        {activeExploration && (
          <Panel style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "16px 20px",
            background: "rgba(89,212,208,0.06)",
            border: "1px solid rgba(89,212,208,0.2)",
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.teal, margin: 0 }}>
                Trwa eksploracja — poziom {activeExploration.actionLevel}
              </p>
              <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "2px 0 0" }}>
                {EXPLORATION_LEVELS[activeExploration.actionLevel - 1]?.name}
              </p>
            </div>
            <Timer finishesAt={activeExploration.finishesAt} onDone={fetchActions} />
          </Panel>
        )}

        {/* Gotowa do odebrania */}
        {completedExploration && (
          <Panel style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "16px 20px",
            background: "rgba(245,196,81,0.07)",
            border: "1px solid rgba(245,196,81,0.25)",
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.gold, margin: 0 }}>
              Eksploracja zakończona! Odbierz wynik.
            </p>
            <button
              onClick={() => handleClaim(completedExploration.id)}
              disabled={claiming}
              style={{
                padding: "8px 18px", borderRadius: 8,
                background: COLORS.gold, color: COLORS.bg,
                border: "none", fontSize: 12, fontWeight: 700,
                fontFamily: "Cinzel, serif", letterSpacing: "0.05em",
                cursor: claiming ? "not-allowed" : "pointer",
                opacity: claiming ? 0.6 : 1,
              }}
            >
              {claiming ? "..." : "Odbierz"}
            </button>
          </Panel>
        )}

        {/* Główny układ */}
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start" }}>

          {/* Lista lokacji */}
          <Panel style={{ padding: 0, overflow: "hidden" }}>
            <div style={{
              padding: "14px 16px", borderBottom: `1px solid ${COLORS.borderSoft}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontFamily: "Cinzel, serif", fontSize: 11, color: COLORS.gold, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Lokacje
              </span>
              <span style={{ fontSize: 11, color: COLORS.textFaint }}>
                Akcje: <span style={{ fontWeight: 700, color: COLORS.textDim }}>{explorationActions}/15</span>
              </span>
            </div>
            <div>
              {EXPLORATION_LEVELS.map((loc, i) => {
                const locked = towerLevel < loc.requiredTowerLevel;
                const isSelected = selected === loc.level;
                return (
                  <button
                    key={loc.level}
                    onClick={() => !locked && setSelected(loc.level)}
                    disabled={locked}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "12px 16px",
                      borderTop: i === 0 ? "none" : `1px solid ${COLORS.borderSoft}`,
                      borderBottom: "none", borderLeft: "none", borderRight: "none",
                      background: locked ? "rgba(0,0,0,0.15)" : isSelected ? "rgba(245,196,81,0.1)" : "transparent",
                      cursor: locked ? "not-allowed" : "pointer",
                      opacity: locked ? 0.45 : 1,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => { if (!locked && !isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                    onMouseLeave={e => { if (!locked && !isSelected) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: isSelected ? COLORS.gold : COLORS.text, margin: 0 }}>
                        {loc.name}
                      </p>
                      {locked && <span style={{ fontSize: 11, color: COLORS.textFaint }}>🔒</span>}
                    </div>
                    <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "2px 0 0" }}>{loc.duration} · {loc.points}</p>
                    {loc.availableFrom && (
                      <p style={{ fontSize: 11, margin: "2px 0 0", color: locked ? COLORS.red : COLORS.textGhost }}>
                        {loc.availableFrom}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </Panel>

          {/* Szczegóły lokacji */}
          <Panel style={{ padding: 0, overflow: "hidden", minHeight: 340 }}>
            <div style={{
              height: 180, display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(0,0,0,0.2)", borderBottom: `1px solid ${COLORS.borderSoft}`,
            }}>
              <p style={{ fontSize: 13, color: COLORS.textGhost, margin: 0 }}>Grafika: {currentLoc.name}</p>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <p style={{ fontFamily: "Cinzel, serif", fontSize: 15, fontWeight: 700, color: COLORS.text, margin: 0 }}>
                    {currentLoc.name}
                  </p>
                  {locLocked && (
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 6,
                      background: "rgba(244,106,78,0.12)", color: COLORS.red,
                      border: "1px solid rgba(244,106,78,0.3)",
                    }}>
                      🔒 Wymaga wieży poz. {currentLoc.requiredTowerLevel}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: COLORS.textDim, marginTop: 6, marginBottom: 0 }}>{currentLoc.description}</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  ["Czas trwania", currentLoc.duration],
                  ["Punkty umiej.", currentLoc.points],
                  ["Szansa na przedmiot", currentLoc.itemChance],
                  ["Szansa na spotkanie", currentLoc.encounterChance],
                ].map(([label, val]) => (
                  <div key={label} style={{ padding: "8px 12px", background: COLORS.panelAlt, borderRadius: 8 }}>
                    <p style={{ fontSize: 10, color: COLORS.textFaint, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "Cinzel, serif" }}>{label}</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, margin: "2px 0 0" }}>{val}</p>
                  </div>
                ))}
              </div>

              {!activeExploration && !completedExploration && (
                <button
                  onClick={handleStart}
                  disabled={loading || explorationActions <= 0 || locLocked}
                  style={{
                    width: "100%", padding: "12px 0", borderRadius: 8,
                    border: "none", fontSize: 13, fontWeight: 700,
                    fontFamily: "Cinzel, serif", letterSpacing: "0.05em",
                    background: (loading || explorationActions <= 0 || locLocked) ? "rgba(245,196,81,0.15)" : COLORS.gold,
                    color: (loading || explorationActions <= 0 || locLocked) ? COLORS.textGhost : COLORS.bg,
                    cursor: (loading || explorationActions <= 0 || locLocked) ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {loading
                    ? "..."
                    : locLocked
                    ? `Zablokowane — wymagany poziom wieży ${currentLoc.requiredTowerLevel}`
                    : explorationActions <= 0
                    ? "Brak akcji eksploracji"
                    : `Eksploruj — ${currentLoc.name}`}
                </button>
              )}
            </div>
          </Panel>
        </div>

        {/* Placeholder ustawień */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: 64, borderRadius: 10,
          border: `1px dashed ${COLORS.border}`,
        }}>
          <p style={{ fontSize: 12, color: COLORS.textGhost, fontStyle: "italic", margin: 0 }}>
            Ustawienia eksploracji — poziom trudności, cel itp. — wkrótce
          </p>
        </div>

        {/* Historia spotkań */}
        <Panel>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <SectionTitle style={{ marginBottom: 0 }}>Historia spotkań</SectionTitle>
            <button onClick={() => setShowArchive(true)} style={pillButtonStyle()}>
              Archiwum raportów
            </button>
          </div>
          <EncounterHistoryPanel playerName={playerName} />
        </Panel>
      </div>

      {/* Modal logu walki */}
      {battleModalOpen && report?.encounter?.fought && (
        <BattleLogModal
          encounter={report.encounter}
          playerName={playerName}
          locationName={currentLoc.name}
          onClose={() => setBattleModalOpen(false)}
          onSave={handleSaveReport}
          alreadySaved={reportSaved}
        />
      )}

      {/* Archiwum */}
      {showArchive && (
        <ArchivePanel playerName={playerName} onClose={() => setShowArchive(false)} />
      )}
    </div>
  );
}