// src/pages/ReportPage.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";
import { DuelReport } from "../components/DuelReport";
import { TournamentReport } from "../components/TournamentReport";
import { StudyReport } from "../components/StudyReport";
import { ExplorationReport } from "../components/ExplorationReport";
import { RiftReport } from "../components/RiftReport";

const COLORS = {
  bg: "#161d38", panel: "#372b5d", gold: "#F5C451",
  text: "#F7F0DD", textFaint: "rgba(247,240,221,0.35)", red: "#F46A4E",
  border: "rgba(245,196,81,0.12)",
};

function renderReportComponent(type: string, payload: any, viewerCharacterId: number) {
  switch (type) {
    case "duel":
      return <DuelReport result={payload} viewerCharacterId={viewerCharacterId} />;
    case "tournament":
      return <TournamentReport result={payload} viewerCharacterId={viewerCharacterId} />;
    case "study":
      return <StudyReport payload={payload} viewerCharacterId={viewerCharacterId} />;
    case "exploration":
      return <ExplorationReport payload={payload} viewerCharacterId={viewerCharacterId} />;
    case "rift_unstable":
      return <RiftReport payload={payload} viewerCharacterId={viewerCharacterId} />;
    default:
      return (
        <div>
          <p style={{ color: COLORS.text, fontSize: 13 }}>
            Typ raportu: <strong>{type}</strong>
          </p>
          <pre style={{ color: COLORS.textFaint, fontSize: 11, overflow: "auto" }}>
            {JSON.stringify(payload, null, 2)}
          </pre>
        </div>
      );
  }
}

export default function ReportPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) return;
    api.get(`/reports/${reportId}`)
      .then(r => setReport(r.data))
      .catch(e => setError(e.response?.data?.error ?? "Błąd ładowania raportu"))
      .finally(() => setLoading(false));
  }, [reportId]);

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px" }}>
      <button
        onClick={() => navigate(-1)}
        style={{ background: "none", border: "none", color: COLORS.textFaint, cursor: "pointer", fontSize: 13, marginBottom: 16, padding: 0 }}
      >
        ← Wróć
      </button>

      {loading && <p style={{ color: COLORS.textFaint }}>Ładowanie...</p>}
      {error && <p style={{ color: COLORS.red }}>{error}</p>}

      {report && (
        <div style={{
          background: COLORS.panel, borderRadius: 12,
          border: `1px solid ${COLORS.border}`, padding: 24,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <p style={{ fontSize: 11, color: COLORS.textFaint, margin: 0 }}>
              {new Date(report.createdAt).toLocaleString("pl-PL")}
            </p>
          </div>

          {renderReportComponent(report.type, report.payload, report.viewerCharacterId)}
        </div>
      )}
    </div>
  );
}