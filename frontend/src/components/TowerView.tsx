import { useEffect, useState, useCallback } from "react";
import api from "../api/client";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
      {children}
    </h3>
  );
}

function BuildingPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[120px] border-2 border-dashed border-gray-100 rounded-lg bg-gray-50">
      <p className="text-gray-300 text-xs text-center px-2">{title}</p>
    </div>
  );
}

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

interface BuildingCardProps {
  title: string;
  level: number;
  isUpgrading: boolean;
  upgradeFinishesAt: string | null;
  canUpgrade: boolean;
  unmetReqs: string[];
  upgradeReqs: Record<string, any>;
  description: string;
  placeholderLabel: string;
  onStartUpgrade: () => Promise<void>;
  onClaimUpgrade: () => Promise<void>;
}

function BuildingCard({
  title,
  level,
  isUpgrading,
  upgradeFinishesAt,
  canUpgrade,
  unmetReqs,
  upgradeReqs,
  description,
  placeholderLabel,
  onStartUpgrade,
  onClaimUpgrade,
}: BuildingCardProps) {
  const [loading, setLoading] = useState(false);

  const isReady =
    isUpgrading &&
    upgradeFinishesAt &&
    new Date() >= new Date(upgradeFinishesAt);

  const nextLevel = level + 1;
  const durationMin = upgradeReqs.durationSeconds ? Math.round(upgradeReqs.durationSeconds / 60) : null;
  const cost = upgradeReqs.costShards ?? null;
  const reqKnowledge = upgradeReqs.knowledge ?? upgradeReqs.reqKnowledge ?? null;
  const reqIntelligence = upgradeReqs.intelligence ?? upgradeReqs.reqIntelligence ?? null;
  const productionAfter = upgradeReqs.productionAfter ?? null;

  function isMet(keyword: string): boolean {
    return !unmetReqs.some(r => r.toLowerCase().includes(keyword.toLowerCase()));
  }

  async function handleStart() {
    if (!canUpgrade) return;
    setLoading(true);
    try { await onStartUpgrade(); }
    finally { setLoading(false); }
  }

  async function handleClaim() {
    setLoading(true);
    try { await onClaimUpgrade(); }
    finally { setLoading(false); }
  }

  return (
    <Card>
      <div className="grid grid-cols-[1fr_140px] gap-4">
        <div className="space-y-3">

          {/* Nagłówek */}
          <div>
            <p className="font-semibold text-gray-900">{title}</p>
            <p className="text-xs text-gray-400 mt-0.5">Poziom {level}</p>
          </div>

          {/* Opis */}
          <div className="p-2.5 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 font-medium mb-0.5">Opis</p>
            <p className="text-xs text-gray-700">{description}</p>
          </div>

          {/* Stan rozbudowy */}
          {isUpgrading ? (
            isReady ? (
              <button
                onClick={handleClaim}
                disabled={loading}
                className="w-full text-xs px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "..." : "Odbierz rozbudowę ✓"}
              </button>
            ) : (
              <div className="p-3 border border-gray-100 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Trwa rozbudowa do poziomu {nextLevel}...</p>
                {upgradeFinishesAt && (
                  <Timer finishesAt={upgradeFinishesAt} onDone={handleClaim} />
                )}
              </div>
            )
          ) : (
            <div className="space-y-2">
              {/* Przycisk = aktywna akcja rozbudowy */}
              <button
                onClick={handleStart}
                disabled={loading || !canUpgrade}
                className={`w-full text-left text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                  !canUpgrade
                    ? "border-red-100 text-red-400 bg-red-50 cursor-not-allowed"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer"
                }`}
              >
                {loading ? "..." : `Rozbudowa do poziomu ${nextLevel}`}
              </button>

              {/* Koszt */}
              {cost !== null && (
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs text-gray-400 w-20 shrink-0">Koszt:</span>
                  <span className={`text-xs font-medium ${isMet("okruchy") ? "text-gray-700" : "text-red-500"}`}>
                    {cost} okruchów mocy
                  </span>
                </div>
              )}

              {/* Wymagania w jednej linii */}
              {(reqKnowledge !== null || reqIntelligence !== null) && (
                <div className="flex items-start gap-2 px-1">
                  <span className="text-xs text-gray-400 w-20 shrink-0 pt-0.5">Wymagania:</span>
                  <span className="text-xs font-medium flex flex-wrap gap-x-3 gap-y-0.5">
                    {reqKnowledge !== null && (
                      <span className={isMet("wiedza") ? "text-gray-700" : "text-red-500"}>
                        Wiedza {reqKnowledge}
                      </span>
                    )}
                    {reqIntelligence !== null && (
                      <span className={isMet("inteligencja") ? "text-gray-700" : "text-red-500"}>
                        Inteligencja {reqIntelligence}
                      </span>
                    )}
                  </span>
                </div>
              )}

              {/* Czas budowy */}
              {durationMin !== null && (
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs text-gray-400 w-20 shrink-0">Czas budowy:</span>
                  <span className="text-xs font-medium text-gray-700">{durationMin} min</span>
                </div>
              )}

              {/* Efekt po rozbudowie */}
              {productionAfter !== null && (
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs text-gray-400 w-20 shrink-0">Efekt:</span>
                  <span className="text-xs font-medium text-gray-700">
                    +{productionAfter} okruchów mocy / godz.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Prawa strona — placeholder grafiki */}
        <BuildingPlaceholder title={placeholderLabel} />
      </div>
    </Card>
  );
}

export default function TowerView({ onResourcesUpdated }: {
  onResourcesUpdated?: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchTower = useCallback(async () => {
    try {
      const res = await api.get("/tower");
      setData(res.data);
      onResourcesUpdated?.();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd ładowania wieży");
    } finally {
      setLoading(false);
    }
  }, [onResourcesUpdated]);

  useEffect(() => { fetchTower(); }, [fetchTower]);

  async function startTowerUpgrade() { await api.post("/tower/upgrade/start"); await fetchTower(); }
  async function claimTowerUpgrade() { await api.post("/tower/upgrade/claim"); await fetchTower(); }
  async function startPCUpgrade()    { await api.post("/tower/power-collector/start"); await fetchTower(); }
  async function claimPCUpgrade()    { await api.post("/tower/power-collector/claim"); await fetchTower(); }

  if (loading) return <p className="text-sm text-gray-400">Ładowanie...</p>;
  if (!data) return null;

  const { tower, buildings, resources } = data;
  const pc = buildings.power_collector;

  return (
    <div className="space-y-4">
      {/* Pasek zasobów */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Okruchy mocy</p>
            <p className="text-2xl font-bold text-gray-900">{resources.powerShards}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-0.5">Produkcja</p>
            <p className="text-sm font-semibold text-gray-700">+{resources.productionPerHour} / godz.</p>
          </div>
        </div>
      </Card>

      <SectionTitle>Wieża główna</SectionTitle>
      <BuildingCard
        title="Wieża Magów"
        level={tower.level}
        isUpgrading={tower.isUpgrading}
        upgradeFinishesAt={tower.upgradeFinishesAt}
        canUpgrade={tower.canUpgrade}
        unmetReqs={tower.unmetReqs}
        upgradeReqs={tower.upgradeReqs}
        description="Centrum Twojego królestwa magii. Wyższy poziom wieży odblokowuje rozbudowę pozostałych budynków i podnosi prestiż."
        placeholderLabel="Grafika wieży"
        onStartUpgrade={startTowerUpgrade}
        onClaimUpgrade={claimTowerUpgrade}
      />

      <SectionTitle>Budynki</SectionTitle>
      <BuildingCard
        title="Zbieracz mocy"
        level={pc.level}
        isUpgrading={pc.isUpgrading}
        upgradeFinishesAt={pc.upgradeFinishesAt}
        canUpgrade={pc.canUpgrade}
        unmetReqs={pc.unmetReqs}
        upgradeReqs={pc.upgradeReqs}
        description={
          pc.level > 0
            ? `Generuje okruchy mocy — ${pc.currentProduction} na godzinę.`
            : "Pasywnie generuje okruchy mocy. Wymaga wybudowania."
        }
        placeholderLabel="Grafika zbieracza"
        onStartUpgrade={startPCUpgrade}
        onClaimUpgrade={claimPCUpgrade}
      />
    </div>
  );
}