import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

// ── TYPY ────────────────────────────────────────────────────────────────────

type RankingCategory = "level" | "prestige" | "builders" | "warriors" | "showoffs" | "collectors";

interface RankingEntry {
  rank: number;
  characterId: number;
  name: string;
  level: number;
  value: number;
  secondaryValue?: number;
  extra?: { wins: number; losses: number; draws: number };
}

interface RankingPage {
  category: RankingCategory;
  page: number;
  pageSize: number;
  totalEntries: number;
  totalPages: number;
  entries: RankingEntry[];
  myRank: RankingEntry | null;
}

// ── KONFIGURACJA KATEGORII ────────────────────────────────────────────────────

const CATEGORIES: { key: RankingCategory; label: string; icon: string }[] = [
  { key: "level",      label: "Główny",        icon: "★" },
  { key: "prestige",   label: "Prestiżowy",    icon: "♛" },
  { key: "builders",   label: "Budowniczowie", icon: "⛏" },
  { key: "warriors",   label: "Wojownicy",     icon: "⚔" },
  { key: "showoffs",   label: "Szpanerzy",     icon: "✦" },
  { key: "collectors", label: "Zbieracze",     icon: "🏆" },
];

const VALUE_LABELS: Record<RankingCategory, string> = {
  level:      "Poziom",
  prestige:   "Prestiż",
  builders:   "Poz. wieży",
  warriors:   "Punkty",
  showoffs:   "Punkty",
  collectors: "Trofea",
};

const SECONDARY_LABELS: Record<RankingCategory, string | null> = {
  level:      null,
  prestige:   null,
  builders:   "Suma poz. budynków",
  warriors:   null,
  showoffs:   null,
  collectors: null,
};

// ── PANEL (styl spójny z resztą aplikacji) ────────────────────────────────────

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

// ── WIERSZ TABELI ──────────────────────────────────────────────────────────────

function RankingRow({
  entry,
  category,
  isMe,
  onVisitProfile,
}: {
  entry: RankingEntry;
  category: RankingCategory;
  isMe: boolean;
  onVisitProfile: (characterId: number) => void;
}) {
  const medalColor =
    entry.rank === 1 ? "#F5C451" :
    entry.rank === 2 ? "#C8CCD8" :
    entry.rank === 3 ? "#D89A5C" : null;

  const secondaryLabel = SECONDARY_LABELS[category];
  const showExtraCol = category === "warriors" || category === "showoffs";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: secondaryLabel || showExtraCol
          ? "56px 1fr 90px 140px"
          : "56px 1fr 90px",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 8,
        background: isMe ? "rgba(89,212,208,0.12)" : "rgba(0,0,0,0.15)",
        border: isMe ? "1px solid rgba(89,212,208,0.4)" : "1px solid transparent",
        marginBottom: 6,
        transition: "background 0.15s",
      }}
    >
      <span style={{
        fontFamily: "Cinzel, serif",
        fontSize: 14,
        fontWeight: 700,
        color: medalColor ?? "rgba(247,240,221,0.5)",
        textAlign: "center",
      }}>
        {entry.rank}
      </span>

      <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
        <span
          onClick={() => onVisitProfile(entry.characterId)}
          title="Zobacz profil"
          style={{
            fontSize: 13,
            fontWeight: isMe ? 700 : 500,
            color: isMe ? "#59D4D0" : "#F7F0DD",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            cursor: "pointer",
            textDecoration: "underline",
            textDecorationColor: "transparent",
            transition: "text-decoration-color 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.textDecorationColor = isMe ? "#59D4D0" : "rgba(247,240,221,0.4)")}
          onMouseLeave={e => (e.currentTarget.style.textDecorationColor = "transparent")}
        >
          {entry.name}
        </span>
        <span style={{ fontSize: 10, color: "rgba(247,240,221,0.35)", flexShrink: 0 }}>
          poz. {entry.level}
        </span>
      </div>

      <span style={{ fontSize: 14, fontWeight: 700, color: "#F5C451", textAlign: "right" }}>
        {entry.value}
      </span>

      {secondaryLabel && entry.secondaryValue !== undefined && (
        <span style={{ fontSize: 12, color: "rgba(247,240,221,0.5)", textAlign: "right" }}>
          {entry.secondaryValue}
        </span>
      )}

      {showExtraCol && entry.extra && (
        <span style={{ fontSize: 11, color: "rgba(247,240,221,0.5)", textAlign: "right" }}>
          <span style={{ color: "#59D4D0" }}>{entry.extra.wins}W</span>
          {" / "}
          <span style={{ color: "#F46A4E" }}>{entry.extra.losses}P</span>
          {" / "}
          <span style={{ color: "rgba(247,240,221,0.6)" }}>{entry.extra.draws}R</span>
        </span>
      )}
    </div>
  );
}

// ── GŁÓWNY KOMPONENT ─────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

export default function Rankings() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<RankingCategory>("level");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<RankingPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRanking = useCallback(async (cat: RankingCategory, pg: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/rankings/${cat}`, { params: { page: pg, pageSize: PAGE_SIZE } });
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Błąd ładowania rankingu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRanking(category, page);
  }, [category, page, fetchRanking]);

  function selectCategory(cat: RankingCategory) {
    if (cat === category) return;
    setCategory(cat);
    setPage(1);
  }

  function jumpToMyPage() {
    if (!data?.myRank) return;
    const myPage = Math.ceil(data.myRank.rank / PAGE_SIZE);
    if (myPage === page) return;
    setPage(myPage);
  }

  function visitProfile(characterId: number) {
    navigate(`/profile/${characterId}`);
  }

  const secondaryLabel = SECONDARY_LABELS[category];
  const showExtraCol = category === "warriors" || category === "showoffs";

  const isMyRankOnPage = !!(data?.myRank && data.entries.some(e => e.characterId === data.myRank!.characterId));

  return (
    <div>
      <h1 style={{ fontFamily: "Cinzel, serif", color: "#F5C451", fontSize: 22, marginBottom: 24, letterSpacing: "0.06em" }}>
        Rankingi
      </h1>

      {/* ── PRZEŁĄCZNIK KATEGORII ── */}
      <Panel style={{ marginBottom: 20, padding: 14 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {CATEGORIES.map(cat => {
            const active = cat.key === category;
            return (
              <button
                key={cat.key}
                onClick={() => selectCategory(cat.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "9px 16px",
                  borderRadius: 8,
                  border: active ? "1px solid rgba(245,196,81,0.5)" : "1px solid rgba(247,240,221,0.1)",
                  background: active ? "rgba(245,196,81,0.12)" : "transparent",
                  color: active ? "#F5C451" : "rgba(247,240,221,0.6)",
                  fontFamily: "Cinzel, serif",
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = "#F7F0DD"; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.color = "rgba(247,240,221,0.6)"; }}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            );
          })}
        </div>
      </Panel>

      {/* ── TABELA RANKINGU ── */}
      <Panel>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
          <SectionTitle>
            {CATEGORIES.find(c => c.key === category)?.label} — Ranking
          </SectionTitle>
          {data && (
            <span style={{ fontSize: 11, color: "rgba(247,240,221,0.35)" }}>
              {data.totalEntries} {data.totalEntries === 1 ? "gracz" : "graczy"}
            </span>
          )}
        </div>

        {/* Nagłówek kolumn */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: secondaryLabel || showExtraCol ? "56px 1fr 90px 140px" : "56px 1fr 90px",
            gap: 10,
            padding: "0 12px 8px 12px",
            fontSize: 10,
            color: "rgba(247,240,221,0.35)",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ textAlign: "center" }}>#</span>
          <span>Gracz</span>
          <span style={{ textAlign: "right" }}>{VALUE_LABELS[category]}</span>
          {secondaryLabel && <span style={{ textAlign: "right" }}>{secondaryLabel}</span>}
          {showExtraCol && <span style={{ textAlign: "right" }}>W / P / R</span>}
        </div>

        {loading && (
          <p style={{ color: "rgba(247,240,221,0.4)", fontSize: 13, padding: "20px 0", textAlign: "center" }}>
            Ładowanie...
          </p>
        )}

        {error && (
          <p style={{ color: "#F46A4E", fontSize: 13, padding: "20px 0", textAlign: "center" }}>
            {error}
          </p>
        )}

        {!loading && !error && data && (
          <>
            {data.entries.length === 0 ? (
              <p style={{ color: "rgba(247,240,221,0.3)", fontSize: 13, padding: "20px 0", textAlign: "center", fontStyle: "italic" }}>
                Brak graczy w tej kategorii.
              </p>
            ) : (
              data.entries.map(entry => (
                <RankingRow
                  key={entry.characterId}
                  entry={entry}
                  category={category}
                  isMe={data.myRank?.characterId === entry.characterId}
                  onVisitProfile={visitProfile}
                />
              ))
            )}

            {/* ── PAGINACJA ── */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 16 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={pagerButtonStyle(page <= 1)}
              >
                ← Poprzednia
              </button>
              <span style={{ fontSize: 12, color: "rgba(247,240,221,0.5)", minWidth: 90, textAlign: "center" }}>
                Strona {data.page} / {data.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                style={pagerButtonStyle(page >= data.totalPages)}
              >
                Następna →
              </button>
            </div>
          </>
        )}
      </Panel>

      {/* ── STICKY: TWOJA POZYCJA ── */}
      {data?.myRank && (
        <div
          style={{
            position: "sticky",
            bottom: 16,
            marginTop: 16,
            zIndex: 50,
          }}
        >
          <Panel style={{
            padding: "12px 16px",
            border: "1px solid rgba(89,212,208,0.4)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 10, color: "rgba(247,240,221,0.4)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Twoja pozycja
                </span>
                <span style={{ fontFamily: "Cinzel, serif", fontSize: 16, fontWeight: 700, color: "#59D4D0" }}>
                  #{data.myRank.rank}
                </span>
                <span style={{ fontSize: 13, color: "#F7F0DD", fontWeight: 600 }}>
                  {data.myRank.name}
                </span>
                <span style={{ fontSize: 11, color: "rgba(247,240,221,0.4)" }}>
                  poz. {data.myRank.level}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#F5C451" }}>
                  {data.myRank.value} <span style={{ fontSize: 10, color: "rgba(247,240,221,0.4)", fontWeight: 400 }}>{VALUE_LABELS[category].toLowerCase()}</span>
                </span>
                {!isMyRankOnPage && (
                  <button
                    onClick={jumpToMyPage}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 6,
                      border: "1px solid rgba(89,212,208,0.4)",
                      background: "rgba(89,212,208,0.1)",
                      color: "#59D4D0",
                      fontSize: 11,
                      fontFamily: "Cinzel, serif",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      cursor: "pointer",
                    }}
                  >
                    Pokaż mnie
                  </button>
                )}
              </div>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

function pagerButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "7px 14px",
    borderRadius: 6,
    border: "1px solid rgba(247,240,221,0.15)",
    background: "transparent",
    color: disabled ? "rgba(247,240,221,0.2)" : "rgba(247,240,221,0.7)",
    fontSize: 12,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "color 0.15s",
  };
}