import { useCallback, useEffect, useState } from "react";
import api from "../api/client";
import { useCharacter } from "../contexts/CharacterContext";

// ── PALETA (zgodna z Training.tsx / ExplorationPanel.tsx / StudyPanel.tsx) ───
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

interface RankingEntry {
  rank: number;
  characterId: number;
  name: string;
  prestige: number;
  isMe: boolean;
  foughtToday: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: kolorowanie eventów walki
// ═══════════════════════════════════════════════════════════════════════════════

type EventSide = "ally" | "enemy" | "neutral";

/**
 * Określa stronę eventu na podstawie pola `attacker` i metadanych walki.
 *
 * Logika:
 * - "ally"    → turkus  — mój fighter lub mój minion
 * - "enemy"   → czerwony — fighter/minion przeciwnika
 * - "neutral" → złoty   — minion z targetType=randomAny, efekty globalne,
 *                          System, eventy bez wyraźnej strony
 */
function getEventSide(
  attackerName: string,
  metadata: any,
  myCharacterId: number | null
): EventSide {
  if (!metadata || !myCharacterId) return "neutral";

  const sideAFighterNames: string[] = metadata.sideAFighterNames ?? [];
  const sideBFighterNames: string[] = metadata.sideBFighterNames ?? [];
  const sideAMinionNames:  string[] = metadata.sideAMinionNames  ?? [];
  const sideBMinionNames:  string[] = metadata.sideBMinionNames  ?? [];

  // Eventy systemowe / globalne → neutralne
  if (!attackerName || attackerName === "System" || attackerName === "Wszyscy") {
    return "neutral";
  }

  // Określ moją stronę
  const mySide: "sideA" | "sideB" | null =
    myCharacterId === metadata.attackerId ? "sideA" :
    myCharacterId === metadata.defenderId ? "sideB" :
    null;

  if (mySide === null) {
    // Obserwator (nie uczestnik) — sideA turkus, sideB czerwony
    if (sideAFighterNames.includes(attackerName) || sideAMinionNames.includes(attackerName)) return "ally";
    if (sideBFighterNames.includes(attackerName) || sideBMinionNames.includes(attackerName)) return "enemy";
    return "neutral";
  }

  // Sprawdź czy attacker należy do sideA lub sideB
  const isOnSideA = sideAFighterNames.includes(attackerName) || sideAMinionNames.includes(attackerName);
  const isOnSideB = sideBFighterNames.includes(attackerName) || sideBMinionNames.includes(attackerName);

  const allParticipants: Array<{ name: string; side: string; type: string; targetType?: string }> =
    metadata.allParticipants ?? [];

  if (allParticipants.length > 0) {
    const participant = allParticipants.find(p => p.name === attackerName);
    if (participant) {
      // Neutralne (randomAny, all) — zawsze złote
      if (participant.side === "neutral") return "neutral";

      if (participant.type === "minion" && participant.targetType) {
        const participantIsAlly =
          (mySide === "sideA" && participant.side === "sideA") ||
          (mySide === "sideB" && participant.side === "sideB");
        return participantIsAlly ? "ally" : "enemy";
      }

      // Fighterzy — standardowa logika
      const participantIsAlly =
        (mySide === "sideA" && participant.side === "sideA") ||
        (mySide === "sideB" && participant.side === "sideB");
      return participantIsAlly ? "ally" : "enemy";
    }
  }

  // Fallback: brak w allParticipants — użyj list nazw
  const isAlly  = (mySide === "sideA" && isOnSideA) || (mySide === "sideB" && isOnSideB);
  const isEnemy = (mySide === "sideA" && isOnSideB) || (mySide === "sideB" && isOnSideA);

  if (isAlly)  return "ally";
  if (isEnemy) return "enemy";
  return "neutral";
}

const EVENT_COLORS: Record<EventSide, string> = {
  ally:    COLORS.teal,
  enemy:   COLORS.red,
  neutral: COLORS.gold,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED — Panel / SectionTitle (jak w Training.tsx / ExplorationPanel.tsx)
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
// KOMPONENT: log jednej tury (wielokrotne użycie)
// ═══════════════════════════════════════════════════════════════════════════════

interface TurnLogViewProps {
  turn: any;
  metadata: any;
  myCharacterId: number | null;
  /** true = świeży wynik walki (pokazuje HP z sideAFighterHps/sideBFighterHps) */
  isFreshResult?: boolean;
}

function TurnLogView({ turn, metadata, myCharacterId, isFreshResult = false }: TurnLogViewProps) {
  const hpHeader = isFreshResult
    ? `HP Atakującego: ${turn.sideAFighterHps?.[0]?.hp ?? "?"} • HP Obrońcy: ${turn.sideBFighterHps?.[0]?.hp ?? "?"}`
    : `HP Atakującego: ${turn.attackerHp ?? turn.sideAFighterHps?.[0]?.hp ?? "?"} • HP Obrońcy: ${turn.defenderHp ?? turn.sideBFighterHps?.[0]?.hp ?? "?"}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.textFaint }}>
        <span style={{ fontFamily: "Cinzel, serif", fontWeight: 700, color: COLORS.textDim }}>Tura {turn.turn}</span>
        <span>•</span>
        <span>{hpHeader}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {turn.events?.map((event: any, eventIndex: number) => {
          const side  = getEventSide(event.attacker, metadata, myCharacterId);
          const color = EVENT_COLORS[side];
          return (
            <div key={eventIndex} style={{ color }}>
              <span style={{ fontWeight: 600 }}>{event.description}</span>
              {event.damage > 0 && side === "enemy" && (
                <span style={{ opacity: 0.75 }}> (cel: {event.targetHpAfter} HP)</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// KOMPONENT: legenda kolorów
// ═══════════════════════════════════════════════════════════════════════════════

function ColorLegend() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 11, color: COLORS.textFaint, marginBottom: 8, flexWrap: "wrap" }}>
      <span style={{ fontFamily: "Cinzel, serif", color: COLORS.textFaint, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Legenda:
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: COLORS.teal, display: "inline-block" }} />
        <span style={{ color: COLORS.teal, fontWeight: 600 }}>Twoje akcje</span>
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: COLORS.red, display: "inline-block" }} />
        <span style={{ color: COLORS.red, fontWeight: 600 }}>Akcje przeciwnika</span>
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: COLORS.gold, display: "inline-block" }} />
        <span style={{ color: COLORS.gold, fontWeight: 600 }}>Efekty globalne / neutralne</span>
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GŁÓWNY KOMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function CombatPanel() {
  const { refresh: refreshCharacter } = useCharacter();

  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [myCharacterId, setMyCharacterId] = useState<number | null>(null);
  const [selected, setSelected] = useState<RankingEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [fighting, setFighting] = useState(false);
  const [battleResult, setBattleResult] = useState<any>(null);

  const fetchRanking = useCallback(async () => {
    try {
      const res = await api.get("/combat/ranking");
      setRanking(res.data.ranking);
      setMyCharacterId(res.data.myCharacterId);
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd ładowania rankingu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRanking(); }, [fetchRanking]);

  async function handleChallenge() {
    if (!selected) return;
    setFighting(true);
    setBattleResult(null);
    try {
      const res = await api.post("/combat/challenge", {
        defenderCharacterId: selected.characterId,
      });
      setBattleResult(res.data);
      await fetchRanking();
      await refreshCharacter();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd walki");
    } finally {
      setFighting(false);
      setSelected(null);
    }
  }

  function handleSelect(entry: RankingEntry) {
    if (entry.isMe) return;
    if (entry.foughtToday) return;
    setSelected(prev =>
      prev?.characterId === entry.characterId ? null : entry
    );
  }

  if (loading) return <p style={{ fontSize: 13, color: COLORS.textFaint }}>Ładowanie...</p>;

  return (
    <div>
      <h1 style={{ fontFamily: "Cinzel, serif", color: COLORS.gold, fontSize: 22, marginBottom: 24, letterSpacing: "0.06em" }}>
        Pojedynki
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Wynik walki */}
        {battleResult && (
          <Panel style={{
            background: battleResult.attackerWon ? "rgba(89,212,208,0.06)" : "rgba(244,106,78,0.06)",
            border: `1px solid ${battleResult.attackerWon ? "rgba(89,212,208,0.25)" : "rgba(244,106,78,0.25)"}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <p style={{
                fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: 14,
                color: battleResult.attackerWon ? COLORS.teal : COLORS.red,
                margin: 0, letterSpacing: "0.04em",
              }}>
                {battleResult.attackerWon ? "⚔️ Zwycięstwo!" : "💀 Porażka"}
              </p>
              <button
                onClick={() => setBattleResult(null)}
                style={{ background: "none", border: "none", color: COLORS.textGhost, fontSize: 18, lineHeight: 1, cursor: "pointer", padding: 0 }}
                onMouseEnter={e => (e.currentTarget.style.color = COLORS.red)}
                onMouseLeave={e => (e.currentTarget.style.color = COLORS.textGhost)}
              >×</button>
            </div>
            <p style={{ fontSize: 13, color: COLORS.textDim, marginTop: 0, marginBottom: 10 }}>{battleResult.summary}</p>
            {battleResult.attackerWon && (
              <p style={{ fontSize: 13, fontWeight: 700, color: COLORS.gold, marginTop: 0, marginBottom: 10 }}>
                +{battleResult.prestigeGain} prestiżu
              </p>
            )}

            {/* Log walki */}
            {battleResult.log?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <ColorLegend />
                <div style={{
                  maxHeight: 288, overflowY: "auto",
                  display: "flex", flexDirection: "column", gap: 12,
                  background: COLORS.bg, borderRadius: 8, padding: 12,
                  border: `1px solid ${COLORS.borderSoft}`,
                }}>
                  {battleResult.log.map((turn: any) => (
                    <TurnLogView
                      key={turn.turn}
                      turn={turn}
                      metadata={battleResult.metadata}
                      myCharacterId={myCharacterId}
                      isFreshResult
                    />
                  ))}
                </div>
              </div>
            )}
          </Panel>
        )}

        {/* Arena */}
        <Panel style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ position: "relative", height: 200 }}>
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(0,0,0,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <p style={{ fontSize: 13, color: COLORS.textGhost, margin: 0 }}>Grafika areny — tło z czarodziejami po bokach</p>
            </div>

            <div style={{ position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)", textAlign: "center" }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "rgba(89,212,208,0.12)", border: `2px solid ${COLORS.teal}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, fontWeight: 700, color: COLORS.teal, marginBottom: 6,
                fontFamily: "Cinzel, serif",
              }}>
                ?
              </div>
              <p style={{ fontSize: 11, fontWeight: 600, color: COLORS.textDim, margin: 0 }}>Ty</p>
            </div>

            <div style={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)", textAlign: "center" }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: selected ? "rgba(244,106,78,0.12)" : "rgba(0,0,0,0.25)",
                border: `2px solid ${selected ? COLORS.red : COLORS.borderSoft}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, fontWeight: 700,
                color: selected ? COLORS.red : COLORS.textGhost,
                marginBottom: 6,
                fontFamily: "Cinzel, serif",
                transition: "all 0.2s",
              }}>
                {selected ? selected.name[0] : "?"}
              </div>
              <p style={{ fontSize: 11, fontWeight: 600, color: COLORS.textDim, margin: 0 }}>
                {selected ? selected.name : "Przeciwnik"}
              </p>
            </div>

            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "Cinzel, serif", fontSize: 24, fontWeight: 700, color: COLORS.textGhost, letterSpacing: "0.08em" }}>
                VS
              </span>
            </div>
          </div>

          {/* Ranking */}
          <div style={{ borderTop: `1px solid ${COLORS.borderSoft}` }}>
            <div style={{
              padding: "12px 16px", borderBottom: `1px solid ${COLORS.borderSoft}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontFamily: "Cinzel, serif", fontSize: 11, color: COLORS.gold, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Ranking graczy
              </span>
              <span style={{ fontSize: 11, color: COLORS.textFaint }}>Kliknij gracza aby wyzwać</span>
            </div>
            <div style={{ maxHeight: 256, overflowY: "auto" }}>
              {ranking.map((entry, i) => {
                const isSelected = selected?.characterId === entry.characterId;
                const disabled = entry.isMe || entry.foughtToday;
                const medal = entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`;
                const medalColor =
                  entry.rank === 1 ? COLORS.gold :
                  entry.rank === 2 ? COLORS.textDim :
                  entry.rank === 3 ? "#D89A5C" :
                  COLORS.textFaint;

                return (
                  <div
                    key={entry.characterId}
                    onClick={() => handleSelect(entry)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 16px",
                      borderTop: i === 0 ? "none" : `1px solid ${COLORS.borderSoft}`,
                      background: entry.isMe
                        ? COLORS.panelAlt
                        : isSelected
                        ? "rgba(244,106,78,0.08)"
                        : "transparent",
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: entry.foughtToday && !entry.isMe ? 0.45 : 1,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => { if (!disabled && !isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                    onMouseLeave={e => { if (!disabled && !isSelected) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, width: 32, textAlign: "center", flexShrink: 0, color: medalColor, fontFamily: "Cinzel, serif" }}>
                      {medal}
                    </span>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700, flexShrink: 0,
                      fontFamily: "Cinzel, serif",
                      background: entry.isMe ? COLORS.gold : isSelected ? COLORS.red : "rgba(255,255,255,0.06)",
                      color: entry.isMe || isSelected ? COLORS.bg : COLORS.textDim,
                    }}>
                      {entry.name[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          fontSize: 13, fontWeight: 600,
                          color: entry.isMe ? COLORS.text : COLORS.textDim,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {entry.name}
                        </span>
                        {entry.isMe && (
                          <span style={{
                            fontSize: 10, padding: "1px 6px", borderRadius: 4,
                            background: COLORS.gold, color: COLORS.bg, fontWeight: 700,
                            fontFamily: "Cinzel, serif",
                          }}>
                            Ty
                          </span>
                        )}
                        {entry.foughtToday && !entry.isMe && (
                          <span style={{ fontSize: 11, color: COLORS.textFaint }}>✓ walczono dziś</span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.textDim, flexShrink: 0 }}>
                      {entry.prestige} <span style={{ fontSize: 11, fontWeight: 400, color: COLORS.textFaint }}>prestiżu</span>
                    </span>
                    {isSelected && <span style={{ color: COLORS.red, flexShrink: 0 }}>⚔️</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ padding: "16px", borderTop: `1px solid ${COLORS.borderSoft}` }}>
            {selected ? (
              <button
                onClick={handleChallenge}
                disabled={fighting}
                style={{
                  width: "100%", padding: "12px 0", borderRadius: 8,
                  border: "none", fontSize: 13, fontWeight: 700,
                  fontFamily: "Cinzel, serif", letterSpacing: "0.05em",
                  background: fighting ? "rgba(244,106,78,0.3)" : COLORS.red,
                  color: COLORS.bg,
                  cursor: fighting ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                }}
              >
                {fighting ? "Trwa walka..." : `⚔️ Wyzwij ${selected.name} na pojedynek`}
              </button>
            ) : (
              <p style={{ textAlign: "center", fontSize: 12, color: COLORS.textGhost, margin: 0 }}>
                Wybierz przeciwnika z rankingu aby wyzwać go na pojedynek
              </p>
            )}
          </div>
        </Panel>

        {/* Historia walk */}
        <HistoryPanel />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// KOMPONENT: historia walk
// ═══════════════════════════════════════════════════════════════════════════════

function HistoryPanel() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    api.get("/combat/history")
      .then(r => setHistory(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (history.length === 0) return null;

  return (
    <Panel>
      <SectionTitle>Historia walk</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {history.map((battle: any) => {
          const isOpen = expanded === battle.id;
          return (
            <div key={battle.id}>
              <div
                onClick={() => setExpanded(isOpen ? null : battle.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px", borderRadius: 10,
                  border: `1px solid ${COLORS.borderSoft}`,
                  background: COLORS.panelAlt,
                  cursor: "pointer", transition: "background 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                onMouseLeave={e => (e.currentTarget.style.background = COLORS.panelAlt)}
              >
                <span style={{ fontSize: 16, color: battle.youWon ? COLORS.teal : COLORS.red, flexShrink: 0 }}>
                  {battle.youWon ? "⚔️" : "💀"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: COLORS.text, margin: 0 }}>
                    <span style={{ fontWeight: 600 }}>{battle.attacker}</span>
                    <span style={{ color: COLORS.textFaint, margin: "0 6px" }}>vs</span>
                    <span style={{ fontWeight: 600 }}>{battle.defender}</span>
                  </p>
                  <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "2px 0 0" }}>
                    {new Date(battle.foughtAt).toLocaleString("pl-PL")}
                  </p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: battle.youWon ? COLORS.gold : COLORS.textFaint, margin: 0 }}>
                    {battle.youWon ? `+${battle.prestigeGain} prestiżu` : "Porażka"}
                  </p>
                  <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "2px 0 0" }}>Wygrał: {battle.winner}</p>
                </div>
                <span style={{
                  color: COLORS.textGhost, fontSize: 11, marginLeft: 4,
                  transition: "transform 0.15s", display: "inline-block",
                  transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                }}>▶</span>
              </div>

              {isOpen && (
                <div style={{
                  marginTop: 6, padding: "12px 14px", borderRadius: 10,
                  background: "rgba(0,0,0,0.15)", border: `1px solid ${COLORS.borderSoft}`,
                  display: "flex", flexDirection: "column", gap: 12,
                }}>
                  <p style={{ fontSize: 12, color: COLORS.textDim, margin: 0 }}>{battle.summary}</p>
                  {battle.log?.length > 0 && (
                    <div>
                      <ColorLegend />
                      <div style={{
                        display: "flex", flexDirection: "column", gap: 12,
                        background: COLORS.bg, borderRadius: 8, padding: 12,
                        border: `1px solid ${COLORS.borderSoft}`,
                      }}>
                        {battle.log.map((turn: any) => (
                          <TurnLogView
                            key={turn.turn}
                            turn={turn}
                            metadata={battle.metadata}
                            myCharacterId={battle.myCharacterId ?? null}
                            isFreshResult={false}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}