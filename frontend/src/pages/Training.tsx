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

const STAT_DESCRIPTIONS: Record<string, string> = {
  knowledge:      "Czarodziej musi być światowy! Twoja wiedza decyduje przede wszystkim o tym, jak bardzo będziesz w stanie rozbudować swoją wieżę. Wpływa też na zrozumienie działania odnajdywanych artefaktów.",
  intelligence:   "Czarodziej musi być bystry! Nie osiągniesz w magicznym świecie niczego, jeśli nie będziesz rozwijać swojej inteligencji. Wpływa ona przede wszystkim na szanse wyczarowania czegokolwiek, ale także na możliwości stworzenia bardziej skomplikowanych struktur w Twojej wieży i na możliwość korzystania z niektórych artefaktów.",
  power:          "Czarodziej musi być potężny! Co z tego, że wiesz, jak wyczarować deszcz, jeśli z chmurki kapnie co najwyżej kilka kropel? Twoja moc ma wpływ na obrażenia i efekty wywoływane przez wszystkie Twoje czary. Potężniejsze artefakty również wymagają posiadania potężnej mocy.",
  endurance:      "Czarodziej musi być twardy! Aby naprawdę udowodnić swoją wartość, musi umieć wytrwać w boju. Wytrzymałość określa, ile Punktów Życia ma Twoja postać (1 pkt wytrzymałości = 5 pkt życia).",
  resistance:     "Czarodziej musi być odporny! Skoro wszyscy potrafią posługiwać się magią, nigdy nie wiesz, czy akurat ktoś nie spróbuje potraktować Cię szczególnie okrutną klątwą. Odporność zmniejsza otrzymywane obrażenia z dowolnego źródła magii (1 pkt = 1% otrzymywanych obrażeń mniej).",
  initiative:     "Czarodziej musi być szybki! Milisekundy mogą decydować o tym, czy Ty porazisz piorunem kogoś, czy ktoś porazi piorunem Ciebie. Inicjatywa określa, kto jako pierwszy wykona swój ruch w walce.",
  elementalMagic: "Ogień, woda, ziemia i powietrze to fundamenty magicznego świata. Rozwijając magię żywiołów zwiększasz swoją kontrolę nad siłami natury oraz nad wszystkimi ich pochodnymi formami — lodem, piorunami, lawą, burzami, czy parą. Statystyka ta wpływa przede wszystkim na skuteczność oraz siłę czarów opartych na żywiołach, a także na możliwość korzystania z bardziej zaawansowanych zaklęć żywiołów i związanych z nimi artefaktów.",
  astralMagic:    "Nie każda magia niszczy ciało. Niektóre czary potrafią wpływać na sam umysł i rzeczywistość. Magia astralna odpowiada za zdolności manipulowania energią astralną: wzmacniające aury i wszystkie te rzeczy, o których mogą marzyć młodzi magicy — kontrolę nad umysłem, teleportację, lewitację, iluzje, nawet zakrzywianie przestrzeni. Rozwijanie tej statystyki zwiększa skuteczność czarów wspierających i kontroli, a także pozwala korzystać z coraz bardziej złożonych technik astralnych i mistycznych artefaktów.",
  bloodMagic:     "Życie i śmierć są ze sobą nierozerwalnie związane, a magia krwi pozwala czerpać moc z obu tych sił. Dzięki niej możliwe jest leczenie ran, wysysanie energii życiowej, nakładanie klątw, przyzywanie istot oraz manipulowanie esencją życia. Statystyka ta wpływa na skuteczność zaklęć związanych z regeneracją, drenażem życia i przyzywaniem, a także umożliwia korzystanie z coraz bardziej niebezpiecznych rytuałów oraz artefaktów powiązanych z krwią i duszami.",
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
  const [pending, setPending] = useState<Record<string, number>>({});

  // ── TOOLTIP — stan wewnątrz komponentu ──────────────────────────────────
  const [tooltip, setTooltip] = useState<{ stat: string; x: number; y: number } | null>(null);

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
onMouseMove={e => {
  const tooltipWidth = 280;
  const margin = 12;
  const x = e.clientX + tooltipWidth + margin > window.innerWidth
    ? e.clientX - tooltipWidth - margin
    : e.clientX + margin;
  setTooltip({ stat: cost.stat, x, y: e.clientY + 16 });
}}
onMouseLeave={() => setTooltip(null)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px",
                    background: delta > 0 ? "rgba(89,212,208,0.07)" : "rgba(0,0,0,0.15)",
                    borderRadius: 8,
                    position: "relative",
                    border: delta > 0 ? "1px solid rgba(89,212,208,0.2)" : "1px solid transparent",
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: 16, width: 22, textAlign: "center", flexShrink: 0 }}>{icon}</span>
<span className="stat-label-span" style={{ fontSize: 13, color: "rgba(247,240,221,0.8)", flex: 1 }}>{label}</span>
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

      {/* ── TOOLTIP — position:fixed, renderuje się nad wszystkim ── */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            top: tooltip.y,
            left: tooltip.x + 16,
            zIndex: 9999,
            width: 280,
            background: "#161d38",
            color: "#F7F0DD",
            fontSize: 12,
            lineHeight: 1.6,
            fontFamily: "Inter, sans-serif",
            padding: "12px 14px",
            borderRadius: 8,
            border: "1px solid rgba(245,196,81,0.3)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            pointerEvents: "none",
          }}
        >
          {STAT_DESCRIPTIONS[tooltip.stat]}
        </div>
      )}
    </div>
  );
}