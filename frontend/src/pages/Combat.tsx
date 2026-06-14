import { useCallback, useEffect, useState } from "react";
import api from "../api/client";

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
 * - "ally"    → ciemnozielony  — mój fighter lub mój minion
 * - "enemy"   → ciemnoczerwony — fighter/minion przeciwnika
 * - "neutral" → ciemnożółty   — minion z targetType=randomAny, efekty globalne,
 *                                System, eventy bez wyraźnej strony
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
    // Obserwator (nie uczestnik) — sideA zielona, sideB czerwona
    if (sideAFighterNames.includes(attackerName) || sideAMinionNames.includes(attackerName)) return "ally";
    if (sideBFighterNames.includes(attackerName) || sideBMinionNames.includes(attackerName)) return "enemy";
    return "neutral";
  }

  // Sprawdź czy attacker należy do sideA lub sideB
  const isOnSideA = sideAFighterNames.includes(attackerName) || sideAMinionNames.includes(attackerName);
  const isOnSideB = sideBFighterNames.includes(attackerName) || sideBMinionNames.includes(attackerName);

  // Miniony neutralne (randomAny) — identyfikacja przez allParticipants
  // Jeśli attacker jest minionem ale nie ma go w żadnej liście fighterów/minionów,
  // lub jawnie oznaczony jako neutralny w allParticipants — traktuj jako neutral.
  // Dla uproszczenia: miniony z summonTargetType=randomAny są w sideBMinionNames/sideAMinionNames
  // ale możemy oznaczyć je jako neutral w allParticipants jeśli dodasz to w serwisie.
  // Tymczasowo: sprawdź allParticipants jeśli dostępne.
  const allParticipants: Array<{ name: string; side: string; type: string; targetType?: string }> =
    metadata.allParticipants ?? [];

if (allParticipants.length > 0) {
  const participant = allParticipants.find(p => p.name === attackerName);
  if (participant) {
    // Neutralne (randomAny, all) — zawsze żółte
    if (participant.side === "neutral") return "neutral";

    if (participant.type === "minion" && participant.targetType) {
      // randomAlly / allAllies — minion bije sojuszników właściciela
      // z perspektywy właściciela to sojusznik (zielony), dla wroga to... też sojusznik właściciela (zielony/czerwony normalnie)
      // Traktujemy go jak fightera swojej strony
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
  ally:    "text-green-800",
  enemy:   "text-red-800",
  neutral: "text-yellow-700",
};

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
  // HP header — świeży wynik używa sideAFighterHps/sideBFighterHps,
  // historia używa starszego attackerHp/defenderHp
  const hpHeader = isFreshResult
    ? `HP Atakującego: ${turn.sideAFighterHps?.[0]?.hp ?? "?"} • HP Obrońcy: ${turn.sideBFighterHps?.[0]?.hp ?? "?"}`
    : `HP Atakującego: ${turn.attackerHp ?? turn.sideAFighterHps?.[0]?.hp ?? "?"} • HP Obrońcy: ${turn.defenderHp ?? turn.sideBFighterHps?.[0]?.hp ?? "?"}`;

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center gap-2 text-gray-500">
        <span className="font-semibold">Tura {turn.turn}</span>
        <span>•</span>
        <span>{hpHeader}</span>
      </div>
      <div className="space-y-1">
        {turn.events?.map((event: any, eventIndex: number) => {
          const side  = getEventSide(event.attacker, metadata, myCharacterId);
          const color = EVENT_COLORS[side];
          return (
            <div key={eventIndex} className={color}>
              <span className="font-medium">{event.description}</span>
              {event.damage > 0 && side === "enemy" && (
                <span className="opacity-75"> (cel: {event.targetHpAfter} HP)</span>
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
    <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
      <span className="font-medium text-gray-400 uppercase tracking-wide">Legenda:</span>
      <span className="flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-full bg-green-800 inline-block" />
        <span className="text-green-800 font-medium">Twoje akcje</span>
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-full bg-red-800 inline-block" />
        <span className="text-red-800 font-medium">Akcje przeciwnika</span>
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-600 inline-block" />
        <span className="text-yellow-700 font-medium">Efekty globalne / neutralne</span>
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GŁÓWNY KOMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function CombatPanel({ onRefresh }: { onRefresh: () => void }) {
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
      onRefresh();
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

  if (loading) return <p className="text-sm text-gray-400">Ładowanie...</p>;

  return (
    <div className="space-y-4">

      {/* Wynik walki */}
      {battleResult && (
        <div className={`rounded-xl border p-4 ${battleResult.attackerWon ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          <div className="flex justify-between items-start mb-3">
            <p className={`font-semibold ${battleResult.attackerWon ? "text-green-900" : "text-red-900"}`}>
              {battleResult.attackerWon ? "⚔️ Zwycięstwo!" : "💀 Porażka"}
            </p>
            <button onClick={() => setBattleResult(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>
          <p className="text-sm text-gray-700 mb-3">{battleResult.summary}</p>
          {battleResult.attackerWon && (
            <p className="text-sm font-medium text-green-700">+{battleResult.prestigeGain} prestiżu</p>
          )}

          {/* Log walki */}
          {battleResult.log?.length > 0 && (
            <div className="mt-3">
              <ColorLegend />
              <div className="max-h-72 overflow-y-auto space-y-3 bg-white rounded-lg p-3 border border-gray-100">
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
        </div>
      )}

      {/* Arena */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="relative" style={{ height: "200px" }}>
          <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
            <p className="text-gray-200 text-sm">Grafika areny — tło z czarodziejami po bokach</p>
          </div>
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center text-2xl font-bold text-gray-400 mb-1">
              ?
            </div>
            <p className="text-xs font-medium text-gray-500">Ty</p>
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-center">
            <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center text-2xl font-bold mb-1 transition-colors ${
              selected ? "bg-red-100 border-red-300 text-red-400" : "bg-gray-200 border-gray-300 text-gray-400"
            }`}>
              {selected ? selected.name[0] : "?"}
            </div>
            <p className="text-xs font-medium text-gray-500">
              {selected ? selected.name : "Przeciwnik"}
            </p>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-black text-gray-200">VS</span>
          </div>
        </div>

        {/* Ranking */}
        <div className="border-t border-gray-100">
          <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ranking graczy</p>
            <p className="text-xs text-gray-400">Kliknij gracza aby wyzwać</p>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
            {ranking.map((entry) => {
              const isSelected = selected?.characterId === entry.characterId;
              return (
                <div
                  key={entry.characterId}
                  onClick={() => handleSelect(entry)}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    entry.isMe
                      ? "bg-gray-50 cursor-default"
                      : entry.foughtToday
                      ? "opacity-40 cursor-not-allowed"
                      : isSelected
                      ? "bg-red-50 cursor-pointer"
                      : "hover:bg-gray-50 cursor-pointer"
                  }`}
                >
                  <span className={`text-sm font-bold w-8 text-center shrink-0 ${
                    entry.rank === 1 ? "text-yellow-500" :
                    entry.rank === 2 ? "text-gray-400" :
                    entry.rank === 3 ? "text-amber-600" :
                    "text-gray-300"
                  }`}>
                    {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                  </span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    entry.isMe ? "bg-gray-900 text-white" :
                    isSelected ? "bg-red-500 text-white" :
                    "bg-gray-200 text-gray-500"
                  }`}>
                    {entry.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium truncate ${entry.isMe ? "text-gray-900" : "text-gray-700"}`}>
                        {entry.name}
                      </span>
                      {entry.isMe && (
                        <span className="text-xs px-1.5 py-0.5 bg-gray-900 text-white rounded">Ty</span>
                      )}
                      {entry.foughtToday && !entry.isMe && (
                        <span className="text-xs text-gray-400">✓ walczono dziś</span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 shrink-0">
                    {entry.prestige} <span className="text-xs font-normal text-gray-400">prestiżu</span>
                  </span>
                  {isSelected && (
                    <span className="text-red-500 shrink-0">⚔️</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-gray-100">
          {selected ? (
            <button
              onClick={handleChallenge}
              disabled={fighting}
              className="w-full py-2.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {fighting ? "Trwa walka..." : `⚔️ Wyzwij ${selected.name} na pojedynek`}
            </button>
          ) : (
            <p className="text-center text-sm text-gray-400 py-1">
              Wybierz przeciwnika z rankingu aby wyzwać go na pojedynek
            </p>
          )}
        </div>
      </div>

      {/* Historia walk */}
      <HistoryPanel />
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
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Historia walk</p>
      <div className="space-y-2">
        {history.map((battle: any) => (
          <div key={battle.id}>
            <div
              onClick={() => setExpanded(expanded === battle.id ? null : battle.id)}
              className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <span className={`text-lg ${battle.youWon ? "text-green-500" : "text-red-400"}`}>
                {battle.youWon ? "⚔️" : "💀"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{battle.attacker}</span>
                  <span className="text-gray-400 mx-1">vs</span>
                  <span className="font-medium">{battle.defender}</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(battle.foughtAt).toLocaleString("pl-PL")}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-medium ${battle.youWon ? "text-green-600" : "text-red-400"}`}>
                  {battle.youWon ? `+${battle.prestigeGain} prestiżu` : "Porażka"}
                </p>
                <p className="text-xs text-gray-400">Wygrał: {battle.winner}</p>
              </div>
            </div>

            {expanded === battle.id && (
              <div className="mt-1 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 border border-gray-100 space-y-3">
                <p>{battle.summary}</p>
                {battle.log?.length > 0 && (
                  <div>
                    <ColorLegend />
                    <div className="space-y-3 bg-white rounded-lg p-3 border border-gray-100">
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
        ))}
      </div>
    </div>
  );
}