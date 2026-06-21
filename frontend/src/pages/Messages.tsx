import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../api/client";

// ── PALETA ───────────────────────────────────────────────────────────────────
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

type ViewKey = "all" | "random" | "private" | "levelup" | "tutorial" | "saved";

const VIEWS: { key: ViewKey; label: string; icon: string }[] = [
  { key: "all",      label: "Wszystkie",  icon: "✦" },
  { key: "private",  label: "Prywatne",   icon: "✉" },
  { key: "random",   label: "Losowe",     icon: "☾" },
  { key: "levelup",  label: "Poziomy",    icon: "★" },
  { key: "tutorial", label: "Tutorial",   icon: "◈" },
  { key: "saved",    label: "Zapisane",   icon: "📌" },
];

interface SystemMessage {
  id: number;
  type: "random" | "levelup" | "tutorial";
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

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

const TYPE_LABELS: Record<SystemMessage["type"], { label: string; color: string }> = {
  random:   { label: "Losowe",   color: COLORS.purple },
  levelup:  { label: "Poziom",   color: COLORS.gold },
  tutorial: { label: "Tutorial", color: COLORS.teal },
};

// ═══════════════════════════════════════════════════════════════════════════
// GŁÓWNY KOMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function Messages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationParam = searchParams.get("conversation");

  const [view, setView] = useState<ViewKey>(conversationParam ? "private" : "all");
  const [openConversationId, setOpenConversationId] = useState<number | null>(
    conversationParam ? parseInt(conversationParam, 10) : null
  );

  function selectView(key: ViewKey) {
    setView(key);
    if (key !== "private") setOpenConversationId(null);
    setSearchParams({});
  }

  return (
    <div>
      <h1 style={{ fontFamily: "Cinzel, serif", color: COLORS.gold, fontSize: 22, marginBottom: 24, letterSpacing: "0.06em" }}>
        Wiadomości
      </h1>

      {/* ── PRZEŁĄCZNIK WIDOKÓW ── */}
      <Panel style={{ marginBottom: 20, padding: 14 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {VIEWS.map(v => {
            const active = v.key === view;
            return (
              <button
                key={v.key}
                onClick={() => selectView(v.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "9px 16px", borderRadius: 8,
                  border: active ? "1px solid rgba(245,196,81,0.5)" : "1px solid rgba(247,240,221,0.1)",
                  background: active ? "rgba(245,196,81,0.12)" : "transparent",
                  color: active ? COLORS.gold : COLORS.textDim,
                  fontFamily: "Cinzel, serif", fontSize: 12, fontWeight: active ? 700 : 500,
                  letterSpacing: "0.04em", cursor: "pointer", transition: "all 0.15s",
                }}
              >
                <span>{v.icon}</span>
                {v.label}
              </button>
            );
          })}
        </div>
      </Panel>

      {view === "private" ? (
        <PrivateMessagesView
          initialConversationId={openConversationId}
          onConversationOpened={() => setSearchParams({})}
        />
      ) : (
        <SystemMessagesView view={view} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// WIDOK: WIADOMOŚCI SYSTEMOWE (Wszystkie / Losowe / Poziomy / Tutorial / Zapisane)
// ═══════════════════════════════════════════════════════════════════════════

const PAGE_SIZE = 20;

function SystemMessagesView({ view }: { view: ViewKey }) {
  const [messages, setMessages] = useState<SystemMessage[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const fetchMessages = useCallback(async (pageToLoad: number) => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = { page: pageToLoad, pageSize: PAGE_SIZE };
      if (view === "saved") {
        params.savedOnly = true;
      } else if (view !== "all") {
        params.type = view;
      }
      const res = await api.get("/messages/system", { params });
      setMessages(res.data.messages);
      setTotalPages(res.data.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Błąd ładowania wiadomości");
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    setPage(1);
    fetchMessages(1);
  }, [fetchMessages]);

  useEffect(() => {
    fetchMessages(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function markRead(id: number) {
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, isRead: true } : m)));
    try {
      await api.patch(`/messages/system/${id}/read`);
    } catch {
      // ciche niepowodzenie — UI już zaktualizowany optymistycznie
    }
  }

  async function toggleSave(id: number, current: boolean) {
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, isSaved: !current } : m)));
    try {
      await api.patch(`/messages/system/${id}/save`, { isSaved: !current });
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd zapisu wiadomości");
      setMessages(prev => prev.map(m => (m.id === id ? { ...m, isSaved: current } : m)));
    }
  }

  async function deleteMessage(id: number) {
    try {
      await api.delete(`/messages/system/${id}`);
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd usuwania wiadomości");
    }
  }

  function toggleExpand(id: number, isRead: boolean) {
    setExpanded(prev => (prev === id ? null : id));
    if (!isRead) markRead(id);
  }

  return (
    <Panel>
      {loading && (
        <p style={{ color: COLORS.textFaint, fontSize: 13, padding: "20px 0", textAlign: "center" }}>Ładowanie...</p>
      )}
      {error && (
        <p style={{ color: COLORS.red, fontSize: 13, padding: "20px 0", textAlign: "center" }}>{error}</p>
      )}
      {!loading && !error && messages.length === 0 && (
        <p style={{ color: COLORS.textGhost, fontSize: 13, padding: "20px 0", textAlign: "center", fontStyle: "italic" }}>
          Brak wiadomości w tej kategorii.
        </p>
      )}

      {!loading && !error && messages.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {messages.map(msg => {
            const isOpen = expanded === msg.id;
            const typeInfo = TYPE_LABELS[msg.type];
            return (
              <div key={msg.id}>
                <div
                  onClick={() => toggleExpand(msg.id, msg.isRead)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px", borderRadius: 10,
                    border: `1px solid ${COLORS.borderSoft}`,
                    background: msg.isRead ? COLORS.panelAlt : "rgba(245,196,81,0.06)",
                    cursor: "pointer", transition: "background 0.15s",
                  }}
                >
                  {!msg.isRead && (
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.red, flexShrink: 0 }} />
                  )}
                  <span style={{
                    fontSize: 9, padding: "2px 6px", borderRadius: 4, fontWeight: 700,
                    fontFamily: "Cinzel, serif", letterSpacing: "0.06em",
                    background: `${typeInfo.color}22`, color: typeInfo.color,
                    border: `1px solid ${typeInfo.color}44`, flexShrink: 0,
                  }}>
                    {typeInfo.label}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, color: COLORS.text, margin: 0, fontWeight: msg.isRead ? 400 : 600,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {msg.title ?? msg.content}
                    </p>
                    <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "2px 0 0" }}>
                      {formatDateTime(msg.createdAt)}
                    </p>
                  </div>
                  {msg.isSaved && <span style={{ color: COLORS.gold, fontSize: 13, flexShrink: 0 }}>📌</span>}
                  <span style={{
                    color: COLORS.textGhost, fontSize: 11, flexShrink: 0,
                    transition: "transform 0.15s", display: "inline-block",
                    transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                  }}>▶</span>
                </div>

                {isOpen && (
                  <div style={{
                    marginTop: 6, padding: "12px 14px", borderRadius: 10,
                    background: "rgba(0,0,0,0.15)", border: `1px solid ${COLORS.borderSoft}`,
                  }}>
                    <p style={{ fontSize: 13, color: COLORS.textDim, margin: "0 0 12px", lineHeight: 1.5 }}>
                      {msg.content}
                    </p>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => toggleSave(msg.id, msg.isSaved)} style={miniButtonStyle}>
                        {msg.isSaved ? "Odepnij zapis" : "Zapisz wiadomość"}
                      </button>
                      <button onClick={() => deleteMessage(msg.id)} style={miniButtonStyle}>
                        Usuń
                      </button>
                    </div>
                    {!msg.isSaved && (
                      <p style={{ fontSize: 10, color: COLORS.textGhost, marginTop: 8, marginBottom: 0, fontStyle: "italic" }}>
                        Niezapisane wiadomości znikają automatycznie po 30 dniach.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 16 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={pagerButtonStyle(page <= 1)}>
            ← Poprzednia
          </button>
          <span style={{ fontSize: 12, color: COLORS.textDim, minWidth: 90, textAlign: "center" }}>
            Strona {page} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={pagerButtonStyle(page >= totalPages)}>
            Następna →
          </button>
        </div>
      )}
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// WIDOK: WIADOMOŚCI PRYWATNE (lista wątków + okno konwersacji)
// ═══════════════════════════════════════════════════════════════════════════

function PrivateMessagesView({
  initialConversationId,
  onConversationOpened,
}: {
  initialConversationId: number | null;
  onConversationOpened: () => void;
}) {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOtherId, setActiveOtherId] = useState<number | null>(null);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/messages/private");
      setConversations(res.data);
    } catch {
      // ciche niepowodzenie listy wątków
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Jeśli przyszliśmy z profilu z parametrem ?conversation=ID, otwórz od razu ten wątek.
  // initialConversationId to conversationId z linku — ale endpoint wątku przyjmuje ID
  // DRUGIEGO GRACZA, nie ID konwersacji, więc znajdujemy go po liście (gdy się załaduje)
  // lub, jeśli wątek jeszcze nie istnieje, traktujemy initialConversationId jako characterId.
  useEffect(() => {
    if (initialConversationId === null) return;
    if (loading) return;
    const existing = conversations.find(c => c.conversationId === initialConversationId);
    if (existing) {
      setActiveOtherId(existing.otherCharacter.id);
    } else {
      // Brak istniejącego wątku o tym ID konwersacji — prawdopodobnie to ID gracza
      // przekazane z profilu, z którym nie ma jeszcze żadnej wymiany wiadomości.
      setActiveOtherId(initialConversationId);
    }
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
      {loading && (
        <p style={{ color: COLORS.textFaint, fontSize: 13, padding: "24px 0", textAlign: "center" }}>Ładowanie...</p>
      )}
      {!loading && conversations.length === 0 && (
        <p style={{ color: COLORS.textGhost, fontSize: 13, padding: "24px 0", textAlign: "center", fontStyle: "italic" }}>
          Brak rozmów. Odwiedź profil innego gracza, aby wysłać pierwszą wiadomość.
        </p>
      )}
      {!loading && conversations.map((c, i) => (
        <div
          key={c.conversationId}
          onClick={() => setActiveOtherId(c.otherCharacter.id)}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "14px 16px",
            borderTop: i === 0 ? "none" : `1px solid ${COLORS.borderSoft}`,
            cursor: "pointer", transition: "background 0.15s",
            background: c.unreadCount > 0 ? "rgba(245,196,81,0.05)" : "transparent",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
          onMouseLeave={e => (e.currentTarget.style.background = c.unreadCount > 0 ? "rgba(245,196,81,0.05)" : "transparent")}
        >
          <div style={{
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 700, color: COLORS.bg,
            background: "linear-gradient(135deg, #F5C451, #F46A4E)",
          }}>
            {c.otherCharacter.name[0]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{c.otherCharacter.name}</span>
              <span style={{ fontSize: 10, color: COLORS.textFaint }}>poz. {c.otherCharacter.level}</span>
              {c.unreadCount > 0 && (
                <span style={{
                  fontSize: 10, padding: "1px 7px", borderRadius: 10,
                  background: COLORS.red, color: COLORS.text, fontWeight: 700,
                }}>
                  {c.unreadCount}
                </span>
              )}
            </div>
            {c.lastMessage && (
              <p style={{
                fontSize: 12, color: COLORS.textFaint, margin: "2px 0 0",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {c.lastMessage.content}
              </p>
            )}
          </div>
          <span style={{ fontSize: 11, color: COLORS.textGhost, flexShrink: 0 }}>
            {formatDateTime(c.lastMessageAt)}
          </span>
        </div>
      ))}
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// WIDOK: POJEDYNCZA KONWERSACJA
// ═══════════════════════════════════════════════════════════════════════════

interface PrivateMessageRow {
  id: number;
  senderId: number;
  content: string;
  createdAt: string;
  isSavedBySender: boolean;
  isSavedByReceiver: boolean;
}

function ConversationView({
  otherCharacterId,
  onBack,
  onProfileClick,
}: {
  otherCharacterId: number;
  onBack: () => void;
  onProfileClick: () => void;
}) {
  const [messages, setMessages] = useState<PrivateMessageRow[]>([]);
  const [otherName, setOtherName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get(`/messages/private/${otherCharacterId}`);
      setMessages(res.data.messages);
    } catch (err: any) {
      setSendError(err.response?.data?.error ?? "Błąd ładowania wiadomości");
    } finally {
      setLoading(false);
    }
  }, [otherCharacterId]);

  // Nazwa drugiego gracza — z profilu (publiczny endpoint), żeby działało
  // też dla zupełnie nowego wątku bez żadnych wiadomości jeszcze.
  useEffect(() => {
    api.get(`/profile/${otherCharacterId}`).then(r => setOtherName(r.data.name)).catch(() => {});
  }, [otherCharacterId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend() {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    setSending(true);
    setSendError(null);
    try {
      await api.post(`/messages/private/${otherCharacterId}`, { content: trimmed });
      setText("");
      await fetchMessages();
    } catch (err: any) {
      setSendError(err.response?.data?.error ?? "Nie udało się wysłać wiadomości");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <Panel style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", height: 560 }}>
      {/* Nagłówek konwersacji */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
        borderBottom: `1px solid ${COLORS.borderSoft}`, flexShrink: 0,
      }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.textDim, cursor: "pointer", fontSize: 13, padding: "4px 6px" }}>
          ←
        </button>
        <span
          onClick={onProfileClick}
          style={{ fontSize: 14, fontWeight: 700, color: COLORS.gold, cursor: "pointer", fontFamily: "Cinzel, serif" }}
        >
          {otherName || "..."}
        </span>
        <button onClick={onProfileClick} style={{ ...miniButtonStyle, marginLeft: "auto" }}>
          Zobacz profil
        </button>
      </div>

      {/* Lista wiadomości */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {loading && <p style={{ color: COLORS.textFaint, fontSize: 13, textAlign: "center" }}>Ładowanie...</p>}
        {!loading && messages.length === 0 && (
          <p style={{ color: COLORS.textGhost, fontSize: 13, textAlign: "center", fontStyle: "italic", marginTop: 40 }}>
            Brak wiadomości — napisz pierwszą!
          </p>
        )}
        {messages.map(msg => {
          // Wiadomości "moje" mają senderId == aktualnego gracza, ale nie znamy go tu
          // bezpośrednio — rozpoznajemy je po fakcie, że NIE pochodzą od otherCharacterId.
          const isMine = msg.senderId !== otherCharacterId;
          return (
            <div key={msg.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "70%", padding: "8px 12px", borderRadius: 12,
                background: isMine ? "rgba(89,212,208,0.15)" : COLORS.panelAlt,
                border: `1px solid ${isMine ? "rgba(89,212,208,0.3)" : COLORS.borderSoft}`,
              }}>
                <p style={{ fontSize: 13, color: COLORS.text, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {msg.content}
                </p>
                <p style={{ fontSize: 10, color: COLORS.textGhost, margin: "4px 0 0", textAlign: "right" }}>
                  {formatDateTime(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Pole wpisywania */}
      <div style={{ padding: 12, borderTop: `1px solid ${COLORS.borderSoft}`, flexShrink: 0 }}>
        {sendError && <p style={{ fontSize: 11, color: COLORS.red, margin: "0 0 6px" }}>{sendError}</p>}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value.slice(0, 1000))}
            onKeyDown={handleKeyDown}
            disabled={sending}
            placeholder="Napisz wiadomość... (Enter = wyślij, Shift+Enter = nowa linia)"
            rows={2}
            style={{
              flex: 1, resize: "none", boxSizing: "border-box",
              background: COLORS.panelAlt, border: `1px solid ${COLORS.borderSoft}`,
              borderRadius: 8, padding: 10, color: COLORS.text, fontSize: 13,
              fontFamily: "Inter, sans-serif",
            }}
          />
          <button
            onClick={handleSend}
            disabled={sending || text.trim().length === 0}
            style={primaryButtonStyle(sending || text.trim().length === 0)}
          >
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
  padding: "6px 12px", borderRadius: 6,
  border: `1px solid ${COLORS.borderSoft}`,
  background: "transparent", color: COLORS.textDim,
  fontSize: 11, cursor: "pointer", fontFamily: "Cinzel, serif", fontWeight: 600,
};

function pagerButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "7px 14px", borderRadius: 6,
    border: `1px solid ${COLORS.borderSoft}`,
    background: "transparent",
    color: disabled ? COLORS.textGhost : COLORS.textDim,
    fontSize: 12, cursor: disabled ? "not-allowed" : "pointer",
  };
}

function primaryButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "10px 18px", borderRadius: 8, border: "none",
    background: disabled ? "rgba(245,196,81,0.3)" : COLORS.gold,
    color: COLORS.bg, fontSize: 12, fontWeight: 700,
    fontFamily: "Cinzel, serif", cursor: disabled ? "not-allowed" : "pointer",
    flexShrink: 0,
  };
}