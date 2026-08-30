import { useEffect, useState, useCallback } from "react";
import api from "../api/client";

// ── PALETA (zgodna z resztą gry) ──────────────────────────────────
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

function Panel({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.panel, borderRadius: 12,
      border: `1px solid ${C.border}`, padding: 20, ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{
      fontFamily: "Cinzel, serif", fontSize: 13, color: C.gold,
      letterSpacing: "0.08em", marginBottom: 16, ...style,
    }}>
      {children}
    </p>
  );
}

function ProgressBar({ discovered, total }: { discovered: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((discovered / total) * 100)) : 0;
  return (
    <div style={{ width: "100%" }}>
      <div style={{
        height: 6, borderRadius: 4, background: "rgba(0,0,0,0.3)",
        overflow: "hidden", marginBottom: 4,
      }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: pct === 100 ? C.green : C.gold,
          transition: "width 0.4s",
        }} />
      </div>
      <p style={{ fontSize: 11, color: C.textFaint, margin: 0 }}>
        {discovered} / {total}
      </p>
    </div>
  );
}

// ── TYPY ─────────────────────────────────────────────────────────

type PageKey = "overview" | "entities" | "items" | "worlds" | "rankings";

interface NotebookMeta {
  level: number;
  unlockedPages: Record<"overview" | "entities" | "items" | "worlds" | "rankings", boolean>;
}

const PAGE_LABELS: Record<PageKey, string> = {
  overview:  "Informacje ogólne",
  entities:  "Przeciwnicy",
  items:     "Przedmioty",
  worlds:    "Krainy i Szczeliny",
  rankings:  "Rankingi",
};

const PAGE_ICONS: Record<PageKey, string> = {
  overview: "📖",
  entities: "👹",
  items:    "🗡️",
  worlds:   "🌍",
  rankings: "🏆",
};

const PAGE_UNLOCK_LEVEL: Record<PageKey, number> = {
  overview: 1, entities: 2, items: 3, worlds: 4, rankings: 5,
};

// ═══════════════════════════════════════════════════════════════════
// STRONA 1 — INFO OGÓLNE
// ═══════════════════════════════════════════════════════════════════

function StatBlock({ label, discovered, total }: { label: string; discovered: number; total: number }) {
  return (
    <div style={{
      padding: "12px 16px", borderRadius: 10,
      background: C.panelAlt, border: `1px solid ${C.borderSoft}`,
    }}>
      <p style={{ fontSize: 11, color: C.textFaint, margin: "0 0 8px", fontFamily: "Cinzel, serif", letterSpacing: "0.04em" }}>
        {label}
      </p>
      <ProgressBar discovered={discovered} total={total} />
    </div>
  );
}

function OverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/notebook/overview")
      .then(res => setData(res.data))
      .catch(err => alert(err.response?.data?.error ?? "Błąd ładowania"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: C.textFaint, fontSize: 13 }}>Ładowanie...</p>;
  if (!data) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SectionTitle>Postępy odkrywania</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <StatBlock label="Przeciwnicy" discovered={data.entities.discovered} total={data.entities.total} />
        <StatBlock label="Przedmioty" discovered={data.items.discovered} total={data.items.total} />
        <StatBlock label="Szczeliny" discovered={data.rifts.discovered} total={data.rifts.total} />
        <StatBlock label="Krainy" discovered={data.worlds.discovered} total={data.worlds.total} />
        <StatBlock label="Trofea" discovered={data.trophies.discovered} total={data.trophies.total} />
      </div>

      <SectionTitle style={{ marginTop: 8 }}>Księga Magii — odkryte czary</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {data.spellsByCategory.map((cat: any) => (
          <StatBlock key={cat.category} label={cat.category} discovered={cat.discovered} total={cat.total} />
        ))}
      </div>

      <SectionTitle style={{ marginTop: 8 }}>Statystyki ogólne</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ fontSize: 12, color: C.textDim, margin: 0, lineHeight: 1.7 }}>
          Wziąłeś udział w <b style={{ color: C.text }}>{data.battles.total}</b> pojedynkach
          (<span style={{ color: C.green }}>{data.battles.wins} wygrane</span>
          {" / "}<span style={{ color: C.red }}>{data.battles.losses} przegrane</span>
          {" / "}{data.battles.draws} remisy).
        </p>
        <p style={{ fontSize: 12, color: C.textDim, margin: 0, lineHeight: 1.7 }}>
          Wziąłeś udział w <b style={{ color: C.text }}>{data.tournaments.total}</b> turniejach magicznych
          (<span style={{ color: C.green }}>{data.tournaments.wins} wygrane</span>
          {" / "}<span style={{ color: C.red }}>{data.tournaments.losses} przegrane</span>
          {" / "}{data.tournaments.draws} remisy).
        </p>
        <p style={{ fontSize: 12, color: C.textDim, margin: 0, lineHeight: 1.7 }}>
          Wykonałeś <b style={{ color: C.text }}>{data.studies.total}</b> studiów.
        </p>
        <p style={{ fontSize: 12, color: C.textDim, margin: 0, lineHeight: 1.7 }}>
          Wykonałeś <b style={{ color: C.text }}>{data.explorations.total}</b> eksploracji,
          w trakcie których stoczyłeś <b style={{ color: C.text }}>{data.explorations.fights}</b> walk
          (<span style={{ color: C.green }}>{data.explorations.wins} wygrane</span>
          {" / "}<span style={{ color: C.red }}>{data.explorations.losses} przegrane</span>).
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STRONA 2 — PRZECIWNICY
// ═══════════════════════════════════════════════════════════════════

const SOURCE_LABELS: Record<string, string> = {
  exploration: "Eksploracja",
  study:       "Studia",
  rift:        "Szczelina",
};

function RangeDisplay({ label, range, suffix = "" }: { label: string; range: { min: number; max: number; base: number }; suffix?: string }) {
  const isFlat = range.min === range.max;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
      <span style={{ fontSize: 11, color: C.textFaint }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.textDim }}>
        {isFlat ? `${range.base}${suffix}` : `${range.min}–${range.max}${suffix}`}
      </span>
    </div>
  );
}

function EntityCard({ entry }: { entry: any }) {
  const [expanded, setExpanded] = useState(false);
  const resistEntries = Object.entries(entry.resistanceRanges as Record<string, any>);

  return (
    <div style={{
      padding: "14px 16px", borderRadius: 10,
      border: `1px solid ${C.borderSoft}`, background: C.panelAlt,
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
      >
        <div style={{
          width: 38, height: 38, borderRadius: 8, flexShrink: 0,
          background: "rgba(0,0,0,0.25)", display: "flex",
          alignItems: "center", justifyContent: "center", fontSize: 18,
        }}>
          👹
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "Cinzel, serif", fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>
            {entry.name}
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            {entry.encounteredSources.map((src: string) => (
              <span key={src} style={{
                fontSize: 9, padding: "2px 7px", borderRadius: 5,
                background: "rgba(89,212,208,0.1)", color: C.teal,
                fontFamily: "Cinzel, serif", fontWeight: 700,
              }}>
                {SOURCE_LABELS[src] ?? src}
              </span>
            ))}
          </div>
        </div>
        <span style={{ fontSize: 11, color: C.textGhost }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.borderSoft}` }}>
          {entry.description && (
            <p style={{ fontSize: 12, color: C.textDim, margin: "0 0 10px", lineHeight: 1.6, fontStyle: "italic" }}>
              {entry.description}
            </p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <RangeDisplay label="Punkty życia" range={entry.hpRange} />
            <RangeDisplay label="Inicjatywa" range={entry.initiativeRange} />
            <RangeDisplay label="Obrażenia (główny atak)" range={entry.damageRange} />
            {resistEntries.length > 0 && resistEntries.map(([element, range]: [string, any]) => (
              <RangeDisplay key={element} label={`Odporność: ${element}`} range={range} />
            ))}
          </div>
          <p style={{ fontSize: 10, color: C.textGhost, marginTop: 8, marginBottom: 0 }}>
            Losowość profilu: ±{entry.variancePercent}%
          </p>
        </div>
      )}
    </div>
  );
}

function EntitiesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/notebook/entities")
      .then(res => setData(res.data))
      .catch(err => alert(err.response?.data?.error ?? "Błąd ładowania"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: C.textFaint, fontSize: 13 }}>Ładowanie...</p>;
  if (!data) return null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SectionTitle style={{ marginBottom: 0 }}>Poznani przeciwnicy</SectionTitle>
        <span style={{ fontSize: 11, color: C.textFaint }}>
          {data.totalDiscovered} / {data.totalAvailable}
        </span>
      </div>
      {data.discovered.length === 0 ? (
        <p style={{ fontSize: 12, color: C.textGhost, fontStyle: "italic" }}>
          Nie spotkałeś jeszcze żadnego przeciwnika. Wyrusz na eksplorację, studia lub do szczeliny!
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.discovered.map((entry: any) => <EntityCard key={entry.id} entry={entry} />)}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STRONA 3 — PRZEDMIOTY
// ═══════════════════════════════════════════════════════════════════

const STAT_LABELS: Record<string, string> = {
  reqKnowledge: "Wiedza", reqIntelligence: "Inteligencja", reqPower: "Moc",
  reqEndurance: "Wytrzymałość", reqResistance: "Odporność", reqInitiative: "Inicjatywa",
  reqElementalMagic: "Magia żywiołów", reqAstralMagic: "Magia astralna", reqBloodMagic: "Magia krwi",
  bonusKnowledge: "Wiedza", bonusIntelligence: "Inteligencja", bonusPower: "Moc",
  bonusEndurance: "Wytrzymałość", bonusResistance: "Odporność", bonusInitiative: "Inicjatywa",
  bonusElementalMagic: "Magia żywiołów", bonusAstralMagic: "Magia astralna", bonusBloodMagic: "Magia krwi",
};

const RARITY_COLORS: Record<string, string> = {
  common: C.textDim, uncommon: C.green, rare: C.teal, unique: C.gold,
};

function ItemCard({ entry }: { entry: any }) {
  const [expanded, setExpanded] = useState(false);
  const reqs = Object.entries(entry.statsAtTier).filter(([k, v]) => k.startsWith("req") && (v as number) > 0);
  const bonuses = Object.entries(entry.statsAtTier).filter(([k, v]) => k.startsWith("bonus") && (v as number) > 0);
  const rarityColor = RARITY_COLORS[entry.rarity] ?? C.textDim;

  return (
    <div style={{
      padding: "14px 16px", borderRadius: 10,
      border: `1px solid ${C.borderSoft}`, background: C.panelAlt,
    }}>
      <div onClick={() => setExpanded(!expanded)} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
        <div style={{
          width: 38, height: 38, borderRadius: 8, flexShrink: 0,
          background: "rgba(0,0,0,0.25)", display: "flex",
          alignItems: "center", justifyContent: "center", fontSize: 18,
        }}>
          🗡️
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "Cinzel, serif", fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>
            {entry.name}
          </p>
          <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
            <span style={{ fontSize: 10, color: rarityColor, fontWeight: 700, fontFamily: "Cinzel, serif" }}>
              {entry.rarity}
            </span>
            <span style={{ fontSize: 10, color: C.textFaint }}>· {entry.category}</span>
            {entry.element && <span style={{ fontSize: 10, color: C.textFaint }}>· {entry.element}</span>}
          </div>
        </div>
        <span style={{ fontSize: 11, color: C.textGhost }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.borderSoft}` }}>
          {entry.notebookDescription && (
            <p style={{ fontSize: 12, color: C.textDim, margin: "0 0 10px", lineHeight: 1.6, fontStyle: "italic" }}>
              {entry.notebookDescription}
            </p>
          )}
          <p style={{ fontSize: 10, color: C.gold, fontFamily: "Cinzel, serif", letterSpacing: "0.05em", margin: "0 0 6px" }}>
            Statystyki na tierze {entry.tierShown}
          </p>
          {reqs.length > 0 && (
            <>
              <p style={{ fontSize: 10, color: C.textFaint, margin: "8px 0 4px" }}>Wymagania</p>
              {reqs.map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                  <span style={{ fontSize: 11, color: C.textFaint }}>{STAT_LABELS[k]}</span>
                  <span style={{ fontSize: 12, color: C.red }}>{v as number}</span>
                </div>
              ))}
            </>
          )}
          {bonuses.length > 0 && (
            <>
              <p style={{ fontSize: 10, color: C.textFaint, margin: "8px 0 4px" }}>Bonusy</p>
              {bonuses.map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                  <span style={{ fontSize: 11, color: C.textFaint }}>{STAT_LABELS[k]}</span>
                  <span style={{ fontSize: 12, color: C.green }}>+{v as number}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ItemsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState(1);

  const fetchItems = useCallback((t: number) => {
    setLoading(true);
    api.get("/notebook/items", { params: { tier: t } })
      .then(res => setData(res.data))
      .catch(err => alert(err.response?.data?.error ?? "Błąd ładowania"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchItems(tier); }, [tier, fetchItems]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <SectionTitle style={{ marginBottom: 0 }}>Poznane przedmioty</SectionTitle>
        {data && (
          <span style={{ fontSize: 11, color: C.textFaint }}>
            {data.totalDiscovered} / {data.totalAvailable}
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 11, color: C.textFaint, fontFamily: "Cinzel, serif" }}>Pokaż statystyki na tierze:</span>
        <select
          value={tier}
          onChange={e => setTier(parseInt(e.target.value, 10))}
          style={{
            background: C.panelAlt, border: `1px solid ${C.borderSoft}`,
            borderRadius: 6, color: C.text, fontSize: 12, padding: "4px 10px",
            fontFamily: "Cinzel, serif",
          }}
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p style={{ color: C.textFaint, fontSize: 13 }}>Ładowanie...</p>
      ) : !data || data.discovered.length === 0 ? (
        <p style={{ fontSize: 12, color: C.textGhost, fontStyle: "italic" }}>
          Nie odkryłeś jeszcze żadnego przedmiotu.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.discovered.map((entry: any) => <ItemCard key={entry.id} entry={entry} />)}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STRONA 4 — KRAINY + SZCZELINY
// ═══════════════════════════════════════════════════════════════════

function WorldsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/notebook/worlds")
      .then(res => setData(res.data))
      .catch(err => alert(err.response?.data?.error ?? "Błąd ładowania"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: C.textFaint, fontSize: 13 }}>Ładowanie...</p>;
  if (!data) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <SectionTitle style={{ marginBottom: 0 }}>Odkryte szczeliny</SectionTitle>
          <span style={{ fontSize: 11, color: C.textFaint }}>
            {data.totalRiftsDiscovered} / {data.totalRiftsAvailable}
          </span>
        </div>
        {data.rifts.length === 0 ? (
          <p style={{ fontSize: 12, color: C.textGhost, fontStyle: "italic" }}>Nie natrafiłeś jeszcze na żadną szczelinę.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.rifts.map((rift: any) => (
              <div key={rift.key} style={{
                padding: "10px 14px", borderRadius: 8,
                border: `1px solid ${C.borderSoft}`, background: C.panelAlt,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: rift.color, flexShrink: 0 }} />
                <span style={{ fontFamily: "Cinzel, serif", fontSize: 12, fontWeight: 700, color: C.text }}>
                  {rift.name}
                </span>
                <span style={{ fontSize: 10, color: C.textFaint }}>
                  {rift.type === "stable" ? "stabilna" : "niestabilna"} · {rift.visitedWorldKeys.length} krain odkrytych
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <SectionTitle style={{ marginBottom: 0 }}>Odkryte krainy</SectionTitle>
          <span style={{ fontSize: 11, color: C.textFaint }}>
            {data.totalWorldsDiscovered} / {data.totalWorldsAvailable}
          </span>
        </div>
        {data.worlds.length === 0 ? (
          <p style={{ fontSize: 12, color: C.textGhost, fontStyle: "italic" }}>Nie odwiedziłeś jeszcze żadnej krainy.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.worlds.map((world: any) => (
              <div key={world.key} style={{
                padding: "14px 16px", borderRadius: 10,
                border: `1px solid ${C.borderSoft}`, background: C.panelAlt,
              }}>
                <p style={{ fontFamily: "Cinzel, serif", fontSize: 13, fontWeight: 700, color: C.text, margin: "0 0 6px" }}>
                  {world.name}
                </p>
                <p style={{ fontSize: 12, color: C.textDim, margin: "0 0 10px", lineHeight: 1.6 }}>
                  {world.notebookDescription}
                </p>
                {world.encounteredEntities.length > 0 && (
                  <p style={{ fontSize: 11, color: C.teal, margin: "0 0 4px" }}>
                    Spotkałeś w niej: {world.encounteredEntities.map((e: any) => e.name).join(", ")}
                  </p>
                )}
                {world.earnedTrophies.length > 0 && (
                  <p style={{ fontSize: 11, color: C.gold, margin: 0 }}>
                    Zdobyłeś w niej: {world.earnedTrophies.map((t: any) => t.name).join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STRONA 5 — RANKINGI
// ═══════════════════════════════════════════════════════════════════

function RankingRow({ entry }: { entry: any }) {
  return (
    <div style={{
      padding: "12px 16px", borderRadius: 10,
      border: `1px solid ${C.borderSoft}`, background: C.panelAlt,
      display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
    }}>
      <span style={{ fontFamily: "Cinzel, serif", fontSize: 12, fontWeight: 700, color: C.text }}>
        {entry.label}
      </span>
      <div style={{ textAlign: "right" }}>
        <p style={{ fontSize: 12, color: C.gold, margin: 0, fontWeight: 700 }}>
          {entry.currentRank !== null ? `Obecnie: ${entry.currentRank}. miejsce` : "Brak pozycji"}
        </p>
        {entry.bestRank !== null && !entry.isCurrentlyBest && (
          <p style={{ fontSize: 11, color: C.textFaint, margin: "2px 0 0" }}>
            Zdarzyło Ci się zajmować {entry.bestRank}. miejsce
            {entry.bestRankAchievedAt && ` (${new Date(entry.bestRankAchievedAt).toLocaleDateString("pl-PL")})`}
          </p>
        )}
        {entry.isCurrentlyBest && entry.currentRank !== null && (
          <p style={{ fontSize: 11, color: C.green, margin: "2px 0 0" }}>
            ✦ To Twoja najlepsza pozycja!
          </p>
        )}
      </div>
    </div>
  );
}

function RankingsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/notebook/rankings")
      .then(res => setData(res.data))
      .catch(err => alert(err.response?.data?.error ?? "Błąd ładowania"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: C.textFaint, fontSize: 13 }}>Ładowanie...</p>;
  if (!data) return null;

  return (
    <div>
      <SectionTitle>Twoje pozycje rankingowe</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.rankings.map((entry: any) => <RankingRow key={entry.category} entry={entry} />)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ZABLOKOWANA STRONA
// ═══════════════════════════════════════════════════════════════════

function LockedPage({ page, currentLevel }: { page: PageKey; currentLevel: number }) {
  return (
    <div style={{
      padding: "40px 24px", textAlign: "center",
      border: `1px dashed ${C.borderSoft}`, borderRadius: 12,
    }}>
      <p style={{ fontSize: 32, marginBottom: 12 }}>🔒</p>
      <p style={{ fontFamily: "Cinzel, serif", fontSize: 14, fontWeight: 700, color: C.text, margin: "0 0 6px" }}>
        Strona zablokowana
      </p>
      <p style={{ fontSize: 12, color: C.textFaint, margin: 0 }}>
        Wymaga poziomu {PAGE_UNLOCK_LEVEL[page]} Magicznego Notesu (obecny: {currentLevel}).
        Rozbuduj budynek w Wieży, aby odblokować tę stronę.
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// GŁÓWNY KOMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function MagicNotebook() {
  const [meta, setMeta] = useState<NotebookMeta | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [activePage, setActivePage] = useState<PageKey>("overview");

  useEffect(() => {
    api.get("/notebook/meta")
      .then(res => setMeta(res.data))
      .catch(() => {})
      .finally(() => setLoadingMeta(false));
  }, []);

  if (loadingMeta) return <p style={{ color: C.textFaint, fontSize: 13 }}>Ładowanie...</p>;

  const level = meta?.level ?? 0;

  if (level === 0) {
    return (
      <div>
        <h1 style={{ fontFamily: "Cinzel, serif", color: C.gold, fontSize: 22, marginBottom: 24, letterSpacing: "0.06em" }}>
          Magiczny Notes
        </h1>
        <Panel>
          <div style={{ textAlign: "center", padding: "24px 12px" }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>📓</p>
            <p style={{ fontFamily: "Cinzel, serif", fontSize: 14, fontWeight: 700, color: C.text, margin: "0 0 8px" }}>
              Nie posiadasz jeszcze Magicznego Notesu
            </p>
            <p style={{ fontSize: 12, color: C.textFaint, margin: 0, lineHeight: 1.6 }}>
              Wybuduj go w Wieży, aby śledzić swoje postępy — poznane czary, przeciwników,
              przedmioty, krainy, szczeliny, trofea i pozycje rankingowe.
            </p>
          </div>
        </Panel>
      </div>
    );
  }

  const pages: PageKey[] = ["overview", "entities", "items", "worlds", "rankings"];

  return (
    <div>
      <h1 style={{ fontFamily: "Cinzel, serif", color: C.gold, fontSize: 22, marginBottom: 24, letterSpacing: "0.06em" }}>
        Magiczny Notes
      </h1>

      {/* Zakładki stron */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {pages.map(page => {
          const unlocked = meta?.unlockedPages[page] ?? false;
          const isActive = activePage === page;
          return (
            <button
              key={page}
              onClick={() => unlocked && setActivePage(page)}
              disabled={!unlocked}
              style={{
                padding: "8px 16px", borderRadius: 8,
                border: `1px solid ${isActive ? "rgba(245,196,81,0.4)" : C.borderSoft}`,
                background: isActive ? "rgba(245,196,81,0.1)" : C.panelAlt,
                color: !unlocked ? C.textGhost : isActive ? C.gold : C.textDim,
                fontSize: 12, fontWeight: isActive ? 700 : 400,
                fontFamily: "Cinzel, serif", letterSpacing: "0.03em",
                cursor: unlocked ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", gap: 6,
                transition: "all 0.15s",
              }}
            >
              <span>{unlocked ? PAGE_ICONS[page] : "🔒"}</span>
              {PAGE_LABELS[page]}
            </button>
          );
        })}
      </div>

      <Panel>
        {!meta?.unlockedPages[activePage] ? (
          <LockedPage page={activePage} currentLevel={level} />
        ) : activePage === "overview" ? (
          <OverviewPage />
        ) : activePage === "entities" ? (
          <EntitiesPage />
        ) : activePage === "items" ? (
          <ItemsPage />
        ) : activePage === "worlds" ? (
          <WorldsPage />
        ) : (
          <RankingsPage />
        )}
      </Panel>
    </div>
  );
}