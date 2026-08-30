import { useCharacter } from "../contexts/CharacterContext";
import { useEffect, useState } from "react";
import api from "../api/client";

const STAT_LABELS: Record<string, string> = {
  knowledge:      "Wiedza",
  intelligence:   "Inteligencja",
  power:          "Moc",
  endurance:      "Wytrzymałość",
  resistance:     "Odporność",
  initiative:     "Inicjatywa",
  elementalMagic: "Magia Żywiołów",
  astralMagic:    "Magia Astralna",
  bloodMagic:     "Magia Krwi",
};

// ── STAŁE AWATARÓW ──────────────────────────────────────────────────────────
const AVATAR_BASE_PATH = "/src/assets/playericons/playericon";
const AVATAR_EXT = ".jpg";

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

export default function Overview() {
  const { character } = useCharacter();
  const [effectiveStats, setEffectiveStats] = useState<any>(null);
  const [spellSlots, setSpellSlots] = useState<any[]>([]);
  const [productionPerHour, setProductionPerHour] = useState<number | null>(null);

  useEffect(() => {
    api.get("/character/effective-stats").then(r => setEffectiveStats(r.data)).catch(() => {});
    api.get("/equipment").then(r => setSpellSlots(r.data.spellSlots ?? [])).catch(() => {});
    api.get("/tower").then(r => {
      setProductionPerHour(r.data.resources?.productionPerHour ?? null);
    }).catch(() => {});
  }, [character?.level, character?.powerShards]);

  if (!character) return null;

  const xpPct = Math.min(100, Math.round(character.experience / character.xpToNextLevel * 100));

  const base = effectiveStats?.base ?? {};
  const eff  = effectiveStats?.effective ?? {};

  // ── AWATAR ──
  const avatarIndex = character.avatarIndex ?? 0;
  const avatarSrc = `${AVATAR_BASE_PATH}${avatarIndex}${AVATAR_EXT}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── PASEK POSTACI ── */}
      <Panel style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          {/* Avatar – obrazek zamiast inicjału */}
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            overflow: "hidden",
            border: `2px solid rgba(245,196,81,0.3)`,
            flexShrink: 0,
            background: "#000",
          }}>
            <img
              src={avatarSrc}
              alt={character.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => {
                // Jeśli obrazek się nie ładuje – pokaż inicjał
                e.currentTarget.style.display = "none";
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.style.background = "linear-gradient(135deg, #F5C451, #F46A4E)";
                  parent.style.display = "flex";
                  parent.style.alignItems = "center";
                  parent.style.justifyContent = "center";
                  parent.textContent = character.name[0];
                  parent.style.fontSize = "22px";
                  parent.style.fontWeight = "700";
                  parent.style.color = "#161d38";
                }
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{ fontFamily: "Cinzel, serif", fontSize: 18, fontWeight: 700, color: "#F5C451" }}>
                {character.name}
              </span>
              <span style={{ fontSize: 12, color: "rgba(247,240,221,0.4)" }}>Prestiż: {character.prestige}</span>
            </div>

            {/* Pasek XP */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: "rgba(247,240,221,0.5)", minWidth: 60 }}>
                Poz. {character.level}
              </span>
              <div style={{ flex: 1, height: 8, background: "rgba(247,240,221,0.08)", borderRadius: 4, overflow: "hidden" }}>
                <div
                  title={`${character.experience} / ${character.xpToNextLevel} pkt XP`}
                  style={{
                    height: "100%", width: `${xpPct}%`,
                    background: "linear-gradient(90deg, #F5C451 0%, #59D4D0 100%)",
                    borderRadius: 4, transition: "width 0.5s ease",
                  }}
                />
              </div>
              <span style={{ fontSize: 11, color: "rgba(247,240,221,0.4)", whiteSpace: "nowrap" }}>
                {character.experience} / {character.xpToNextLevel} XP
              </span>
            </div>
          </div>

          {/* Zasoby */}
          <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#F5C451", margin: 0 }}>{character.powerShards}</p>
              <p style={{ fontSize: 10, color: "rgba(247,240,221,0.4)", margin: 0 }}>
                okruchów mocy · +{productionPerHour ?? "?"}/godz.
              </p>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#59D4D0", margin: 0 }}>{character.runicStoneShards}</p>
              <p style={{ fontSize: 10, color: "rgba(247,240,221,0.4)", margin: 0 }}>okruchów runicznych</p>
            </div>
          </div>
        </div>
      </Panel>

      {/* ── GŁÓWNA SIATKA ── */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20, alignItems: "start" }}>

        {/* Wizualizacja postaci – teraz wyświetlamy awatar */}
        <Panel style={{ minHeight: 380, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
          <div style={{
            width: "100%",
            maxWidth: 200,
            aspectRatio: "1/1",
            borderRadius: 12,
            overflow: "hidden",
            border: `2px solid rgba(245,196,81,0.15)`,
            background: "#000",
          }}>
            <img
              src={avatarSrc}
              alt={character.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => {
                // Jeśli obrazek się nie ładuje – pokaż emoji lub inicjał
                e.currentTarget.style.display = "none";
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.style.background = "#2a1f44";
                  parent.style.display = "flex";
                  parent.style.alignItems = "center";
                  parent.style.justifyContent = "center";
                  parent.textContent = "🧙";
                  parent.style.fontSize = "64px";
                }
              }}
            />
          </div>
          <p style={{ fontSize: 11, color: "rgba(247,240,221,0.25)", fontStyle: "italic", textAlign: "center", margin: 0 }}>
            Twój awatar
          </p>
        </Panel>

        {/* Reszta (statystyki, czary, bonusy) – bez zmian */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Statystyki */}
          <Panel>
            <p style={{ fontFamily: "Cinzel, serif", fontSize: 13, color: "#F5C451", marginBottom: 14, letterSpacing: "0.06em" }}>
              STATYSTYKI
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px 20px" }}>
              {Object.entries(STAT_LABELS).map(([key, label]) => {
                const baseVal = base[key] ?? 0;
                const effVal  = eff[key]  ?? baseVal;
                const bonus   = effVal - baseVal;
                return (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid rgba(247,240,221,0.06)" }}>
                    <span style={{ fontSize: 12, color: "rgba(247,240,221,0.55)" }}>{label}</span>
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: bonus > 0 ? "#59D4D0" : "#F7F0DD",
                    }}>
                      {effVal}
                    </span>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: 10, color: "rgba(247,240,221,0.25)", marginTop: 10 }}>
              Wartości turkusowe uwzględniają bonusy z ekwipunku
            </p>
          </Panel>

          {/* Aktywne czary */}
          <Panel>
            <p style={{ fontFamily: "Cinzel, serif", fontSize: 13, color: "#F5C451", marginBottom: 12, letterSpacing: "0.06em" }}>
              AKTYWNE CZARY
            </p>
            {spellSlots.length === 0 ? (
              <p style={{ fontSize: 12, color: "rgba(247,240,221,0.3)", fontStyle: "italic" }}>
                Brak aktywnych czarów — wyekwipuj je w Księdze Magii
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {spellSlots.map((slot: any) => (
                  <div key={slot.slotIndex} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid rgba(247,240,221,0.06)" }}>
                    <span style={{ fontSize: 10, color: "rgba(247,240,221,0.3)", minWidth: 50, fontFamily: "Cinzel, serif" }}>
                      Slot {slot.slotIndex + 1}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{slot.spell?.name ?? "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Bonusy klasy */}
          <Panel>
            <p style={{ fontFamily: "Cinzel, serif", fontSize: 13, color: "#F5C451", marginBottom: 12, letterSpacing: "0.06em" }}>
              BONUSY KLASY
            </p>
            <p style={{ fontSize: 12, color: "rgba(247,240,221,0.5)", fontStyle: "italic" }}>
              Moje magiczne JA: <span style={{ color: "#59D4D0", fontStyle: "normal" }}>—</span>
              {" — "}szczegółowe bonusy wkrótce
            </p>
          </Panel>

        </div>
      </div>
    </div>
  );
}