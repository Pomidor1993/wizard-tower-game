import { useEffect, useState, useCallback } from "react";
import api from "../api/client";

const C = {
  panel:      "#372b5d",
  panelAlt:   "rgba(0,0,0,0.18)",
  border:     "rgba(245,196,81,0.12)",
  borderSoft: "rgba(247,240,221,0.08)",
  gold:       "#F5C451",
  teal:       "#59D4D0",
  red:        "#F46A4E",
  purple:     "#B681E0",
  green:      "#4ade80",
  sky:        "#38bdf8",
  text:       "#F7F0DD",
  textDim:    "rgba(247,240,221,0.55)",
  textFaint:  "rgba(247,240,221,0.35)",
  textGhost:  "rgba(247,240,221,0.2)",
  bg:         "#161d38",
};

const RIFT_COLORS: Record<string, { primary: string; secondary: string; glow: string }> = {
  green: { primary: "#4ade80", secondary: "#38bdf8", glow: "rgba(74,222,128,0.35)" },
};

interface UnstableRift {
  id: number;
  riftKey: string;
  worldKey: string;
  riftName: string;
  worldName: string;
  status: "open" | "active" | "completed" | "dismissed";
  openedAt: string;
  run: { id: number; worldKey: string; status: string; xpEarned: number | null } | null;
}

interface RiftNode {
  key: string;
  description: string;
  isEnd: boolean;
  choices: RiftChoice[];
}

interface RiftChoice {
  key: "A" | "B" | "C";
  label: string;
  locked: boolean;
  requiredSpellName: string | null;
}

interface ChoiceResult {
  type: "goto" | "test" | "fight" | "end";
  success?: boolean;
  testChance?: number;
  playerWon?: boolean;
  entityName?: string;
  description?: string;
  xpEarned?: number;
  xpModifier?: number;
  levelResult?: { level: number; levelsGained: number };
  prestigeEarned?: number;
  prestigeLost?: number;
  trophy?: { key: string; name: string } | null;
  item?: { name: string; rarity: string; tier: number; message: string } | null;
  nextNode?: RiftNode;
  [key: string]: any;
}

interface BattleLogEntry {
  turn: number;
  events: {
    type: string;
    attacker: string;
    target: string;
    damage: number;
    targetHpAfter: number;
    description: string;
    spellName?: string;
    healAmount?: number;
  }[];
  sideAFighterHps: { name: string; hp: number }[];
  sideBFighterHps: { name: string; hp: number }[];
}

interface FightEvent {
  entityName: string;
  playerWon: boolean;
  battleLog: BattleLogEntry[];
  summary: string;
  pendingResult: ChoiceResult; // wynik do zastosowania po zamknięciu raportu
}

const RARITY_COLORS: Record<string, string> = {
  common: "#aaa", uncommon: C.teal, rare: C.purple, unique: C.gold,
};

function Panel({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: C.panel, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, ...style }}>{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p style={{ fontFamily: "Cinzel, serif", fontSize: 12, color: C.gold, letterSpacing: "0.1em", marginBottom: 14, marginTop: 0 }}>{children}</p>;
}

function ActionBtn({ onClick, disabled = false, children, color = C.teal, style = {} }: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode; color?: string; style?: React.CSSProperties;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${color}`, background: "transparent", color, fontFamily: "Cinzel, serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1, transition: "all 0.15s", whiteSpace: "nowrap", ...style }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = `${color}22`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
    >{children}</button>
  );
}

function RiftArt({ riftKey, size = 320 }: { riftKey: string; size?: number }) {
  const colors = RIFT_COLORS[riftKey] ?? RIFT_COLORS["green"]!;
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <svg width={size} height={size} viewBox="0 0 320 320" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id={`rg_${riftKey}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.primary} stopOpacity="0.5" />
            <stop offset="60%" stopColor={colors.secondary} stopOpacity="0.15" />
            <stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`rc_${riftKey}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.secondary} stopOpacity="0.9" />
            <stop offset="40%" stopColor={colors.primary} stopOpacity="0.6" />
            <stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
          </radialGradient>
          <filter id={`fb_${riftKey}`}><feGaussianBlur stdDeviation="8" /></filter>
          <filter id={`fs_${riftKey}`}><feGaussianBlur stdDeviation="3" /></filter>
        </defs>
        <circle cx="160" cy="160" r="130" fill={`url(#rg_${riftKey})`} filter={`url(#fb_${riftKey})`}>
          <animate attributeName="r" values="120;135;120" dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.7;1;0.7" dur="4s" repeatCount="indefinite" />
        </circle>
        {[110, 90, 72].map((r, i) => (
          <circle key={i} cx="160" cy="160" r={r} fill="none"
            stroke={i % 2 === 0 ? colors.primary : colors.secondary}
            strokeWidth={i === 0 ? 1.5 : 1} strokeOpacity={0.3 - i * 0.05}
            strokeDasharray={`${r * 0.3} ${r * 0.15}`}>
            <animateTransform attributeName="transform" type="rotate"
              from="0 160 160" to={`${i % 2 === 0 ? 360 : -360} 160 160`}
              dur={`${8 + i * 4}s`} repeatCount="indefinite" />
          </circle>
        ))}
        <ellipse cx="160" cy="160" rx="55" ry="72" fill={`url(#rc_${riftKey})`} filter={`url(#fs_${riftKey})`}>
          <animate attributeName="ry" values="68;76;68" dur="3.5s" repeatCount="indefinite" />
          <animate attributeName="rx" values="52;58;52" dur="3.5s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="160" cy="160" rx="28" ry="38" fill={C.bg} opacity="0.92">
          <animate attributeName="ry" values="35;42;35" dur="3.5s" repeatCount="indefinite" />
        </ellipse>
        {[0, 60, 120, 180, 240, 300].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const r = 88 + (i % 2) * 14;
          return (
            <circle key={i} cx={160 + Math.cos(rad) * r} cy={160 + Math.sin(rad) * r} r={2.5}
              fill={i % 2 === 0 ? colors.primary : colors.secondary}>
              <animate attributeName="opacity" values="0;1;0" dur={`${1.5 + i * 0.3}s`} begin={`${i * 0.25}s`} repeatCount="indefinite" />
              <animate attributeName="r" values="1.5;3.5;1.5" dur={`${1.5 + i * 0.3}s`} begin={`${i * 0.25}s`} repeatCount="indefinite" />
            </circle>
          );
        })}
        <ellipse cx="160" cy="160" rx="55" ry="72" fill="none" stroke={colors.primary} strokeWidth="2" strokeOpacity="0.7">
          <animate attributeName="ry" values="68;76;68" dur="3.5s" repeatCount="indefinite" />
          <animate attributeName="rx" values="52;58;52" dur="3.5s" repeatCount="indefinite" />
        </ellipse>
      </svg>
    </div>
  );
}

function EmptyRiftArt({ size = 280 }: { size?: number }) {
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <svg width={size} height={size} viewBox="0 0 280 280" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="emptyGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(247,240,221,0.08)" />
            <stop offset="100%" stopColor="rgba(247,240,221,0)" />
          </radialGradient>
        </defs>
        <circle cx="140" cy="140" r="110" fill="url(#emptyGlow)" />
        {[90, 70, 52].map((r, i) => (
          <circle key={i} cx="140" cy="140" r={r} fill="none" stroke="rgba(247,240,221,0.08)" strokeWidth="1" strokeDasharray={`${r * 0.2} ${r * 0.1}`}>
            <animateTransform attributeName="transform" type="rotate"
              from="0 140 140" to={`${i % 2 === 0 ? 360 : -360} 140 140`}
              dur={`${16 + i * 6}s`} repeatCount="indefinite" />
          </circle>
        ))}
        <ellipse cx="140" cy="140" rx="40" ry="55" fill="none" stroke="rgba(247,240,221,0.06)" strokeWidth="1.5" strokeDasharray="8 6">
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="5s" repeatCount="indefinite" />
        </ellipse>
        <text x="140" y="148" textAnchor="middle" fill="rgba(247,240,221,0.12)" style={{ fontSize: 40, fontFamily: "Cinzel, serif" }}>?</text>
      </svg>
    </div>
  );
}

function EndView({ result, onClose }: { result: ChoiceResult; onClose: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Panel style={{ borderColor: "rgba(245,196,81,0.2)" }}>
        <SectionTitle>WYPRAWA ZAKONCZONA</SectionTitle>
        {result.description && <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.8, marginBottom: 16 }}>{result.description}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {result.xpEarned !== undefined && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(245,196,81,0.06)", border: "1px solid rgba(245,196,81,0.15)" }}>
              <span style={{ fontSize: 18 }}>✨</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.gold, margin: 0 }}>+{result.xpEarned} punktow doswiadczenia</p>
                {result.xpModifier !== undefined && result.xpModifier !== 0 && (
                  <p style={{ fontSize: 11, color: C.textFaint, margin: "2px 0 0" }}>Modyfikator: {result.xpModifier > 0 ? "+" : ""}{result.xpModifier}%</p>
                )}
                {result.levelResult && result.levelResult.levelsGained > 0 && (
                  <p style={{ fontSize: 11, color: C.teal, margin: "2px 0 0" }}>Awans! Nowy poziom: {result.levelResult.level}</p>
                )}
              </div>
            </div>
          )}
          {result.prestigeEarned !== undefined && result.prestigeEarned > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(182,129,224,0.08)", border: "1px solid rgba(182,129,224,0.2)" }}>
              <span style={{ fontSize: 18 }}>⚔️</span>
              <p style={{ fontSize: 13, color: C.purple, margin: 0, fontWeight: 600 }}>+{result.prestigeEarned} prestizu</p>
            </div>
          )}
          {result.prestigeLost !== undefined && result.prestigeLost > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(244,106,78,0.08)", border: "1px solid rgba(244,106,78,0.2)" }}>
              <span style={{ fontSize: 18 }}>💔</span>
              <p style={{ fontSize: 13, color: C.red, margin: 0, fontWeight: 600 }}>-{result.prestigeLost} prestizu</p>
            </div>
          )}
          {result.trophy && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(245,196,81,0.08)", border: "1px solid rgba(245,196,81,0.25)" }}>
              <span style={{ fontSize: 18 }}>🏆</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.gold, margin: 0 }}>Trofeum: {result.trophy.name}</p>
                <p style={{ fontSize: 11, color: C.textFaint, margin: "2px 0 0" }}>Dodano do Twojej kolekcji</p>
              </div>
            </div>
          )}
          {result.item && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(0,0,0,0.2)", border: `1px solid ${RARITY_COLORS[result.item.rarity] ?? C.borderSoft}44` }}>
              <span style={{ fontSize: 18 }}>📦</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: RARITY_COLORS[result.item.rarity] ?? C.text, margin: 0 }}>{result.item.name} (Tier {result.item.tier})</p>
                <p style={{ fontSize: 11, color: C.textFaint, margin: "2px 0 0" }}>{result.item.message}</p>
              </div>
            </div>
          )}
        </div>
      </Panel>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <ActionBtn onClick={onClose} color={C.gold} style={{ padding: "11px 32px", fontSize: 12 }}>Zamknij szczelinę</ActionBtn>
      </div>
    </div>
  );
}

function FightReport({ event, colors, onContinue }: {
  event: FightEvent;
  colors: { primary: string; secondary: string; glow: string };
  onContinue: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Panel style={{ borderColor: event.playerWon ? `${colors.primary}40` : "rgba(244,106,78,0.3)" }}>
        <SectionTitle>STARCIE: {event.entityName.toUpperCase()}</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto", paddingRight: 4 }}>
          {event.battleLog.map((turnLog: any, ti: number) => (
            <div key={ti}>
              <p style={{ fontSize: 10, color: C.textGhost, margin: "6px 0 2px", fontFamily: "Cinzel, serif", letterSpacing: "0.08em" }}>
                TURA {turnLog.turn}
              </p>
              {(turnLog.events ?? [])
                .filter((e: any) => e.description)
                .map((e: any, ei: number) => (
                  <p key={ei} style={{
                    fontSize: 12,
                    color: e.type === "dot_tick"       ? C.red
                         : e.type === "heal_tick"      ? C.green
                         : e.type === "stun"           ? C.purple
                         : e.type === "miss"           ? C.textGhost
                         : e.type === "status_applied" ? C.teal
                         : e.type === "status_expired" ? C.textFaint
                         : e.damage > 0               ? C.text
                         : C.textDim,
                    margin: 0,
                    lineHeight: 1.7,
                    paddingLeft: 8,
                    borderLeft: `2px solid ${
                      e.type === "dot_tick"  ? `${C.red}44`
                    : e.type === "heal_tick" ? `${C.green}44`
                    : e.type === "stun"      ? `${C.purple}44`
                    : e.damage > 0           ? `${colors.primary}44`
                    : C.borderSoft
                    }`,
                    marginBottom: 2,
                  }}>
                    {e.description}
                  </p>
                ))}
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 14,
          padding: "10px 14px",
          borderRadius: 8,
          background: event.playerWon ? "rgba(74,222,128,0.08)" : "rgba(244,106,78,0.08)",
          border: `1px solid ${event.playerWon ? "rgba(74,222,128,0.25)" : "rgba(244,106,78,0.25)"}`,
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: event.playerWon ? C.green : C.red, margin: 0 }}>
            {event.playerWon ? `⚔️ Zwycięstwo! Pokonałeś ${event.entityName}.` : `💀 Porażka. ${event.entityName} wziął górę.`}
          </p>
          <p style={{ fontSize: 11, color: C.textFaint, margin: "4px 0 0" }}>{event.summary}</p>
        </div>
      </Panel>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <ActionBtn onClick={onContinue} color={event.playerWon ? colors.primary : C.red} style={{ padding: "11px 32px", fontSize: 12 }}>
          {event.playerWon ? "Idź dalej" : "Opuść szczelinę"}
        </ActionBtn>
      </div>
    </div>
  );
}


function RiftRunView({ riftKey, runId, initialNode, onFinished }: {
  riftKey: string; runId: number; initialNode: RiftNode; onFinished: () => void;
}) {
  const colors = RIFT_COLORS[riftKey] ?? RIFT_COLORS["green"]!;
  const [currentNode, setCurrentNode] = useState<RiftNode>(initialNode);
  const [choosing, setChoosing]       = useState<string | null>(null);
  const [events, setEvents]           = useState<{ text: string; color: string }[]>([]);
  const [endResult, setEndResult]     = useState<ChoiceResult | null>(null);
  const [fightEvent, setFightEvent]   = useState<FightEvent | null>(null);

  function addEvent(text: string, color: string) {
    setEvents(prev => [...prev, { text, color }]);
  }

  async function handleChoice(choiceKey: "A" | "B" | "C") {
    if (choosing) return;
    setChoosing(choiceKey);
    try {
      const res = await api.post(`/rifts/unstable/run/${runId}/choose`, { choiceKey });
      processResult(res.data as ChoiceResult);
    } catch (e: any) {
      addEvent(e.response?.data?.error ?? "Błąd", C.red);
    } finally {
      setChoosing(null);
    }
  }

function processResult(result: ChoiceResult) {
    // Obsługa testu — dodaj event do logu
if (result.success !== undefined && result.testChance !== undefined) {      addEvent(
        result.success
          ? `Test udany! (szansa: ${result.testChance ?? 50}%)`
          : `Test nieudany. (szansa: ${result.testChance ?? 50}%)`,
        result.success ? C.green : C.red
      );
    }

    // Obsługa walki — pokaż transkrypt zamiast od razu iść dalej
    if (result.playerWon !== undefined && Array.isArray(result.battleLog)) {
      // Wyciągnij zagnieżdżony wynik (to co ma się stać PO walce)
      const afterFight = extractAfterFight(result);
      setFightEvent({
        entityName: result.entityName ?? "przeciwnik",
        playerWon: result.playerWon,
        battleLog: result.battleLog ?? [],
        summary: result.summary ?? "",
        pendingResult: afterFight,
      });
      return; // czekamy na kliknięcie "Idź dalej" / "Opuść szczelinę"
    }

    // Zagnieżdżony test (np. test → fight lub test → goto)
    if (result.type === "test") {
      const nested = findNestedNonFight(result);
      if (nested) { processResult(nested); return; }
    }

    if (result.nextNode) { setCurrentNode(result.nextNode); return; }
    if (result.type === "end" || result.xpEarned !== undefined) { setEndResult(result); }
  }

  // Wyciąga wynik zagnieżdżony po walce (nextNode lub end)
  function extractAfterFight(result: any): ChoiceResult {
    // Wynik fight zawiera spłaszczone pola z resolveEffect
    // nextNode = jest następny węzeł, xpEarned = to był end
    if (result.nextNode || result.xpEarned !== undefined) return result;
    // Fallback — traktuj jako end bez nagrody
    return { type: "end", description: result.summary ?? "" };
  }

  // Szuka zagnieżdżonego wyniku pomijając fight (fight obsługujemy osobno)
  function findNestedNonFight(result: any): ChoiceResult | null {
    if (result.nextNode || result.xpEarned !== undefined) return result;
    for (const key of ["onSuccess", "onFailure"]) {
      if (result[key]) return result[key];
    }
    return null;
  }

  function handleFightContinue() {
    if (!fightEvent) return;
    const pending = fightEvent.pendingResult;
    setFightEvent(null);
    // Teraz aplikuj wynik walki
    if (pending.nextNode) { setCurrentNode(pending.nextNode); return; }
    if (pending.type === "end" || pending.xpEarned !== undefined) { setEndResult(pending); return; }
    // Jeśli przegrał i nie ma nextNode — zamknij szczelinę
    if (!fightEvent.playerWon) { setEndResult(pending); }
  }

if (endResult) return <EndView result={endResult} onClose={onFinished} />;

  if (fightEvent) return (
    <FightReport
      event={fightEvent}
      colors={RIFT_COLORS[riftKey] ?? RIFT_COLORS["green"]!}
      onContinue={handleFightContinue}
    />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {events.length > 0 && (
        <Panel style={{ padding: "12px 16px" }}>
          {events.map((ev, i) => (
            <p key={i} style={{ fontSize: 12, color: ev.color, margin: i > 0 ? "6px 0 0" : 0, lineHeight: 1.6 }}>{ev.text}</p>
          ))}
        </Panel>
      )}
      <Panel style={{ borderColor: `${colors.primary}30`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg, ${colors.primary}, ${colors.secondary})`, borderRadius: "4px 0 0 4px" }} />
        <p style={{ fontSize: 14, color: C.text, lineHeight: 1.9, margin: 0, fontStyle: "italic", paddingLeft: 8 }}>{currentNode.description}</p>
      </Panel>
      {!currentNode.isEnd && currentNode.choices.length > 0 && (
        <Panel>
          <SectionTitle>CO ROBISZ?</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {currentNode.choices.map(choice => (
              <button key={choice.key}
                onClick={() => !choice.locked && handleChoice(choice.key)}
                disabled={!!choosing || choice.locked}
                style={{ width: "100%", textAlign: "left", padding: "13px 16px", borderRadius: 9, background: choice.locked ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.2)", border: `1px solid ${choice.locked ? C.borderSoft : choosing === choice.key ? colors.primary : "rgba(247,240,221,0.12)"}`, color: choice.locked ? C.textGhost : C.text, cursor: choice.locked || choosing ? "not-allowed" : "pointer", opacity: choice.locked ? 0.5 : 1, transition: "all 0.15s", display: "flex", alignItems: "center", gap: 12 }}
                onMouseEnter={e => { if (!choice.locked && !choosing) (e.currentTarget as HTMLButtonElement).style.borderColor = colors.primary; }}
                onMouseLeave={e => { if (!choosing) (e.currentTarget as HTMLButtonElement).style.borderColor = choice.locked ? C.borderSoft : "rgba(247,240,221,0.12)"; }}
              >
                <span style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0, background: choice.locked ? "rgba(0,0,0,0.2)" : `${colors.primary}22`, border: `1px solid ${choice.locked ? C.borderSoft : `${colors.primary}55`}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Cinzel, serif", fontSize: 11, fontWeight: 700, color: choice.locked ? C.textGhost : colors.primary }}>
                  {choice.key}
                </span>
                <span style={{ flex: 1, fontSize: 13, lineHeight: 1.5 }}>
                  {choice.label}
                  {choice.locked && choice.requiredSpellName && (
                    <span style={{ fontSize: 10, color: C.textGhost, display: "block", marginTop: 2 }}>Wymaga czaru: {choice.requiredSpellName}</span>
                  )}
                </span>
                {choosing === choice.key && <span style={{ fontSize: 11, color: colors.primary }}>...</span>}
              </button>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

export default function Rifts() {
  const [rift, setRift]             = useState<UnstableRift | null | undefined>(undefined);
  const [loading, setLoading]       = useState(true);
  const [runState, setRunState]     = useState<{ runId: number; node: RiftNode } | null>(null);
  const [dismissing, setDismissing] = useState(false);
  const [entering, setEntering]     = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const fetchRift = useCallback(async () => {
    try {
      const res = await api.get("/rifts/unstable");
      const data = res.data?.id ? res.data as UnstableRift : null;
      setRift(data);
      // Jezeli szczelina jest aktywna (gracz byl w srodku i wrocil) odtworz stan
      if (data?.status === "active" && data.run) {
        try {
          const runRes = await api.get(`/rifts/unstable/run/${data.run.id}`);
          if (runRes.data.status === "in_progress" && runRes.data.currentNode) {
            setRunState({ runId: data.run.id, node: runRes.data.currentNode });
          }
        } catch { /* run nie znaleziony — zostajemy w lobby */ }
      }
    } catch {
      setRift(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRift(); }, [fetchRift]);

  async function handleDismiss() {
    setDismissing(true); setError(null);
    try {
      await api.delete("/rifts/unstable");
      setRift(null); setRunState(null);
    } catch (e: any) {
      setError(e.response?.data?.error ?? "Błąd usuwania szczeliny");
    } finally { setDismissing(false); }
  }

  async function handleEnter() {
    if (!rift) return;
    setEntering(true); setError(null);
    try {
      const res = await api.post("/rifts/unstable/enter");
      setRift(prev => prev ? { ...prev, status: "active" } : prev);
      setRunState({ runId: res.data.runId, node: res.data.currentNode });
    } catch (e: any) {
      setError(e.response?.data?.error ?? "Błąd wejścia do szczeliny");
    } finally { setEntering(false); }
  }

  function handleRunFinished() {
    setRunState(null);
    setRift(null);
    fetchRift();
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
        <p style={{ fontFamily: "Cinzel, serif", color: C.gold, fontSize: 13, letterSpacing: "0.12em" }}>Skanowanie przestrzeni...</p>
      </div>
    );
  }

  const colors = rift ? (RIFT_COLORS[rift.riftKey] ?? RIFT_COLORS["green"]!) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontFamily: "Cinzel, serif", color: C.gold, fontSize: 22, letterSpacing: "0.06em", margin: "0 0 6px" }}>Szczeliny</h1>
        <p style={{ fontSize: 13, color: C.textFaint, margin: 0 }}>Niestabilne bramy do innych wymiarów. Odkryjesz je podczas eksploracji i studiów.</p>
      </div>

      {runState ? (
        <div>
          <p style={{ fontFamily: "Cinzel, serif", fontSize: 11, color: colors?.primary ?? C.gold, letterSpacing: "0.1em", margin: "0 0 16px" }}>
            {rift?.riftName ?? "SZCZELINA"}
          </p>
          <RiftRunView riftKey={rift?.riftKey ?? "green"} runId={runState.runId} initialNode={runState.node} onFinished={handleRunFinished} />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 20, alignItems: "start" }}>

          <Panel style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px", gap: 24, background: rift ? `radial-gradient(ellipse at center, ${colors!.glow} 0%, rgba(55,43,93,0.6) 70%)` : C.panel, borderColor: rift ? `${colors!.primary}40` : C.border, transition: "all 0.4s" }}>
            {rift ? (
              <>
                <RiftArt riftKey={rift.riftKey} size={320} />
                <p style={{ fontFamily: "Cinzel, serif", fontSize: 18, color: colors!.primary, margin: 0, letterSpacing: "0.1em" }}>{rift.riftName}</p>
              </>
            ) : (
              <>
                <EmptyRiftArt size={280} />
                <div style={{ textAlign: "center", maxWidth: 280 }}>
                  <p style={{ fontFamily: "Cinzel, serif", fontSize: 14, color: C.textFaint, margin: "0 0 10px", letterSpacing: "0.06em" }}>Brak aktywnej szczeliny</p>
                  <p style={{ fontSize: 13, color: C.textGhost, lineHeight: 1.7, margin: 0 }}>Eksploruj lub ucz się, żeby odkryć nową szczelinę. Może otworzyć się sama...</p>
                </div>
              </>
            )}
          </Panel>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {error && (
              <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(244,106,78,0.08)", border: "1px solid rgba(244,106,78,0.25)" }}>
                <p style={{ fontSize: 12, color: C.red, margin: 0 }}>{error}</p>
              </div>
            )}
            {rift ? (
              <>
                <Panel style={{ borderColor: `${colors!.primary}30` }}>
                  <SectionTitle>AKCJE</SectionTitle>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <ActionBtn onClick={handleEnter} disabled={entering || dismissing} color={colors!.primary} style={{ width: "100%", justifyContent: "center", padding: "11px 12px", fontSize: 11 }}>
                      {entering ? "Wchodzisz..." : "Wejdź do szczeliny"}
                    </ActionBtn>
                    <ActionBtn onClick={handleDismiss} disabled={dismissing || entering} color={C.textFaint} style={{ width: "100%", justifyContent: "center", fontSize: 11 }}>
                      {dismissing ? "Usuwanie..." : "Usuń"}
                    </ActionBtn>
                  </div>
                </Panel>
                <Panel style={{ padding: "14px 16px" }}>
                  <SectionTitle>INFO</SectionTitle>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[["Typ", rift.riftName], ["Odkryta", new Date(rift.openedAt).toLocaleDateString("pl-PL")]].map(([label, value]) => (
                      <div key={label}>
                        <p style={{ fontSize: 10, color: C.textGhost, margin: "0 0 1px" }}>{label}</p>
                        <p style={{ fontSize: 12, color: C.textDim, margin: 0 }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </Panel>
                <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(245,196,81,0.04)", border: "1px solid rgba(245,196,81,0.1)" }}>
                  <p style={{ fontSize: 10, color: C.textGhost, margin: 0, lineHeight: 1.7 }}>Dopoki ta szczelina jest otwarta, zadna nowa nie moze sie pojawic.</p>
                </div>
              </>
            ) : (
              <Panel>
                <SectionTitle>JAK ODKRYC?</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[{ icon: "📖", label: "Studia", desc: "Niskie poziomy" }, { icon: "🧭", label: "Eksploracja", desc: "Poziomy 1 i 2" }, { icon: "🍀", label: "Szczescie", desc: "1% per akcja" }].map(item => (
                    <div key={item.label} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 600, color: C.textDim, margin: 0, fontFamily: "Cinzel, serif" }}>{item.label}</p>
                        <p style={{ fontSize: 11, color: C.textGhost, margin: 0 }}>{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        </div>
      )}
    </div>
  );
}