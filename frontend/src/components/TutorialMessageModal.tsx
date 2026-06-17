import { useTutorial } from "../contexts/TutorialContext";

export default function TutorialMessageModal() {
  const { tutorial, dismissMessage } = useTutorial();

  if (!tutorial?.pendingMessage) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={dismissMessage}
    >
      <div
        style={{
          background: "#1e2540",
          border: "1px solid rgba(245,196,81,0.35)",
          borderRadius: 12,
          padding: "36px 40px",
          maxWidth: 540,
          width: "100%",
          boxShadow: "0 8px 48px rgba(0,0,0,0.6)",
          position: "relative",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Złota ozdoba górna */}
        <div style={{
          width: 48,
          height: 3,
          background: "linear-gradient(90deg, transparent, #F5C451, transparent)",
          margin: "0 auto 24px",
          borderRadius: 2,
        }} />

        {/* Ikona */}
        <div style={{
          textAlign: "center",
          fontSize: 36,
          marginBottom: 20,
          lineHeight: 1,
        }}>
          📜
        </div>

        {/* Treść wiadomości */}
        <p style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 15,
          lineHeight: 1.7,
          color: "#F7F0DD",
          textAlign: "center",
          margin: "0 0 28px",
        }}>
          {tutorial.pendingMessage}
        </p>

        {/* Złota ozdoba dolna */}
        <div style={{
          width: 48,
          height: 3,
          background: "linear-gradient(90deg, transparent, #F5C451, transparent)",
          margin: "0 auto 24px",
          borderRadius: 2,
        }} />

        {/* Przycisk */}
        <div style={{ textAlign: "center" }}>
          <button
            onClick={dismissMessage}
            style={{
              background: "linear-gradient(135deg, #F5C451, #d4a93a)",
              border: "none",
              borderRadius: 8,
              color: "#161d38",
              fontFamily: "Cinzel, serif",
              fontWeight: 700,
              fontSize: 13,
              padding: "10px 32px",
              cursor: "pointer",
              letterSpacing: "0.05em",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            Rozumiem
          </button>
        </div>
      </div>
    </div>
  );
}