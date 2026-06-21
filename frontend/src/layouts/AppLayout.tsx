import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { useCharacter } from "../contexts/CharacterContext";
import { useTutorial } from "../contexts/TutorialContext";
import TutorialMessageModal from "../components/TutorialMessageModal";
import api from "../api/client";

// ── PEŁNE MENU ────────────────────────────────────────────────────────────────

const FULL_NAV = [
  { to: "/premium",     label: "✦ Premium",      tabKey: "premium"    },
  { to: "/overview",    label: "Przegląd konta",  tabKey: "character"  },
  { to: "/training",    label: "Trening",          tabKey: "training"   },
  { to: "/vault",       label: "Komnata Nieładu", tabKey: "vault"      },
  { to: "/spellbook",   label: "Księga Magii",    tabKey: "spellbook"  },
  { to: "/tower",       label: "Wieża",           tabKey: "tower"      },
  { to: "/study",       label: "Studia",          tabKey: "study"      },
  { to: "/exploration", label: "Eksploracja",     tabKey: "exploration"},
  { to: "/combat",      label: "Pojedynki",       tabKey: "combat"     },
  { to: "/rankings",    label: "Rankingi",        tabKey: "rankings"   },
  { to: "/messages",    label: "Wiadomości",      tabKey: "messages"   },
  { to: "/school",      label: "Szkoła Magii",    tabKey: "school"     },
  { to: "/settings",    label: "Ustawienia",      tabKey: "settings"   },
];

// Menu tutorialowe — kolejność i zestaw odpowiada logice tutoriala
const TUTORIAL_NAV = [
  { to: "/home",        label: "Zniszczony Dom",  tabKey: "home"       },
  { to: "/exploration", label: "Eksploracja",     tabKey: "exploration"},
  { to: "/study",       label: "Studia",          tabKey: "study"      },
  { to: "/spellbook",   label: "Księga Magii",    tabKey: "spellbook"  },
  { to: "/training",    label: "Trening",         tabKey: "training"   },
  { to: "/vault",       label: "Komnata Nieładu", tabKey: "vault"      },
];

// Łączny licznik nieprzeczytanych jest odpytywany w pewnym interwale —
// wiadomości prywatne i systemowe to dwa osobne endpointy, więc sumujemy je tutaj.
const UNREAD_POLL_INTERVAL_MS = 30_000;

export default function AppLayout() {
  const { character, refresh } = useCharacter();
  const { tutorial, refresh: refreshTutorial } = useTutorial();
  const [productionPerHour, setProductionPerHour] = useState<number | null>(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // ── Odświeżanie przy zmianie trasy ───────────────────────────────────────
  useEffect(() => { refresh(); }, [location.pathname, refresh]);
  useEffect(() => { refreshTutorial(); }, [location.pathname, refreshTutorial]);

  // ── Redirect tutorialowy — działa wewnątrz drzewa providerów ─────────────
  useEffect(() => {
    if (tutorial === null) return; // jeszcze ładuje
    if (tutorial.active && location.pathname === "/overview") {
      // Gracz właśnie się zalogował / zarejestrował i wylądował na /overview
      // przez domyślny redirect z index route — przenieś go na /home
      navigate("/home", { replace: true });
    }
  }, [tutorial, location.pathname, navigate]);

  // ── Redirect gdy gracz próbuje wejść na zablokowaną zakładkę ─────────────
  useEffect(() => {
    if (!tutorial?.active) return;
    const visibleTabs = tutorial.visibleTabs;
    const currentTab = FULL_NAV.find(n => location.pathname.startsWith(n.to));
    if (currentTab && !visibleTabs.includes(currentTab.tabKey)) {
      navigate("/home", { replace: true });
    }
  }, [location.pathname, tutorial, navigate]);

  useEffect(() => {
    const handleLogout = () => navigate("/login", { replace: true });
    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, [navigate]);

  useEffect(() => {
    api.get("/tower")
      .then(r => setProductionPerHour(r.data.resources?.productionPerHour ?? null))
      .catch(() => {});
  }, [character?.powerShards]);

  // ── Sprawdzenie nieprzeczytanych wiadomości (prywatne + systemowe) ───────
  const checkUnread = useCallback(async () => {
    try {
      const [privateRes, systemRes] = await Promise.all([
        api.get("/messages/private/unread-count"),
        api.get("/messages/system", { params: { pageSize: 1 } }),
      ]);
      const privateUnread = privateRes.data.unreadCount ?? 0;
      const systemUnread = systemRes.data.unreadCount ?? 0;
      setHasUnreadMessages(privateUnread > 0 || systemUnread > 0);
    } catch {
      // brak danych nie powinien wywalać layoutu — po prostu nie pokazujemy wskaźnika
    }
  }, []);

  useEffect(() => {
    checkUnread();
    const interval = setInterval(checkUnread, UNREAD_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkUnread]);

  // Odśwież licznik od razu po wejściu na zakładkę Wiadomości (np. po przeczytaniu)
  useEffect(() => {
    if (location.pathname.startsWith("/messages")) {
      checkUnread();
    }
  }, [location.pathname, checkUnread]);

  function logout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  // ── Oblicz widoczne pozycje menu ──────────────────────────────────────────
  const isTutorialActive = tutorial?.active ?? false;
  const visibleTabs = tutorial?.visibleTabs ?? [];

  const navItems = isTutorialActive
    ? TUTORIAL_NAV.filter(item => visibleTabs.includes(item.tabKey))
    : FULL_NAV;

  return (
    <div style={{ minHeight: "100vh", background: "#161d38", color: "#F7F0DD", fontFamily: "Inter, sans-serif" }}>

      {/* Modal wiadomości z TutorialContext (pendingMessage z backendu) */}
      <TutorialMessageModal />

      {/* ── PASEK NAWIGACJI ── */}
      <nav style={{
        background: "#16192E",
        borderBottom: "1px solid rgba(245,196,81,0.15)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        {/* Górny pasek postaci */}
        {character && (
          <div style={{
            display: "flex", alignItems: "center", gap: 24,
            padding: "8px 24px",
            borderBottom: "1px solid rgba(245,196,81,0.08)",
            fontSize: 12, color: "rgba(247,240,221,0.6)",
          }}>
            <span
              onClick={() => navigate("/profile/me")}
              title="Zobacz swój profil"
              style={{
                fontFamily: "Cinzel, serif", color: "#F5C451", fontWeight: 600, fontSize: 13,
                cursor: "pointer", transition: "opacity 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.75")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              {character.name}
            </span>
            <span>Poziom {character.level}</span>
            <span>Prestiż: {character.prestige}</span>

            {/* Pasek XP */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, maxWidth: 240 }}>
              <div style={{ flex: 1, height: 5, background: "rgba(247,240,221,0.1)", borderRadius: 3, overflow: "hidden" }}>
                <div
                  title={`${character.experience} / ${character.xpToNextLevel} XP`}
                  style={{
                    height: "100%",
                    width: `${Math.min(100, Math.round(character.experience / character.xpToNextLevel * 100))}%`,
                    background: "linear-gradient(90deg, #F5C451, #59D4D0)",
                    borderRadius: 3, transition: "width 0.4s ease",
                  }}
                />
              </div>
              <span style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                {character.experience}/{character.xpToNextLevel} XP
              </span>
            </div>

            <div style={{ display: "flex", gap: 16, marginLeft: "auto" }}>
              <span>✦ {character.powerShards} okruchów{productionPerHour !== null ? ` (+${productionPerHour}/godz.)` : ""}</span>
              <span>◈ {character.runicStoneShards} runicznych</span>
            </div>

            <button
              onClick={logout}
              style={{
                background: "none", border: "none", color: "rgba(247,240,221,0.4)",
                cursor: "pointer", fontSize: 12, padding: "2px 8px",
                borderRadius: 4, transition: "color 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "#F46A4E")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(247,240,221,0.4)")}
            >
              Wyloguj
            </button>
          </div>
        )}

        {/* Pozycje nawigacji */}
        <div style={{ display: "flex", padding: "0 24px", overflowX: "auto", gap: 2 }}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: 6,
                padding: "12px 14px", fontSize: 12,
                fontFamily: item.to === "/premium" ? "Cinzel, serif" : "Inter, sans-serif",
                fontWeight: item.to === "/premium" ? 700 : 500,
                color: isActive ? "#F5C451" : item.to === "/premium" ? "#F46A4E" : "rgba(247,240,221,0.65)",
                textDecoration: "none",
                borderBottom: isActive ? "2px solid #F5C451" : "2px solid transparent",
                whiteSpace: "nowrap", transition: "color 0.15s, border-color 0.15s",
              })}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                if (!el.classList.contains("active")) el.style.color = "#F7F0DD";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                if (!el.classList.contains("active")) el.style.color = "rgba(247,240,221,0.65)";
              }}
            >
              {item.label}
              {item.tabKey === "messages" && hasUnreadMessages && (
                <span style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: "#F46A4E", display: "inline-block",
                  boxShadow: "0 0 4px rgba(244,106,78,0.8)",
                }} />
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* ── TREŚĆ ZAKŁADKI ── */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px" }}>
        <Outlet />
      </main>
    </div>
  );
}