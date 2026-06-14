import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../api/auth";
import wizardTower from "../assets/WizardTowerMain.png";

const TOP_NAV = ["Home", "O grze", "Regulamin", "Forum", "Magiczne Kompendium"];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await register(username, email, password);
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username);
      navigate("/overview");
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Błąd rejestracji");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      fontFamily: "Inter, sans-serif",
      color: "#F7F0DD",
    }}>

      {/* ── PASEK GÓRNY ── */}
      <header style={{
        background: "#161d38",
        borderBottom: "1px solid rgba(245,196,81,0.12)",
        zIndex: 10,
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto", padding: "0 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 56,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #F5C451, #F46A4E)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
            }}>
              🧙
            </div>
            <span style={{
              fontFamily: "Cinzel, serif", fontSize: 18, fontWeight: 700,
              color: "#F5C451", letterSpacing: "0.08em",
            }}>
              Magic Mess
            </span>
          </div>

          <nav style={{ display: "flex", gap: 4 }}>
            {TOP_NAV.map(item => (
              <span
                key={item}
                style={{
                  padding: "8px 14px",
                  fontSize: 13,
                  color: "rgba(247,240,221,0.35)",
                  cursor: "not-allowed",
                  fontFamily: "Inter, sans-serif",
                  userSelect: "none",
                }}
                title="Wkrótce"
              >
                {item}
              </span>
            ))}
          </nav>
        </div>
      </header>

      {/* ── TŁO + FORMULARZ ── */}
      <div style={{
        flex: 1,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}>
        <img
          src={wizardTower}
          alt=""
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
          }}
        />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(135deg, rgba(22,29,56,0.85) 0%, rgba(22,29,56,0.5) 50%, rgba(22,29,56,0.85) 100%)",
        }} />

        <div style={{
          position: "relative", zIndex: 1,
          width: "100%", maxWidth: 380,
          background: "#372b5d",
          borderRadius: 16,
          border: "1px solid rgba(245,196,81,0.18)",
          padding: 32,
          boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        }}>
          <h1 style={{
            fontFamily: "Cinzel, serif", fontSize: 24, fontWeight: 700,
            color: "#F5C451", marginBottom: 4, letterSpacing: "0.05em",
            textAlign: "center",
          }}>
            Magic Mess
          </h1>
          <p style={{
            fontSize: 13, color: "rgba(247,240,221,0.5)",
            marginBottom: 24, textAlign: "center",
          }}>
            Utwórz konto czarodzieja
          </p>

          {error && (
            <div style={{
              marginBottom: 16, padding: "10px 14px",
              background: "rgba(244,106,78,0.12)",
              border: "1px solid rgba(244,106,78,0.35)",
              borderRadius: 10,
              fontSize: 13, color: "#F46A4E",
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>Nazwa czarodzieja</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Merlin"
                required
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = "#F5C451")}
                onBlur={e => (e.currentTarget.style.borderColor = "rgba(245,196,81,0.2)")}
              />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="mag@magicmess.pl"
                required
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = "#F5C451")}
                onBlur={e => (e.currentTarget.style.borderColor = "rgba(245,196,81,0.2)")}
              />
            </div>
            <div>
              <label style={labelStyle}>Hasło</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="minimum 6 znaków"
                required
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = "#F5C451")}
                onBlur={e => (e.currentTarget.style.borderColor = "rgba(245,196,81,0.2)")}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "12px 0", marginTop: 4,
                background: loading ? "rgba(245,196,81,0.4)" : "#F5C451",
                color: "#161d38",
                border: "none", borderRadius: 10,
                fontFamily: "Cinzel, serif", fontSize: 14, fontWeight: 700,
                letterSpacing: "0.06em",
                cursor: loading ? "default" : "pointer",
                transition: "background 0.15s",
              }}
            >
              {loading ? "Tworzenie konta..." : "Zarejestruj się"}
            </button>
          </form>

          <p style={{
            marginTop: 20, textAlign: "center",
            fontSize: 13, color: "rgba(247,240,221,0.5)",
          }}>
            Masz już konto?{" "}
            <Link to="/login" style={{ color: "#59D4D0", fontWeight: 600, textDecoration: "none" }}>
              Zaloguj się
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 500,
  color: "rgba(247,240,221,0.6)", marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "rgba(22,29,56,0.5)",
  border: "1px solid rgba(245,196,81,0.2)",
  borderRadius: 8,
  color: "#F7F0DD",
  fontSize: 13,
  outline: "none",
  transition: "border-color 0.15s",
};