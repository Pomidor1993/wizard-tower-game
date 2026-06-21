import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useCharacter } from "../contexts/CharacterContext";

// ── PALETA 
const COLORS = {
  bg:        "#161d38",
  panel:     "#372b5d",
  panelAlt:  "rgba(0,0,0,0.15)",
  border:    "rgba(245,196,81,0.12)",
  borderSoft:"rgba(247,240,221,0.08)",
  gold:      "#F5C451",
  teal:      "#59D4D0",
  red:       "#F46A4E",
  purple:    "#A78BFA",
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
  level: number;
  isMe: boolean;
  foughtToday: boolean;
}

type ActionMode = "duel" | "tournament";

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: avatar oparty na poziomie postaci
// ═══════════════════════════════════════════════════════════════════════════════

function getLevelTier(level: number): { label: string; color: string; bg: string } {
  if (level >= 50) return { label: "⚜️", color: "#F5C451", bg: "rgba(245,196,81,0.15)" };
  if (level >= 30) return { label: "🔮", color: "#A78BFA", bg: "rgba(167,139,250,0.15)" };
  if (level >= 15) return { label: "✦",  color: "#59D4D0", bg: "rgba(89,212,208,0.15)" };
  return                   { label: "◈",  color: "rgba(247,240,221,0.4)", bg: "rgba(255,255,255,0.05)" };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: kolorowanie eventów walki
// ═══════════════════════════════════════════════════════════════════════════════

type EventSide = "ally" | "enemy" | "neutral";

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

  if (!attackerName || attackerName === "System" || attackerName === "Wszyscy") {
    return "neutral";
  }

  const mySide: "sideA" | "sideB" | null =
    myCharacterId === metadata.attackerId ? "sideA" :
    myCharacterId === metadata.defenderId ? "sideB" :
    null;

  if (mySide === null) {
    if (sideAFighterNames.includes(attackerName) || sideAMinionNames.includes(attackerName)) return "ally";
    if (sideBFighterNames.includes(attackerName) || sideBMinionNames.includes(attackerName)) return "enemy";
    return "neutral";
  }

  const isOnSideA = sideAFighterNames.includes(attackerName) || sideAMinionNames.includes(attackerName);
  const isOnSideB = sideBFighterNames.includes(attackerName) || sideBMinionNames.includes(attackerName);

  const allParticipants: Array<{ name: string; side: string; type: string; targetType?: string }> =
    metadata.allParticipants ?? [];

  if (allParticipants.length > 0) {
    const participant = allParticipants.find(p => p.name === attackerName);
    if (participant) {
      if (participant.side === "neutral") return "neutral";

      if (participant.type === "minion" && participant.targetType) {
        const participantIsAlly =
          (mySide === "sideA" && participant.side === "sideA") ||
          (mySide === "sideB" && participant.side === "sideB");
        return participantIsAlly ? "ally" : "enemy";
      }

      const participantIsAlly =
        (mySide === "sideA" && participant.side === "sideA") ||
        (mySide === "sideB" && participant.side === "sideB");
      return participantIsAlly ? "ally" : "enemy";
    }
  }

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
// SHARED — Panel / SectionTitle
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
// KOMPONENT: log jednej tury pojedynku
// ═══════════════════════════════════════════════════════════════════════════════

interface TurnLogViewProps {
  turn: any;
  metadata: any;
  myCharacterId: number | null;
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
// KOMPONENT: log jednej rundy turnieju magicznego
// ═══════════════════════════════════════════════════════════════════════════════

function TournamentRoundView({
  round, challengerName, defenderName, mySide,
}: {
  round: any;
  challengerName: string;
  defenderName: string;
  mySide: "challenger" | "defender";
}) {
  function castBlock(cast: any, side: "challenger" | "defender") {
    const isMySide = mySide === side;
    const color = isMySide ? COLORS.teal : COLORS.red;
    const name  = side === "challenger" ? challengerName : defenderName;
    const stars = "★".repeat(cast.effectiveness) + "☆".repeat(Math.max(0, 5 - cast.effectiveness));

    return (
      <div style={{
        flex: 1, padding: "10px 12px", borderRadius: 8,
        background: `${color}10`,
        border: `1px solid ${color}33`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: "Cinzel, serif" }}>{name}</span>
          <span style={{ fontSize: 11, color, letterSpacing: 1 }}>{stars}</span>
        </div>
        <p style={{ fontSize: 11, fontWeight: 700, color: COLORS.textDim, margin: "0 0 4px" }}>
          {cast.spellName}
          {cast.wasImprovised && (
            <span style={{ fontSize: 10, color: COLORS.textFaint, marginLeft: 6, fontWeight: 400 }}>(improwizacja)</span>
          )}
        </p>
        <p style={{ fontSize: 11, color: COLORS.textFaint, margin: 0, fontStyle: "italic" }}>
          {cast.description}
        </p>
        <p style={{ fontSize: 12, fontWeight: 700, color, margin: "6px 0 0" }}>
          +{cast.points} pkt
        </p>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 11, color: COLORS.textGhost, fontFamily: "Cinzel, serif", marginBottom: 8 }}>
        Runda {round.round}
        <span style={{ color: COLORS.textFaint, marginLeft: 12, fontFamily: "inherit" }}>
          {round.challengerTotalAfter} : {round.defenderTotalAfter}
        </span>
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        {castBlock(round.challenger, "challenger")}
        {castBlock(round.defender, "defender")}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GŁÓWNY KOMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function CombatPanel() {
  const { refresh: refreshCharacter } = useCharacter();
  const navigate = useNavigate();

  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [myCharacterId, setMyCharacterId] = useState<number | null>(null);
  const [selected, setSelected] = useState<RankingEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<ActionMode | null>(null);
  const [duelResult, setDuelResult] = useState<any>(null);
  const [tournamentResult, setTournamentResult] = useState<any>(null);

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

  function handleSelect(entry: RankingEntry) {
    if (entry.isMe) return;
    if (entry.foughtToday) return;
    setSelected(prev => (prev?.characterId === entry.characterId ? null : entry));
    setDuelResult(null);
    setTournamentResult(null);
  }

  function visitProfile(characterId: number, e: React.MouseEvent) {
    e.stopPropagation();
    navigate(`/profile/${characterId}`);
  }

  async function handleDuel() {
    if (!selected) return;
    setActing("duel");
    setDuelResult(null);
    setTournamentResult(null);
    try {
      const res = await api.post("/combat/challenge", {
        defenderCharacterId: selected.characterId,
      });
      setDuelResult(res.data);
      await fetchRanking();
      await refreshCharacter();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd walki");
    } finally {
      setActing(null);
      setSelected(null);
    }
  }

  async function handleTournament() {
    if (!selected) return;
    setActing("tournament");
    setDuelResult(null);
    setTournamentResult(null);
    try {
      const res = await api.post(`/combat/tournament/${selected.characterId}`);
      setTournamentResult(res.data);
      await fetchRanking();
      await refreshCharacter();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd turnieju");
    } finally {
      setActing(null);
      setSelected(null);
    }
  }

  if (loading) return <p style={{ fontSize: 13, color: COLORS.textFaint }}>Ładowanie...</p>;

  const myEntry = ranking.find(r => r.isMe);
  const myTier  = getLevelTier(myEntry?.level ?? 1);

  return (
    <div>
      <h1 style={{ fontFamily: "Cinzel, serif", color: COLORS.gold, fontSize: 22, marginBottom: 24, letterSpacing: "0.06em" }}>
        Pojedynki
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Wynik pojedynku */}
        {duelResult && (
          <Panel style={{
            background: duelResult.draw
              ? "rgba(245,196,81,0.05)"
              : duelResult.attackerWon
              ? "rgba(89,212,208,0.06)"
              : "rgba(244,106,78,0.06)",
            border: `1px solid ${
              duelResult.draw
                ? "rgba(245,196,81,0.25)"
                : duelResult.attackerWon
                ? "rgba(89,212,208,0.25)"
                : "rgba(244,106,78,0.25)"
            }`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <p style={{
                fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: 14,
                color: duelResult.draw ? COLORS.gold : duelResult.attackerWon ? COLORS.teal : COLORS.red,
                margin: 0, letterSpacing: "0.04em",
              }}>
                {duelResult.draw ? "🤝 Remis" : duelResult.attackerWon ? "⚔️ Zwycięstwo!" : "💀 Porażka"}
              </p>
              <button
                onClick={() => setDuelResult(null)}
                style={{ background: "none", border: "none", color: COLORS.textGhost, fontSize: 18, lineHeight: 1, cursor: "pointer", padding: 0 }}
                onMouseEnter={e => (e.currentTarget.style.color = COLORS.red)}
                onMouseLeave={e => (e.currentTarget.style.color = COLORS.textGhost)}
              >×</button>
            </div>
            <p style={{ fontSize: 13, color: COLORS.textDim, marginTop: 0, marginBottom: 10 }}>{duelResult.summary}</p>
            {!duelResult.draw && duelResult.attackerWon && (
              <p style={{ fontSize: 13, fontWeight: 700, color: COLORS.gold, marginTop: 0, marginBottom: 10 }}>
                +{duelResult.prestigeGain} prestiżu
              </p>
            )}

            {duelResult.log?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <ColorLegend />
                <div style={{
                  maxHeight: 288, overflowY: "auto",
                  display: "flex", flexDirection: "column", gap: 12,
                  background: COLORS.bg, borderRadius: 8, padding: 12,
                  border: `1px solid ${COLORS.borderSoft}`,
                }}>
                  {duelResult.log.map((turn: any) => (
                    <TurnLogView
                      key={turn.turn}
                      turn={turn}
                      metadata={duelResult.metadata}
                      myCharacterId={myCharacterId}
                      isFreshResult
                    />
                  ))}
                </div>
              </div>
            )}
          </Panel>
        )}

        {/* Wynik turnieju magicznego */}
        {tournamentResult && (
          <Panel style={{
            background: "rgba(167,139,250,0.06)",
            border: "1px solid rgba(167,139,250,0.25)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <p style={{
                fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: 14,
                color: COLORS.purple, margin: 0, letterSpacing: "0.04em",
              }}>
                {tournamentResult.draw
                  ? "🤝 Remis turniejowy"
                  : tournamentResult.challengerWon
                  ? "🏆 Triumf w turnieju!"
                  : "🎭 Porażka w turnieju"}
              </p>
              <button
                onClick={() => setTournamentResult(null)}
                style={{ background: "none", border: "none", color: COLORS.textGhost, fontSize: 18, lineHeight: 1, cursor: "pointer", padding: 0 }}
                onMouseEnter={e => (e.currentTarget.style.color = COLORS.red)}
                onMouseLeave={e => (e.currentTarget.style.color = COLORS.textGhost)}
              >×</button>
            </div>
            <p style={{ fontSize: 13, color: COLORS.textDim, marginTop: 0, marginBottom: 6 }}>{tournamentResult.summary}</p>
            <p style={{ fontSize: 12, color: COLORS.textFaint, marginBottom: 12 }}>
              Wynik:{" "}
              <span style={{ color: COLORS.purple, fontWeight: 700 }}>
                {tournamentResult.challengerTotal} : {tournamentResult.defenderTotal}
              </span>
            </p>
            {tournamentResult.prestigeGain > 0 && (
              <p style={{ fontSize: 13, fontWeight: 700, color: COLORS.gold, marginBottom: 12 }}>
                +{tournamentResult.prestigeGain} prestiżu
              </p>
            )}
            {tournamentResult.rounds?.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {tournamentResult.rounds.map((round: any) => (
                  <TournamentRoundView
                    key={round.round}
                    round={round}
                    challengerName={tournamentResult.metadata?.challengerName ?? "Ty"}
                    defenderName={tournamentResult.metadata?.defenderName ?? "Przeciwnik"}
                    mySide="challenger"
                  />
                ))}
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

            {/* Mój avatar — wg poziomu */}
            <div style={{ position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)", textAlign: "center" }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: myTier.bg, border: `2px solid ${myTier.color}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, marginBottom: 6,
              }}>
                {myTier.label}
              </div>
              <p style={{ fontSize: 11, fontWeight: 600, color: COLORS.textDim, margin: 0 }}>
                Ty {myEntry ? `• poz. ${myEntry.level}` : ""}
              </p>
            </div>

            {/* Avatar przeciwnika — wg poziomu */}
            <div style={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)", textAlign: "center" }}>
              {selected ? (() => {
                const tier = getLevelTier(selected.level);
                return (
                  <>
                    <div style={{
                      width: 64, height: 64, borderRadius: "50%",
                      background: tier.bg, border: `2px solid ${COLORS.red}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 26, marginBottom: 6, transition: "all 0.2s",
                    }}>
                      {tier.label}
                    </div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: COLORS.textDim, margin: 0 }}>
                      {selected.name} • poz. {selected.level}
                    </p>
                    <button
                      onClick={(e) => visitProfile(selected.characterId, e)}
                      style={{
                        marginTop: 4, padding: "3px 10px", borderRadius: 6,
                        border: `1px solid ${COLORS.borderSoft}`, background: "rgba(0,0,0,0.25)",
                        color: COLORS.textDim, fontSize: 10, cursor: "pointer",
                        fontFamily: "Cinzel, serif", fontWeight: 600,
                      }}
                    >
                      Odwiedź profil
                    </button>
                  </>
                );
              })() : (
                <>
                  <div style={{
                    width: 64, height: 64, borderRadius: "50%",
                    background: "rgba(0,0,0,0.25)", border: `2px solid ${COLORS.borderSoft}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24, fontWeight: 700, color: COLORS.textGhost, marginBottom: 6,
                    fontFamily: "Cinzel, serif",
                  }}>
                    ?
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: COLORS.textDim, margin: 0 }}>Przeciwnik</p>
                </>
              )}
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
                const tier = getLevelTier(entry.level);

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
                      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 15,
                      background: isSelected ? "rgba(244,106,78,0.15)" : tier.bg,
                      border: `1px solid ${isSelected ? COLORS.red : tier.color}`,
                    }}>
                      {tier.label}
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
                        <span style={{ fontSize: 10, color: COLORS.textFaint }}>poz. {entry.level}</span>
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
                    {!entry.isMe && (
                      <button
                        onClick={(e) => visitProfile(entry.characterId, e)}
                        title="Odwiedź profil"
                        style={{
                          flexShrink: 0, padding: "4px 10px", borderRadius: 6,
                          border: `1px solid ${COLORS.borderSoft}`, background: "transparent",
                          color: COLORS.textFaint, fontSize: 10, cursor: "pointer",
                          fontFamily: "Cinzel, serif", fontWeight: 600,
                          transition: "color 0.15s, border-color 0.15s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = COLORS.teal; e.currentTarget.style.borderColor = "rgba(89,212,208,0.4)"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = COLORS.textFaint; e.currentTarget.style.borderColor = COLORS.borderSoft; }}
                      >
                        Profil
                      </button>
                    )}
                    <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.textDim, flexShrink: 0 }}>
                      {entry.prestige} <span style={{ fontSize: 11, fontWeight: 400, color: COLORS.textFaint }}>prestiżu</span>
                    </span>
                    {isSelected && <span style={{ color: COLORS.red, flexShrink: 0 }}>⚔️</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Przyciski akcji — pojedynek / turniej */}
          <div style={{ padding: "16px", borderTop: `1px solid ${COLORS.borderSoft}` }}>
            {selected ? (
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleDuel}
                  disabled={acting !== null}
                  style={{
                    flex: 1, padding: "12px 0", borderRadius: 8,
                    border: "none", fontSize: 12, fontWeight: 700,
                    fontFamily: "Cinzel, serif", letterSpacing: "0.04em",
                    background: acting ? "rgba(244,106,78,0.3)" : COLORS.red,
                    color: COLORS.bg,
                    cursor: acting ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {acting === "duel" ? "Trwa walka..." : "⚔️ Wyzwij na pojedynek"}
                </button>
                <button
                  onClick={handleTournament}
                  disabled={acting !== null}
                  style={{
                    flex: 1, padding: "12px 0", borderRadius: 8,
                    border: `1px solid ${COLORS.purple}`, fontSize: 12, fontWeight: 700,
                    fontFamily: "Cinzel, serif", letterSpacing: "0.04em",
                    background: acting ? "rgba(167,139,250,0.1)" : "rgba(167,139,250,0.18)",
                    color: acting ? COLORS.textFaint : COLORS.purple,
                    cursor: acting ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {acting === "tournament" ? "Trwa turniej..." : "🎭 Turniej magiczny"}
                </button>
              </div>
            ) : (
              <p style={{ textAlign: "center", fontSize: 12, color: COLORS.textGhost, margin: 0 }}>
                Wybierz przeciwnika z rankingu, aby wyzwać go na pojedynek lub do turnieju magicznego
              </p>
            )}
          </div>
        </Panel>

        {/* Historia */}
        <HistoryPanel myCharacterId={myCharacterId} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// KOMPONENT: historia pojedynków + turniejów (połączona, posortowana po dacie)
// ═══════════════════════════════════════════════════════════════════════════════

function HistoryPanel({ myCharacterId }: { myCharacterId: number | null }) {
  const [duels, setDuels] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get("/combat/history").then(r => setDuels(r.data)).catch(() => {}),
      api.get("/combat/tournament/history").then(r => setTournaments(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  const combined = [
    ...duels.map(d => ({ ...d, _type: "duel" as const })),
    ...tournaments.map(t => ({ ...t, _type: "tournament" as const })),
  ].sort((a, b) => new Date(b.foughtAt).getTime() - new Date(a.foughtAt).getTime());

  if (combined.length === 0) return null;

  return (
    <Panel>
      <SectionTitle>Historia</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {combined.map((entry: any) => {
          const isDuel = entry._type === "duel";
          const key = `${isDuel ? "d" : "t"}-${entry.id}`;
          const isOpen = expanded === key;

          const isDraw = isDuel ? !!entry.isDraw : !!entry.draw;
          const youWon = !isDraw && entry.youWon;

          const tagLabel = isDuel ? "Pojedynek" : "Turniej";
          const tagColor = isDuel ? COLORS.red : COLORS.purple;

          const resultColor = isDraw ? COLORS.gold : youWon ? COLORS.teal : COLORS.red;
          const resultIcon  = isDraw ? "🤝" : youWon ? (isDuel ? "⚔️" : "🏆") : (isDuel ? "💀" : "🎭");
          const resultLabel = isDraw ? "Remis" : youWon ? "Zwycięstwo" : "Porażka";

          const showPrestige = entry.prestigeGain > 0 && (youWon || (isDraw && !isDuel));

          const leftName  = isDuel ? entry.attacker : entry.challenger;
          const rightName = entry.defender;

          return (
            <div key={key}>
              <div
                onClick={() => setExpanded(isOpen ? null : key)}
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
                <span style={{ fontSize: 16, color: resultColor, flexShrink: 0 }}>{resultIcon}</span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: 9, padding: "2px 6px", borderRadius: 4, fontWeight: 700,
                      fontFamily: "Cinzel, serif", letterSpacing: "0.06em",
                      background: `${tagColor}22`, color: tagColor,
                      border: `1px solid ${tagColor}44`, flexShrink: 0,
                    }}>
                      {tagLabel}
                    </span>
                    <p style={{
                      fontSize: 13, color: COLORS.text, margin: 0,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      <span style={{ fontWeight: 600 }}>{leftName}</span>
                      <span style={{ color: COLORS.textFaint, margin: "0 6px" }}>vs</span>
                      <span style={{ fontWeight: 600 }}>{rightName}</span>
                    </p>
                  </div>
                  <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "2px 0 0" }}>
                    {new Date(entry.foughtAt).toLocaleString("pl-PL")}
                  </p>
                </div>

                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: resultColor, margin: 0 }}>
                    {resultLabel}
                  </p>
                  {showPrestige ? (
                    <p style={{ fontSize: 11, color: COLORS.gold, margin: "2px 0 0", fontWeight: 700 }}>
                      +{entry.prestigeGain} prestiżu
                    </p>
                  ) : !isDraw && entry.winner ? (
                    <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "2px 0 0" }}>
                      Wygrał: {entry.winner}
                    </p>
                  ) : null}
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
                  <p style={{ fontSize: 12, color: COLORS.textDim, margin: 0 }}>{entry.summary}</p>

                  {isDuel && entry.log?.length > 0 && (
                    <div>
                      <ColorLegend />
                      <div style={{
                        display: "flex", flexDirection: "column", gap: 12,
                        background: COLORS.bg, borderRadius: 8, padding: 12,
                        border: `1px solid ${COLORS.borderSoft}`,
                      }}>
                        {entry.log.map((turn: any) => (
                          <TurnLogView
                            key={turn.turn}
                            turn={turn}
                            metadata={entry.metadata}
                            myCharacterId={entry.myCharacterId ?? myCharacterId}
                            isFreshResult={false}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {!isDuel && entry.rounds?.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {entry.rounds.map((round: any) => (
                        <TournamentRoundView
                          key={round.round}
                          round={round}
                          challengerName={entry.challenger}
                          defenderName={entry.defender}
                          mySide={
                            (entry.myCharacterId ?? myCharacterId) === entry.metadata?.challengerId
                              ? "challenger"
                              : "defender"
                          }
                        />
                      ))}
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