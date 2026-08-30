import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useCharacter } from "../contexts/CharacterContext";

// ── IMPORTY GRAFIK WIEŻY ──────────────
import towerImg1 from "../assets/tower/towerlvl1.jpg";
import towerImg2 from "../assets/tower/towerlvl3.jpg";
import towerImg3 from "../assets/tower/towerlvl5.jpg";
import towerImg4 from "../assets/tower/towerlvl10.jpg";
import towerImg5 from "../assets/tower/towerlvl15.jpg";
import towerImg6 from "../assets/tower/towerlvl25.jpg";
import towerImg7 from "../assets/tower/towerlvl50.jpg";
import towerImg8 from "../assets/tower/towerlvl75.jpg";
import disintegratorImg from "../assets/tower/disintegrator.png";
import libraryImg from "../assets/tower/librarylvl1.png";
import powerCollectorImg from "../assets/tower/powercollector.png";

const TOWER_IMAGES: Record<number, string> = {
  1: towerImg1,
  2: towerImg2,
  3: towerImg3,
  4: towerImg4,
  5: towerImg5,
  6: towerImg6,
  7: towerImg7,
  8: towerImg8,
};

const BUILDING_IMAGES: Record<string, string> = {
  disintegrator: disintegratorImg,
  library: libraryImg,
  power_collector: powerCollectorImg,
};



// ── PALETA ───────────────────────────────────────────────────────────────────
const C = {
  bg:        "#161d38",
  panel:     "#372b5d",
  panelAlt:  "rgba(0,0,0,0.15)",
  border:    "rgba(245,196,81,0.12)",
  borderSoft:"rgba(247,240,221,0.08)",
  gold:      "#F5C451",
  teal:      "#59D4D0",
  red:       "#F46A4E",
  green:     "#7FCB7F",
  text:      "#F7F0DD",
  textDim:   "rgba(247,240,221,0.55)",
  textFaint: "rgba(247,240,221,0.35)",
  textGhost: "rgba(247,240,221,0.2)",
};

// ── POZIOMY GRAFIK ─────────────────────────────────────────────────────────
function getTowerImageIndex(level: number): number {
  if (level >= 75) return 8;
  if (level >= 50) return 7;
  if (level >= 25) return 6;
  if (level >= 15) return 5;
  if (level >= 10) return 4;
  if (level >= 5)  return 3;
  if (level >= 3)  return 2;
  return 1;
}

// ── POPUPY PO ULEPSZENIU ──────────────────────────────────────────────────
const LEVEL_UP_POPUPS: Record<number, { title: string; text: string }> = {
  3:  { title: "Poziom 3 — Ściany przestały wyglądać jak ser z dziurami",
        text: "Ściany zostały pozatykane. Prowizorycznie, ale przynajmniej wiatr nie gasi już świec przy każdym oddechu. Twój wykonawca twierdzi, że to 'styl rustykalny'. Kłamie." },
  5:  { title: "Poziom 5 — Podłoga? Tak, masz już podłogę",
        text: "Deski zostały wymienione na takie, które nie trzeszczą JAK OPĘTANE przy każdym kroku. Drobna poprawa, ale Twój sąsiad nekromanta przestał myśleć, że masz duchy. Miał rację, ale to nieważne." },
  10: { title: "Poziom 10 — Okno i drzwi przestały być pośmiewiskiem dzielnicy",
        text: "Wreszcie drzwi, które nie wylatują przy silniejszym kichnięciu. Okno zamyka się bez użycia zaklęcia. To małe rzeczy, ale kiedy byłeś zmuszony blokować wejście kamieniem runistycznym... cenisz postęp." },
  15: { title: "Poziom 15 — Sufit z ambicjami",
        text: "Żyrandol trzyma się pułapu bez magicznej taśmy klejącej. Sufit przestał 'artystycznie' kapać. Goście przestaną myśleć, że mieszkasz w ruinach. Chociaż... właściwie tak było. Ale teraz to MODNE ruiny." },
  25: { title: "Poziom 25 — To się zaczyna przypominać wieżę czarodzieja",
        text: "Ktoś obcy mógłby tu wejść i pomyśleć 'o, tu mieszka ktoś ważny'. Oczywiście ten ktoś byłby w błędzie co do 'ważny', ale budynek robi właściwe wrażenie. To połowa sukcesu." },
  50: { title: "Poziom 50 — Luksus? Prawie",
        text: "Twoja wieża zaczyna budzić coś, co u innych magów można nazwać zawiścią, a u Ciebie skromnością. Nie daj się zwieść — to nadal tylko kamienie i drewno. Magiczne kamienie i enchantowane drewno, ale jednak." },
  75: { title: "Poziom 75 — Architektoniczne arcydzieło (według Ciebie)",
        text: "Legendy będą opowiadane o tej wieży. Głównie przez Ciebie, samemu sobie, w lustrze. Ale kto pyta o szczegóły? Wieża stoi. I to imponująco. Gratulacje — jesteś oficjalnie zbyt zaangażowany w grę przeglądarkową." },
};

// ── BUDYNKI — DEFINICJE ────────────────────────────────────────────────────
// Pozycje hotspotów jako % szerokości/wysokości grafiki (1800×1200)
// left, top = środek hotspotu

interface BuildingHotspot {
  key: string;
  label: string;
  icon: string;
  left: number;
  top: number;
  width: number;
  height: number;
  description: string;
  effectLabel: string;
  vaultDoors?: boolean;
}

const BUILDING_HOTSPOTS: BuildingHotspot[] = [
  {
    key: "library",
    label: "Biblioteka",
    icon: "📚",
    left: 13,
    top: 57,
    width: 13,
    height: 40,
    description: "Jeśli nie wiesz, jak coś wyczarować, to jest najlepsze miejsce do poszukiwań. Każdy poziom biblioteki dodaje slot na czar bojowy.",
    effectLabel: "+1 aktywny slot czaru bojowego",
  },
  {
    key: "disintegrator",
    label: "Dezintegrator",
    icon: "💥",
    left: 32,
    top: 52,
    width: 12,
    height: 38,
    description: "Nie podoba Ci się jakiś artefakt? Gardzisz jakimś rodzajem magii? Nie krępuj się — wrzuć ustrojstwo tutaj i patrz z satysfakcją jak wyparowuje.",
    effectLabel: "Umożliwia wymianę przedmiotów na okruchy mocy",
  },
  {
    key: "chaos_vault",
    label: "Komnata nieładu",
    icon: "🚪",
    left: 73,
    top: 52,
    width: 7,
    height: 25,
    description: "Gdzieś trzeba składować te wszystkie magiczne rupiecie. Za tymi drzwiami jest ich cała masa.",
    effectLabel: "+10 widocznych slotów na nadmiarowe przedmioty",
    vaultDoors: true,
  },
  {
    key: "power_collector",
    label: "Zbieracz mocy",
    icon: "⚡",
    left: 84,
    top: 60,
    width: 12,
    height: 38,
    description: "Pasywnie generuje okruchy mocy. Im wyższy poziom, tym więcej energii zbiera co godzinę.",
    effectLabel: "+2 okruchy mocy / godz. (skaluje się z poziomem)",
  },
  {
    key: "Altair",
    label: "Ołtarz żywiołów",
    icon: "⚗️",
    left: 52,
    top: 76,
    width: 27,
    height: 10,
    description: "Mistyczna instalacja wzmacniająca wybrany żywioł kosztem osłabienia jego przeciwieństwa. Każda para żywiołów odblokowuje się co 10 poziomów Ołtarza.",
    effectLabel: "+2% do wybranego żywiołu, −1% do przeciwnego",
  },
];

// ── ELEMENT CONFIG (Altair) ────────────────────────────────────────────────
const ELEMENT_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  fire:    { label: "Ogień",     icon: "🔥", color: "#F46A4E" },
  water:   { label: "Woda",      icon: "💧", color: "#59D4D0" },
  earth:   { label: "Ziemia",    icon: "🌿", color: "#8BAA5C" },
  air:     { label: "Powietrze", icon: "🌪",  color: "#C9D6E8" },
  chaos:   { label: "Chaos",     icon: "🌀", color: "#B681E0" },
  harmony: { label: "Harmonia",  icon: "☯",  color: "#F5C451" },
  life:    { label: "Życie",     icon: "✨", color: "#7FCB7F" },
  death:   { label: "Śmierć",   icon: "💀", color: "#9C9CB0" },
};

const ALTAIR_PAIRS: [string, string][] = [
  ["water", "fire"],
  ["earth", "air"],
  ["chaos", "harmony"],
  ["life",  "death"],
];


const GLOW_KEYFRAMES = `
  @keyframes towerGlowPulseGold {
    0%, 100% { filter: drop-shadow(0 0 8px rgba(245,196,81,0.6)) drop-shadow(0 0 20px rgba(245,196,81,0.3)); }
    50% { filter: drop-shadow(0 0 16px rgba(245,196,81,0.9)) drop-shadow(0 0 40px rgba(245,196,81,0.5)); }
  }
  @keyframes towerGlowPulseGreen {
    0%, 100% { filter: drop-shadow(0 0 8px rgba(127,203,127,0.6)) drop-shadow(0 0 20px rgba(127,203,127,0.3)); }
    50% { filter: drop-shadow(0 0 16px rgba(127,203,127,0.9)) drop-shadow(0 0 40px rgba(127,203,127,0.5)); }
  }
  .glow-gold {
    animation: towerGlowPulseGold 2s ease-in-out infinite;
  }
  .glow-green {
    animation: towerGlowPulseGreen 2s ease-in-out infinite;
  }
  .ghost-building {
    filter: grayscale(1) brightness(0.6);
  }
`;

// ── TIMER ─────────────────────────────────────────────────────────────────
function Timer({ finishesAt, onDone }: { finishesAt: string; onDone: () => void }) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = new Date(finishesAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Gotowe!"); clearInterval(interval); setTimeout(onDone, 500); }
      else { const m = Math.floor(diff / 60000); const s = Math.floor((diff % 60000) / 1000); setTimeLeft(`${m}:${s.toString().padStart(2, "0")}`); }
    }, 1000);
    return () => clearInterval(interval);
  }, [finishesAt, onDone]);
  return <span style={{ fontFamily: "Cinzel, serif", fontWeight: 700, color: C.gold, fontSize: 15 }}>{timeLeft}</span>;
}

// ── LEVEL UP POPUP ────────────────────────────────────────────────────────
function LevelUpPopup({ level, onClose }: { level: number; onClose: () => void }) {
  const popup = LEVEL_UP_POPUPS[level];
  if (!popup) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "linear-gradient(135deg, #1e1440 0%, #2a1f55 100%)",
          border: `1px solid ${C.gold}`,
          borderRadius: 16, padding: "32px 36px", maxWidth: 440, margin: 16,
          boxShadow: `0 0 60px rgba(245,196,81,0.25), 0 20px 60px rgba(0,0,0,0.8)`,
          position: "relative",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 36 }}>🗼</span>
        </div>
        <p style={{
          fontFamily: "Cinzel, serif", fontSize: 15, fontWeight: 700,
          color: C.gold, textAlign: "center", margin: "0 0 12px", lineHeight: 1.4,
        }}>
          {popup.title}
        </p>
        <p style={{ fontSize: 13, color: C.textDim, textAlign: "center", lineHeight: 1.7, margin: "0 0 24px" }}>
          {popup.text}
        </p>
        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "10px", borderRadius: 8,
            background: C.gold, border: "none", color: C.bg,
            fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: 12,
            letterSpacing: "0.06em", cursor: "pointer",
          }}
        >
          Tak, zgadzam się z tą oceną
        </button>
      </div>
    </div>
  );
}

// ── VAULT CONFIRM MODAL ───────────────────────────────────────────────────
function VaultConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 900,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(3px)",
    }} onClick={onCancel}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#1e1440", border: `1px solid ${C.border}`,
          borderRadius: 14, padding: "28px 32px", maxWidth: 360, margin: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
        }}
      >
        <p style={{ fontSize: 22, textAlign: "center", margin: "0 0 12px" }}>🚪</p>
        <p style={{
          fontFamily: "Cinzel, serif", fontSize: 14, fontWeight: 700,
          color: C.text, textAlign: "center", margin: "0 0 10px",
        }}>
          Komnata nieładu
        </p>
        <p style={{ fontSize: 13, color: C.textDim, textAlign: "center", lineHeight: 1.6, margin: "0 0 24px" }}>
          Chcesz wejść do Komnaty nieładu? Wróć w każdej chwili z powrotem do wieży.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: "9px", borderRadius: 8,
            background: "rgba(247,240,221,0.07)", border: `1px solid ${C.borderSoft}`,
            color: C.textDim, fontSize: 12, cursor: "pointer", fontFamily: "Cinzel, serif",
          }}>
            Zostań
          </button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: "9px", borderRadius: 8,
            background: C.gold, border: "none",
            color: C.bg, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Cinzel, serif",
          }}>
            Wejdź
          </button>
        </div>
      </div>
    </div>
  );
}

// ── BUDYNEK MODAL ─────────────────────────────────────────────────────────
function BuildingModal({
  hotspot, buildingData, towerData, onClose, onAction, onRefresh, currentShards,
}: {
  hotspot: BuildingHotspot;
  buildingData: any;
  towerData: any;
  onClose: () => void;
  onAction: (start: string, claim: string) => { start: () => Promise<void>; claim: () => Promise<void> };
  onRefresh: () => void;
  currentShards: number;
}) {
  const [loading, setLoading] = useState(false);
  const [altairSelecting, setAltairSelecting] = useState(false);

  const endpointMap: Record<string, [string, string]> = {
    library:         ["/tower/library/start",         "/tower/library/claim"],
    disintegrator:   ["/tower/disintegrator/start",   "/tower/disintegrator/claim"],
    power_collector: ["/tower/power-collector/start", "/tower/power-collector/claim"],
    chaos_vault:     ["/tower/chaos-vault/start",     "/tower/chaos-vault/claim"],
    Altair:          ["/tower/altair/start",           "/tower/altair/claim"],
    trophy_cabinet:  ["/tower/trophy-cabinet/start",  "/tower/trophy-cabinet/claim"],
    magic_notebook:  ["/tower/magic-notebook/start",  "/tower/magic-notebook/claim"],
  };

  const endpoints = endpointMap[hotspot.key];
  const acts = endpoints ? onAction(endpoints[0], endpoints[1]) : null;

  const b = buildingData;
  if (!b) return null;

  const isReady = b.isUpgrading && b.upgradeFinishesAt && new Date() >= new Date(b.upgradeFinishesAt);

  async function handleStart() {
    if (!acts) return;
    setLoading(true);
    try { await acts.start(); onClose(); }
    catch (err: any) { alert(err?.message ?? "Błąd"); }
    finally { setLoading(false); }
  }
  async function handleClaim() {
    if (!acts) return;
    setLoading(true);
    try { await acts.claim(); onClose(); }
    catch (err: any) { alert(err?.message ?? "Błąd"); }
    finally { setLoading(false); }
  }

  async function handleAltairSelect(pairIndex: number, element: string) {
    setAltairSelecting(true);
    try {
      await api.post("/tower/altair/select-element", { pairIndex, element });
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd wyboru żywiołu");
    } finally {
      setAltairSelecting(false);
    }
  }

  const isAltair = hotspot.key === "Altair";
  const altairData = isAltair ? towerData?.buildings?.Altair : null;
  const altairSelections: (string | null)[] = altairData?.selections ?? ALTAIR_PAIRS.map(() => null);
  const unlockedPairs: number = altairData?.unlockedPairs ?? 0;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 900,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)",
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "linear-gradient(160deg, #1a1240 0%, #231752 100%)",
          border: `1px solid ${C.border}`,
          borderRadius: 16, padding: "0", maxWidth: isAltair ? 520 : 400,
          width: "100%", margin: 16, maxHeight: "85vh", overflow: "hidden",
          display: "flex", flexDirection: "column",
          boxShadow: "0 24px 80px rgba(0,0,0,0.9)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: `1px solid ${C.borderSoft}`,
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <span style={{ fontSize: 28 }}>{hotspot.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <p style={{ fontFamily: "Cinzel, serif", fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>
                {hotspot.label}
              </p>
              <span style={{
                fontSize: 10, padding: "2px 8px", borderRadius: 6,
                background: b.level > 0 ? "rgba(89,212,208,0.12)" : C.panelAlt,
                color: b.level > 0 ? C.teal : C.textFaint,
                fontFamily: "Cinzel, serif", fontWeight: 700,
              }}>
                {b.level > 0 ? `Poziom ${b.level}${b.maxLevel ? `/${b.maxLevel}` : ""}` : "Niewybudowany"}
              </span>
            </div>
            <p style={{ fontSize: 12, color: C.textDim, margin: "4px 0 0", lineHeight: 1.5 }}>
              {hotspot.description}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: C.textFaint,
            fontSize: 20, cursor: "pointer", padding: 4, flexShrink: 0,
          }}>✕</button>
        </div>

        {/* Scrollable body */}
        <div style={{ padding: "16px 24px 20px", overflowY: "auto", flex: 1 }}>

          {/* Efekt aktualny */}
          <div style={{
            padding: "8px 12px", borderRadius: 8, marginBottom: 16,
            background: "rgba(89,212,208,0.06)", border: `1px solid rgba(89,212,208,0.15)`,
          }}>
            <span style={{ fontSize: 11, color: C.textFaint }}>Efekt po wybudowaniu: </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.teal }}>{hotspot.effectLabel}</span>
          </div>

          {/* Altair — wybór żywiołów */}
          {isAltair && b.level > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{
                fontSize: 10, color: C.gold, fontFamily: "Cinzel, serif",
                letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 10px",
              }}>
                Konfiguracja par żywiołów
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ALTAIR_PAIRS.map((pair, i) => {
                  const unlocked = i < unlockedPairs;
                  const selected = altairSelections[i];
                  return (
                    <div key={i} style={{
                      padding: "10px 14px", borderRadius: 10,
                      background: unlocked ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.12)",
                      border: `1px solid ${unlocked ? C.borderSoft : "rgba(247,240,221,0.04)"}`,
                      opacity: unlocked ? 1 : 0.45,
                    }}>
                      <p style={{
                        fontSize: 10, color: C.textFaint, fontFamily: "Cinzel, serif",
                        letterSpacing: "0.05em", textTransform: "uppercase", margin: "0 0 8px",
                      }}>
                        {unlocked ? `Para ${i + 1}` : `🔒 Odblokowuje się na poziomie ${i * 10 + 1} Ołtarza`}
                      </p>
                      <div style={{ display: "flex", gap: 8 }}>
                        {pair.map(element => {
                          const cfg = ELEMENT_LABELS[element];
                          const isSelected = selected === element;
                          return (
                            <button key={element}
                              onClick={() => unlocked && !altairSelecting && handleAltairSelect(i, element)}
                              disabled={!unlocked || altairSelecting}
                              style={{
                                flex: 1, padding: "8px 6px", borderRadius: 8,
                                border: `1px solid ${isSelected ? cfg.color : C.borderSoft}`,
                                background: isSelected ? `${cfg.color}22` : "rgba(0,0,0,0.2)",
                                color: isSelected ? cfg.color : C.textDim,
                                fontSize: 12, fontWeight: isSelected ? 700 : 400,
                                cursor: unlocked ? "pointer" : "not-allowed",
                                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                                transition: "all 0.15s",
                              }}
                            >
                              <span style={{ fontSize: 16 }}>{cfg.icon}</span>
                              <span style={{ fontSize: 10, fontFamily: "Cinzel, serif" }}>{cfg.label}</span>
                              {isSelected && <span style={{ fontSize: 9, color: cfg.color }}>▲ +2% obrażeń</span>}
                              {!isSelected && selected && selected !== element &&
                                <span style={{ fontSize: 9, color: C.textGhost }}>▼ −1% obrażeń</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stan budynku */}
          {!b.towerLevelMet ? (
            <div style={{
              padding: "10px 14px", borderRadius: 8,
              background: "rgba(244,106,78,0.08)", border: "1px solid rgba(244,106,78,0.2)",
            }}>
              <p style={{ fontSize: 12, color: C.red, margin: 0 }}>
                🔒 Dostępne od poziomu {b.requiredTowerLevel} wieży
              </p>
            </div>
          ) : b.isUpgrading ? (
            isReady ? (
              <button onClick={handleClaim} disabled={loading} style={btnStyle(C.green)}>
                {loading ? "..." : "Odbierz rozbudowę ✓"}
              </button>
            ) : (
              <div style={{
                padding: "12px 16px", borderRadius: 8,
                background: "rgba(89,212,208,0.06)", border: "1px solid rgba(89,212,208,0.2)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <p style={{ fontSize: 12, color: C.teal, margin: 0 }}>
                  Trwa rozbudowa do poziomu {b.level + 1}...
                </p>
                {b.upgradeFinishesAt && <Timer finishesAt={b.upgradeFinishesAt} onDone={handleClaim} />}
              </div>
            )
          ) : b.atMaxLevel ? (
            <p style={{ fontSize: 12, color: C.textFaint, fontStyle: "italic", margin: 0 }}>
              Budynek osiągnął maksymalny poziom ({b.maxLevel}).
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {b.unmetReqs?.length > 0 && (
                <div style={{
                  padding: "10px 14px", borderRadius: 8,
                  background: "rgba(244,106,78,0.06)", border: "1px solid rgba(244,106,78,0.15)",
                }}>
                  <p style={{ fontSize: 11, color: C.red, margin: "0 0 4px", fontWeight: 700 }}>
                    Nie spełniasz wymagań:
                  </p>
                  {b.unmetReqs.map((r: string, i: number) => (
                    <p key={i} style={{ fontSize: 11, color: C.red, margin: 0 }}>✕ {r}</p>
                  ))}
                </div>
              )}
              <div style={{
                padding: "10px 14px", borderRadius: 8,
                background: "rgba(0,0,0,0.2)", border: `1px solid ${C.borderSoft}`,
                display: "flex", flexDirection: "column", gap: 4,
              }}>
                {b.upgradeReqs?.costShards > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: C.textFaint }}>Koszt</span>
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: currentShards < b.upgradeReqs.costShards ? C.red : C.textDim,
                    }}>
                      {b.upgradeReqs.costShards} okruchów mocy
                    </span>
                  </div>
                )}
                {b.upgradeReqs?.durationSeconds > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: C.textFaint }}>Czas budowy</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.textDim }}>
                      {Math.round(b.upgradeReqs.durationSeconds / 60)} min
                    </span>
                  </div>
                )}
              </div>
              <button onClick={handleStart} disabled={loading || !b.canUpgrade} style={btnStyle(C.gold, !b.canUpgrade || loading)}>
                {loading ? "..." : `Rozbuduj do poziomu ${b.level + 1}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function btnStyle(color: string, disabled = false): React.CSSProperties {
  return {
    width: "100%", padding: "10px 18px", borderRadius: 8, border: "none",
    fontSize: 12, fontWeight: 700, fontFamily: "Cinzel, serif",
    letterSpacing: "0.05em", cursor: disabled ? "not-allowed" : "pointer",
    background: disabled ? "rgba(245,196,81,0.12)" : color,
    color: disabled ? C.textGhost : "#161d38",
    transition: "all 0.2s",
  };
}

// ── TOWER UPGRADE BAR ────────────────────────────────────────────────────
function TowerUpgradeBar({
  tower, onStart, onClaim, onRefresh,
}: {
  tower: any;
  onStart: () => Promise<void>;
  onClaim: () => Promise<void>;
  onRefresh: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const canUpgrade = tower.canUpgrade;
  const isUpgrading = tower.isUpgrading;
  const isReady = isUpgrading && tower.upgradeFinishesAt && new Date() >= new Date(tower.upgradeFinishesAt);
  const unmet: string[] = tower.unmetReqs ?? [];

  async function handleStart() {
    setLoading(true);
    try { await onStart(); }
    catch (err: any) { alert(err?.message ?? "Błąd"); }
    finally { setLoading(false); }
  }
  async function handleClaim() {
    setLoading(true);
    try { await onClaim(); }
    catch (err: any) { alert(err?.message ?? "Błąd"); }
    finally { setLoading(false); }
  }

  const barBg = canUpgrade
    ? "linear-gradient(90deg, rgba(245,196,81,0.12) 0%, rgba(245,196,81,0.06) 100%)"
    : "rgba(22,29,56,0.85)";
  const barBorder = canUpgrade ? `1px solid rgba(245,196,81,0.35)` : `1px solid ${C.borderSoft}`;

  return (
    <div style={{
      background: barBg,
      border: barBorder,
      borderRadius: 12, padding: "12px 18px",
      display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
      marginBottom: 12,
      boxShadow: canUpgrade ? "0 0 20px rgba(245,196,81,0.12)" : "none",
      transition: "all 0.4s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>🗼</span>
        <div>
          <p style={{
            fontFamily: "Cinzel, serif", fontSize: 12, fontWeight: 700,
            color: C.text, margin: "0 0 2px",
          }}>
            Wieża Magów — Poziom {tower.level}
          </p>
          {isUpgrading && !isReady ? (
            <p style={{ fontSize: 11, color: C.teal, margin: 0 }}>
              Rozbudowa w toku do poz. {tower.level + 1}
            </p>
          ) : unmet.length > 0 ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {unmet.map((r, i) => (
                <span key={i} style={{ fontSize: 10, color: C.red }}>✕ {r}</span>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 11, color: canUpgrade ? C.green : C.textFaint, margin: 0 }}>
              {canUpgrade ? "✓ Wymagania spełnione — możesz rozbudować!" : `Następny poziom: ${tower.level + 1}`}
            </p>
          )}
        </div>
      </div>

      {/* Reqs summary */}
      {!isUpgrading && (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {[
            { label: "Wiedza", val: tower.upgradeReqs?.knowledge },
            { label: "Inteligencja", val: tower.upgradeReqs?.intelligence },
            { label: "Prestiż", val: tower.upgradeReqs?.prestige },
          ].filter(r => r.val).map(r => (
            <div key={r.label} style={{ textAlign: "center" }}>
              <p style={{ fontSize: 10, color: C.textFaint, margin: 0 }}>{r.label}</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.gold, margin: 0 }}>{r.val}</p>
            </div>
          ))}
          {tower.upgradeReqs?.durationSeconds > 0 && (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 10, color: C.textFaint, margin: 0 }}>Czas</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.textDim, margin: 0 }}>
                {Math.round(tower.upgradeReqs.durationSeconds / 60)} min
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action button */}
      <div style={{ flexShrink: 0 }}>
        {isUpgrading ? (
          isReady ? (
            <button onClick={handleClaim} disabled={loading} style={{
              ...btnStyle(C.green, loading),
              width: "auto", padding: "8px 18px", whiteSpace: "nowrap",
            }}>
              {loading ? "..." : "Odbierz ✓"}
            </button>
          ) : (
            tower.upgradeFinishesAt && <Timer finishesAt={tower.upgradeFinishesAt} onDone={onRefresh} />
          )
        ) : (
          <button onClick={handleStart} disabled={loading || !canUpgrade} style={{
            ...btnStyle(C.gold, loading || !canUpgrade),
            width: "auto", padding: "8px 18px", whiteSpace: "nowrap",
          }}>
            {loading ? "..." : `Rozbuduj → ${tower.level + 1}`}
          </button>
        )}
      </div>
    </div>
  );
}

// ── CSS KEYFRAMES INJECTION ───────────────────────────────────────────────

function injectGlobalStyles() {
  if (document.getElementById("tower-keyframes")) return;
  const style = document.createElement("style");
  style.id = "tower-keyframes";
  style.textContent = GLOW_KEYFRAMES;
  document.head.appendChild(style);
}

// ── GŁÓWNY KOMPONENT ──────────────────────────────────────────────────────
export default function TowerView() {
  const { refresh: refreshCharacter } = useCharacter();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openBuilding, setOpenBuilding] = useState<BuildingHotspot | null>(null);
  const [vaultConfirm, setVaultConfirm] = useState(false);
  const [levelUpPopup, setLevelUpPopup] = useState<number | null>(null);
  const prevTowerLevel = useRef<number | null>(null);

  useEffect(() => { injectGlobalStyles(); }, []);

  const fetchTower = useCallback(async () => {
    try {
      const res = await api.get("/tower");
      setData(res.data);
      await refreshCharacter();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd ładowania wieży");
    } finally {
      setLoading(false);
    }
  }, [refreshCharacter]);

  useEffect(() => { fetchTower(); }, [fetchTower]);

  // Sprawdź czy poziom wieży wzrósł i pokaż popup
  useEffect(() => {
    if (!data) return;
    const lvl: number = data.tower.level;
    if (prevTowerLevel.current !== null && lvl > prevTowerLevel.current) {
      if (LEVEL_UP_POPUPS[lvl]) setLevelUpPopup(lvl);
    }
    prevTowerLevel.current = lvl;
  }, [data?.tower?.level]);

  function makeActions(start: string, claim: string) {
    return {
      start: async () => { await api.post(start); await fetchTower(); },
      claim: async () => { await api.post(claim); await fetchTower(); },
    };
  }

  function onAction(start: string, claim: string) {
    return makeActions(start, claim);
  }

  if (loading) return <p style={{ color: C.textFaint, fontSize: 13 }}>Ładowanie...</p>;
  if (!data) return null;

  const { tower, buildings, resources } = data;

  // Poziom grafiki
  const imgIndex = getTowerImageIndex(tower.level);
  const imgSrc = TOWER_IMAGES[imgIndex] ?? towerImg1;

  function getBuildingData(key: string) {
    return buildings[key] ?? null;
  }

function getBuildingState(b: any): "ghost" | "upgrading" | "ready" | "can_upgrade" | "built" {
  if (!b || !b.towerLevelMet || b.level === 0) return "ghost";
  if (b.isUpgrading) {
    const ready = b.upgradeFinishesAt && new Date() >= new Date(b.upgradeFinishesAt);
    return ready ? "ready" : "upgrading";
  }
  if (b.canUpgrade) return "can_upgrade";
  return "built";
}

  const towerActs = makeActions("/tower/upgrade/start", "/tower/upgrade/claim");

function getBuildingGlow(state: ReturnType<typeof getBuildingState>): string {
  switch (state) {
    case "upgrading":
      return "drop-shadow(0 0 10px rgba(89,212,208,0.7))";
    default:
      return "none";
  }
}

  return (
    <div>
      <h1 style={{
        fontFamily: "Cinzel, serif", color: C.gold, fontSize: 22,
        marginBottom: 16, letterSpacing: "0.06em",
      }}>
        Wieża
      </h1>

      {/* Pasek ulepszenia wieży */}
      <TowerUpgradeBar
        tower={tower}
        onStart={towerActs.start}
        onClaim={towerActs.claim}
        onRefresh={fetchTower}
      />

      {/* Grafika wieży z hotspotami */}
      <div style={{
        position: "relative",
        width: "100%",
        borderRadius: 14,
        overflow: "hidden",
        border: `1px solid ${C.borderSoft}`,
        boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
      }}>
        <img
          src={imgSrc}
          alt={`Wnętrze wieży — poziom ${tower.level}`}
          style={{ width: "100%", display: "block", userSelect: "none" }}
          draggable={false}
        />

        {/* Hotspoty budynków */}
{BUILDING_HOTSPOTS.map(hs => {
  const b = getBuildingData(hs.key);
  const state = getBuildingState(b);
  const imgSrc = BUILDING_IMAGES[hs.key];
  const showImage = imgSrc && b; // wyświetlamy grafikę zawsze, gdy istnieje

  const filterStyle = (state === "upgrading") ? getBuildingGlow(state) : "none";
  const className = state === "can_upgrade" ? "glow-gold" :
                    state === "ready"       ? "glow-green" :
                    state === "ghost"       ? "ghost-building" : "";

  return (
    <React.Fragment key={hs.key}>
      {showImage && (
        <img
          src={imgSrc}
          alt={hs.label}
          style={{
            position: "absolute",
            left: `${hs.left - hs.width / 2}%`,
            top: `${hs.top - hs.height / 2}%`,
            width: `${hs.width}%`,
            height: `${hs.height}%`,
            objectFit: "cover",
            borderRadius: "8px",          // dopasuj do swoich potrzeb
            pointerEvents: "none",
            zIndex: 1,
            filter: filterStyle,
            transition: "filter 0.3s ease",
          }}
          className={className}
        />
      )}

      <div
        style={{
          position: "absolute",
          left: `${hs.left - hs.width / 2}%`,
          top: `${hs.top - hs.height / 2}%`,
          width: `${hs.width}%`,
          height: `${hs.height}%`,
          zIndex: 2,
          cursor: "pointer",
          background: "transparent",
          border: "none",
          borderRadius: "8px",
        }}
        onClick={() => {
          if (hs.vaultDoors && state !== "ghost") {
            setVaultConfirm(true);
            return;
          }
          setOpenBuilding(hs);
        }}
      >
        {/* Usunięto div z ikonkami */}
      </div>
    </React.Fragment>
  );
})}
      </div>

      {/* Legenda */}
      <div style={{
        display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10,
        padding: "8px 12px", borderRadius: 8,
        background: "rgba(0,0,0,0.2)", border: `1px solid ${C.borderSoft}`,
      }}>
        {[
          { color: C.gold, label: "Można ulepszyć" },
          { color: C.green, label: "Gotowe do odbioru" },
          { color: C.teal, label: "W trakcie budowy" },
          { color: C.textGhost, label: "Niewybudowane" },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: 2,
              background: l.color, opacity: l ? 0.4 : 1,
            }} />
            <span style={{ fontSize: 10, color: C.textFaint }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Modals */}
      {openBuilding && (
        <BuildingModal
          hotspot={openBuilding}
          buildingData={getBuildingData(openBuilding.key)}
          towerData={data}
          onClose={() => setOpenBuilding(null)}
          onAction={onAction}
          onRefresh={fetchTower}
          currentShards={resources.powerShards}
        />
      )}

      {vaultConfirm && (
        <VaultConfirmModal
          onConfirm={() => navigate("/vault")}
          onCancel={() => setVaultConfirm(false)}
        />
      )}

      {levelUpPopup !== null && (
        <LevelUpPopup
          level={levelUpPopup}
          onClose={() => setLevelUpPopup(null)}
        />
      )}
    </div>
  );
}