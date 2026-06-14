import { useEffect, useState } from "react";
import { useCharacter } from "../contexts/CharacterContext";
import api from "../api/client";

// ── TYPY ────────────────────────────────────────────────────────────────────

interface StatCost {
  stat: string;
  currentLevel: number;
  upgradeCost: number;
  canAfford: boolean;
}

interface CostsData {
  skillPoints: number;
  level: number;
  experience: number;
  xpToNextLevel: number;
  costs: StatCost[];
}

// ── KONFIGURACJA ─────────────────────────────────────────────────────────────

const STAT_LABELS: Record<string, string> = {
  knowledge:      "Wiedza",
  intelligence:   "Inteligencja",
  power:          "Moc",
  endurance:      "Wytrzymałość",
  resistance:     "Odporność",
  initiative:     "Inicjatywa",
  elementalMagic: "Magia Żywiołów",
  astralMagic:    "Magia Astralna",
  bloodMagic:     "Magia Krwi",
};

const STAT_ICONS: Record<string, string> = {
  knowledge:      "📚",
  intelligence:   "🧠",
  power:          "⚡",
  endurance:      "🛡",
  resistance:     "🔰",
  initiative:     "💨",
  elementalMagic: "🔥",
  astralMagic:    "🌙",
  bloodMagic:     "🩸",
};

function upgradeCostForLevel(level: number): number {
  return Math.floor(level / 20) + 1;
}

// ── PANEL ────────────────────────────────────────────────────────────────────

function Panel({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "#372b5d",
      borderRadius: 12,
      border: "1px solid rgba(245,196,81,0.12)",
      padding: 20,
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: "Cinzel, serif",
      fontSize: 13,
      color: "#F5C451",
      letterSpacing: "0.08em",
      marginBottom: 16,
    }}>
      {children}
    </p>
  );
}

// ── GŁÓWNY KOMPONENT ─────────────────────────────────────────────────────────

export default function Training() {
  const { refresh: refreshCharacter } = useCharacter();

  const [costs, setCosts] = useState<CostsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Lokalny stan: delta per statystykę (ile chcemy dodać, zanim zatwierdzimy)
  const [pending, setPending] = useState<Record<string, number>>({});

  async function fetchCosts() {
    try {
      const res = await api.get("/character/upgrade-costs");
      setCosts(res.data);
    } catch {
      // interceptor obsłuży błędy auth
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchCosts(); }, []);

  // Oblicz łączny koszt wszystkich pending zmian
  function totalPendingCost(): number {
    if (!costs) return 0;
    let total = 0;
    for (const [stat, delta] of Object.entries(pending)) {
      if (delta <= 0) continue;
      const base = costs.costs.find(c => c.stat === stat)?.currentLevel ?? 0;
      for (let i = 0; i < delta; i++) {
        total += upgradeCostForLevel(base + i);
      }
    }
    return total;
  }

  // Dostępne punkty po odjęciu pending
  const remainingPoints = (costs?.skillPoints ?? 0) - totalPendingCost();

  function canIncrement(stat: string): boolean {
    if (!costs) return false;
    const base = costs.costs.find(c => c.stat === stat)?.currentLevel ?? 0;
    const delta = pending[stat] ?? 0;
    const nextCost = upgradeCostForLevel(base + delta);
    return remainingPoints >= nextCost;
  }

  function canDecrement(stat: string): boolean {
    return (pending[stat] ?? 0) > 0;
  }

  function increment(stat: string) {
    if (!canIncrement(stat)) return;
    setPending(p => ({ ...p, [stat]: (p[stat] ?? 0) + 1 }));
  }

  function decrement(stat: string) {
    if (!canDecrement(stat)) return;
    setPending(p => {
      const next = { ...p, [stat]: (p[stat] ?? 0) - 1 };
      if (next[stat] === 0) delete next[stat];
      return next;
    });
  }

  function resetPending() {
    setPending({});
  }

  async function handleSave() {
    if (!costs || Object.keys(pending).length === 0) return;
    setSaving(true);
    try {
      // Wysyłamy każde ulepszenie po kolei
      for (const [stat, delta] of Object.entries(pending)) {
        for (let i = 0; i < delta; i++) {
          await api.post("/character/upgrade", { stat });
        }
      }
      setPending({});
      await fetchCosts();
      await refreshCharacter();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd podczas zapisywania");
    } finally {
      setSaving(false);
    }
  }

  const hasPending = Object.values(pending).some(v => v > 0);

  if (loading) return <p style={{ color: "rgba(247,240,221,0.4)" }}>Ładowanie...</p>;
  if (!costs)  return <p style={{ color: "rgba(247,240,221,0.4)" }}>Błąd ładowania danych</p>;

  return (
    <div>
      <h1 style={{ fontFamily: "Cinzel, serif", color: "#F5C451", fontSize: 22, marginBottom: 24, letterSpacing: "0.06em" }}>
        Trening
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* ── LEWA: STATYSTYKI ── */}
        <Panel>
          <SectionTitle>Rozwijaj statystyki</SectionTitle>

          {/* Dostępne punkty */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "#161d38", borderRadius: 10, padding: "12px 16px", marginBottom: 20,
          }}>
            <div>
              <p style={{ fontSize: 11, color: "rgba(247,240,221,0.4)", marginBottom: 2 }}>
                Dostępne punkty umiejętności
              </p>
              <p style={{ fontSize: 26, fontWeight: 700, color: "#F5C451", fontFamily: "Cinzel, serif" }}>
                {remainingPoints}
                {hasPending && (
                  <span style={{ fontSize: 13, color: "rgba(247,240,221,0.35)", marginLeft: 8, fontFamily: "Inter, sans-serif" }}>
                    / {costs.skillPoints} (po zatwierdzeniu)
                  </span>
                )}
              </p>
            </div>
            {hasPending && (
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 11, color: "rgba(247,240,221,0.4)", marginBottom: 4 }}>Koszt zmian</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#F46A4E" }}>−{totalPendingCost()}</p>
              </div>
            )}
          </div>

          {/* Lista statystyk */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {costs.costs.map(cost => {
              const delta    = pending[cost.stat] ?? 0;
              const newLevel = cost.currentLevel + delta;
              const nextCost = upgradeCostForLevel(newLevel);
              const icon     = STAT_ICONS[cost.stat] ?? "◆";
              const label    = STAT_LABELS[cost.stat] ?? cost.stat;

              return (
                <div
                  key={cost.stat}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px",
                    background: delta > 0 ? "rgba(89,212,208,0.07)" : "rgba(0,0,0,0.15)",
                    borderRadius: 8,
                    border: delta > 0 ? "1px solid rgba(89,212,208,0.2)" : "1px solid transparent",
                    transition: "all 0.15s",
                  }}
                >
                  {/* Ikona + nazwa */}
                  <span style={{ fontSize: 16, width: 22, textAlign: "center", flexShrink: 0 }}>{icon}</span>
                  <span style={{ fontSize: 13, color: "rgba(247,240,221,0.8)", flex: 1 }}>{label}</span>

                  {/* Kontrolka */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      onClick={() => decrement(cost.stat)}
                      disabled={!canDecrement(cost.stat)}
                      style={{
                        width: 26, height: 26, borderRadius: 6,
                        background: canDecrement(cost.stat) ? "rgba(244,106,78,0.2)" : "rgba(0,0,0,0.15)",
                        border: "1px solid rgba(244,106,78,0.3)",
                        color: canDecrement(cost.stat) ? "#F46A4E" : "rgba(247,240,221,0.2)",
                        cursor: canDecrement(cost.stat) ? "pointer" : "not-allowed",
                        fontSize: 14, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      −
                    </button>

                    {/* Wartość */}
                    <div style={{ minWidth: 52, textAlign: "center" }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#F7F0DD" }}>
                        {cost.currentLevel}
                      </span>
                      {delta > 0 && (
                        <>
                          <span style={{ fontSize: 11, color: "rgba(247,240,221,0.3)", margin: "0 3px" }}>→</span>
                          <span style={{ fontSize: 16, fontWeight: 700, color: "#59D4D0" }}>
                            {newLevel}
                          </span>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => increment(cost.stat)}
                      disabled={!canIncrement(cost.stat)}
                      style={{
                        width: 26, height: 26, borderRadius: 6,
                        background: canIncrement(cost.stat) ? "rgba(89,212,208,0.15)" : "rgba(0,0,0,0.15)",
                        border: "1px solid rgba(89,212,208,0.3)",
                        color: canIncrement(cost.stat) ? "#59D4D0" : "rgba(247,240,221,0.2)",
                        cursor: canIncrement(cost.stat) ? "pointer" : "not-allowed",
                        fontSize: 14, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      +
                    </button>
                  </div>

                  {/* Koszt następnego ulepszenia */}
                  <span style={{
                    fontSize: 10, color: "rgba(247,240,221,0.3)",
                    minWidth: 52, textAlign: "right", fontFamily: "Cinzel, serif",
                  }}>
                    {nextCost} pkt
                  </span>
                </div>
              );
            })}
          </div>

          {/* Przyciski akcji */}
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              onClick={resetPending}
              disabled={!hasPending || saving}
              style={{
                flex: 1, padding: "10px 0",
                background: "transparent",
                border: "1px solid rgba(247,240,221,0.15)",
                borderRadius: 8,
                color: hasPending ? "rgba(247,240,221,0.6)" : "rgba(247,240,221,0.2)",
                fontSize: 13, cursor: hasPending ? "pointer" : "not-allowed",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (hasPending) (e.currentTarget.style.borderColor = "rgba(244,106,78,0.4)"); }}
              onMouseLeave={e => { (e.currentTarget.style.borderColor = "rgba(247,240,221,0.15)"); }}
            >
              Cofnij zmiany
            </button>
            <button
              onClick={handleSave}
              disabled={!hasPending || saving}
              style={{
                flex: 2, padding: "10px 0",
                background: hasPending ? "#F5C451" : "rgba(245,196,81,0.15)",
                border: "none",
                borderRadius: 8,
                color: hasPending ? "#161d38" : "rgba(247,240,221,0.2)",
                fontSize: 13, fontWeight: 700,
                fontFamily: "Cinzel, serif",
                cursor: hasPending ? "pointer" : "not-allowed",
                transition: "all 0.2s",
                letterSpacing: "0.05em",
              }}
            >
              {saving ? "Zapisywanie..." : hasPending ? `Akceptuj (−${totalPendingCost()} pkt)` : "Akceptuj"}
            </button>
          </div>

          <p style={{ fontSize: 10, color: "rgba(247,240,221,0.2)", marginTop: 12, textAlign: "center" }}>
            Koszt ulepszenia rośnie co 20 poziomów statystyki
          </p>
        </Panel>

        {/* ── PRAWA: BONUSY (PLACEHOLDER) ── */}
        <Panel style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionTitle>Rozwijaj bonusy</SectionTitle>

          <div style={{
            flex: 1, minHeight: 300,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 12,
            background: "rgba(0,0,0,0.15)",
            borderRadius: 10,
            border: "1px dashed rgba(245,196,81,0.15)",
            padding: 32,
            textAlign: "center",
          }}>
            <span style={{ fontSize: 40, opacity: 0.3 }}>✦</span>
            <p style={{ fontFamily: "Cinzel, serif", fontSize: 14, color: "rgba(247,240,221,0.3)", letterSpacing: "0.06em" }}>
              Bonusy specjalne
            </p>
            <p style={{ fontSize: 12, color: "rgba(247,240,221,0.2)", fontStyle: "italic", maxWidth: 240 }}>
              System bonusów specjalnych pojawi się w przyszłej aktualizacji. Będą tu dostępne unikalne zdolności powiązane z klasą postaci.
            </p>
          </div>
        </Panel>

      </div>
    </div>
  );
}