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
  atMaxLevel: boolean;
  maxLevel: number | null;
  towerLevelMet: boolean;
  requiredTowerLevel: number;
  unmetReqs: string[];
  upgradeReqs: Record<string, any>;
  description: string;
  effectLabel: string;
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
  atMaxLevel,
  maxLevel,
  towerLevelMet,
  requiredTowerLevel,
  unmetReqs,
  upgradeReqs,
  description,
  effectLabel,
  placeholderLabel,
  onStartUpgrade,
  onClaimUpgrade,
}: BuildingCardProps) {
  const [loading, setLoading] = useState(false);

  const isReady = isUpgrading && upgradeFinishesAt && new Date() >= new Date(upgradeFinishesAt);
  const nextLevel = level + 1;

  const durationMin = upgradeReqs.durationSeconds ? Math.round(upgradeReqs.durationSeconds / 60) : null;
  const costShards = upgradeReqs.costShards ?? 0;
  const costGold = upgradeReqs.costGold ?? 0;
  const reqKnowledge = upgradeReqs.reqKnowledge ?? upgradeReqs.knowledge ?? 0;
  const reqIntelligence = upgradeReqs.reqIntelligence ?? upgradeReqs.intelligence ?? 0;
  const reqPower = upgradeReqs.reqPower ?? 0;
  const reqFire = upgradeReqs.reqFire ?? 0;

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

          <div>
            <p className="font-semibold text-gray-900">{title}</p>
            <p className="text-xs text-gray-400 mt-0.5">Poziom {level}</p>
          </div>

          <div className="p-2.5 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 font-medium mb-0.5">Opis</p>
            <p className="text-xs text-gray-700">{description}</p>
          </div>

          {!towerLevelMet ? (
            <p className="text-xs text-gray-400 italic">
              Dostępne od poziomu {requiredTowerLevel} wieży
            </p>
          ) : isUpgrading ? (
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
                {upgradeFinishesAt && <Timer finishesAt={upgradeFinishesAt} onDone={handleClaim} />}
              </div>
            )
          ) : atMaxLevel ? (
            <p className="text-xs text-gray-400 italic">
              Budynek osiągnął maksymalny poziom ({maxLevel})
            </p>
          ) : (
            <div className="space-y-2">
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

              {(costShards > 0 || costGold > 0) && (
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs text-gray-400 w-20 shrink-0">Koszt:</span>
                  <span className="text-xs font-medium flex flex-wrap gap-x-3">
                    {costShards > 0 && (
                      <span className={isMet("okruchy") ? "text-gray-700" : "text-red-500"}>
                        {costShards} okruchów mocy
                      </span>
                    )}
                    {costGold > 0 && (
                      <span className={isMet("złoto") ? "text-gray-700" : "text-red-500"}>
                        {costGold} złota
                      </span>
                    )}
                  </span>
                </div>
              )}

              {(reqKnowledge > 0 || reqIntelligence > 0 || reqPower > 0 || reqFire > 0) && (
                <div className="flex items-start gap-2 px-1">
                  <span className="text-xs text-gray-400 w-20 shrink-0 pt-0.5">Wymagania:</span>
                  <span className="text-xs font-medium flex flex-wrap gap-x-3 gap-y-0.5">
                    {reqKnowledge > 0 && (
                      <span className={isMet("wiedza") ? "text-gray-700" : "text-red-500"}>
                        Wiedza {reqKnowledge}
                      </span>
                    )}
                    {reqIntelligence > 0 && (
                      <span className={isMet("inteligencja") ? "text-gray-700" : "text-red-500"}>
                        Inteligencja {reqIntelligence}
                      </span>
                    )}
                    {reqPower > 0 && (
                      <span className={isMet("moc") ? "text-gray-700" : "text-red-500"}>
                        Moc {reqPower}
                      </span>
                    )}
                    {reqFire > 0 && (
                      <span className={isMet("ognia") ? "text-gray-700" : "text-red-500"}>
                        Żywioł ognia {reqFire}
                      </span>
                    )}
                  </span>
                </div>
              )}

              {durationMin !== null && (
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs text-gray-400 w-20 shrink-0">Czas budowy:</span>
                  <span className="text-xs font-medium text-gray-700">{durationMin} min</span>
                </div>
              )}

              {effectLabel && (
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs text-gray-400 w-20 shrink-0">Efekt:</span>
                  <span className="text-xs font-medium text-gray-700">{effectLabel}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <BuildingPlaceholder title={placeholderLabel} />
      </div>
    </Card>
  );
}

export default function TowerView({ onResourcesUpdated }: { onResourcesUpdated?: () => void }) {
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

  const make = (start: string, claim: string) => ({
    start: async () => { await api.post(start); await fetchTower(); },
    claim: async () => { await api.post(claim); await fetchTower(); },
  });

  const actions = {
    tower:          make("/tower/upgrade/start",         "/tower/upgrade/claim"),
    powerCollector: make("/tower/power-collector/start", "/tower/power-collector/claim"),
    storage:        make("/tower/storage/start",         "/tower/storage/claim"),
    library:        make("/tower/library/start",         "/tower/library/claim"),
    magicHands:     make("/tower/magic-hands/start",     "/tower/magic-hands/claim"),
    spyOrb:         make("/tower/spy-orb/start",         "/tower/spy-orb/claim"),
    candles:        make("/tower/candles/start",         "/tower/candles/claim"),
    chaosVault:     make("/tower/chaos-vault/start",     "/tower/chaos-vault/claim"),
    disintegrator: make("/tower/disintegrator/start", "/tower/disintegrator/claim"),
  };

  if (loading) return <p className="text-sm text-gray-400">Ładowanie...</p>;
  if (!data) return null;

  const { tower, buildings, resources } = data;
  const pc = buildings.power_collector;
  const st = buildings.storage;
  const lb = buildings.library;
  const mh = buildings.magic_hands;
  const so = buildings.spy_orb;
  const ca = buildings.candles;
  const cv = buildings.chaos_vault;
  const di = buildings.disintegrator;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-8">
          <div>
            <p className="text-xs text-gray-500">Okruchy mocy</p>
            <p className="text-2xl font-bold text-gray-900">{resources.powerShards}</p>
            <p className="text-xs text-gray-400">+{resources.productionPerHour}/godz.</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Złoto</p>
            <p className="text-2xl font-bold text-gray-900">{resources.gold}</p>
            <p className="text-xs text-gray-400">+{resources.goldPerHour}/godz.</p>
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
        atMaxLevel={false}
        maxLevel={null}
        towerLevelMet={true}
        requiredTowerLevel={1}
        unmetReqs={tower.unmetReqs}
        upgradeReqs={tower.upgradeReqs}
        description="Centrum Twojego królestwa magii. Wyższy poziom wieży odblokowuje rozbudowę pozostałych budynków i podnosi prestiż."
        effectLabel=""
        placeholderLabel="Grafika wieży"
        onStartUpgrade={actions.tower.start}
        onClaimUpgrade={actions.tower.claim}
      />

      <SectionTitle>Budynki</SectionTitle>

      <BuildingCard
        title="Zbieracz mocy"
        level={pc.level}
        isUpgrading={pc.isUpgrading}
        upgradeFinishesAt={pc.upgradeFinishesAt}
        canUpgrade={pc.canUpgrade}
        atMaxLevel={pc.atMaxLevel}
        maxLevel={pc.maxLevel}
        towerLevelMet={pc.towerLevelMet}
        requiredTowerLevel={pc.requiredTowerLevel}
        unmetReqs={pc.unmetReqs}
        upgradeReqs={pc.upgradeReqs}
        description={pc.level > 0
          ? `Generuje okruchy mocy — ${pc.currentProduction} na godzinę.`
          : "Pasywnie generuje okruchy mocy. Wymaga wybudowania."}
        effectLabel={`+${pc.upgradeReqs?.productionAfter ?? 2} okruchów mocy / godz.`}
        placeholderLabel="Grafika zbieracza"
        onStartUpgrade={actions.powerCollector.start}
        onClaimUpgrade={actions.powerCollector.claim}
      />

      <BuildingCard
        title="Graciarnia"
        level={st.level}
        isUpgrading={st.isUpgrading}
        upgradeFinishesAt={st.upgradeFinishesAt}
        canUpgrade={st.canUpgrade}
        atMaxLevel={st.atMaxLevel}
        maxLevel={st.maxLevel}
        towerLevelMet={st.towerLevelMet}
        requiredTowerLevel={st.requiredTowerLevel}
        unmetReqs={st.unmetReqs}
        upgradeReqs={st.upgradeReqs}
        description="Gdzieś trzeba składować te wszystkie magiczne rupiecie."
        effectLabel="+10 do maksymalnej ilości posiadanych artefaktów"
        placeholderLabel="Grafika graciarni"
        onStartUpgrade={actions.storage.start}
        onClaimUpgrade={actions.storage.claim}
      />

      <BuildingCard
        title="Biblioteka"
        level={lb.level}
        isUpgrading={lb.isUpgrading}
        upgradeFinishesAt={lb.upgradeFinishesAt}
        canUpgrade={lb.canUpgrade}
        atMaxLevel={lb.atMaxLevel}
        maxLevel={lb.maxLevel}
        towerLevelMet={lb.towerLevelMet}
        requiredTowerLevel={lb.requiredTowerLevel}
        unmetReqs={lb.unmetReqs}
        upgradeReqs={lb.upgradeReqs}
        description="Jeśli nie wiesz, jak coś wyczarować, to jest najlepsze miejsce do poszukiwań."
        effectLabel="+2 do maksymalnej ilości znanych czarów"
        placeholderLabel="Grafika biblioteki"
        onStartUpgrade={actions.library.start}
        onClaimUpgrade={actions.library.claim}
      />

      <BuildingCard
        title="Sztuczne ręce"
        level={mh.level}
        isUpgrading={mh.isUpgrading}
        upgradeFinishesAt={mh.upgradeFinishesAt}
        canUpgrade={mh.canUpgrade}
        atMaxLevel={mh.atMaxLevel}
        maxLevel={mh.maxLevel}
        towerLevelMet={mh.towerLevelMet}
        requiredTowerLevel={mh.requiredTowerLevel}
        unmetReqs={mh.unmetReqs}
        upgradeReqs={mh.upgradeReqs}
        description="Prosta ruchoma konstrukcja, która powtarza odpowiednie ruchy, wytwarzając przy tym małe, lśniące grudki złota."
        effectLabel="+1 złota / godz."
        placeholderLabel="Grafika sztucznych rąk"
        onStartUpgrade={actions.magicHands.start}
        onClaimUpgrade={actions.magicHands.claim}
      />

      <BuildingCard
        title="Kula szpiegula"
        level={so.level}
        isUpgrading={so.isUpgrading}
        upgradeFinishesAt={so.upgradeFinishesAt}
        canUpgrade={so.canUpgrade}
        atMaxLevel={so.atMaxLevel}
        maxLevel={so.maxLevel}
        towerLevelMet={so.towerLevelMet}
        requiredTowerLevel={so.requiredTowerLevel}
        unmetReqs={so.unmetReqs}
        upgradeReqs={so.upgradeReqs}
        description="Interesuje Cię, co się dzieje w magicznym świecie? Wystarczy spojrzeć.."
        effectLabel="Umożliwia wykonanie akcji Podglądanie"
        placeholderLabel="Grafika kuli szpieguli"
        onStartUpgrade={actions.spyOrb.start}
        onClaimUpgrade={actions.spyOrb.claim}
      />

      <BuildingCard
        title="Świeczki"
        level={ca.level}
        isUpgrading={ca.isUpgrading}
        upgradeFinishesAt={ca.upgradeFinishesAt}
        canUpgrade={ca.canUpgrade}
        atMaxLevel={ca.atMaxLevel}
        maxLevel={ca.maxLevel}
        towerLevelMet={ca.towerLevelMet}
        requiredTowerLevel={ca.requiredTowerLevel}
        unmetReqs={ca.unmetReqs}
        upgradeReqs={ca.upgradeReqs}
        description="Każdy szanujący się mag powinien roztaczać wokół siebie odpowiednią aurę. Świeczki powinny w tym pomóc."
        effectLabel={ca.level > 0
          ? `+${ca.currentBonus}% szansy na odkrycie czaru podczas studiów`
          : "+1% szansy na odkrycie czaru za każdy poziom"}
        placeholderLabel="Grafika świeczek"
        onStartUpgrade={actions.candles.start}
        onClaimUpgrade={actions.candles.claim}
      />

<BuildingCard
  title="Komnata nieładu"
  level={cv.level}
  isUpgrading={cv.isUpgrading}
  upgradeFinishesAt={cv.upgradeFinishesAt}
  canUpgrade={cv.canUpgrade}
  atMaxLevel={cv.atMaxLevel}
  maxLevel={cv.maxLevel}
  towerLevelMet={cv.towerLevelMet}
  requiredTowerLevel={cv.requiredTowerLevel}
  unmetReqs={cv.unmetReqs}
  upgradeReqs={cv.upgradeReqs}
  description="Graciarnia zajęta? Nie ma miejsca w bibliotece? Po prostu wrzuć wszystko tutaj i udawaj, że problemu nie ma!"
  effectLabel={cv.level > 0
    ? `Przechowuje nadmiarowe przedmioty i czary. Widocznych slotów: ${cv.visibleSlots}`
    : "+5 widocznych slotów na nadmiarowe przedmioty i czary"}
  placeholderLabel="Grafika komnaty"
  onStartUpgrade={actions.chaosVault.start}
  onClaimUpgrade={actions.chaosVault.claim}
/>
<BuildingCard
  title="Dezintegrator"
  level={di.level}
  isUpgrading={di.isUpgrading}
  upgradeFinishesAt={di.upgradeFinishesAt}
  canUpgrade={di.canUpgrade}
  atMaxLevel={di.atMaxLevel}
  maxLevel={di.maxLevel}
  towerLevelMet={di.towerLevelMet}
  requiredTowerLevel={di.requiredTowerLevel}
  unmetReqs={di.unmetReqs}
  upgradeReqs={di.upgradeReqs}
  description="Nie podoba Ci się jakiś artefakt? Gardzisz jakimś rodzajem magii? Nie krępuj się, wrzuć ustrojstwo tutaj i patrz z satysfakcją jak wyparowuje."
  effectLabel="Umożliwia wymianę przedmiotów na okruchy mocy"
  placeholderLabel="Grafika dezintegratora"
  onStartUpgrade={actions.disintegrator.start}
  onClaimUpgrade={actions.disintegrator.claim}
/>
    </div>
  );
}