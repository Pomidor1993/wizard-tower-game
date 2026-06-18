import { useEffect, useState, useCallback } from "react";
import api from "../api/client";
import { useCharacter } from "../contexts/CharacterContext";
import { useTutorial } from "../contexts/TutorialContext";

// ═══════════════════════════════════════════════════════════════════════════════
// STAŁE
// ═══════════════════════════════════════════════════════════════════════════════

const STUDY_LEVELS = [
  {
    level: 1, duration: "1 min", points: "1–4 pkt", chance: "20%", requiredTowerLevel: 1,
    subcategories: ["Chaotyczne machanie rękoma", "Losowy bełkot", "Kiepska inscenizacja"],
  },
  {
    level: 2, duration: "2 min", points: "5–10 pkt", chance: "30%", requiredTowerLevel: 3,
    subcategories: ["Pozornie sensowne gesty dłońmi", "Ciche mamroczenie", "Szalone wygibasy"],
  },
  {
    level: 3, duration: "3 min", points: "11–22 pkt", chance: "40%", requiredTowerLevel: 6,
    subcategories: ["Gwałtowne, synchroniczne wymachy dłońmi", "Mamroczenie słów brzmiących zagranicznie", "Energiczny taniec"],
  },
  {
    level: 4, duration: "4 min", points: "23–50 pkt", chance: "40%", requiredTowerLevel: 10,
    subcategories: ["Opanowane, konsekwentne ruchy dłońmi", "Rymowane skandowanie trudnych słów", "Rytualne ruchy"],
  },
  {
    level: 5, duration: "5 min", points: "51–100 pkt", chance: "50%", requiredTowerLevel: 15,
    subcategories: ["Precyzyjne gesty godne maga", "Doniosła recytacja starożytnych formuł", "Ceremonialny rytuał"],
  },
];

// ── PALETA (zgodna z Training.tsx / ExplorationPanel.tsx) ────────────────────
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

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED — Panel / SectionTitle / pillButton (jak w Training.tsx / ExplorationPanel.tsx)
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
  return (
    <span style={{ fontFamily: "Cinzel, serif", fontWeight: 700, color: COLORS.gold, fontSize: 14 }}>
      {timeLeft}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GŁÓWNY KOMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function StudyPanel() {
  const { refresh: refreshCharacter } = useCharacter();
  const { refresh: refreshTutorial } = useTutorial();

  const [actions, setActions] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [report, setReport] = useState<any>(null);

  const fetchActions = useCallback(async () => {
    try { const res = await api.get("/actions"); setActions(res.data); } catch {}
  }, []);

  useEffect(() => { fetchActions(); }, [fetchActions]);

  const studyActions    = actions?.studyActionsAvailable ?? 0;
  const studyActionsMax = actions?.studyActionsMax ?? 30;
  const activeActions   = actions?.activeActions ?? [];
  const towerLevel = actions?.towerLevel ?? 0;

  const activeStudy    = activeActions.find((a: any) => a.actionType === "study" && a.status === "in_progress");
  const completedStudy = activeActions.find((a: any) => a.actionType === "study" && a.status === "completed");

  // Odśwież dane postaci (pasek nick/poziom/XP w AppLayout) po każdej akcji.
  const syncCharacter = useCallback(async () => {
    await refreshCharacter();
  }, [refreshCharacter]);

async function startStudy(level: number, subcategory: number) {
  setLoading(`${level}-${subcategory}`); 
  try {
    await api.post("/actions/study/start", { level, subcategory });
    await fetchActions();
    await syncCharacter();
  } catch (err: any) {
    alert(err.response?.data?.error ?? "Błąd");
  } finally {
    setLoading(null);
  }
}

async function claimStudy(actionId: number) {
  setClaiming(actionId);
  try {
    const res = await api.post(`/actions/study/claim/${actionId}`);
    setReport(res.data);
    await fetchActions();
    await syncCharacter();
    await refreshTutorial();
  } catch (err: any) {
    alert(err.response?.data?.error ?? "Błąd");
  } finally {
    setClaiming(null);
  }
}

  return (
    <div>
      <h1 style={{ fontFamily: "Cinzel, serif", color: COLORS.gold, fontSize: 22, marginBottom: 24, letterSpacing: "0.06em" }}>
        Studia
      </h1>

      <Panel>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <SectionTitle style={{ marginBottom: 0 }}>Szalone studia</SectionTitle>
          <span style={{ fontSize: 11, color: COLORS.textFaint }}>
            Akcje: <span style={{ fontWeight: 700, color: COLORS.textDim }}>{studyActions}/{studyActionsMax}</span>
          </span>
        </div>

        {/* Aktywna akcja */}
        {activeStudy && (
          <div style={{
            marginBottom: 16, padding: "12px 16px", borderRadius: 10,
            background: "rgba(89,212,208,0.06)", border: "1px solid rgba(89,212,208,0.2)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.teal, margin: 0 }}>Trwa nauka...</p>
              <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "2px 0 0" }}>Poziom {activeStudy.actionLevel}</p>
            </div>
            <Timer finishesAt={activeStudy.finishesAt} onDone={fetchActions} />
          </div>
        )}

        {/* Gotowa do odebrania */}
        {completedStudy && (
          <div style={{
            marginBottom: 16, padding: "12px 16px", borderRadius: 10,
            background: "rgba(245,196,81,0.07)", border: "1px solid rgba(245,196,81,0.25)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.gold, margin: 0 }}>
              Nauka zakończona! Odbierz wynik.
            </p>
            <button
              onClick={() => claimStudy(completedStudy.id)}
              disabled={claiming === completedStudy.id}
              style={{
                padding: "8px 18px", borderRadius: 8,
                background: COLORS.gold, color: COLORS.bg,
                border: "none", fontSize: 12, fontWeight: 700,
                fontFamily: "Cinzel, serif", letterSpacing: "0.05em",
                cursor: claiming === completedStudy.id ? "not-allowed" : "pointer",
                opacity: claiming === completedStudy.id ? 0.6 : 1,
              }}
            >
              {claiming === completedStudy.id ? "..." : "Odbierz"}
            </button>
          </div>
        )}

        {/* Raport */}
        {report && (
          <div style={{
            marginBottom: 16, padding: "12px 16px", borderRadius: 10,
            background: COLORS.panelAlt, border: `1px solid ${COLORS.borderSoft}`,
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, margin: "0 0 4px" }}>Wynik nauki:</p>
            <p style={{ fontSize: 13, color: COLORS.textDim, margin: 0 }}>{report.message}</p>
            <button
              onClick={() => setReport(null)}
              style={{
                marginTop: 8, background: "none", border: "none",
                color: COLORS.textGhost, fontSize: 11, cursor: "pointer", padding: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = COLORS.red)}
              onMouseLeave={e => (e.currentTarget.style.color = COLORS.textGhost)}
            >
              Zamknij
            </button>
          </div>
        )}

        {/* Lista poziomów */}
{!activeStudy && !completedStudy && (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    {STUDY_LEVELS.map(lvl => {
      const towerOk = towerLevel >= lvl.requiredTowerLevel;
      const canStart = studyActions > 0 && actions !== null && towerOk;
      const lockedByTower = actions !== null && !towerOk;

      return (
        <div key={lvl.level} style={{
          padding: "14px 16px", borderRadius: 10,
          border: `1px solid ${COLORS.borderSoft}`,
          background: COLORS.panelAlt,
          opacity: lockedByTower ? 0.45 : 1,
        }}>
          {/* Nagłówek poziomu */}
          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 12, color: COLORS.textFaint, margin: 0 }}>
              Poziom {lvl.level} · {lvl.duration} · {lvl.points} · {lvl.chance} na czar
            </p>
            {lockedByTower && (
              <p style={{ fontSize: 11, color: COLORS.red, margin: "4px 0 0" }}>
                Dostępne od poziomu {lvl.requiredTowerLevel} wieży
              </p>
            )}
            {!lockedByTower && !canStart && (
              <p style={{ fontSize: 11, color: COLORS.red, margin: "4px 0 0" }}>
                Brak dostępnych akcji — odnawia się co 30 minut
              </p>
            )}
          </div>

          {/* 3 przyciski podkategorii */}
          <div style={{ display: "flex", flexDirection: "row", gap: 6 }}>
            {lvl.subcategories.map((name, i) => {
              const key = `${lvl.level}-${i + 1}`;
              const isLoading = loading === key;
              return (
                <button
                  key={i}
                  onClick={() => canStart ? startStudy(lvl.level, i + 1) : undefined}
                  disabled={isLoading || !canStart}
                  style={{
                    flex: 1,
                    minWidth: 120,
                    padding: "8px 14px", borderRadius: 8, textAlign: "left",
                    border: `1px solid ${canStart ? "rgba(245,196,81,0.2)" : COLORS.borderSoft}`,
                    fontSize: 12, fontWeight: 600,
                    fontFamily: "Inter, sans-serif",
                    background: isLoading
                      ? "rgba(245,196,81,0.08)"
                      : canStart
                        ? "rgba(245,196,81,0.06)"
                        : "rgba(255,255,255,0.02)",
                    color: canStart ? COLORS.text : COLORS.textGhost,
                    cursor: (!canStart || isLoading) ? "not-allowed" : "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (canStart && !isLoading) e.currentTarget.style.background = "rgba(245,196,81,0.13)"; }}
                  onMouseLeave={e => { if (canStart && !isLoading) e.currentTarget.style.background = "rgba(245,196,81,0.06)"; }}
                >
                  {isLoading ? "..." : lockedByTower ? `🔒 ${name}` : name}
                </button>
              );
            })}
          </div>
        </div>
      );
    })}
  </div>
)}
      </Panel>
    </div>
  );
}