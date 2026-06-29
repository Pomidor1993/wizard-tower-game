import { useEffect, useState, useCallback } from "react";
import api from "../api/client";
import { useCharacter } from "../contexts/CharacterContext";

// ── PALETA ───────────────────────────────────────────────────────────────────
const C = {
  bg:        "#161d38",
  panel:     "#372b5d",
  panelAlt:  "rgba(0,0,0,0.15)",
  border:    "rgba(245,196,81,0.12)",
  borderSoft:"rgba(247,240,221,0.08)",
  gold:      "#F5C451",
  teal:      "#59D4D0",
  red:       "#F46A4E",
  green:     "#7FCB7F",
  text:      "#F7F0DD",
  textDim:   "rgba(247,240,221,0.55)",
  textFaint: "rgba(247,240,221,0.35)",
  textGhost: "rgba(247,240,221,0.2)",
};

// ── ELEMENT CONFIG (Altair) ───────────────────────────────────────────────────
const ELEMENT_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  fire:    { label: "Ogień",     icon: "🔥", color: "#F46A4E" },
  water:   { label: "Woda",      icon: "💧", color: "#59D4D0" },
  earth:   { label: "Ziemia",    icon: "🌿", color: "#8BAA5C" },
  air:     { label: "Powietrze", icon: "🌪",  color: "#C9D6E8" },
  chaos:   { label: "Chaos",     icon: "🌀", color: "#B681E0" },
  harmony: { label: "Harmonia",  icon: "☯",  color: "#F5C451" },
  life:    { label: "Życie",     icon: "✨", color: "#7FCB7F" },
  death:   { label: "Śmierć",   icon: "💀", color: "#9C9CB0" },
};

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────

function Panel({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.panel, borderRadius: 12,
      border: `1px solid ${C.border}`, padding: 20, ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: "Cinzel, serif", fontSize: 11, color: C.gold,
      letterSpacing: "0.1em", textTransform: "uppercase", margin: "20px 0 10px",
    }}>
      {children}
    </p>
  );
}

function InfoRow({ label, value, warn }: { label: string; value: React.ReactNode; warn?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
      <span style={{ fontSize: 11, color: C.textFaint, minWidth: 88, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: warn ? C.red : C.textDim }}>{value}</span>
    </div>
  );
}

// ── TIMER ─────────────────────────────────────────────────────────────────────

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
  return <span style={{ fontFamily: "Cinzel, serif", fontWeight: 700, color: C.gold, fontSize: 15 }}>{timeLeft}</span>;
}

// ── ACTION BUTTON ─────────────────────────────────────────────────────────────

function ActionButton({
  label, onClick, disabled = false, variant = "primary",
}: {
  label: string; onClick: () => void; disabled?: boolean; variant?: "primary" | "success" | "danger";
}) {
  const bg =
    disabled ? "rgba(245,196,81,0.12)" :
    variant === "success" ? C.green :
    variant === "danger"  ? C.red :
    C.gold;
  const color = disabled ? C.textGhost : C.bg;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "9px 18px", borderRadius: 8, border: "none",
        fontSize: 12, fontWeight: 700, fontFamily: "Cinzel, serif",
        letterSpacing: "0.05em", cursor: disabled ? "not-allowed" : "pointer",
        background: bg, color,
        transition: "all 0.2s", width: "100%",
      }}
    >
      {label}
    </button>
  );
}

// ── BUILDING CARD ─────────────────────────────────────────────────────────────

interface BuildingData {
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
}

function BuildingCard({
  title, icon, description, effectLabel, data, onStart, onClaim, children, currentShards,
}: {
  title: string;
  icon: string;
  description: string;
  effectLabel?: string;
  data: BuildingData;
  onStart: () => Promise<void>;
  onClaim: () => Promise<void>;
  children?: React.ReactNode;
  currentShards: number;
}) {
  const [loading, setLoading] = useState(false);
  const { level, isUpgrading, upgradeFinishesAt, canUpgrade, atMaxLevel, towerLevelMet, requiredTowerLevel, unmetReqs, upgradeReqs, maxLevel } = data;

  const isReady = isUpgrading && upgradeFinishesAt && new Date() >= new Date(upgradeFinishesAt);
  const durationMin = upgradeReqs.durationSeconds ? Math.round(upgradeReqs.durationSeconds / 60) : null;

  async function handleStart() {
    setLoading(true);
    try { await onStart(); } finally { setLoading(false); }
  }
  async function handleClaim() {
    setLoading(true);
    try { await onClaim(); } finally { setLoading(false); }
  }

  return (
    <Panel>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: "rgba(0,0,0,0.25)", border: `1px solid ${C.borderSoft}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <p style={{ fontFamily: "Cinzel, serif", fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>{title}</p>
            <span style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 6,
              background: level > 0 ? "rgba(89,212,208,0.12)" : C.panelAlt,
              color: level > 0 ? C.teal : C.textFaint,
              fontFamily: "Cinzel, serif", fontWeight: 700,
            }}>
              {level > 0 ? `Poziom ${level}${maxLevel ? `/${maxLevel}` : ""}` : "Niewybudowany"}
            </span>
          </div>
          <p style={{ fontSize: 12, color: C.textDim, margin: "4px 0 0", lineHeight: 1.5 }}>{description}</p>
        </div>
      </div>

      {effectLabel && (
        <div style={{
          padding: "8px 12px", borderRadius: 8, marginBottom: 14,
          background: C.panelAlt, border: `1px solid ${C.borderSoft}`,
        }}>
          <span style={{ fontSize: 11, color: C.textFaint }}>Efekt: </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.teal }}>{effectLabel}</span>
        </div>
      )}

      {children}

      {!towerLevelMet ? (
        <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(244,106,78,0.08)", border: "1px solid rgba(244,106,78,0.2)" }}>
          <p style={{ fontSize: 11, color: C.red, margin: 0 }}>🔒 Dostępne od poziomu {requiredTowerLevel} wieży</p>
        </div>
      ) : isUpgrading ? (
        isReady ? (
          <ActionButton label={loading ? "..." : "Odbierz rozbudowę ✓"} onClick={handleClaim} variant="success" disabled={loading} />
        ) : (
          <div style={{
            padding: "12px 16px", borderRadius: 8,
            background: "rgba(89,212,208,0.06)", border: "1px solid rgba(89,212,208,0.2)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <p style={{ fontSize: 12, color: C.teal, margin: 0 }}>Trwa rozbudowa do poziomu {level + 1}...</p>
            {upgradeFinishesAt && <Timer finishesAt={upgradeFinishesAt} onDone={handleClaim} />}
          </div>
        )
      ) : atMaxLevel ? (
        <p style={{ fontSize: 11, color: C.textFaint, fontStyle: "italic", margin: 0 }}>
          Budynek osiągnął maksymalny poziom ({maxLevel})
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
{unmetReqs.length > 0 && (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(244,106,78,0.06)", border: "1px solid rgba(244,106,78,0.15)" }}>
              <p style={{ fontSize: 11, color: C.red, margin: "0 0 4px", fontWeight: 700 }}>Nie spełniasz wymagań do rozbudowy tego budynku!</p>
              {unmetReqs.map((r, i) => (
                <p key={i} style={{ fontSize: 11, color: C.red, margin: 0 }}>✕ {r}</p>
              ))}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
{upgradeReqs.costShards > 0 && (
  <InfoRow
    label="Koszt"
    value={`${upgradeReqs.costShards} okruchów mocy`}
    warn={currentShards < upgradeReqs.costShards}
  />
)}
            {durationMin !== null && (
              <InfoRow label="Czas budowy" value={`${durationMin} min`} />
            )}
          </div>

          <ActionButton
            label={loading ? "..." : `Rozbuduj do poziomu ${level + 1}`}
            onClick={handleStart}
            disabled={loading || !canUpgrade}
          />
        </div>
      )}
    </Panel>
  );
}

// ── ALTAIR CARD ───────────────────────────────────────────────────────────────

const ALTAIR_PAIRS: [string, string][] = [
  ["water", "fire"],
  ["earth", "air"],
  ["chaos", "harmony"],
  ["life",  "death"],
];

function AltairCard({
  data, onStart, onClaim, onRefresh, currentShards,
}: {
  data: BuildingData & { unlockedPairs?: number; pairs?: [string, string][]; selections?: (string | null)[] };
  onStart: () => Promise<void>;
  onClaim: () => Promise<void>;
  onRefresh: () => void;
  currentShards: number;
}) {
  const [selecting, setSelecting] = useState(false);
  const unlockedPairs = data.unlockedPairs ?? 0;
  const selections: (string | null)[] = data.selections ?? ALTAIR_PAIRS.map(() => null);

  async function handleSelectElement(pairIndex: number, element: string) {
    setSelecting(true);
    try {
      await api.post("/tower/altair/select-element", { pairIndex, element });
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd wyboru żywiołu");
    } finally {
      setSelecting(false);
    }
  }

  const pairUI = data.level > 0 && (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
      {ALTAIR_PAIRS.map((pair, i) => {
        const unlocked = i < unlockedPairs;
        const selected = selections[i];
        return (
          <div
            key={i}
            style={{
              padding: "10px 14px", borderRadius: 10,
              background: unlocked ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.1)",
              border: `1px solid ${unlocked ? C.borderSoft : "rgba(247,240,221,0.04)"}`,
              opacity: unlocked ? 1 : 0.45,
            }}
          >
            <p style={{ fontSize: 10, color: C.textFaint, fontFamily: "Cinzel, serif", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 8px" }}>
              {unlocked ? `Para ${i + 1}` : `🔒 Odblokowuje się na poziomie ${i * 10 + 1} Altaira`}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              {pair.map(element => {
                const cfg = ELEMENT_LABELS[element];
                const isSelected = selected === element;
                return (
                  <button
                    key={element}
                    onClick={() => unlocked && !selecting && handleSelectElement(i, element)}
                    disabled={!unlocked || selecting}
                    style={{
                      flex: 1, padding: "8px 6px", borderRadius: 8,
                      border: `1px solid ${isSelected ? cfg.color : C.borderSoft}`,
                      background: isSelected ? `${cfg.color}22` : "rgba(0,0,0,0.2)",
                      color: isSelected ? cfg.color : C.textDim,
                      fontSize: 12, fontWeight: isSelected ? 700 : 400,
                      cursor: unlocked ? "pointer" : "not-allowed",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                      transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{cfg.icon}</span>
                    <span style={{ fontSize: 10, fontFamily: "Cinzel, serif" }}>{cfg.label}</span>
                    {isSelected && <span style={{ fontSize: 9, color: cfg.color }}>▲ +2% obrażeń</span>}
                    {!isSelected && selected && selected !== element && <span style={{ fontSize: 9, color: C.textGhost }}>▼ −1% obrażeń</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <BuildingCard
      title="Altair"
      icon="⚗️"
      description="Mistyczna instalacja wzmacniająca wybrany żywioł kosztem osłabienia jego przeciwieństwa. Każda para żywiołów odblokowuje się co 10 poziomów."
      effectLabel={data.level > 0 ? `${unlockedPairs} para/y żywiołów aktywna` : "+2% do wybranego żywiołu, −1% do przeciwnego"}
      data={data}
      onStart={onStart}
      onClaim={onClaim}
      currentShards={currentShards}
    >
      {pairUI}
    </BuildingCard>
  );
}

// ── GŁÓWNY KOMPONENT ──────────────────────────────────────────────────────────

export default function TowerView() {
  const { refresh: refreshCharacter } = useCharacter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchTower = useCallback(async () => {
    try {
      const res = await api.get("/tower");
      setData(res.data);
      await refreshCharacter();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd ładowania wieży");
    } finally {
      setLoading(false);
    }
  }, [refreshCharacter]);

  useEffect(() => { fetchTower(); }, [fetchTower]);

  function make(start: string, claim: string) {
    return {
      start: async () => { await api.post(start); await fetchTower(); },
      claim: async () => { await api.post(claim); await fetchTower(); },
    };
  }

  if (loading) return <p style={{ color: C.textFaint, fontSize: 13 }}>Ładowanie...</p>;
  if (!data) return null;

  const { tower, buildings, resources } = data;
  const pc = buildings.power_collector;
  const lb = buildings.library;
  const mh = buildings.trophy_cabinet;
  const so = buildings.magic_notebook;
  const al = buildings.Altair;
  const cv = buildings.chaos_vault;
  const di = buildings.disintegrator;

  const acts = {
    tower:          make("/tower/upgrade/start",         "/tower/upgrade/claim"),
    powerCollector: make("/tower/power-collector/start", "/tower/power-collector/claim"),
    library:        make("/tower/library/start",         "/tower/library/claim"),
    trophyCabinet:  make("/tower/trophy-cabinet/start",  "/tower/trophy-cabinet/claim"),
    magicNotebook:  make("/tower/magic-notebook/start",  "/tower/magic-notebook/claim"),
    altair:         make("/tower/altair/start",          "/tower/altair/claim"),
    chaosVault:     make("/tower/chaos-vault/start",     "/tower/chaos-vault/claim"),
    disintegrator:  make("/tower/disintegrator/start",   "/tower/disintegrator/claim"),
  };

  return (
    <div>
      <h1 style={{ fontFamily: "Cinzel, serif", color: C.gold, fontSize: 22, marginBottom: 24, letterSpacing: "0.06em" }}>
        Wieża
      </h1>

      {/* Zasoby */}
      <Panel style={{ marginBottom: 4 }}>
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontSize: 10, color: C.textFaint, fontFamily: "Cinzel, serif", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Okruchy mocy</p>
            <p style={{ fontSize: 26, fontWeight: 700, color: C.gold, fontFamily: "Cinzel, serif", margin: 0 }}>{resources.powerShards}</p>
            <p style={{ fontSize: 11, color: C.textFaint, margin: "2px 0 0" }}>+{resources.productionPerHour}/godz.</p>
          </div>
          {resources.gold != null && (
            <div>
              <p style={{ fontSize: 10, color: C.textFaint, fontFamily: "Cinzel, serif", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Złoto</p>
              <p style={{ fontSize: 26, fontWeight: 700, color: C.teal, fontFamily: "Cinzel, serif", margin: 0 }}>{resources.gold}</p>
              {resources.goldPerHour != null && (
                <p style={{ fontSize: 11, color: C.textFaint, margin: "2px 0 0" }}>+{resources.goldPerHour}/godz.</p>
              )}
            </div>
          )}
        </div>
      </Panel>

      {/* ── WIEŻA GŁÓWNA ── */}
      <SectionTitle>Wieża główna</SectionTitle>
      <Panel>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            background: "rgba(0,0,0,0.25)", border: `1px solid ${C.borderSoft}`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
          }}>
            🗼
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <p style={{ fontFamily: "Cinzel, serif", fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>Wieża Magów</p>
              <span style={{
                fontSize: 10, padding: "2px 8px", borderRadius: 6,
                background: "rgba(245,196,81,0.12)", color: C.gold,
                fontFamily: "Cinzel, serif", fontWeight: 700,
              }}>
                Poziom {tower.level}
              </span>
            </div>
            <p style={{ fontSize: 12, color: C.textDim, margin: "4px 0 0", lineHeight: 1.5 }}>
              Centrum Twojego królestwa magii. Wyższy poziom wieży odblokowuje rozbudowę pozostałych budynków i podnosi prestiż.
            </p>
          </div>
        </div>

{tower.unmetReqs?.length > 0 && (
          <div style={{ padding: "8px 12px", borderRadius: 8, marginBottom: 10, background: "rgba(244,106,78,0.06)", border: "1px solid rgba(244,106,78,0.15)" }}>
            <p style={{ fontSize: 11, color: C.red, margin: "0 0 4px", fontWeight: 700 }}>Nie spełniasz wymagań do rozbudowy tego budynku!</p>
            {tower.unmetReqs.map((r: string, i: number) => (
              <p key={i} style={{ fontSize: 11, color: C.red, margin: 0 }}>✕ {r}</p>
            ))}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 12 }}>
          {tower.upgradeReqs?.durationSeconds > 0 && (
            <InfoRow label="Czas budowy" value={`${Math.round(tower.upgradeReqs.durationSeconds / 60)} min`} />
          )}
        </div>

        {tower.isUpgrading ? (
          new Date() >= new Date(tower.upgradeFinishesAt) ? (
            <ActionButton
              label="Odbierz rozbudowę ✓"
              onClick={async () => { await acts.tower.claim(); }}
              variant="success"
            />
          ) : (
            <div style={{
              padding: "12px 16px", borderRadius: 8,
              background: "rgba(89,212,208,0.06)", border: "1px solid rgba(89,212,208,0.2)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <p style={{ fontSize: 12, color: C.teal, margin: 0 }}>Trwa rozbudowa do poziomu {tower.level + 1}...</p>
              <Timer finishesAt={tower.upgradeFinishesAt} onDone={acts.tower.claim} />
            </div>
          )
        ) : (
          <ActionButton
            label={`Rozbuduj do poziomu ${tower.level + 1}`}
            onClick={acts.tower.start}
            disabled={!tower.canUpgrade}
          />
        )}
      </Panel>

      {/* ── BUDYNKI ── */}
      <SectionTitle>Budynki</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        <BuildingCard
          title="Zbieracz mocy"
          icon="⚡"
          description={pc.level > 0
            ? `Generuje okruchy mocy — ${pc.currentProduction} na godzinę.`
            : "Pasywnie generuje okruchy mocy. Wymaga wybudowania."}
          effectLabel={`+${pc.upgradeReqs?.productionAfter ?? 2} okruchów mocy / godz.`}
          data={pc}
          onStart={acts.powerCollector.start}
          onClaim={acts.powerCollector.claim}
          currentShards={resources.powerShards}
        />

        <BuildingCard
          title="Biblioteka"
          icon="📚"
          description="Jeśli nie wiesz, jak coś wyczarować, to jest najlepsze miejsce do poszukiwań."
          effectLabel="+1 aktywny slot czaru bojowego"
          data={lb}
          onStart={acts.library.start}
          onClaim={acts.library.claim}
          currentShards={resources.powerShards}

        />

        <BuildingCard
          title="Gablota trofeów"
          icon="X"
          description="Umożliwia obejrzenie trofeów oraz wybranie aktywnego bonusu."
          effectLabel="+1 aktywny bonus z trofeów"
          data={mh}
          onStart={acts.trophyCabinet.start}
          onClaim={acts.trophyCabinet.claim}
          currentShards={resources.powerShards}
        />

        <BuildingCard
          title="Magiczny Notes"
          icon="X"
          description="Ten prosty, acz genialny magiczny wynalazek służy do notowania wszystkiego, czego uda Ci się o magii dowiedzieć!"
          effectLabel="Umożliwia dostęp przeglądania poznanych przedmiotów, przeciwników, szczelin, krain itd."
          data={so}
          onStart={acts.magicNotebook.start}
          onClaim={acts.magicNotebook.claim}
          currentShards={resources.powerShards}

        />

        <AltairCard
          data={al}
          onStart={acts.altair.start}
          onClaim={acts.altair.claim}
          onRefresh={fetchTower}
          currentShards={resources.powerShards}
        />

        <BuildingCard
          title="Komnata nieładu"
          icon="🗄️"
          description="Gdzieś trzeba składować te wszystkie magiczne rupiecie."
          effectLabel={cv.level > 0
            ? `Widocznych slotów: ${cv.visibleSlots}`
            : "+10 widocznych slotów na nadmiarowe przedmioty"}
          data={cv}
          onStart={acts.chaosVault.start}
          onClaim={acts.chaosVault.claim}
          currentShards={resources.powerShards}

        />

        <BuildingCard
          title="Dezintegrator"
          icon="💥"
          description="Nie podoba Ci się jakiś artefakt? Gardzisz jakimś rodzajem magii? Nie krępuj się, wrzuć ustrojstwo tutaj i patrz z satysfakcją jak wyparowuje."
          effectLabel="Umożliwia wymianę przedmiotów na okruchy mocy"
          data={di}
          onStart={acts.disintegrator.start}
          onClaim={acts.disintegrator.claim}
          currentShards={resources.powerShards}
        />

      </div>
    </div>
  );
}