import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useCharacter } from "../contexts/CharacterContext";

// ── PALETA ──────────────────────────────────────────────────────────────────────
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

// ── STAŁE AWATARÓW ──────────────────────────────────────────────────────────
const AVATAR_COUNT = 20;
const AVATAR_BASE_PATH = "/src/assets/playericons/playericon";
const AVATAR_EXT = ".jpg";

// ── TYPY ────────────────────────────────────────────────────────────────────
interface PlayerProfile {
  characterId: number;
  name: string;
  level: number;
  prestige: number;
  towerLevel: number | null;
  registeredAt: string;
  lastSeenAt: string | null;
  titles: string[];
  portraitUrl: string | null;
  avatarIndex: number;
  isSelf: boolean;
  isBlocked: boolean;
}

// ── KOMPONENTY POMOCNICZE ──────────────────────────────────────────────────
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

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: 22, fontWeight: 700, color, margin: 0 }}>{value}</p>
      <p style={{ fontSize: 10, color: COLORS.textFaint, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "nieznana";
  return new Date(value).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
}

function formatLastSeen(value: string | null): string {
  if (!value) return "brak danych";
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 2) return "przed chwilą";
  if (diffMin < 60) return `${diffMin} min temu`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} godz. temu`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "wczoraj";
  if (diffD < 30) return `${diffD} dni temu`;
  return date.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
}

// ── MODAL WYBORU AWATARA ──────────────────────────────────────────────────
function AvatarPickerModal({
  currentIndex,
  onSelect,
  onClose,
}: {
  currentIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  // Zamykanie po kliknięciu poza modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: COLORS.panel,
          borderRadius: 16,
          padding: 24,
          maxWidth: 500,
          width: "90%",
          maxHeight: "80vh",
          overflowY: "auto",
          border: `1px solid ${COLORS.border}`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <p style={{ fontFamily: "Cinzel, serif", fontSize: 16, color: COLORS.gold, margin: 0, letterSpacing: "0.06em" }}>
            Wybierz awatar
          </p>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: COLORS.textDim,
              fontSize: 20,
              cursor: "pointer",
              padding: "0 8px",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          {Array.from({ length: AVATAR_COUNT + 1 }, (_, i) => i).map((num) => (
            <button
              key={num}
              onClick={() => {
                onSelect(num);
                onClose();
              }}
              style={{
                width: 64,
                height: 64,
                borderRadius: 12,
                border: `3px solid ${currentIndex === num ? COLORS.gold : COLORS.borderSoft}`,
                padding: 4,
                background: "transparent",
                cursor: "pointer",
                transition: "all 0.15s",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) => {
                if (currentIndex !== num) {
                  e.currentTarget.style.borderColor = COLORS.textDim;
                }
              }}
              onMouseLeave={(e) => {
                if (currentIndex !== num) {
                  e.currentTarget.style.borderColor = COLORS.borderSoft;
                }
              }}
            >
              <img
                src={`${AVATAR_BASE_PATH}${num}${AVATAR_EXT}`}
                alt={`Avatar ${num}`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: 8,
                }}
                onError={(e) => {
                  // Jeśli obrazek się nie ładuje – ukryj i pokaż czarne tło
                  e.currentTarget.style.display = "none";
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.style.background = "#000";
                    // Bez żadnych znaków
                  }
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── GŁÓWNY KOMPONENT ───────────────────────────────────────────────────────
export default function PlayerProfile() {
  const { characterId } = useParams<{ characterId: string }>();
  const navigate = useNavigate();
  const { character: myCharacter } = useCharacter();

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Stan wiadomości
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Stan blokowania
  const [blockBusy, setBlockBusy] = useState(false);

  const targetId = characterId === "me" ? myCharacter?.id : characterId;

  const fetchProfile = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/profile/${targetId}`);
      setProfile(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Nie udało się załadować profilu");
    } finally {
      setLoading(false);
    }
  }, [targetId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  useEffect(() => {
    setMessageText("");
    setSendError(null);
    setSendSuccess(false);
  }, [targetId]);

  // ── WYSYŁANIE WIADOMOŚCI ──────────────────────────────────────────────
  async function handleSendMessage() {
    if (!profile || messageText.trim().length === 0) return;
    setSending(true);
    setSendError(null);
    setSendSuccess(false);
    try {
      await api.post(`/messages/private/${profile.characterId}`, { content: messageText.trim() });
      setMessageText("");
      setSendSuccess(true);
    } catch (err: any) {
      setSendError(err.response?.data?.error ?? "Nie udało się wysłać wiadomości");
    } finally {
      setSending(false);
    }
  }

  // ── BLOKOWANIE ──────────────────────────────────────────────────────────
  async function handleToggleBlock() {
    if (!profile) return;
    setBlockBusy(true);
    try {
      if (profile.isBlocked) {
        await api.delete(`/messages/private/block/${profile.characterId}`);
      } else {
        await api.post(`/messages/private/block/${profile.characterId}`);
      }
      await fetchProfile();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd operacji blokowania");
    } finally {
      setBlockBusy(false);
    }
  }

  // ── ZMIANA AWATARA ──────────────────────────────────────────────────────
  async function handleChangeAvatar(newIndex: number) {
    if (!profile || newIndex === profile.avatarIndex) return;
    try {
      await api.patch("/profile/avatar", { avatarIndex: newIndex });
      setProfile((prev) => (prev ? { ...prev, avatarIndex: newIndex } : null));
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd zmiany awatara");
    }
  }

  // ── RENDER ──────────────────────────────────────────────────────────────

  if (!targetId) {
    return <p style={{ fontSize: 13, color: COLORS.textFaint }}>Ładowanie...</p>;
  }

  if (loading) {
    return <p style={{ fontSize: 13, color: COLORS.textFaint }}>Ładowanie profilu...</p>;
  }

  if (error || !profile) {
    return (
      <Panel>
        <p style={{ fontSize: 13, color: COLORS.red, margin: 0 }}>{error ?? "Profil nie znaleziony"}</p>
        <button onClick={() => navigate(-1)} style={backButtonStyle}>← Wróć</button>
      </Panel>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontFamily: "Cinzel, serif", color: COLORS.gold, fontSize: 22, margin: 0, letterSpacing: "0.06em" }}>
            {profile.isSelf ? "Twój profil" : "Profil gracza"}
          </h1>
          {profile.isSelf && (
            <button
              onClick={() => setShowAvatarPicker(true)}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: `1px solid ${COLORS.gold}`,
                background: "transparent",
                color: COLORS.gold,
                fontSize: 11,
                fontFamily: "Cinzel, serif",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(245,196,81,0.12)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              Edytuj profil
            </button>
          )}
        </div>
        <button onClick={() => navigate(-1)} style={backButtonStyle}>← Wróć</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20, alignItems: "start" }}>

        {/* ── LEWA KOLUMNA: AWATAR ── */}
        <Panel style={{ minHeight: 320, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ width: "100%", maxWidth: 200, aspectRatio: "1/1", overflow: "hidden", borderRadius: 8, border: `2px solid ${COLORS.border}` }}>
            <img
              src={`${AVATAR_BASE_PATH}${profile.avatarIndex}${AVATAR_EXT}`}
              alt={profile.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              onError={(e) => {
                // Jeśli obrazek się nie ładuje – czarne tło z numerem
                e.currentTarget.style.display = "none";
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.style.background = "#000";
                  parent.style.display = "flex";
                  parent.style.alignItems = "center";
                  parent.style.justifyContent = "center";
                  parent.textContent = profile.avatarIndex.toString();
                  parent.style.color = "#fff";
                  parent.style.fontSize = "24px";
                  parent.style.fontWeight = "bold";
                }
              }}
            />
          </div>
        </Panel>

        {/* ── PRAWA KOLUMNA: DANE ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <Panel>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
              <span style={{ fontFamily: "Cinzel, serif", fontSize: 22, fontWeight: 700, color: COLORS.gold }}>
                {profile.name}
              </span>
              {profile.isSelf && (
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 4,
                  background: COLORS.gold, color: COLORS.bg, fontWeight: 700,
                  fontFamily: "Cinzel, serif",
                }}>
                  To Ty
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 14 }}>
              <Stat label="Poziom" value={profile.level} color={COLORS.teal} />
              <Stat label="Prestiż" value={profile.prestige} color={COLORS.gold} />
              <Stat label="Poziom wieży" value={profile.towerLevel ?? "—"} color={COLORS.purple} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 12, borderTop: `1px solid ${COLORS.borderSoft}` }}>
              <p style={{ fontSize: 12, color: COLORS.textDim, margin: 0 }}>
                Stał się magiem dnia: <span style={{ color: COLORS.text, fontWeight: 600 }}>{formatDate(profile.registeredAt)}</span>
              </p>
              <p style={{ fontSize: 12, color: COLORS.textDim, margin: 0 }}>
                Ostatnio widziany: <span style={{ color: COLORS.text, fontWeight: 600 }}>{formatLastSeen(profile.lastSeenAt)}</span>
              </p>
            </div>
          </Panel>

          {/* TYTUŁY */}
          <Panel>
            <p style={{ fontFamily: "Cinzel, serif", fontSize: 13, color: COLORS.gold, marginBottom: 12, letterSpacing: "0.06em" }}>
              TYTUŁY
            </p>
            {profile.titles.length === 0 ? (
              <p style={{ fontSize: 12, color: COLORS.textGhost, fontStyle: "italic", margin: 0 }}>
                Brak tytułów — mechanika wkrótce
              </p>
            ) : (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {profile.titles.map(title => (
                  <span key={title} style={{
                    fontSize: 11, padding: "4px 10px", borderRadius: 6,
                    background: "rgba(245,196,81,0.12)", border: `1px solid ${COLORS.border}`,
                    color: COLORS.gold,
                  }}>
                    {title}
                  </span>
                ))}
              </div>
            )}
          </Panel>

          {/* WIADOMOŚCI I BLOKOWANIE */}
          {!profile.isSelf && (
            <Panel>
              <p style={{ fontFamily: "Cinzel, serif", fontSize: 13, color: COLORS.gold, marginBottom: 12, letterSpacing: "0.06em" }}>
                WYŚLIJ WIADOMOŚĆ
              </p>

              {profile.isBlocked && (
                <p style={{ fontSize: 12, color: COLORS.red, marginBottom: 10 }}>
                  Zablokowałeś tego gracza — odblokuj go, aby wysłać wiadomość.
                </p>
              )}

              <textarea
                value={messageText}
                onChange={e => setMessageText(e.target.value.slice(0, 1000))}
                disabled={profile.isBlocked || sending}
                placeholder={`Napisz wiadomość do ${profile.name}...`}
                rows={3}
                style={{
                  width: "100%", resize: "vertical", boxSizing: "border-box",
                  background: COLORS.panelAlt, border: `1px solid ${COLORS.borderSoft}`,
                  borderRadius: 8, padding: 10, color: COLORS.text, fontSize: 13,
                  fontFamily: "Inter, sans-serif", marginBottom: 8,
                }}
              />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: COLORS.textFaint }}>{messageText.length} / 1000</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => navigate(`/messages?conversation=${profile.characterId}`)}
                    style={secondaryButtonStyle}
                  >
                    Otwórz wątek
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={profile.isBlocked || sending || messageText.trim().length === 0}
                    style={primaryButtonStyle(profile.isBlocked || sending || messageText.trim().length === 0)}
                  >
                    {sending ? "Wysyłanie..." : "Wyślij"}
                  </button>
                </div>
              </div>

              {sendError && <p style={{ fontSize: 12, color: COLORS.red, margin: "0 0 8px" }}>{sendError}</p>}
              {sendSuccess && <p style={{ fontSize: 12, color: COLORS.teal, margin: "0 0 8px" }}>Wiadomość wysłana!</p>}

              <button
                onClick={handleToggleBlock}
                disabled={blockBusy}
                style={{
                  background: "none", border: "none", cursor: blockBusy ? "not-allowed" : "pointer",
                  color: profile.isBlocked ? COLORS.teal : COLORS.textFaint,
                  fontSize: 11, padding: 0, marginTop: 4,
                  textDecoration: "underline",
                }}
              >
                {profile.isBlocked ? "Odblokuj gracza" : "Zablokuj gracza"}
              </button>
            </Panel>
          )}
        </div>
      </div>

      {/* ── MODAL WYBORU AWATARA ── */}
      {showAvatarPicker && (
        <AvatarPickerModal
          currentIndex={profile.avatarIndex}
          onSelect={handleChangeAvatar}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
    </div>
  );
}

// ── STYLE ──────────────────────────────────────────────────────────────────
const backButtonStyle: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 8,
  border: `1px solid ${COLORS.borderSoft}`,
  background: "transparent", color: COLORS.textDim,
  fontSize: 12, cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 8,
  border: `1px solid ${COLORS.borderSoft}`,
  background: "transparent", color: COLORS.textDim,
  fontSize: 12, cursor: "pointer", fontFamily: "Cinzel, serif", fontWeight: 600,
};

function primaryButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "8px 16px", borderRadius: 8, border: "none",
    background: disabled ? "rgba(245,196,81,0.3)" : COLORS.gold,
    color: COLORS.bg, fontSize: 12, fontWeight: 700,
    fontFamily: "Cinzel, serif", cursor: disabled ? "not-allowed" : "pointer",
  };
}