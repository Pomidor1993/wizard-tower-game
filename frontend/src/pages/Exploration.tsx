import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useCharacter } from "../contexts/CharacterContext";
import { useTutorial } from "../contexts/TutorialContext";

const EXPLORATION_LEVELS = [
  { level: 1, name: "Bliskie okolice",                       description: "Niedaleko, niegroźnie. Idealne na rozgrzewkę.",                          duration: "2 min",  points: "10–20 pkt", itemChance: "10%", encounterChance: "5%",  availableFrom: null,               requiredTowerLevel: 1,   subcategories: ["Przeszukaj krzaki przy wieży", "Poszukaj skrytek w zwykłym, nudnym lesie", "Poszukaj czegoś nad stawem"] },
  { level: 2, name: "Okolice wokół tych bliskich okolic",   description: "Trochę dalej od wieży. Może coś ciekawego się trafi.",                   duration: "4 min",  points: "20–40 pkt", itemChance: "20%", encounterChance: "10%", availableFrom: "Poziom wieży: 10",  requiredTowerLevel: 10,  subcategories: ["Splądruj opuszczoną chatkę", "Zajrzyj pod pobliski most", "Przeszukaj brzegi rzeczki"] },
  { level: 3, name: "Całkiem dalekie miejsca",               description: "Tłoczno, głośno i pełno dziwnych stworzeń. Brzmi jak plan.",             duration: "6 min",  points: "40–60 pkt", itemChance: "30%", encounterChance: "0%",  availableFrom: "Poziom wieży: 25",  requiredTowerLevel: 25,  subcategories: ["Zbadaj starą jaskinię", "Wejdź na pobliskie wzgórze", "Poszukaj skrzyni ukrytej za wodospadem"] },
  { level: 4, name: "Odległe rubieże",                       description: "Zimno, mgliście i pełno niebezpieczeństw. Dla odważnych.",              duration: "8 min",  points: "60–80 pkt", itemChance: "20%", encounterChance: "40%", availableFrom: "Poziom wieży: 50",  requiredTowerLevel: 50,  subcategories: ["Przeszukaj zapomniane ruiny", "Nurkuj w głębokim jeziorze", "Poszukaj skrytek w magicznym, przeklętym lesie"] },
  { level: 5, name: "Gdzieś za siedmioma lasami",            description: "Nieznane wody, nieznane stworzenia. Tylko dla najdzielniejszych magów.", duration: "10 min", points: "70–90 pkt", itemChance: "40%", encounterChance: "50%", availableFrom: "Poziom wieży: 100", requiredTowerLevel: 100, subcategories: ["Ograb legendarną kryptę", `Wejdź do lochu z napisem "NIE WCHODZIĆ"`, `Poszukaj sekretnego przejścia, którego "na pewno tu nie ma"`] },
];

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

function Panel({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: COLORS.panel, borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: 20, ...style }}>
      {children}
    </div>
  );
}

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
  return <span style={{ fontFamily: "Cinzel, serif", fontWeight: 700, color: COLORS.gold, fontSize: 14 }}>{timeLeft}</span>;
}

export default function ExplorationPanel({
  onRefresh,
  towerLevel = 1,
}: {
  onRefresh?: () => void;
  playerName?: string;
  towerLevel?: number;
}) {
  // ── hooki zawsze na początku komponentu ──
  const navigate = useNavigate();
  const { refresh: refreshCharacter } = useCharacter();
  const { refresh: refreshTutorial }  = useTutorial();

  const [selected, setSelected]               = useState(1);
  const [actions, setActions]                 = useState<any>(null);
  const [loading, setLoading]                 = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<"A" | "B" | "C">("A");
  const [justFinished, setJustFinished]       = useState(false);

  useEffect(() => { setSelectedLocation("A"); }, [selected]);

  const fetchActions = useCallback(async () => {
    try { const res = await api.get("/actions"); setActions(res.data); } catch {}
  }, []);

  useEffect(() => { fetchActions(); }, [fetchActions]);

  const syncCharacter = useCallback(async () => {
    await refreshCharacter();
    onRefresh?.();
  }, [refreshCharacter, onRefresh]);

  const activeExploration  = actions?.activeActions?.find((a: any) => a.actionType === "exploration" && a.status === "in_progress");
  const explorationActions = actions?.explorationActionsAvailable ?? 0;
  const currentLoc         = EXPLORATION_LEVELS[selected - 1]!;
  const locLocked          = towerLevel < currentLoc.requiredTowerLevel;

  async function handleStart() {
    setLoading(true);
    try {
      await api.post("/actions/exploration/start", { level: selected, location: selectedLocation });
      setJustFinished(false);
      await fetchActions();
      await syncCharacter();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontFamily: "Cinzel, serif", color: COLORS.gold, fontSize: 22, marginBottom: 24, letterSpacing: "0.06em" }}>
        Eksploracja
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Aktywna eksploracja — odliczanie */}
        {activeExploration && (
          <Panel style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "16px 20px", background: "rgba(89,212,208,0.06)", border: "1px solid rgba(89,212,208,0.2)",
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.teal, margin: 0 }}>
                Trwa eksploracja — poziom {activeExploration.actionLevel}
              </p>
              <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "2px 0 0" }}>
                {EXPLORATION_LEVELS[activeExploration.actionLevel - 1]?.name}
              </p>
            </div>
            <Timer
              finishesAt={activeExploration.finishesAt}
              onDone={async () => {
                setJustFinished(true);
                await fetchActions();
                await syncCharacter();
                await refreshTutorial();
              }}
            />
          </Panel>
        )}

        {/* Powiadomienie po zakończeniu — tylko gdy timer się wyzerował w tej sesji */}
        {justFinished && !activeExploration && (
          <Panel style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "16px 20px", background: "rgba(245,196,81,0.07)", border: "1px solid rgba(245,196,81,0.25)",
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.gold, margin: 0 }}>
              Eksploracja zakończona! Raport dostępny w Wiadomościach.
            </p>
            <button
              onClick={() => navigate("/messages?tab=reports")}
              style={{
                padding: "8px 18px", borderRadius: 8, background: COLORS.gold, color: COLORS.bg,
                border: "none", fontSize: 12, fontWeight: 700, fontFamily: "Cinzel, serif", cursor: "pointer",
              }}
            >
              📬 Odbierz raport
            </button>
          </Panel>
        )}

        {/* Główny układ */}
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start" }}>

          {/* Lista lokacji */}
          <Panel style={{ padding: 0, overflow: "hidden" }}>
            <div style={{
              padding: "14px 16px", borderBottom: `1px solid ${COLORS.borderSoft}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontFamily: "Cinzel, serif", fontSize: 11, color: COLORS.gold, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Lokacje
              </span>
              <span style={{ fontSize: 11, color: COLORS.textFaint }}>
                Akcje: <span style={{ fontWeight: 700, color: COLORS.textDim }}>{explorationActions}/15</span>
              </span>
            </div>
            <div>
              {EXPLORATION_LEVELS.map((loc, i) => {
                const locked     = towerLevel < loc.requiredTowerLevel;
                const isSelected = selected === loc.level;
                return (
                  <button
                    key={loc.level}
                    onClick={() => !locked && setSelected(loc.level)}
                    disabled={locked}
                    style={{
                      display: "block", width: "100%", textAlign: "left", padding: "12px 16px",
                      borderTop: i === 0 ? "none" : `1px solid ${COLORS.borderSoft}`,
                      borderBottom: "none", borderLeft: "none", borderRight: "none",
                      background: locked ? "rgba(0,0,0,0.15)" : isSelected ? "rgba(245,196,81,0.1)" : "transparent",
                      cursor: locked ? "not-allowed" : "pointer", opacity: locked ? 0.45 : 1, transition: "background 0.15s",
                    }}
                    onMouseEnter={e => { if (!locked && !isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                    onMouseLeave={e => { if (!locked && !isSelected) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: isSelected ? COLORS.gold : COLORS.text, margin: 0 }}>{loc.name}</p>
                      {locked && <span style={{ fontSize: 11, color: COLORS.textFaint }}>🔒</span>}
                    </div>
                    <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "2px 0 0" }}>{loc.duration} · {loc.points}</p>
                    {loc.availableFrom && (
                      <p style={{ fontSize: 11, margin: "2px 0 0", color: locked ? COLORS.red : COLORS.textGhost }}>{loc.availableFrom}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </Panel>

          {/* Szczegóły lokacji */}
          <Panel style={{ padding: 0, overflow: "hidden", minHeight: 340 }}>
            <div style={{
              height: 180, display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(0,0,0,0.2)", borderBottom: `1px solid ${COLORS.borderSoft}`,
            }}>
              <p style={{ fontSize: 13, color: COLORS.textGhost, margin: 0 }}>Grafika: {currentLoc.name}</p>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <p style={{ fontFamily: "Cinzel, serif", fontSize: 15, fontWeight: 700, color: COLORS.text, margin: 0 }}>
                    {currentLoc.name}
                  </p>
                  {locLocked && (
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "rgba(244,106,78,0.12)", color: COLORS.red, border: "1px solid rgba(244,106,78,0.3)" }}>
                      🔒 Wymaga wieży poz. {currentLoc.requiredTowerLevel}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: COLORS.textDim, marginTop: 6, marginBottom: 0 }}>{currentLoc.description}</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  ["Czas trwania", currentLoc.duration],
                  ["Punkty umiej.", currentLoc.points],
                  ["Szansa na przedmiot", currentLoc.itemChance],
                  ["Szansa na spotkanie", currentLoc.encounterChance],
                ].map(([label, val]) => (
                  <div key={label} style={{ padding: "8px 12px", background: COLORS.panelAlt, borderRadius: 8 }}>
                    <p style={{ fontSize: 10, color: COLORS.textFaint, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "Cinzel, serif" }}>{label}</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, margin: "2px 0 0" }}>{val}</p>
                  </div>
                ))}
              </div>

              {/* Wybór podlokacji — ukryty gdy trwa akcja */}
              {!activeExploration && (
                <div style={{ display: "flex", gap: 6 }}>
                  {(["A", "B", "C"] as const).map((letter, i) => {
                    const name       = currentLoc.subcategories[i];
                    const isSelected = selectedLocation === letter;
                    return (
                      <button
                        key={letter}
                        onClick={() => !locLocked && setSelectedLocation(letter)}
                        disabled={locLocked}
                        style={{
                          flex: 1, padding: "8px 6px", borderRadius: 8, textAlign: "left",
                          border: `1px solid ${isSelected ? COLORS.gold : COLORS.borderSoft}`,
                          background: isSelected ? "rgba(245,196,81,0.12)" : COLORS.panelAlt,
                          color: isSelected ? COLORS.gold : COLORS.textDim,
                          fontSize: 11, fontWeight: isSelected ? 700 : 400,
                          cursor: locLocked ? "not-allowed" : "pointer", transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { if (!locLocked && !isSelected) e.currentTarget.style.borderColor = "rgba(245,196,81,0.3)"; }}
                        onMouseLeave={e => { if (!locLocked && !isSelected) e.currentTarget.style.borderColor = COLORS.borderSoft; }}
                      >
                        <span style={{ fontFamily: "Cinzel, serif", fontSize: 10, opacity: 0.6, display: "block", marginBottom: 2 }}>{letter}</span>
                        {name}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Przycisk start — ukryty gdy trwa akcja */}
              {!activeExploration && (
                <button
                  onClick={handleStart}
                  disabled={loading || explorationActions <= 0 || locLocked}
                  style={{
                    width: "100%", padding: "12px 0", borderRadius: 8,
                    border: "none", fontSize: 13, fontWeight: 700,
                    fontFamily: "Cinzel, serif", letterSpacing: "0.05em",
                    background: (loading || explorationActions <= 0 || locLocked) ? "rgba(245,196,81,0.15)" : COLORS.gold,
                    color: (loading || explorationActions <= 0 || locLocked) ? COLORS.textGhost : COLORS.bg,
                    cursor: (loading || explorationActions <= 0 || locLocked) ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {loading ? "..." : locLocked
                    ? "Zablokowane..."
                    : `Eksploruj — ${currentLoc.subcategories[["A", "B", "C"].indexOf(selectedLocation)]}`}
                </button>
              )}
            </div>
          </Panel>
        </div>

        {/* Placeholder ustawień */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: 64, borderRadius: 10, border: `1px dashed ${COLORS.border}`,
        }}>
          <p style={{ fontSize: 12, color: COLORS.textGhost, fontStyle: "italic", margin: 0 }}>
            Ustawienia eksploracji — poziom trudności, cel itp. — wkrótce
          </p>
        </div>

      </div>
    </div>
  );
}