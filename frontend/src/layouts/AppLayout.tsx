import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react"
import { useCharacter } from "../contexts/CharacterContext";
import api from "../api/client"

const NAV = [
  { to: "/premium",     label: "✦ Premium" },
  { to: "/overview",    label: "Przegląd konta" },
  { to: "/training",    label: "Trening" },
  { to: "/vault",       label: "Komnata Nieładu" },
  { to: "/spellbook",   label: "Księga Magii" },
  { to: "/tower",       label: "Wieża" },
  { to: "/study",       label: "Studia" },
  { to: "/exploration", label: "Eksploracja" },
  { to: "/combat",      label: "Pojedynki" },
  { to: "/school",      label: "Szkoła Magii" },
  { to: "/settings",    label: "Ustawienia" },
];

export default function AppLayout() {
  const { character, refresh } = useCharacter();
  const [productionPerHour, setProductionPerHour] = useState<number | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    refresh();
  }, [location.pathname, refresh]);
  useEffect(() => {
    const handleLogout = () => navigate("/login", { replace: true });
    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, [navigate]);

useEffect(() => {
  api.get("/tower").then(r => setProductionPerHour(r.data.resources?.productionPerHour ?? null)).catch(() => {});
}, [character?.powerShards]);

  function logout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#161d38", color: "#F7F0DD", fontFamily: "Inter, sans-serif" }}>

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
            <span style={{ fontFamily: "Cinzel, serif", color: "#F5C451", fontWeight: 600, fontSize: 13 }}>
              {character.name}
            </span>
            <span>Poziom {character.level}</span>
            {character.archetypeProfile?.finalClass && (
              <span style={{ color: "#59D4D0" }}>{character.archetypeProfile.finalClass}</span>
            )}
            <span>Prestiż: {character.prestige}</span>

            {/* Pasek XP */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, maxWidth: 240 }}>
              <div style={{
                flex: 1, height: 5, background: "rgba(247,240,221,0.1)", borderRadius: 3, overflow: "hidden",
              }}>
                <div
                  title={`${character.experience} / ${character.xpToNextLevel} XP`}
                  style={{
                    height: "100%",
                    width: `${Math.min(100, Math.round(character.experience / character.xpToNextLevel * 100))}%`,
                    background: "linear-gradient(90deg, #F5C451, #59D4D0)",
                    borderRadius: 3,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
              <span title={`${character.experience} / ${character.xpToNextLevel} XP`} style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                {character.experience}/{character.xpToNextLevel} XP
              </span>
            </div>

            <div style={{ display: "flex", gap: 16, marginLeft: "auto" }}>
<span>✦ {character.powerShards} okruchów{productionPerHour !== null ? ` (+${productionPerHour}/godz.)` : ""}</span>              <span>◈ {character.runicStoneShards} runicznych</span>
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
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: "block",
                padding: "12px 14px",
                fontSize: 12,
                fontFamily: item.to === "/premium" ? "Cinzel, serif" : "Inter, sans-serif",
                fontWeight: item.to === "/premium" ? 700 : 500,
                color: isActive
                  ? "#F5C451"
                  : item.to === "/premium"
                  ? "#F46A4E"
                  : "rgba(247,240,221,0.65)",
                textDecoration: "none",
                borderBottom: isActive ? "2px solid #F5C451" : "2px solid transparent",
                whiteSpace: "nowrap",
                transition: "color 0.15s, border-color 0.15s",
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