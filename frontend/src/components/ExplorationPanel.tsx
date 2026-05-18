import { useEffect, useState, useCallback } from "react";
import api from "../api/client";

const EXPLORATION_LEVELS = [
  {
    level: 1,
    name: "Spacerek wokół wieży",
    description: "Niedaleko, niegroźnie. Idealne na rozgrzewkę.",
    duration: "2 min",
    points: "10–20 pkt",
    itemChance: "10%",
    encounterChance: "5%",
    requiredStat: 0,
    availableFrom: null,
  },
  {
    level: 2,
    name: "Spacerek po włościach",
    description: "Trochę dalej od wieży. Może coś ciekawego się trafi.",
    duration: "4 min",
    points: "20–40 pkt",
    itemChance: "20%",
    encounterChance: "10%",
    requiredStat: 5,
    availableFrom: "Wymagana suma żywiołów: 5",
  },
  {
    level: 3,
    name: "Wycieczka do magicznego miasta",
    description: "Tłoczno, głośno i pełno dziwnych stworzeń. Brzmi jak plan.",
    duration: "6 min",
    points: "40–60 pkt",
    itemChance: "30%",
    encounterChance: "0%",
    requiredStat: 10,
    availableFrom: "Wymagana suma żywiołów: 10",
  },
  {
    level: 4,
    name: "Wycieczka w smutne góry",
    description: "Zimno, mgliście i pełno niebezpieczeństw. Dla odważnych.",
    duration: "8 min",
    points: "60–80 pkt",
    itemChance: "20%",
    encounterChance: "40%",
    requiredStat: 20,
    availableFrom: "Wymagana suma żywiołów: 20",
  },
  {
    level: 5,
    name: "Magiczna podróż morska",
    description: "Nieznane wody, nieznane stworzenia. Tylko dla najdzielniejszych magów.",
    duration: "10 min",
    points: "70–90 pkt",
    itemChance: "40%",
    encounterChance: "50%",
    requiredStat: 35,
    availableFrom: "Wymagana suma żywiołów: 35",
  },
];

function Timer({ finishesAt, onDone }: { finishesAt: string; onDone: () => void }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = new Date(finishesAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Gotowe!");
        clearInterval(interval);
        setTimeout(onDone, 500);
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${m}:${s.toString().padStart(2, "0")}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [finishesAt, onDone]);

  return <span className="font-mono font-semibold text-gray-900">{timeLeft}</span>;
}

export default function ExplorationPanel({ onRefresh }: { onRefresh: () => void }) {
  const [selected, setSelected] = useState(1);
  const [actions, setActions] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [report, setReport] = useState<any>(null);

  const fetchActions = useCallback(async () => {
    try {
      const res = await api.get("/actions");
      setActions(res.data);
    } catch {}
  }, []);

  useEffect(() => { fetchActions(); }, [fetchActions]);

  const activeExploration = actions?.activeActions?.find(
    (a: any) => a.actionType === "exploration" && a.status === "in_progress"
  );
  const completedExploration = actions?.activeActions?.find(
    (a: any) => a.actionType === "exploration" && a.status === "completed"
  );

  async function handleStart() {
    setLoading(true);
    try {
      await api.post("/actions/exploration/start", { level: selected });
      await fetchActions();
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd");
    } finally {
      setLoading(false);
    }
  }

  async function handleClaim(actionId: number) {
    setClaiming(true);
    try {
      const res = await api.post(`/actions/exploration/claim/${actionId}`);
      setReport(res.data);
      await fetchActions();
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd");
    } finally {
      setClaiming(false);
    }
  }

  const explorationActions = actions?.explorationActionsAvailable ?? 0;
  const currentLoc = EXPLORATION_LEVELS[selected - 1]!;

  return (
    <div className="space-y-4">

      {/* Raport */}
      {report && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-semibold text-gray-900">Wynik eksploracji</p>
            <button onClick={() => setReport(null)} className="text-gray-300 hover:text-gray-500 text-lg leading-none">×</button>
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
            <p className="text-sm font-medium text-blue-900">
              Trwa eksploracja — poziom {activeExploration.actionLevel}
            </p>
            <p className="text-xs text-blue-500 mt-0.5">
              {EXPLORATION_LEVELS[activeExploration.actionLevel - 1]?.name}
            </p>
          </div>
          <Timer
            finishesAt={activeExploration.finishesAt}
            onDone={fetchActions}
          />
        </div>
      )}

      {/* Gotowa do odebrania */}
      {completedExploration && (
        <div className="bg-white rounded-xl border border-green-200 p-4 flex justify-between items-center">
          <p className="text-sm font-medium text-green-900">Eksploracja zakończona! Odbierz wynik.</p>
          <button
            onClick={() => handleClaim(completedExploration.id)}
            disabled={claiming}
            className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {claiming ? "..." : "Odbierz"}
          </button>
        </div>
      )}

      {/* Główny układ */}
      <div className="grid grid-cols-[280px_1fr] gap-4 items-start">

        {/* Lewa — lista lokacji */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Lokacje</p>
            <span className="text-xs text-gray-400">
              Akcje: <span className="font-semibold text-gray-700">{explorationActions}/15</span>
            </span>
          </div>

          <div className="divide-y divide-gray-50">
            {EXPLORATION_LEVELS.map((loc) => (
              <button
                key={loc.level}
                onClick={() => setSelected(loc.level)}
                className={`w-full text-left px-4 py-3 transition-colors ${
                  selected === loc.level
                    ? "bg-gray-900 text-white"
                    : "hover:bg-gray-50 text-gray-900"
                }`}
              >
                <p className={`text-sm font-medium ${selected === loc.level ? "text-white" : "text-gray-900"}`}>
                  {loc.name}
                </p>
                <p className={`text-xs mt-0.5 ${selected === loc.level ? "text-gray-300" : "text-gray-400"}`}>
                  {loc.duration} · {loc.points}
                </p>
                {loc.availableFrom && (
                  <p className={`text-xs mt-0.5 ${selected === loc.level ? "text-gray-400" : "text-gray-300"}`}>
                    {loc.availableFrom}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Prawa — grafika lokacji */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ minHeight: "340px" }}>
          {/* Placeholder grafiki */}
          <div className="flex items-center justify-center bg-gray-50 border-b border-gray-100" style={{ height: "220px" }}>
            <p className="text-gray-300 text-sm">Grafika: {currentLoc.name}</p>
          </div>

          {/* Opis lokacji */}
          <div className="p-4 space-y-3">
            <div>
              <p className="font-semibold text-gray-900">{currentLoc.name}</p>
              <p className="text-sm text-gray-500 mt-1">{currentLoc.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400">Czas trwania</p>
                <p className="text-sm font-medium text-gray-900">{currentLoc.duration}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400">Punkty umiej.</p>
                <p className="text-sm font-medium text-gray-900">{currentLoc.points}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400">Szansa na przedmiot</p>
                <p className="text-sm font-medium text-gray-900">{currentLoc.itemChance}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400">Szansa na spotkanie</p>
                <p className="text-sm font-medium text-gray-900">{currentLoc.encounterChance}</p>
              </div>
            </div>

            {/* Przycisk eksploracji */}
            {!activeExploration && !completedExploration && (
              <button
                onClick={handleStart}
                disabled={loading || explorationActions <= 0}
                className="w-full py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "..." : explorationActions <= 0 ? "Brak akcji eksploracji" : `Eksploruj — ${currentLoc.name}`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Pasek ustawień eksploracji — placeholder */}
      <div className="flex items-center justify-center h-16 border-2 border-dashed border-gray-200 rounded-xl">
        <p className="text-gray-400 text-sm">Ustawienia eksploracji — poziom trudności, cel itp. — wkrótce</p>
      </div>

    </div>
  );
}