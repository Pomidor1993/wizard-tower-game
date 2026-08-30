import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../api/client";
import { DuelReport } from "../components/DuelReport";
import { TournamentReport } from "../components/TournamentReport";
import { StudyReport } from "../components/StudyReport";
import { ExplorationReport } from "../components/ExplorationReport";
import { RiftReport } from "../components/RiftReport";

const COLORS = {
  bg:        "#161d38",
  panel:     "#372b5d",
  panelAlt:  "rgba(0,0,0,0.15)",
  border:    "rgba(245,196,81,0.12)",
  borderSoft:"rgba(247,240,221,0.08)",
  gold:      "#F5C451",
  teal:      "#59D4D0",
  red:       "#F46A4E",
  purple:    "#A78BFA",
  text:      "#F7F0DD",
  textDim:   "rgba(247,240,221,0.55)",
  textFaint: "rgba(247,240,221,0.35)",
  textGhost: "rgba(247,240,221,0.2)",
};

type ViewKey = "all" | "saved" | "private" | "reports";

const VIEWS: { key: ViewKey; label: string; icon: string }[] = [
  { key: "all",     label: "Ogólne",             icon: "✦" },
  { key: "reports", label: "Raporty",            icon: "📋" },
  { key: "private", label: "Magiczne ploteczki", icon: "✉" },
  { key: "saved",   label: "Zapisane",           icon: "📌" },
];

interface SystemMessage {
  id: number;
  type: "random" | "levelup" | "tutorial" | "school" | "rift" | "study";
  title: string | null;
  content: string;
  isRead: boolean;
  isSaved: boolean;
  createdAt: string;
}

interface ConversationSummary {
  conversationId: number;
  otherCharacter: { id: number; name: string; level: number };
  lastMessage: { id: number; content: string; senderId: number; createdAt: string } | null;
  lastMessageAt: string;
  unreadCount: number;
}

function Panel({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: COLORS.panel, borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: 20, ...style }}>
      {children}
    </div>
  );
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// pkt 4: "school" → "Magiczne wieści"; "tutorial" pozostaje dla wiadomości tutorialowych
const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  random:   { label: "Magia",   color: COLORS.purple },
  rift:     { label: "Magia",   color: COLORS.purple },
  levelup:  { label: "Poziom",  color: COLORS.gold },
  tutorial: { label: "Tutorial", color: COLORS.teal },
  school:   { label: "Szkoła",  color: "#4ade80" },
  study:    { label: "Studia",  color: "#e09a01" },
};

const REPORT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  study:         { label: "Studia",       color: "#e09a01" },
  exploration:   { label: "Eksploracja",  color: "#59D4D0" },
  duel:          { label: "Pojedynek",    color: "#F46A4E" },
  tournament:    { label: "Turniej",      color: "#A78BFA" },
  rift_unstable: { label: "Szczelina",   color: "#F5C451" },
  rift_stable:   { label: "Sz. Stabilna",color: "#4ade80" },
};

function renderReportContent(type: string, payload: any, viewerCharacterId: number) {
  switch (type) {
    case "duel":        return <DuelReport result={payload} viewerCharacterId={viewerCharacterId} />;
    case "tournament":  return <TournamentReport result={payload} viewerCharacterId={viewerCharacterId} />;
    case "study":       return <StudyReport payload={payload} viewerCharacterId={viewerCharacterId} />;
    case "exploration": return <ExplorationReport payload={payload} viewerCharacterId={viewerCharacterId} />;
    case "rift_unstable":        return <RiftReport payload={payload} viewerCharacterId={viewerCharacterId} />;
    default: return <p style={{ fontSize: 12, color: COLORS.textFaint }}>Brak podglądu dla tego typu raportu.</p>;
  }
}

function ReportsView() {
  const [reports, setReports] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [expandedPayload, setExpandedPayload] = useState<any>(null);
  const [expandedType, setExpandedType] = useState<string>("");
  const [viewerCharacterId, setViewerCharacterId] = useState<number | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const fetchReports = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await api.get("/reports", { params: { page: p, pageSize: 20 } });
      setReports(res.data.reports);
      setTotalPages(res.data.totalPages);
      if (res.data.reports[0]?.payload?.viewerCharacterId) {
        setViewerCharacterId(res.data.reports[0].payload.viewerCharacterId);
      }
    } catch { /* ciche */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchReports(page); }, [page, fetchReports]);

  async function toggleExpand(report: any) {
    if (expanded === report.id) { setExpanded(null); return; }

    // Fetch full payload on expand
    try {
      const res = await api.get(`/reports/${report.id}`);
      setExpandedPayload(res.data.payload);
      setExpandedType(res.data.type);
      setViewerCharacterId(res.data.viewerCharacterId);
      setExpanded(report.id);
      // Mark as read in local list
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, isRead: true } : r));
    } catch { /* ciche */ }
  }

  function copyLink(reportId: number) {
    const url = `${window.location.origin}/reports/${reportId}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  return (
    <Panel>
      {loading && <p style={{ color: COLORS.textFaint, fontSize: 13, textAlign: "center", padding: "20px 0" }}>Ładowanie...</p>}
      {!loading && reports.length === 0 && (
        <p style={{ color: COLORS.textGhost, fontSize: 13, textAlign: "center", padding: "20px 0", fontStyle: "italic" }}>
          Brak raportów. Rozpocznij akcję, aby zobaczyć wyniki tutaj.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {reports.map(report => {
          const isOpen = expanded === report.id;
          const typeInfo = REPORT_TYPE_LABELS[report.type] ?? { label: report.type, color: COLORS.textFaint };

          return (
            <div key={report.id}>
              <div
                onClick={() => toggleExpand(report)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px", borderRadius: 10,
                  border: `1px solid ${COLORS.borderSoft}`,
                  background: report.isRead ? COLORS.panelAlt : "rgba(245,196,81,0.06)",
                  cursor: "pointer", transition: "background 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                onMouseLeave={e => (e.currentTarget.style.background = report.isRead ? COLORS.panelAlt : "rgba(245,196,81,0.06)")}
              >
                {!report.isRead && (
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.red, flexShrink: 0 }} />
                )}
                <span style={{
                  fontSize: 9, padding: "2px 6px", borderRadius: 4, fontWeight: 700,
                  fontFamily: "Cinzel, serif", letterSpacing: "0.06em", flexShrink: 0,
                  background: `${typeInfo.color}22`, color: typeInfo.color,
                  border: `1px solid ${typeInfo.color}44`,
                }}>
                  {typeInfo.label}
                </span>
<div style={{ flex: 1, minWidth: 0 }}>
  <p style={{
    fontSize: 13, color: COLORS.text, margin: 0,
    fontWeight: report.isRead ? 400 : 600,
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  }}>
    {report.preview}
  </p>
</div>
<span style={{ fontSize: 11, color: COLORS.textFaint, flexShrink: 0 }}>
  {formatDateTime(report.createdAt)}
</span>
<span style={{
  color: COLORS.textGhost, fontSize: 11, flexShrink: 0,
  display: "inline-block", transition: "transform 0.15s",
  transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
}}>▶</span>
              </div>

              {isOpen && expandedPayload && (
                <div style={{
                  marginTop: 6, padding: "16px 14px", borderRadius: 10,
                  background: "rgba(0,0,0,0.15)", border: `1px solid ${COLORS.borderSoft}`,
                }}>
                  {renderReportContent(expandedType, expandedPayload, viewerCharacterId ?? 0)}

                  <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${COLORS.borderSoft}`, display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => copyLink(report.id)}
                      style={{
                        padding: "6px 14px", borderRadius: 6,
                        border: `1px solid ${COLORS.borderSoft}`, background: "transparent",
                        color: linkCopied ? COLORS.teal : COLORS.textFaint,
                        fontSize: 11, cursor: "pointer", fontFamily: "Cinzel, serif",
                      }}
                    >
                      {linkCopied ? "✓ Skopiowano link" : "🔗 Wygeneruj link zewnętrzny"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!loading && totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 16 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={pagerButtonStyle(page <= 1)}>← Poprzednia</button>
          <span style={{ fontSize: 12, color: COLORS.textDim }}>{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={pagerButtonStyle(page >= totalPages)}>Następna →</button>
        </div>
      )}
    </Panel>
  );
}

// ── PARSER LINKÓW W TREŚCI WIADOMOŚCI ────────────────────────────────────────
// [PROFIL:id:nazwa]  → klikalny nick → /profile/:id
// [DOŁĄCZ:schoolId] → przycisk dołączenia do szkoły

function renderContent(
  content: string,
  navigate: ReturnType<typeof useNavigate>,
  onJoinSchool?: (schoolId: number) => void
): React.ReactNode {
  const parts = content.split(/(\[PROFIL:\d+:[^\]]+\]|\[DOŁĄCZ:\d+\])/g);

  return parts.map((part, i) => {
    const profileMatch = part.match(/^\[PROFIL:(\d+):([^\]]+)\]$/);
    if (profileMatch) {
      const charId   = parseInt(profileMatch[1], 10);
      const charName = profileMatch[2];
      return (
        <span key={i} onClick={() => navigate(`/profile/${charId}`)}
          style={{ color: COLORS.gold, cursor: "pointer", fontWeight: 600, textDecoration: "underline" }}>
          {charName}
        </span>
      );
    }

    const joinMatch = part.match(/^\[DOŁĄCZ:(\d+)\]$/);
    if (joinMatch) {
      const schoolId = parseInt(joinMatch[1], 10);
      return (
        <button key={i} onClick={() => onJoinSchool?.(schoolId)}
          style={{ display: "inline-block", padding: "4px 12px", borderRadius: 6, border: `1px solid ${COLORS.teal}`, background: "rgba(89,212,208,0.1)", color: COLORS.teal, fontSize: 12, fontFamily: "Cinzel, serif", fontWeight: 600, cursor: "pointer", marginLeft: 6 }}>
          Dołącz do szkoły →
        </button>
      );
    }

    return <span key={i}>{part}</span>;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GŁÓWNY KOMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function Messages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationParam = searchParams.get("conversation");
  const tabParam = searchParams.get("tab");

  // Ustaw widok na podstawie parametrów URL
  const initialView: ViewKey = tabParam === "reports" ? "reports" : conversationParam ? "private" : "all";
  const [view, setView] = useState<ViewKey>(initialView);
  const [openConversationId, setOpenConversationId] = useState<number | null>(
    conversationParam && !tabParam ? parseInt(conversationParam, 10) : null
  );

  function selectView(key: ViewKey) {
    setView(key);
    if (key !== "private") setOpenConversationId(null);
    setSearchParams({}); // czyści parametry po zmianie zakładki
  }

  return (
    <div>
      <h1 style={{ fontFamily: "Cinzel, serif", color: COLORS.gold, fontSize: 22, marginBottom: 24, letterSpacing: "0.06em" }}>
        Wiadomości
      </h1>

      <Panel style={{ marginBottom: 20, padding: 14 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {VIEWS.map(v => {
            const active = v.key === view;
            return (
              <button key={v.key} onClick={() => selectView(v.key)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 8, border: active ? "1px solid rgba(245,196,81,0.5)" : "1px solid rgba(247,240,221,0.1)", background: active ? "rgba(245,196,81,0.12)" : "transparent", color: active ? COLORS.gold : COLORS.textDim, fontFamily: "Cinzel, serif", fontSize: 12, fontWeight: active ? 700 : 500, letterSpacing: "0.04em", cursor: "pointer", transition: "all 0.15s" }}>
                <span>{v.icon}</span>{v.label}
              </button>
            );
          })}
        </div>
      </Panel>

      {/* WARUNEK RENDEROWANIA – dodano obsługę "reports" */}
      {view === "reports" ? (
        <ReportsView />
      ) : view === "private" ? (
        <PrivateMessagesView initialConversationId={openConversationId} onConversationOpened={() => setSearchParams({})} />
      ) : (
        <SystemMessagesView savedOnly={view === "saved"} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// WIDOK: WIADOMOŚCI SYSTEMOWE
// ═══════════════════════════════════════════════════════════════════════════

const PAGE_SIZE = 20;

function SystemMessagesView({ savedOnly }: { savedOnly: boolean }) {
  const navigate = useNavigate();
  const [messages, setMessages]   = useState<SystemMessage[]>([]);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [expanded, setExpanded]   = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy]   = useState(false);
  const [joinBusy, setJoinBusy]   = useState(false);

  const fetchMessages = useCallback(async (pageToLoad: number) => {
    setLoading(true); setError(null);
    try {
      const params: Record<string, any> = { page: pageToLoad, pageSize: PAGE_SIZE };
      if (savedOnly) params.savedOnly = true;
      const res = await api.get("/messages/system", { params });
      setMessages(res.data.messages);
      setTotalPages(res.data.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Błąd ładowania wiadomości");
    } finally { setLoading(false); }
  }, [savedOnly]);

  useEffect(() => { setPage(1); setSelectedIds(new Set()); }, [savedOnly]);
  useEffect(() => { fetchMessages(page); }, [page, fetchMessages]);
  useEffect(() => { setSelectedIds(new Set()); }, [page]);

  // pkt 3: po dołączeniu do szkoły przekieruj na /school
  async function handleJoinSchool(schoolId: number) {
    if (joinBusy) return;
    setJoinBusy(true);
    try {
      await api.post(`/schools/${schoolId}/accept-invite`);
      navigate("/school");
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd dołączania do szkoły.");
      setJoinBusy(false);
    }
  }

  async function markRead(id: number) {
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, isRead: true } : m)));
    try { await api.patch(`/messages/system/${id}/read`); } catch { /* ciche */ }
  }

  async function markUnread(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, isRead: false } : m)));
    try { await api.patch(`/messages/system/${id}/unread`); } catch { /* ciche */ }
  }

  function toggleExpand(id: number, isRead: boolean) {
    setExpanded(prev => (prev === id ? null : id));
    if (!isRead) markRead(id);
  }

  function toggleSelect(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  function toggleSelectAll() {
    setSelectedIds(prev => (prev.size === messages.length ? new Set() : new Set(messages.map(m => m.id))));
  }

  async function bulkSave(isSaved: boolean) {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map(id => api.patch(`/messages/system/${id}/save`, { isSaved })));
if (isSaved && !savedOnly) {
        // Zapisane znikają z zakładki ogólnej
        setMessages(prev => prev.filter(m => !selectedIds.has(m.id)));
      } else if (!isSaved && savedOnly) {
        // Odpięte znikają z zakładki zapisanych
        setMessages(prev => prev.filter(m => !selectedIds.has(m.id)));
      } else {
        setMessages(prev => prev.map(m => (selectedIds.has(m.id) ? { ...m, isSaved } : m)));
      }
      setSelectedIds(new Set());
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd zbiorczego zapisu");
    } finally { setBulkBusy(false); }
  }


  async function bulkMarkRead() {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map(id => api.patch(`/messages/system/${id}/read`)));
      setMessages(prev => prev.map(m => selectedIds.has(m.id) ? { ...m, isRead: true } : m));
      setSelectedIds(new Set());
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd zbiorczego oznaczania");
    } finally { setBulkBusy(false); }
  }

  async function bulkMarkUnread() {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map(id => api.patch(`/messages/system/${id}/unread`)));
      setMessages(prev => prev.map(m => selectedIds.has(m.id) ? { ...m, isRead: false } : m));
      setSelectedIds(new Set());
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd zbiorczego oznaczania");
    } finally { setBulkBusy(false); }
  }

  async function bulkDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Usunąć ${selectedIds.size} wiadomości? Tej operacji nie można cofnąć.`)) return;
    setBulkBusy(true);
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map(id => api.delete(`/messages/system/${id}`)));
      setMessages(prev => prev.filter(m => !selectedIds.has(m.id)));
      setSelectedIds(new Set());
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd zbiorczego usuwania");
    } finally { setBulkBusy(false); }
  }

  const allSelected = messages.length > 0 && selectedIds.size === messages.length;

  return (
    <Panel>
      {messages.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, padding: "8px 4px", borderBottom: `1px solid ${COLORS.borderSoft}` }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: COLORS.textDim }}>
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} style={{ cursor: "pointer" }} />
            Zaznacz wszystkie
          </label>
          {selectedIds.size > 0 && (
            <>
              <span style={{ fontSize: 11, color: COLORS.textFaint }}>{selectedIds.size} zaznaczonych</span>
<div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                {!savedOnly && <button onClick={() => bulkSave(true)} disabled={bulkBusy} style={miniButtonStyle}>Zapisz zaznaczone</button>}
                {savedOnly  && <button onClick={() => bulkSave(false)} disabled={bulkBusy} style={miniButtonStyle}>Odepnij zapis</button>}
                <button onClick={bulkMarkRead} disabled={bulkBusy} style={miniButtonStyle}>Oznacz jako przeczytane</button>
                <button onClick={bulkMarkUnread} disabled={bulkBusy} style={miniButtonStyle}>Oznacz jako nieprzeczytane</button>
                <button onClick={bulkDelete} disabled={bulkBusy} style={{ ...miniButtonStyle, color: COLORS.red, borderColor: "rgba(244,106,78,0.3)" }}>Usuń zaznaczone</button>
              </div>
            </>
          )}
        </div>
      )}

      {loading  && <p style={{ color: COLORS.textFaint, fontSize: 13, padding: "20px 0", textAlign: "center" }}>Ładowanie...</p>}
      {error    && <p style={{ color: COLORS.red,       fontSize: 13, padding: "20px 0", textAlign: "center" }}>{error}</p>}
      {!loading && !error && messages.length === 0 && (
        <p style={{ color: COLORS.textGhost, fontSize: 13, padding: "20px 0", textAlign: "center", fontStyle: "italic" }}>
          {savedOnly ? "Brak zapisanych wiadomości." : "Brak wiadomości."}
        </p>
      )}

      {!loading && !error && messages.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {messages.map(msg => {
            const isOpen     = expanded === msg.id;
            const typeInfo   = TYPE_LABELS[msg.type] ?? { label: msg.type, color: COLORS.textFaint };
            const isSelected = selectedIds.has(msg.id);
            return (
              <div key={msg.id}>
                <div onClick={() => toggleExpand(msg.id, msg.isRead)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, border: isSelected ? `1px solid ${COLORS.teal}` : `1px solid ${COLORS.borderSoft}`, background: isSelected ? "rgba(89,212,208,0.08)" : msg.isRead ? COLORS.panelAlt : "rgba(245,196,81,0.06)", cursor: "pointer", transition: "background 0.15s" }}>
                  <input type="checkbox" checked={isSelected} onClick={e => toggleSelect(msg.id, e)} onChange={() => {}} style={{ cursor: "pointer", flexShrink: 0 }} />
                  {!msg.isRead && <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.red, flexShrink: 0 }} />}
                  <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, fontWeight: 700, fontFamily: "Cinzel, serif", letterSpacing: "0.06em", background: `${typeInfo.color}22`, color: typeInfo.color, border: `1px solid ${typeInfo.color}44`, flexShrink: 0 }}>
                    {typeInfo.label}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: COLORS.text, margin: 0, fontWeight: msg.isRead ? 400 : 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {msg.title ?? msg.content}
                    </p>
                    <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "2px 0 0" }}>{formatDateTime(msg.createdAt)}</p>
                  </div>
                  {msg.isSaved && <span style={{ color: COLORS.gold, fontSize: 13, flexShrink: 0 }}>📌</span>}
                  <span style={{ color: COLORS.textGhost, fontSize: 11, flexShrink: 0, transition: "transform 0.15s", display: "inline-block", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                </div>

                {isOpen && (
                  <div style={{ marginTop: 6, padding: "12px 14px", borderRadius: 10, background: "rgba(0,0,0,0.15)", border: `1px solid ${COLORS.borderSoft}` }}>
                    <p style={{ fontSize: 13, color: COLORS.textDim, margin: "0 0 12px", lineHeight: 1.7 }}>
                      {renderContent(msg.content, navigate, handleJoinSchool)}
                    </p>
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                      {!msg.isSaved && (
                        <p style={{ fontSize: 10, color: COLORS.textGhost, margin: 0, fontStyle: "italic" }}>
                          Niezapisane wiadomości znikają po 30 dniach.
                        </p>
                      )}
<div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                        {msg.isRead ? (
                          <button onClick={(e) => markUnread(msg.id, e)}
                            style={{ ...miniButtonStyle, fontSize: 10 }}>
                            Oznacz jako nieprzeczytane
                          </button>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); markRead(msg.id); }}
                            style={{ ...miniButtonStyle, fontSize: 10 }}>
                            Oznacz jako przeczytane
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 16 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={pagerButtonStyle(page <= 1)}>← Poprzednia</button>
          <span style={{ fontSize: 12, color: COLORS.textDim, minWidth: 90, textAlign: "center" }}>Strona {page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={pagerButtonStyle(page >= totalPages)}>Następna →</button>
        </div>
      )}
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// WIDOK: MAGICZNE PLOTECZKI
// ═══════════════════════════════════════════════════════════════════════════

function PrivateMessagesView({ initialConversationId, onConversationOpened }: {
  initialConversationId: number | null;
  onConversationOpened: () => void;
}) {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeOtherId, setActiveOtherId] = useState<number | null>(null);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get("/messages/private"); setConversations(res.data); }
    catch { /* ciche */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    if (initialConversationId === null || loading) return;
    const existing = conversations.find(c => c.conversationId === initialConversationId);
    setActiveOtherId(existing ? existing.otherCharacter.id : initialConversationId);
    onConversationOpened();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConversationId, loading]);

  if (activeOtherId !== null) {
    return (
      <ConversationView
        otherCharacterId={activeOtherId}
        onBack={() => { setActiveOtherId(null); fetchConversations(); }}
        onProfileClick={() => navigate(`/profile/${activeOtherId}`)}
      />
    );
  }

  return (
    <Panel style={{ padding: 0, overflow: "hidden" }}>
      {loading && <p style={{ color: COLORS.textFaint, fontSize: 13, padding: "24px 0", textAlign: "center" }}>Ładowanie...</p>}
      {!loading && conversations.length === 0 && (
        <p style={{ color: COLORS.textGhost, fontSize: 13, padding: "24px 0", textAlign: "center", fontStyle: "italic" }}>
          Brak rozmów. Odwiedź profil innego gracza, aby wysłać pierwszą wiadomość.
        </p>
      )}
      {!loading && conversations.map((c, i) => (
        <div key={c.conversationId} onClick={() => setActiveOtherId(c.otherCharacter.id)}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderTop: i === 0 ? "none" : `1px solid ${COLORS.borderSoft}`, cursor: "pointer", transition: "background 0.15s", background: c.unreadCount > 0 ? "rgba(245,196,81,0.05)" : "transparent" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
          onMouseLeave={e => (e.currentTarget.style.background = c.unreadCount > 0 ? "rgba(245,196,81,0.05)" : "transparent")}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: COLORS.bg, background: "linear-gradient(135deg, #F5C451, #F46A4E)" }}>
            {c.otherCharacter.name[0]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{c.otherCharacter.name}</span>
              <span style={{ fontSize: 10, color: COLORS.textFaint }}>poz. {c.otherCharacter.level}</span>
              {c.unreadCount > 0 && <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10, background: COLORS.red, color: COLORS.text, fontWeight: 700 }}>{c.unreadCount}</span>}
            </div>
            {c.lastMessage && (
              <p style={{ fontSize: 12, color: COLORS.textFaint, margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.lastMessage.content}
              </p>
            )}
          </div>
          <span style={{ fontSize: 11, color: COLORS.textGhost, flexShrink: 0 }}>{formatDateTime(c.lastMessageAt)}</span>
        </div>
      ))}
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// WIDOK: POJEDYNCZA KONWERSACJA
// ═══════════════════════════════════════════════════════════════════════════

interface PrivateMessageRow {
  id: number; senderId: number; content: string; createdAt: string;
}

function ConversationView({ otherCharacterId, onBack, onProfileClick }: {
  otherCharacterId: number; onBack: () => void; onProfileClick: () => void;
}) {
  const [messages, setMessages] = useState<PrivateMessageRow[]>([]);
  const [otherName, setOtherName] = useState<string>("");
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState("");
  const [sending, setSending]   = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get(`/messages/private/${otherCharacterId}`);
      setMessages(res.data.messages);
    } catch (err: any) {
      setSendError(err.response?.data?.error ?? "Błąd ładowania wiadomości");
    } finally { setLoading(false); }
  }, [otherCharacterId]);

  useEffect(() => { api.get(`/profile/${otherCharacterId}`).then(r => setOtherName(r.data.name)).catch(() => {}); }, [otherCharacterId]);
  useEffect(() => { fetchMessages(); }, [fetchMessages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true); setSendError(null);
    try {
      await api.post(`/messages/private/${otherCharacterId}`, { content: trimmed });
      setText(""); await fetchMessages();
    } catch (err: any) {
      setSendError(err.response?.data?.error ?? "Nie udało się wysłać wiadomości");
    } finally { setSending(false); }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <Panel style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", height: 560 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${COLORS.borderSoft}`, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.textDim, cursor: "pointer", fontSize: 13, padding: "4px 6px" }}>←</button>
        <span onClick={onProfileClick} style={{ fontSize: 14, fontWeight: 700, color: COLORS.gold, cursor: "pointer", fontFamily: "Cinzel, serif" }}>
          {otherName || "..."}
        </span>
        <button onClick={onProfileClick} style={{ ...miniButtonStyle, marginLeft: "auto" }}>Zobacz profil</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {loading && <p style={{ color: COLORS.textFaint, fontSize: 13, textAlign: "center" }}>Ładowanie...</p>}
        {!loading && messages.length === 0 && (
          <p style={{ color: COLORS.textGhost, fontSize: 13, textAlign: "center", fontStyle: "italic", marginTop: 40 }}>Brak wiadomości — napisz pierwszą!</p>
        )}
        {messages.map(msg => {
          const isMine = msg.senderId !== otherCharacterId;
          return (
            <div key={msg.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "70%", padding: "8px 12px", borderRadius: 12, background: isMine ? "rgba(89,212,208,0.15)" : COLORS.panelAlt, border: `1px solid ${isMine ? "rgba(89,212,208,0.3)" : COLORS.borderSoft}` }}>
                <p style={{ fontSize: 13, color: COLORS.text, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.content}</p>
                <p style={{ fontSize: 10, color: COLORS.textGhost, margin: "4px 0 0", textAlign: "right" }}>{formatDateTime(msg.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: 12, borderTop: `1px solid ${COLORS.borderSoft}`, flexShrink: 0 }}>
        {sendError && <p style={{ fontSize: 11, color: COLORS.red, margin: "0 0 6px" }}>{sendError}</p>}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea value={text} onChange={e => setText(e.target.value.slice(0, 1000))} onKeyDown={handleKeyDown} disabled={sending}
            placeholder="Napisz wiadomość... (Enter = wyślij, Shift+Enter = nowa linia)" rows={2}
            style={{ flex: 1, resize: "none", boxSizing: "border-box", background: COLORS.panelAlt, border: `1px solid ${COLORS.borderSoft}`, borderRadius: 8, padding: 10, color: COLORS.text, fontSize: 13, fontFamily: "Inter, sans-serif" }} />
          <button onClick={handleSend} disabled={sending || text.trim().length === 0} style={primaryButtonStyle(sending || text.trim().length === 0)}>
            {sending ? "..." : "Wyślij"}
          </button>
        </div>
        <p style={{ fontSize: 10, color: COLORS.textGhost, margin: "4px 0 0" }}>{text.length} / 1000</p>
      </div>
    </Panel>
  );
}

// ── STYLE WSPÓLNE ────────────────────────────────────────────────────────────

const miniButtonStyle: React.CSSProperties = {
  padding: "6px 12px", borderRadius: 6, border: `1px solid ${COLORS.borderSoft}`,
  background: "transparent", color: COLORS.textDim,
  fontSize: 11, cursor: "pointer", fontFamily: "Cinzel, serif", fontWeight: 600,
};

function pagerButtonStyle(disabled: boolean): React.CSSProperties {
  return { padding: "7px 14px", borderRadius: 6, border: `1px solid ${COLORS.borderSoft}`, background: "transparent", color: disabled ? COLORS.textGhost : COLORS.textDim, fontSize: 12, cursor: disabled ? "not-allowed" : "pointer" };
}

function primaryButtonStyle(disabled: boolean): React.CSSProperties {
  return { padding: "10px 18px", borderRadius: 8, border: "none", background: disabled ? "rgba(245,196,81,0.3)" : COLORS.gold, color: COLORS.bg, fontSize: 12, fontWeight: 700, fontFamily: "Cinzel, serif", cursor: disabled ? "not-allowed" : "pointer", flexShrink: 0 };
}
