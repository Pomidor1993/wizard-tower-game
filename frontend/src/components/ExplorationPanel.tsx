import { useEffect, useState, useCallback } from "react";
import api from "../api/client";

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
  // Statystyki startowe obu stron (opcjonalne — backend może je dołączyć)
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
  return <span className="font-mono font-semibold text-gray-900">{timeLeft}</span>;
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
    if (!stats) return <div className="flex-1" />;
    const isPlayer = side === "player";
    const borderColor = isPlayer ? "border-green-200" : "border-red-200";
    const bgColor     = isPlayer ? "bg-green-50"     : "bg-red-50";
    const nameColor   = isPlayer ? "text-green-900"  : "text-red-900";
    const dotColor    = isPlayer ? "bg-green-500"    : "bg-red-400";

    // Tylko statystyki > 0
    const visibleStats = Object.entries(STAT_LABELS).filter(([key]) => {
      const val = stats[key as keyof FighterStats];
      return val != null && val > 0;
    });

    return (
      <div className={`flex-1 rounded-xl border ${borderColor} ${bgColor} p-4`}>
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-7 h-7 rounded-full ${dotColor} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
            {name[0]}
          </div>
          <p className={`font-semibold text-sm ${nameColor} truncate`}>{name}</p>
          {isPlayer && playerWon !== undefined && (
            <span className="ml-auto text-base">{playerWon ? "⚔️" : "💀"}</span>
          )}
          {!isPlayer && playerWon !== undefined && (
            <span className="ml-auto text-base">{playerWon ? "💀" : "⚔️"}</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {visibleStats.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{label}</span>
              <span className="text-xs font-semibold text-gray-800">{stats[key as keyof FighterStats]}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 px-6 py-4 border-b border-gray-100">
      <StatColumn name={playerName} stats={playerStats} side="player" />
      <div className="flex items-center justify-center w-6 shrink-0">
        <span className="text-gray-300 font-bold text-sm">VS</span>
      </div>
      <StatColumn name={entityName} stats={entityStats} side="entity" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOG WALKI — widok jednej tury
// Kolorowanie: zielony = gracz, czerwony = byt, żółty = minion "all"/"randomAny", szary = system
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
    <div className="space-y-1.5 text-xs">
      <div className="flex items-center gap-2 text-gray-400 pb-1 border-b border-gray-100">
        <span className="font-semibold text-gray-600">Tura {turn.turn}</span>
        <span>•</span>
        <span className="text-green-700 font-medium">{playerName}: {hpA} HP</span>
        <span>•</span>
        <span className="text-red-700 font-medium">{entityName}: {hpB} HP</span>
      </div>
      <div className="space-y-0.5">
        {turn.events?.map((event: any, i: number) => {
          const isSystem = !event.attacker || event.attacker === "System" || event.attacker === "Wszyscy";
          const isPlayer = event.attacker === playerName;

          // Neutralne: eventy systemowe LUB miniony z targetType all/randomAny
          // Sprawdzamy po opisie — jeśli attacker nie jest ani graczem ani bytem, to minion
          const isKnownActor = isPlayer || event.attacker === entityName;
          const isMinion = !isSystem && !isKnownActor;

          // Dla minionów sprawdzamy czy opis zawiera atak na wszystkich (heurystyka)
          // Bezpieczniej: miniony zawsze żółte w PvE — nie wiemy z czyjej są strony
          let color: string;
          if (isSystem) color = "text-gray-400";
          else if (isPlayer) color = "text-green-800";
          else if (isMinion) color = "text-yellow-700";
          else color = "text-red-800"; // byt
          return (
            <p key={i} className={color}>{event.description}</p>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL LOGU WALKI
// ═══════════════════════════════════════════════════════════════════════════════

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
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Nagłówek */}
        <div className={`px-6 py-4 flex items-start justify-between ${encounter.playerWon ? "bg-green-50 border-b border-green-100" : "bg-red-50 border-b border-red-100"}`}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{encounter.playerWon ? "⚔️" : "💀"}</span>
              <p className={`font-semibold ${encounter.playerWon ? "text-green-900" : "text-red-900"}`}>
                {encounter.playerWon ? "Zwycięstwo!" : "Porażka"} — {encounter.entityName}
              </p>
            </div>
            <p className="text-xs text-gray-500">{locationName}</p>
            {encounter.summary && <p className="text-sm text-gray-700 mt-1">{encounter.summary}</p>}
            {encounter.playerWon && (encounter.runicShardsEarned ?? 0) > 0 && (
              <p className="text-sm font-medium text-amber-700 mt-1">+{encounter.runicShardsEarned} okruchów kamienia runicznego</p>
            )}
            {encounter.flavorText && (
              <p className="text-xs text-gray-500 italic mt-1">„{encounter.flavorText}"</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            {onSave && !alreadySaved && (
              <button onClick={onSave} className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                Zapisz raport
              </button>
            )}
            {alreadySaved && <span className="text-xs text-gray-400 px-2">✓ zapisano</span>}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
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
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {encounter.battleLog && encounter.battleLog.length > 0
            ? encounter.battleLog.map((turn: any) => (
                <TurnLogView
                  key={turn.turn}
                  turn={turn}
                  playerName={playerName}
                  entityName={encounter.entityName ?? "Byt"}
                />
              ))
            : <p className="text-sm text-gray-400 text-center py-8">Brak logu walki.</p>
          }
        </div>
      </div>
    </div>
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

  if (loading) return <p className="text-xs text-gray-400 py-2">Ładowanie historii...</p>;
  if (history.length === 0) return (
    <p className="text-sm text-gray-400 text-center py-6">Brak spotkań w historii. Eksploruj więcej!</p>
  );

  return (
    <div className="space-y-2">
      {history.slice(0, 20).map(entry => {
        const loc = EXPLORATION_LEVELS[entry.locationLevel - 1];
        const isOpen = expanded === entry.id;
        return (
          <div key={entry.id} className="border border-gray-100 rounded-lg overflow-hidden">
            <div
              onClick={() => setExpanded(isOpen ? null : entry.id)}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <span className={`text-base ${entry.playerWon ? "text-green-500" : "text-red-400"}`}>
                {entry.playerWon ? "⚔️" : "💀"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{entry.entityName ?? "Nieznany byt"}</span>
                  <span className="text-gray-400 text-xs ml-2">— {loc?.name ?? `Poziom ${entry.locationLevel}`}</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{new Date(entry.foughtAt).toLocaleString("pl-PL")}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-medium ${entry.playerWon ? "text-amber-600" : "text-gray-400"}`}>
                  {entry.playerWon ? `+${entry.runicShardsEarned} okruchów` : "Porażka"}
                </p>
              </div>
              <span className={`text-gray-300 text-xs ml-1 transition-transform duration-150 inline-block ${isOpen ? "rotate-90" : ""}`}>▶</span>
            </div>

            {isOpen && (
              <div className="border-t border-gray-100 bg-gray-50">
                {/* Statystyki w historii */}
                {(entry.playerStats || entry.entityStats) && (
                  <StatsPanel
                    playerName={playerName}
                    entityName={entry.entityName ?? "Byt"}
                    playerStats={entry.playerStats}
                    entityStats={entry.entityStats}
                    playerWon={entry.playerWon}
                  />
                )}
                <div className="px-4 py-3">
                  {entry.summary && <p className="text-xs text-gray-600 mb-3 italic">{entry.summary}</p>}
                  <div className="space-y-3 max-h-64 overflow-y-auto bg-white rounded-lg p-3 border border-gray-100">
                    {entry.log?.length > 0
                      ? entry.log.map((turn: any) => (
                          <TurnLogView
                            key={turn.turn}
                            turn={turn}
                            playerName={playerName}
                            entityName={entry.entityName ?? "Byt"}
                          />
                        ))
                      : <p className="text-xs text-gray-400">Brak logu.</p>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Archiwum raportów</h2>
            <p className="text-xs text-gray-400 mt-0.5">{archive.length} zapisanych raportów</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {archive.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">Brak zapisanych raportów.</p>
              <p className="text-gray-300 text-xs mt-1">Po walce z bytem kliknij „Zapisz raport" żeby zachować log.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {archive.map(report => {
                const enc = report.encounter;
                const isOpen = expanded === report.id;
                return (
                  <div key={report.id} className="border border-gray-100 rounded-lg overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className={`text-base ${enc?.playerWon ? "text-green-500" : enc?.fought ? "text-red-400" : "text-gray-300"}`}>
                        {enc?.fought ? (enc.playerWon ? "⚔️" : "💀") : "🗺️"}
                      </span>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(isOpen ? null : report.id)}>
                        <p className="text-sm text-gray-900">
                          {enc?.fought
                            ? <><span className="font-medium">{enc.entityName}</span><span className="text-gray-400 text-xs ml-2">— {report.locationName}</span></>
                            : <span className="font-medium">{report.locationName}</span>
                          }
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Zapisano: {new Date(report.savedAt).toLocaleString("pl-PL")} · +{report.skillPointsEarned} pkt umiej.
                          {enc?.fought && enc.playerWon && enc.runicShardsEarned ? ` · +${enc.runicShardsEarned} okruchów` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {enc?.fought && (
                          <button
                            onClick={() => setActiveModal(report)}
                            className="text-xs px-2.5 py-1 border border-gray-200 text-gray-500 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            Log walki
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(report.id)}
                          className="text-xs text-gray-300 hover:text-red-400 transition-colors px-1"
                          title="Usuń"
                        >×</button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="border-t border-gray-50 px-4 py-3 bg-gray-50">
                        <div className="space-y-1">
                          {report.messages?.map((msg, i) => (
                            <p key={i} className="text-xs text-gray-600">• {msg}</p>
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
      </div>

      {activeModal?.encounter?.fought && (
        <BattleLogModal
          encounter={activeModal.encounter}
          playerName={playerName}
          locationName={activeModal.locationName}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
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
  onRefresh: () => void;
  playerName?: string;
  towerLevel?: number;
}) {
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

  const activeExploration = actions?.activeActions?.find((a: any) => a.actionType === "exploration" && a.status === "in_progress");
  const completedExploration = actions?.activeActions?.find((a: any) => a.actionType === "exploration" && a.status === "completed");
  const explorationActions = actions?.explorationActionsAvailable ?? 0;
  const currentLoc = EXPLORATION_LEVELS[selected - 1]!;
  const locLocked = towerLevel < currentLoc.requiredTowerLevel;

  async function handleStart() {
    setLoading(true);
    try { await api.post("/actions/exploration/start", { level: selected }); await fetchActions(); onRefresh(); }
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
      onRefresh();
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
    <div className="space-y-4">

      {/* Pasek wyniku */}
      {report && !battleModalOpen && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-semibold text-gray-900">Wynik eksploracji</p>
            <div className="flex items-center gap-2">
              {report.encounter?.fought && (
                <button onClick={() => setBattleModalOpen(true)}
                  className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                  Zobacz log walki
                </button>
              )}
              {!reportSaved
                ? <button onClick={handleSaveReport} className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">Zapisz raport</button>
                : <span className="text-xs text-gray-400">✓ zapisano</span>
              }
              <button onClick={() => setReport(null)} className="text-gray-300 hover:text-gray-500 text-lg leading-none">×</button>
            </div>
          </div>
          <div className="space-y-1">
            {report.messages?.map((msg: string, i: number) => (
              <p key={i} className="text-sm text-gray-700">• {msg}</p>
            ))}
          </div>
        </div>
      )}

      {/* Aktywna eksploracja */}
      {activeExploration && (
        <div className="bg-white rounded-xl border border-blue-200 bg-blue-50 p-4 flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-blue-900">Trwa eksploracja — poziom {activeExploration.actionLevel}</p>
            <p className="text-xs text-blue-500 mt-0.5">{EXPLORATION_LEVELS[activeExploration.actionLevel - 1]?.name}</p>
          </div>
          <Timer finishesAt={activeExploration.finishesAt} onDone={fetchActions} />
        </div>
      )}

      {/* Gotowa do odebrania */}
      {completedExploration && (
        <div className="bg-white rounded-xl border border-green-200 p-4 flex justify-between items-center">
          <p className="text-sm font-medium text-green-900">Eksploracja zakończona! Odbierz wynik.</p>
          <button onClick={() => handleClaim(completedExploration.id)} disabled={claiming}
            className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50">
            {claiming ? "..." : "Odbierz"}
          </button>
        </div>
      )}

      {/* Główny układ */}
      <div className="grid grid-cols-[280px_1fr] gap-4 items-start">

        {/* Lista lokacji */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Lokacje</p>
            <span className="text-xs text-gray-400">Akcje: <span className="font-semibold text-gray-700">{explorationActions}/15</span></span>
          </div>
          <div className="divide-y divide-gray-50">
            {EXPLORATION_LEVELS.map(loc => {
              const locked = towerLevel < loc.requiredTowerLevel;
              const isSelected = selected === loc.level;
              return (
                <button
                  key={loc.level}
                  onClick={() => !locked && setSelected(loc.level)}
                  disabled={locked}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    locked
                      ? "opacity-40 cursor-not-allowed bg-gray-50"
                      : isSelected
                      ? "bg-gray-900 text-white"
                      : "hover:bg-gray-50 text-gray-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium ${isSelected && !locked ? "text-white" : "text-gray-900"}`}>{loc.name}</p>
                    {locked && <span className="text-xs text-gray-400">🔒</span>}
                  </div>
                  <p className={`text-xs mt-0.5 ${isSelected && !locked ? "text-gray-300" : "text-gray-400"}`}>{loc.duration} · {loc.points}</p>
                  {loc.availableFrom && (
                    <p className={`text-xs mt-0.5 ${isSelected && !locked ? "text-gray-400" : locked ? "text-red-400" : "text-gray-300"}`}>
                      {loc.availableFrom}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Szczegóły lokacji */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ minHeight: "340px" }}>
          <div className="flex items-center justify-center bg-gray-50 border-b border-gray-100" style={{ height: "220px" }}>
            <p className="text-gray-300 text-sm">Grafika: {currentLoc.name}</p>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">{currentLoc.name}</p>
                {locLocked && (
                  <span className="text-xs px-2 py-0.5 bg-red-50 text-red-500 rounded border border-red-100">
                    🔒 Wymaga wieży poz. {currentLoc.requiredTowerLevel}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">{currentLoc.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-gray-50 rounded-lg"><p className="text-xs text-gray-400">Czas trwania</p><p className="text-sm font-medium text-gray-900">{currentLoc.duration}</p></div>
              <div className="p-2 bg-gray-50 rounded-lg"><p className="text-xs text-gray-400">Punkty umiej.</p><p className="text-sm font-medium text-gray-900">{currentLoc.points}</p></div>
              <div className="p-2 bg-gray-50 rounded-lg"><p className="text-xs text-gray-400">Szansa na przedmiot</p><p className="text-sm font-medium text-gray-900">{currentLoc.itemChance}</p></div>
              <div className="p-2 bg-gray-50 rounded-lg"><p className="text-xs text-gray-400">Szansa na spotkanie</p><p className="text-sm font-medium text-gray-900">{currentLoc.encounterChance}</p></div>
            </div>
            {!activeExploration && !completedExploration && (
              <button
                onClick={handleStart}
                disabled={loading || explorationActions <= 0 || locLocked}
                className="w-full py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "..." : locLocked ? `Zablokowane — wymagany poziom wieży ${currentLoc.requiredTowerLevel}` : explorationActions <= 0 ? "Brak akcji eksploracji" : `Eksploruj — ${currentLoc.name}`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Placeholder ustawień */}
      <div className="flex items-center justify-center h-16 border-2 border-dashed border-gray-200 rounded-xl">
        <p className="text-gray-400 text-sm">Ustawienia eksploracji — poziom trudności, cel itp. — wkrótce</p>
      </div>

      {/* Historia spotkań */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Historia spotkań</p>
          <button onClick={() => setShowArchive(true)}
            className="text-xs px-3 py-1.5 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition-colors">
            Archiwum raportów
          </button>
        </div>
        <EncounterHistoryPanel playerName={playerName} />
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