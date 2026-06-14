import { useEffect, useState } from "react";
import api from "../api/client";

const STUDY_LEVELS = [
  { level: 1, name: "Chaotyczne machanie rękoma",   duration: "1 min",  points: "1–4 pkt",    chance: "20%" },
  { level: 2, name: "Opanowane ruchy dłońmi",       duration: "2 min",  points: "5–10 pkt",   chance: "30%" },
  { level: 3, name: "Skupiona inkantacja",           duration: "3 min",  points: "11–22 pkt",  chance: "40%" },
  { level: 4, name: "Podstawowa inkantacja",         duration: "4 min",  points: "23–50 pkt",  chance: "40%" },
  { level: 5, name: "Zaawansowana inkantacja",       duration: "5 min",  points: "51–100 pkt", chance: "50%" },
];

interface Props {
  studyActions: number;
  studyActionsMax: number;
  activeActions: any[];
  onRefresh: () => void;
}


export default function StudyPanel({ studyActions, studyActionsMax, activeActions, onRefresh }: Props) {
  const [loading, setLoading] = useState<number | null>(null);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [report, setReport] = useState<any>(null);

  const activeStudy = activeActions.find(a => a.actionType === "study" && a.status === "in_progress");
  const completedStudy = activeActions.find(a => a.actionType === "study" && a.status === "completed");

  async function startStudy(level: number) {
    setLoading(level);
    try {
      await api.post("/actions/study/start", { level });
      onRefresh();
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
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd");
    } finally {
      setClaiming(null);
    }
  }

function TimeLeft({ finishesAt }: { finishesAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = new Date(finishesAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Gotowe!");
        clearInterval(interval);
        setTimeout(() => onRefresh(), 500);
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${m}:${s.toString().padStart(2, "0")}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [finishesAt]);

  return <span className="font-mono text-sm font-semibold text-gray-900">{timeLeft}</span>;
}

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-gray-900">Szalone studia</h2>
        <span className="text-sm text-gray-500">
          Akcje: <span className="font-semibold text-gray-900">{studyActions}/{studyActionsMax}</span>
        </span>
      </div>

      {/* Aktywna akcja */}
      {activeStudy && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-blue-900">Trwa nauka...</p>
            <p className="text-xs text-blue-600 mt-0.5">Poziom {activeStudy.actionLevel}</p>
          </div>
          <TimeLeft finishesAt={activeStudy.finishesAt} />
        </div>
      )}

      {/* Gotowa do odebrania */}
      {completedStudy && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex justify-between items-center">
          <p className="text-sm font-medium text-green-900">Nauka zakończona! Odbierz wynik.</p>
          <button
            onClick={() => claimStudy(completedStudy.id)}
            disabled={claiming === completedStudy.id}
            className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {claiming === completedStudy.id ? "..." : "Odbierz"}
          </button>
        </div>
      )}

      {/* Raport */}
      {report && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm font-medium text-gray-900 mb-1">Wynik nauki:</p>
          <p className="text-sm text-gray-700">{report.message}</p>
          <button onClick={() => setReport(null)} className="text-xs text-gray-400 mt-2 hover:text-gray-600">
            Zamknij
          </button>
        </div>
      )}

      {/* Lista poziomów */}
      {!activeStudy && !completedStudy && (
        <div className="space-y-2">
          {STUDY_LEVELS.map(lvl => (
            <div key={lvl.level} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-900">{lvl.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {lvl.duration} · {lvl.points} · {lvl.chance} na czar
                </p>
              </div>
              <button
                onClick={() => startStudy(lvl.level)}
                disabled={studyActions <= 0 || loading === lvl.level}
                className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading === lvl.level ? "..." : "Ucz się"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}