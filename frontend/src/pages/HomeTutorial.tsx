import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useTutorial } from "../contexts/TutorialContext";
import type { HomeRepairTask } from "../contexts/TutorialContext";

const STATUS_LABEL: Record<string, string> = {
  locked:      "🔒 Zablokowane",
  available:   "✦ Dostępne",
  in_progress: "⚙️ W trakcie",
  completed:   "✅ Ukończone",
};

const STATUS_COLOR: Record<string, string> = {
  locked:      "rgba(247,240,221,0.25)",
  available:   "#59D4D0",
  in_progress: "#F5C451",
  completed:   "rgba(89,212,208,0.5)",
};

function formatCountdown(finishesAt: string): string {
  const diff = Math.max(0, Math.floor((new Date(finishesAt).getTime() - Date.now()) / 1000));
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function HomeTutorial() {
  const { tutorial, refresh: refreshTutorial } = useTutorial();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<HomeRepairTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Odliczanie co sekundę dla zadań w trakcie
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const res = await api.get("/tutorial/home-repair");
      setTasks(res.data);
    } catch (e: any) {
      setError(e.response?.data?.error ?? "Błąd ładowania zadań");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  async function startTask(taskCode: string) {
    setActionLoading(taskCode);
    setError(null);
    try {
      await api.post(`/tutorial/home-repair/${taskCode}/start`);
      await loadTasks();
    } catch (e: any) {
      setError(e.response?.data?.error ?? "Błąd");
    } finally {
      setActionLoading(null);
    }
  }

  async function claimTask(taskCode: string) {
    setActionLoading(taskCode);
    setError(null);
    try {
      await api.post(`/tutorial/home-repair/${taskCode}/claim`);
      await loadTasks();
      await refreshTutorial(); // może pojawić się nowa wiadomość / nowy krok
    } catch (e: any) {
      setError(e.response?.data?.error ?? "Błąd");
    } finally {
      setActionLoading(null);
    }
  }

  async function completeTutorial() {
    setActionLoading("complete");
    try {
      await api.post("/tutorial/complete");
      await refreshTutorial();
      navigate("/tower");
    } catch (e: any) {
      setError(e.response?.data?.error ?? "Błąd");
    } finally {
      setActionLoading(null);
    }
  }

  const step = tutorial?.step;
  const isTowerReady = step === "TOWER_READY";
  const allDone = tasks.length > 0 && tasks.every(t => t.status === "completed");

  // ── FAZY WIDOKU ───────────────────────────────────────────────────────────

  // INTRO: gracz jeszcze nie ukończył eksploracji — pokazujemy tylko klimatyczny tekst
  if (step === "INTRO") {
    return (
      <div style={containerStyle}>
        <h1 style={titleStyle}>Zniszczony Dom</h1>
        <div style={cardStyle}>
          <p style={textStyle}>
            Twój dom jest w opłakanym stanie. Dach przecieka, ściany pełne są dziur, a podłoga
            skrzypi przy każdym kroku. Jeśli chcesz tu żyć, musisz coś z tym zrobić.
          </p>
          <p style={{ ...textStyle, color: "rgba(247,240,221,0.5)", marginTop: 12 }}>
            Może eksploracja okolicy pozwoli znaleźć materiały do naprawy?
          </p>
        </div>
      </div>
    );
  }

  // EXPLORATION_DONE / STUDY_DONE / SPELL_EQUIPPED: gracz wie już że jest czarodziejem,
  // ale SPELL_EQUIPPED to moment gdy lista zadań powinna się pojawić
  if (step === "EXPLORATION_DONE" || step === "STUDY_DONE") {
    return (
      <div style={containerStyle}>
        <h1 style={titleStyle}>Zniszczony Dom</h1>
        <div style={cardStyle}>
          <p style={textStyle}>
            Twój dom nadal czeka na naprawę... ale może najpierw warto rozwinąć swoje magiczne
            umiejętności?
          </p>
        </div>
      </div>
    );
  }

  // SPELL_EQUIPPED, TOWER_READY: pokazujemy listę zadań
  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>Zniszczony Dom</h1>

      {isTowerReady && allDone && (
        <div style={{
          ...cardStyle,
          borderColor: "rgba(245,196,81,0.5)",
          background: "rgba(245,196,81,0.07)",
          marginBottom: 24,
          textAlign: "center",
        }}>
          <p style={{ ...textStyle, marginBottom: 20 }}>
            Wszystkie prace ukończone! Twoja wieża stoi dumnie i czeka na Ciebie.
          </p>
          <button
            onClick={completeTutorial}
            disabled={actionLoading === "complete"}
            style={primaryBtnStyle}
          >
            {actionLoading === "complete" ? "Przenoszenie..." : "✦ Podziwiaj swoje dzieło"}
          </button>
        </div>
      )}

      {error && (
        <div style={{ color: "#F46A4E", marginBottom: 16, fontSize: 13 }}>{error}</div>
      )}

      {loading ? (
        <p style={{ color: "rgba(247,240,221,0.4)" }}>Ładowanie zadań...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tasks.map(task => {
            const isActive = actionLoading === task.taskCode;
            const isInProgress = task.status === "in_progress";
            const canClaim = isInProgress && task.finishesAt && new Date(task.finishesAt) <= new Date();

            return (
              <div
                key={task.taskCode}
                style={{
                  ...cardStyle,
                  opacity: task.status === "locked" ? 0.5 : 1,
                  borderColor: task.status === "available"
                    ? "rgba(89,212,208,0.35)"
                    : "rgba(245,196,81,0.12)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{
                    fontFamily: "Cinzel, serif",
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#F7F0DD",
                  }}>
                    {task.name}
                  </span>
                  <span style={{ fontSize: 12, color: STATUS_COLOR[task.status] }}>
                    {STATUS_LABEL[task.status]}
                  </span>
                </div>

                <div style={{ fontSize: 12, color: "rgba(247,240,221,0.45)", marginBottom: 10 }}>
                  Czas trwania: {Math.round(task.durationSeconds / 60)} min
                </div>

                {/* Wymagania niespełnione */}
                {task.unmetReqs.length > 0 && task.status === "available" && (
                  <div style={{ fontSize: 12, color: "#F46A4E", marginBottom: 10 }}>
                    Wymagania: {task.unmetReqs.join(", ")} — odwiedź Trening!
                  </div>
                )}

                {/* Pasek postępu dla in_progress */}
                {isInProgress && task.finishesAt && task.startedAt && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{
                      height: 4,
                      background: "rgba(247,240,221,0.1)",
                      borderRadius: 2,
                      overflow: "hidden",
                      marginBottom: 6,
                    }}>
                      <div style={{
                        height: "100%",
                        background: "linear-gradient(90deg, #F5C451, #59D4D0)",
                        borderRadius: 2,
                        width: `${Math.min(100, Math.round(
                          (Date.now() - new Date(task.startedAt).getTime()) /
                          (new Date(task.finishesAt).getTime() - new Date(task.startedAt).getTime()) * 100
                        ))}%`,
                        transition: "width 1s linear",
                      }} />
                    </div>
                    {!canClaim && (
                      <span style={{ fontSize: 12, color: "#F5C451" }}>
                        Pozostało: {formatCountdown(task.finishesAt)}
                      </span>
                    )}
                  </div>
                )}

                {/* Przyciski akcji */}
                {task.status === "available" && task.canStart && (
                  <button
                    onClick={() => startTask(task.taskCode)}
                    disabled={isActive}
                    style={secondaryBtnStyle}
                  >
                    {isActive ? "Uruchamianie..." : "Rozpocznij"}
                  </button>
                )}

                {canClaim && (
                  <button
                    onClick={() => claimTask(task.taskCode)}
                    disabled={isActive}
                    style={primaryBtnStyle}
                  >
                    {isActive ? "Odbieranie..." : "✦ Odbierz"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── STYLE ─────────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  maxWidth: 640,
  margin: "0 auto",
};

const titleStyle: React.CSSProperties = {
  fontFamily: "Cinzel, serif",
  fontSize: 26,
  fontWeight: 700,
  color: "#F5C451",
  marginBottom: 24,
  letterSpacing: "0.04em",
};

const cardStyle: React.CSSProperties = {
  background: "#372b5d",
  border: "1px solid rgba(245,196,81,0.12)",
  borderRadius: 10,
  padding: "20px 24px",
};

const textStyle: React.CSSProperties = {
  fontFamily: "Inter, sans-serif",
  fontSize: 14,
  lineHeight: 1.7,
  color: "#F7F0DD",
  margin: 0,
};

const primaryBtnStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #F5C451, #d4a93a)",
  border: "none",
  borderRadius: 7,
  color: "#161d38",
  fontFamily: "Cinzel, serif",
  fontWeight: 700,
  fontSize: 13,
  padding: "9px 24px",
  cursor: "pointer",
  letterSpacing: "0.04em",
};

const secondaryBtnStyle: React.CSSProperties = {
  background: "rgba(89,212,208,0.12)",
  border: "1px solid rgba(89,212,208,0.35)",
  borderRadius: 7,
  color: "#59D4D0",
  fontFamily: "Inter, sans-serif",
  fontWeight: 600,
  fontSize: 13,
  padding: "9px 24px",
  cursor: "pointer",
};