import { useEffect, useState, useCallback, useMemo } from "react";
import api from "../api/client";

// ── TYPY ─────────────────────────────────────────────────────────────────────

interface SpellbookSpell {
  id: number;
  discovered: boolean;
  spellBook: boolean;
  basicCost: number;
  element: string;
  spellPool: string;
  rarity: string;
  category: string;
  name?: string;
  damage?: number;
  special?: string;
  isDirectional?: boolean;
  statusEffects?: string;
  reqFireMagic?: number;
  reqWaterMagic?: number;
  reqEarthMagic?: number;
  reqAirMagic?: number;
  reqChaosMagic?: number;
  reqLifeMagic?: number;
  reqDeathMagic?: number;
  reqEnergyMagic?: number;
  summonCount?: number;
  summonElement?: string | null;
  discoveredAt?: string;
  source?: string;
  owned?: boolean;
}

// ── KONFIGURACJE ──────────────────────────────────────────────────────────────

const ELEMENT_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  fire:   { label: "Ogień",      color: "#ef4444", bg: "rgba(239,68,68,0.12)",   icon: "🔥" },
  water:  { label: "Woda",       color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  icon: "💧" },
  earth:  { label: "Ziemia",     color: "#84cc16", bg: "rgba(132,204,22,0.12)",  icon: "🌿" },
  air:    { label: "Powietrze",  color: "#a3e635", bg: "rgba(163,230,53,0.12)",  icon: "🌪" },
  chaos:  { label: "Chaos",      color: "#a855f7", bg: "rgba(168,85,247,0.12)",  icon: "🌀" },
  life:   { label: "Życie",      color: "#22c55e", bg: "rgba(34,197,94,0.12)",   icon: "✨" },
  death:  { label: "Śmierć",     color: "#64748b", bg: "rgba(100,116,139,0.12)", icon: "💀" },
  energy: { label: "Energia",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  icon: "⚡" },
  basic:  { label: "Podstawowy", color: "#94a3b8", bg: "rgba(148,163,184,0.12)", icon: "○" },
};

const POOL_CONFIG: Record<string, { label: string; difficulty: number }> = {
  chaotic:      { label: "Banalne",         difficulty: 1 },
  controlled:   { label: "Proste",          difficulty: 2 },
  incantation:  { label: "Wymagające",      difficulty: 3 },
  professional: { label: "Skomplikowane",   difficulty: 4 },
  master:       { label: "Szalenie trudne", difficulty: 5 },
};

const RARITY_CONFIG: Record<string, { label: string; color: string; glow: string }> = {
  common:   { label: "Pospolity",  color: "#94a3b8", glow: "rgba(148,163,184,0.3)" },
  uncommon: { label: "Nietypowy",  color: "#4ade80", glow: "rgba(74,222,128,0.3)"  },
  rare:     { label: "Rzadki",     color: "#60a5fa", glow: "rgba(96,165,250,0.3)"  },
  unique:   { label: "Unikalny",   color: "#fbbf24", glow: "rgba(251,191,36,0.4)"  },
};

const CATEGORY_CONFIG: Record<string, { label: string; icon: string }> = {
  summoner:  { label: "Przywołujący", icon: "👁" },
  offensive: { label: "Ofensywny",    icon: "⚔" },
  defensive: { label: "Defensywny",   icon: "🛡" },
  unknown:   { label: "Nieznany",     icon: "?" },
};

const SOURCE_LABELS: Record<string, string> = {
  study:          "Studia",
  battle_cast:    "Walka",
  school:         "Szkoła Magii",
  basic_purchase: "Zakupiony",
  basic:          "Czar podstawowy",
};

type MainTab = "basic" | "custom";

interface CharacterStats {
  fireMagic: number; waterMagic: number; earthMagic: number; airMagic: number;
  chaosMagic: number; lifeMagic: number; deathMagic: number; energyMagic: number;
}

function meetsRequirements(spell: SpellbookSpell, stats: CharacterStats | null): boolean {
  if (!stats) return false;
  return (
    (spell.reqFireMagic   ?? 0) <= stats.fireMagic   &&
    (spell.reqWaterMagic  ?? 0) <= stats.waterMagic  &&
    (spell.reqEarthMagic  ?? 0) <= stats.earthMagic  &&
    (spell.reqAirMagic    ?? 0) <= stats.airMagic    &&
    (spell.reqChaosMagic  ?? 0) <= stats.chaosMagic  &&
    (spell.reqLifeMagic   ?? 0) <= stats.lifeMagic   &&
    (spell.reqDeathMagic  ?? 0) <= stats.deathMagic  &&
    (spell.reqEnergyMagic ?? 0) <= stats.energyMagic
  );
}

// ── KARTA ODKRYTEGO CZARU ─────────────────────────────────────────────────────

function DiscoveredCard({
  spell,
  onClick,
  onLearn,
  canLearn,
  learning,
}: {
  spell: SpellbookSpell;
  onClick: () => void;
  onLearn?: (e: React.MouseEvent) => void;
  canLearn?: boolean;
  learning?: boolean;
}) {
  const elem   = ELEMENT_CONFIG[spell.element]   ?? ELEMENT_CONFIG.basic!;
  const rarity = RARITY_CONFIG[spell.rarity]     ?? RARITY_CONFIG.common!;
  const pool   = POOL_CONFIG[spell.spellPool]    ?? { label: spell.spellPool, difficulty: 1 };
  const cat    = CATEGORY_CONFIG[spell.category] ?? CATEGORY_CONFIG.unknown!;

  return (
    <button
      onClick={onClick}
      className="spellbook-card discovered"
      style={{
        "--elem-color":   elem.color,
        "--elem-bg":      elem.bg,
        "--rarity-color": rarity.color,
        "--rarity-glow":  rarity.glow,
      } as React.CSSProperties}
    >
      <div className="rarity-corner" />

      <div className="card-element-bar">
        <span className="element-icon">{elem.icon}</span>
        <span className="element-label">{elem.label}</span>
        <span className="category-badge">{cat.icon}</span>
      </div>

      <div className="card-name">
        <span className="spell-name">{spell.name}</span>
      </div>

      <div className="card-difficulty">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className="difficulty-dot" style={{ opacity: i < pool.difficulty ? 1 : 0.2 }} />
        ))}
        <span className="difficulty-label">{pool.label}</span>
      </div>

      <div className="card-footer">
        <span className="rarity-label" style={{ color: rarity.color }}>{rarity.label}</span>
        {spell.damage != null && spell.damage > 0 && (
          <span className="damage-badge">⚔ {spell.damage}</span>
        )}
      </div>

      {/* Przycisk "Naucz się" dla czarów podstawowych nieposiadanych */}
{spell.spellBook && !spell.owned && onLearn && (
  <div className="learn-btn-wrapper" onClick={e => e.stopPropagation()}>
    <button
      onClick={canLearn ? onLearn : undefined}
      disabled={learning || !canLearn}
      className={`learn-btn ${!canLearn ? "locked" : ""}`}
      title={!canLearn ? "Nie spełniasz wymagań" : undefined}
    >
      {learning ? "..." : `✦ ${spell.basicCost} ✦`}
    </button>
  </div>
)}

      {spell.owned && (
        <div className="owned-indicator">✓ W bibliotece</div>
      )}
    </button>
  );
}

// ── KARTA NIEPOZNANEGO CZARU ──────────────────────────────────────────────────

function UnknownCard({ spell }: { spell: SpellbookSpell }) {
  const elem   = ELEMENT_CONFIG[spell.element] ?? ELEMENT_CONFIG.basic!;
  const pool   = POOL_CONFIG[spell.spellPool]  ?? { label: spell.spellPool, difficulty: 1 };
  const rarity = RARITY_CONFIG[spell.rarity]   ?? RARITY_CONFIG.common!;

  return (
    <div className="spellbook-card unknown">
      <div className="card-element-bar muted">
        <span className="element-icon" style={{ filter: "grayscale(1) opacity(0.5)" }}>{elem.icon}</span>
        <span className="element-label" style={{ opacity: 0.5 }}>{elem.label}</span>
      </div>
      <div className="card-unknown-center">
        <div className="unknown-sigil">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="22" width="28" height="20" rx="3" stroke="currentColor" strokeWidth="2" opacity="0.4"/>
            <path d="M16 22V16a8 8 0 0116 0v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
            <circle cx="24" cy="31" r="2.5" fill="currentColor" opacity="0.3"/>
            <line x1="24" y1="33.5" x2="24" y2="37" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3"/>
          </svg>
        </div>
        <span className="unknown-label">Czar niepoznany</span>
      </div>
      <div className="card-difficulty muted">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className="difficulty-dot" style={{ opacity: i < pool.difficulty ? 0.35 : 0.1 }} />
        ))}
        <span className="difficulty-label" style={{ opacity: 0.4 }}>{pool.label}</span>
      </div>
      <div className="card-footer">
        <span className="rarity-label" style={{ color: rarity.color, opacity: 0.5 }}>{rarity.label}</span>
      </div>
    </div>
  );
}

// ── MODAL SZCZEGÓŁÓW ──────────────────────────────────────────────────────────

function SpellDetailModal({
  spell,
  onClose,
  onLearn,
  canLearn,
  learning,
}: {
  spell: SpellbookSpell;
  onClose: () => void;
  onLearn?: () => void;
  canLearn?: boolean;
  learning?: boolean;
}) {
  const elem   = ELEMENT_CONFIG[spell.element]   ?? ELEMENT_CONFIG.basic!;
  const rarity = RARITY_CONFIG[spell.rarity]     ?? RARITY_CONFIG.common!;
  const pool   = POOL_CONFIG[spell.spellPool]    ?? { label: spell.spellPool, difficulty: 1 };
  const cat    = CATEGORY_CONFIG[spell.category] ?? CATEGORY_CONFIG.unknown!;

  const requirements = [
    { label: "Ogień",     val: spell.reqFireMagic },
    { label: "Woda",      val: spell.reqWaterMagic },
    { label: "Ziemia",    val: spell.reqEarthMagic },
    { label: "Powietrze", val: spell.reqAirMagic },
    { label: "Chaos",     val: spell.reqChaosMagic },
    { label: "Życie",     val: spell.reqLifeMagic },
    { label: "Śmierć",    val: spell.reqDeathMagic },
    { label: "Energia",   val: spell.reqEnergyMagic },
  ].filter(r => r.val != null && r.val > 0);

  let parsedStatuses: any[] = [];
  try {
    if (spell.statusEffects) parsedStatuses = JSON.parse(spell.statusEffects);
  } catch { /* noop */ }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="spell-detail-modal"
        onClick={e => e.stopPropagation()}
        style={{
          "--elem-color":   elem.color,
          "--rarity-color": rarity.color,
          "--rarity-glow":  rarity.glow,
        } as React.CSSProperties}
      >
        <div className="modal-bg-glow" />
        <button className="modal-close" onClick={onClose}>×</button>

        {spell.spellBook && (
          <div className="modal-basic-badge">✦ Czar podstawowy</div>
        )}

        <div className="modal-header">
          <div className="modal-element-badge">
            <span>{elem.icon}</span>
            <span>{elem.label}</span>
          </div>
          <h2 className="modal-spell-name">{spell.name}</h2>
          <div className="modal-meta-row">
            <span className="modal-rarity" style={{ color: rarity.color }}>{rarity.label}</span>
            <span className="modal-separator">·</span>
            <span className="modal-pool">{pool.label}</span>
            <span className="modal-separator">·</span>
            <span className="modal-category">{cat.icon} {cat.label}</span>
          </div>
        </div>

        {spell.special && (
          <div className="modal-description">
            <p className="modal-flavor">{spell.special}</p>
          </div>
        )}

        <div className="modal-stats-grid">
          {spell.damage != null && spell.damage > 0 && (
            <div className="modal-stat">
              <span className="modal-stat-label">Obrażenia</span>
              <span className="modal-stat-value">{spell.damage}</span>
            </div>
          )}
          {spell.summonCount != null && spell.summonCount > 0 && (
            <div className="modal-stat">
              <span className="modal-stat-label">Przywołania</span>
              <span className="modal-stat-value">{spell.summonCount}</span>
            </div>
          )}
          {spell.isDirectional != null && (
            <div className="modal-stat">
              <span className="modal-stat-label">Typ</span>
              <span className="modal-stat-value">{spell.isDirectional ? "Kierunkowy" : "Obszarowy"}</span>
            </div>
          )}
        </div>

        {requirements.length > 0 && (
          <div className="modal-section">
            <h4 className="modal-section-title">Wymagania</h4>
            <div className="modal-requirements">
              {requirements.map(r => (
                <div key={r.label} className="modal-req-badge">{r.label} {r.val}</div>
              ))}
            </div>
          </div>
        )}

        {parsedStatuses.length > 0 && (
          <div className="modal-section">
            <h4 className="modal-section-title">Efekty statusów</h4>
            <div className="modal-status-list">
              {parsedStatuses.map((s: any, i: number) => (
                <div key={i} className="modal-status-badge">{describeStatus(s)}</div>
              ))}
            </div>
          </div>
        )}

        {/* Sekcja zakupu dla czarów podstawowych */}
{spell.spellBook && !spell.owned && (
  <div className="modal-learn-section">
    <p className="modal-learn-cost">
      Koszt nauki: <strong>{spell.basicCost} okruchów mocy</strong>
    </p>
    {!canLearn && (
      <p className="modal-learn-locked">✕ Nie spełniasz wymagań tego czaru</p>
    )}
    {canLearn && onLearn && (
      <button
        onClick={onLearn}
        disabled={learning}
        className="modal-learn-btn"
      >
        {learning ? "Uczenie się..." : `✦ Naucz się tego czaru`}
      </button>
    )}
  </div>
)}

        {spell.owned && (
          <div className="modal-owned-badge">✓ Czar w Twojej bibliotece</div>
        )}

        {spell.discoveredAt && (
          <div className="modal-discovery">
            <span className="modal-discovery-source">
              Odkryto: {SOURCE_LABELS[spell.source ?? ""] ?? spell.source}
            </span>
            <span className="modal-discovery-date">
              {new Date(spell.discoveredAt).toLocaleDateString("pl-PL")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function describeStatus(s: any): string {
  switch (s.type) {
    case "dot":         return `DOT: ${s.damage} ${s.element}/tura`;
    case "resist":      return `Odporność ${s.element}: +${s.value}%`;
    case "vulnerable":  return `Podatność ${s.element}: +${s.value}%`;
    case "stun":        return `Ogłuszenie: ${s.stunChance}% (${s.stunDuration}T)`;
    case "heal_chance": return `Leczenie: ${s.healChance}% → +${s.healAmount}HP`;
    case "miss_chance": return `Szansa chybienia: ${s.missChance}%`;
    case "stat_boost":  return `${s.stat}: ${s.statAmount > 0 ? "+" : ""}${s.statAmount}${s.statMode === "percent" ? "%" : ""}`;
    case "invisibility":return `Niewidzialność: ${s.invisChance}%`;
    case "damage_on_move": return `Poślizg: ${s.moveChance}% → ${s.moveDamage}dmg`;
    default:            return s.type;
  }
}

// ── GŁÓWNY KOMPONENT ──────────────────────────────────────────────────────────

export default function SpellbookPanel() {
  const [spells, setSpells]               = useState<SpellbookSpell[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selectedSpell, setSelectedSpell] = useState<SpellbookSpell | null>(null);
  const [learningId, setLearningId]       = useState<number | null>(null);
  const [mainTab, setMainTab]             = useState<MainTab>("basic");
  const [filterElement, setFilterElement] = useState("all");
  const [filterPool, setFilterPool]       = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showOnlyOwned, setShowOnlyOwned] = useState(false);
  const [charStats, setCharStats] = useState<CharacterStats | null>(null);

  const fetchSpellbook = useCallback(async () => {
    try {
      const res = await api.get("/spellbook");
      setSpells(res.data.spells);
    } catch (err: any) {
      console.error("Błąd ładowania Księgi Magii:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSpellbook(); }, [fetchSpellbook]);
  useEffect(() => {
  api.get("/character/effective-stats")
    .then(res => setCharStats(res.data.effective))
    .catch(() => {});
}, []);

  async function handleLearn(spell: SpellbookSpell, e?: React.MouseEvent) {
    e?.stopPropagation();
    setLearningId(spell.id);
    try {
      const res = await api.post("/spellbook/learn-basic", { spellId: spell.id });
      alert(res.data.message);
      await fetchSpellbook();
      // Odśwież wybrany czar jeśli modal jest otwarty
      if (selectedSpell?.id === spell.id) {
        setSelectedSpell(prev => prev ? { ...prev, owned: true } : null);
      }
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd podczas nauki czaru");
    } finally {
      setLearningId(null);
    }
  }

  // Filtruj wg głównej zakładki
  const tabFiltered = useMemo(() =>
    spells.filter(s => mainTab === "basic" ? s.spellBook : !s.spellBook),
    [spells, mainTab]
  );

  // Filtruj wg dodatkowych filtrów
  const filtered = useMemo(() => {
    return tabFiltered.filter(s => {
      if (showOnlyOwned && !s.owned) return false;
      if (filterElement  !== "all" && s.element  !== filterElement)  return false;
      if (filterPool     !== "all" && s.spellPool !== filterPool)     return false;
      if (filterCategory !== "all" && s.category  !== filterCategory) return false;
      return true;
    });
  }, [tabFiltered, filterElement, filterPool, filterCategory, showOnlyOwned]);

  const basicSpells  = spells.filter(s => s.spellBook);
  const customSpells = spells.filter(s => !s.spellBook);
  const basicOwned   = basicSpells.filter(s => s.owned).length;
  const customDiscovered = customSpells.filter(s => s.discovered).length;

  return (
    <>
      <style>{SPELLBOOK_CSS}</style>

{selectedSpell?.discovered && (
  <SpellDetailModal
    spell={selectedSpell}
    onClose={() => setSelectedSpell(null)}
    onLearn={selectedSpell.spellBook && !selectedSpell.owned
      ? () => handleLearn(selectedSpell)
      : undefined}
    canLearn={meetsRequirements(selectedSpell, charStats)}
    learning={learningId === selectedSpell.id}
  />
)}
      <div className="spellbook-root">

        {/* ── NAGŁÓWEK ── */}
        <div className="spellbook-header">
          <div className="book-title-area">
            <div className="book-ornament">✦</div>
            <h1 className="book-title">Księga Magii</h1>
            <div className="book-ornament">✦</div>
          </div>

          {/* ── GŁÓWNE ZAKŁADKI ── */}
          <div className="main-tabs">
            <button
              className={`main-tab ${mainTab === "basic" ? "active" : ""}`}
              onClick={() => { setMainTab("basic"); setShowOnlyOwned(false); }}
            >
              <span className="main-tab-icon">📖</span>
              <span className="main-tab-label">Czary podstawowe</span>
              <span className="main-tab-count">{basicOwned}/{basicSpells.length}</span>
            </button>
            <button
              className={`main-tab ${mainTab === "custom" ? "active" : ""}`}
              onClick={() => { setMainTab("custom"); setShowOnlyOwned(false); }}
            >
              <span className="main-tab-icon">🌀</span>
              <span className="main-tab-label">Czary niestandardowe</span>
              <span className="main-tab-count">{customDiscovered}/{customSpells.length}</span>
            </button>
          </div>

          {/* Opis zakładki */}
          <p className="tab-description">
            {mainTab === "basic"
              ? "Czary dostępne dla każdego maga. Naucz się ich za okruchy mocy."
              : "Czary odkryte podczas studiów, walk i eksploracji."}
          </p>
        </div>

        {/* ── FILTRY ── */}
        <div className="spellbook-filters">
          <div className="filter-group">
            <span className="filter-group-label">Trudność</span>
            <div className="filter-pills">
              <button className={`filter-pill ${filterPool === "all" ? "active" : ""}`} onClick={() => setFilterPool("all")}>Wszystkie</button>
              {Object.entries(POOL_CONFIG).map(([key, cfg]) => (
                <button key={key} className={`filter-pill ${filterPool === key ? "active" : ""}`} onClick={() => setFilterPool(key)}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-group-label">Żywioł</span>
            <div className="filter-pills">
              <button className={`filter-pill ${filterElement === "all" ? "active" : ""}`} onClick={() => setFilterElement("all")}>Wszystkie</button>
              {Object.entries(ELEMENT_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  className={`filter-pill element-pill ${filterElement === key ? "active" : ""}`}
                  style={{ "--pill-color": cfg.color, "--pill-bg": cfg.bg } as React.CSSProperties}
                  onClick={() => setFilterElement(key)}
                >
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-group-label">Kategoria</span>
            <div className="filter-pills">
              <button className={`filter-pill ${filterCategory === "all" ? "active" : ""}`} onClick={() => setFilterCategory("all")}>Wszystkie</button>
              {Object.entries(CATEGORY_CONFIG).filter(([k]) => k !== "unknown").map(([key, cfg]) => (
                <button key={key} className={`filter-pill ${filterCategory === key ? "active" : ""}`} onClick={() => setFilterCategory(key)}>
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {mainTab === "basic" && (
            <div className="filter-group filter-toggle-group">
              <label className="toggle-label">
                <input type="checkbox" checked={showOnlyOwned} onChange={e => setShowOnlyOwned(e.target.checked)} className="toggle-input" />
                <span className="toggle-track"><span className="toggle-thumb" /></span>
                <span className="toggle-text">Tylko posiadane</span>
              </label>
            </div>
          )}

          {mainTab === "custom" && (
            <div className="filter-group filter-toggle-group">
              <label className="toggle-label">
                <input type="checkbox" checked={showOnlyOwned} onChange={e => setShowOnlyOwned(e.target.checked)} className="toggle-input" />
                <span className="toggle-track"><span className="toggle-thumb" /></span>
                <span className="toggle-text">Tylko odkryte</span>
              </label>
            </div>
          )}
        </div>

        {/* ── TREŚĆ KSIĘGI ── */}
        <div className="spellbook-body">
          <div className="book-spine" />
          <div className="book-pages">
            <div className="book-page-texture" />

            {loading ? (
              <div className="loading-state">
                <div className="loading-runes">
                  {["ᚠ","ᚢ","ᚦ","ᚨ","ᚱ","ᚲ"].map((r, i) => (
                    <span key={i} className="loading-rune" style={{ animationDelay: `${i * 0.15}s` }}>{r}</span>
                  ))}
                </div>
                <p className="loading-text">Otwieranie księgi...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <p className="empty-icon">📖</p>
                <p className="empty-text">Brak czarów pasujących do filtrów</p>
                <p className="empty-sub">Spróbuj zmienić filtry lub odkryj więcej czarów</p>
              </div>
            ) : (
              <div className="spell-grid">
{filtered.map(spell =>
  spell.discovered ? (
    <DiscoveredCard
      key={spell.id}
      spell={spell}
      onClick={() => setSelectedSpell(spell)}
      onLearn={spell.spellBook && !spell.owned
        ? (e) => handleLearn(spell, e)
        : undefined}
      canLearn={meetsRequirements(spell, charStats)}
      learning={learningId === spell.id}
    />
                  ) : (
                    <UnknownCard key={spell.id} spell={spell} />
                  )
                )}
              </div>
            )}

            {!loading && (
              <div className="results-count">
                {filtered.length} czarów
                {mainTab === "basic"
                  ? ` · ${filtered.filter(s => s.owned).length} posiadanych`
                  : ` · ${filtered.filter(s => s.discovered).length} odkrytych`}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── STYLE ─────────────────────────────────────────────────────────────────────

const SPELLBOOK_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');

  :root {
    --parchment:      #f5efe0;
    --parchment-dark: #e8ddc8;
    --ink:            #2c1810;
    --ink-faded:      #6b4c3b;
    --gold:           #c9963a;
    --gold-light:     #e8c06a;
    --border-ornate:  #8b6840;
  }

  .spellbook-root {
    font-family: 'Crimson Text', Georgia, serif;
    color: var(--ink);
    max-width: 100%;
  }

  /* ── NAGŁÓWEK ── */
  .spellbook-header {
    text-align: center;
    padding: 24px 24px 0;
    background: linear-gradient(180deg, #2c1810 0%, #3d2410 100%);
    border-radius: 12px 12px 0 0;
    border: 1px solid var(--border-ornate);
    border-bottom: none;
  }

  .book-title-area {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-bottom: 20px;
  }

  .book-title {
    font-family: 'Cinzel', serif;
    font-size: 26px;
    font-weight: 700;
    color: var(--gold-light);
    letter-spacing: 0.1em;
    margin: 0;
    text-shadow: 0 0 30px rgba(201,150,58,0.5);
  }

  .book-ornament { font-size: 16px; color: var(--gold); opacity: 0.7; }

  /* ── GŁÓWNE ZAKŁADKI ── */
  .main-tabs {
    display: flex;
    gap: 2px;
    justify-content: center;
    margin-bottom: 0;
  }

  .main-tab {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 28px;
    border: none;
    border-radius: 8px 8px 0 0;
    background: rgba(255,255,255,0.06);
    color: rgba(232,192,106,0.55);
    cursor: pointer;
    font-family: 'Cinzel', serif;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.06em;
    transition: all 0.2s ease;
    border-top: 1px solid rgba(139,104,64,0.2);
    border-left: 1px solid rgba(139,104,64,0.2);
    border-right: 1px solid rgba(139,104,64,0.2);
  }

  .main-tab:hover:not(.active) {
    background: rgba(255,255,255,0.1);
    color: rgba(232,192,106,0.8);
  }

  .main-tab.active {
    background: var(--parchment);
    color: var(--ink);
    border-color: var(--border-ornate);
    position: relative;
    z-index: 1;
  }

  .main-tab.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0; right: 0;
    height: 2px;
    background: var(--parchment);
  }

  .main-tab-icon { font-size: 15px; }
  .main-tab-label { }

  .main-tab-count {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 10px;
    background: rgba(0,0,0,0.15);
    color: inherit;
    opacity: 0.8;
  }

  .main-tab.active .main-tab-count {
    background: rgba(44,24,16,0.1);
  }

  .tab-description {
    font-size: 12px;
    color: rgba(232,192,106,0.45);
    margin: 0;
    padding: 8px 0 14px;
    font-style: italic;
    font-family: 'Crimson Text', serif;
  }

  /* ── FILTRY ── */
  .spellbook-filters {
    background: var(--parchment-dark);
    border: 1px solid var(--border-ornate);
    border-top: none;
    border-bottom: none;
    padding: 14px 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .filter-group-label {
    font-family: 'Cinzel', serif;
    font-size: 11px;
    font-weight: 600;
    color: var(--ink-faded);
    letter-spacing: 0.08em;
    min-width: 80px;
    text-transform: uppercase;
  }

  .filter-pills { display: flex; flex-wrap: wrap; gap: 5px; }

  .filter-pill {
    font-family: 'Crimson Text', serif;
    font-size: 13px;
    padding: 2px 9px;
    border-radius: 20px;
    border: 1px solid rgba(139,104,64,0.35);
    background: transparent;
    color: var(--ink-faded);
    cursor: pointer;
    transition: all 0.15s;
  }

  .filter-pill:hover { background: rgba(201,150,58,0.1); border-color: var(--gold); color: var(--ink); }
  .filter-pill.active { background: var(--ink); border-color: var(--ink); color: var(--gold-light); }

  .filter-pill.element-pill.active {
    background: var(--pill-color, var(--ink));
    border-color: var(--pill-color, var(--ink));
    color: white;
  }
  .filter-pill.element-pill:hover:not(.active) {
    background: var(--pill-bg, rgba(201,150,58,0.1));
    border-color: var(--pill-color, var(--gold));
    color: var(--pill-color, var(--ink));
  }

  .filter-toggle-group { margin-top: 2px; }

  .toggle-label { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
  .toggle-input { display: none; }
  .toggle-track {
    width: 34px; height: 18px;
    background: rgba(139,104,64,0.3);
    border-radius: 9px;
    position: relative;
    border: 1px solid rgba(139,104,64,0.5);
    transition: background 0.2s;
  }
  .toggle-input:checked + .toggle-track { background: var(--ink); }
  .toggle-thumb {
    position: absolute; top: 2px; left: 2px;
    width: 12px; height: 12px;
    background: var(--gold); border-radius: 50%;
    transition: transform 0.2s;
  }
  .toggle-input:checked + .toggle-track .toggle-thumb { transform: translateX(16px); }
  .toggle-text {
    font-family: 'Cinzel', serif; font-size: 11px; font-weight: 600;
    color: var(--ink-faded); letter-spacing: 0.06em; text-transform: uppercase;
  }

  /* ── TREŚĆ KSIĘGI ── */
  .spellbook-body {
    display: flex;
    min-height: 400px;
    border: 1px solid var(--border-ornate);
    border-radius: 0 0 12px 12px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(44,24,16,0.2);
  }

  .book-spine {
    width: 20px;
    flex-shrink: 0;
    background: linear-gradient(90deg, #3d1f0a 0%, #6b3a1a 50%, #3d1f0a 100%);
    position: relative;
  }
  .book-spine::after {
    content: '';
    position: absolute;
    top: 0; left: 50%; width: 2px; height: 100%;
    background: linear-gradient(180deg, transparent, rgba(201,150,58,0.3), transparent);
    transform: translateX(-50%);
  }

  .book-pages {
    flex: 1;
    background:
      radial-gradient(ellipse at 10% 20%, rgba(201,150,58,0.04) 0%, transparent 60%),
      var(--parchment);
    padding: 20px;
    position: relative;
  }

  .book-page-texture {
    position: absolute; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
    pointer-events: none;
  }

  /* ── SIATKA ── */
  .spell-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
    gap: 12px;
    position: relative;
    z-index: 1;
  }

  /* ── KARTY ── */
  .spellbook-card {
    position: relative;
    border-radius: 8px;
    padding: 11px;
    border: 1px solid rgba(139,104,64,0.35);
    background: white;
    display: flex;
    flex-direction: column;
    gap: 7px;
    text-align: left;
    font-family: 'Crimson Text', serif;
    transition: transform 0.15s, box-shadow 0.15s;
    min-height: 150px;
    overflow: hidden;
  }

  .spellbook-card.discovered {
    cursor: pointer;
    background: linear-gradient(135deg, color-mix(in srgb, white 92%, var(--elem-bg, white)) 0%, white 100%);
  }

  .spellbook-card.discovered:hover {
    transform: translateY(-3px);
    box-shadow:
      0 8px 20px rgba(44,24,16,0.1),
      0 0 0 1px var(--rarity-color, rgba(139,104,64,0.4)),
      0 0 14px var(--rarity-glow, transparent);
    border-color: var(--rarity-color, rgba(139,104,64,0.35));
  }

  .spellbook-card.unknown {
    background: repeating-linear-gradient(45deg, rgba(139,104,64,0.03), rgba(139,104,64,0.03) 2px, transparent 2px, transparent 8px), white;
    opacity: 0.7;
    cursor: default;
  }

  .rarity-corner {
    position: absolute; top: 0; right: 0;
    width: 0; height: 0;
    border-style: solid;
    border-width: 0 18px 18px 0;
    border-color: transparent var(--rarity-color, rgba(148,163,184,0.6)) transparent transparent;
    opacity: 0.8;
  }

  .card-element-bar { display: flex; align-items: center; gap: 4px; }
  .card-element-bar.muted { opacity: 0.6; }
  .element-icon  { font-size: 12px; line-height: 1; }
  .element-label { font-size: 10px; color: var(--ink-faded); font-family: 'Cinzel', serif; flex: 1; }
  .category-badge { font-size: 11px; opacity: 0.6; }

  .card-name { flex: 1; }
  .spell-name {
    font-family: 'Cinzel', serif;
    font-size: 12px;
    font-weight: 600;
    color: var(--ink);
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-difficulty { display: flex; align-items: center; gap: 2px; }
  .difficulty-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: var(--ink); display: inline-block; flex-shrink: 0;
  }
  .difficulty-label {
    font-size: 9px; color: var(--ink-faded); margin-left: 3px;
    font-family: 'Cinzel', serif; letter-spacing: 0.03em;
  }

  .card-footer { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
  .rarity-label { font-family: 'Cinzel', serif; font-size: 9px; letter-spacing: 0.05em; font-weight: 600; }
  .damage-badge {
    font-size: 9px; color: var(--ink-faded);
    background: rgba(44,24,16,0.07); padding: 1px 4px; border-radius: 3px; margin-left: auto;
  }

  /* Przycisk nauki na karcie */
  .learn-btn-wrapper { margin-top: auto; }
  .learn-btn {
    width: 100%;
    padding: 5px 8px;
    font-family: 'Cinzel', serif;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.05em;
    color: var(--gold-light);
    background: var(--ink);
    border: 1px solid var(--gold);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .learn-btn:hover:not(:disabled) {
    background: #3d2410;
    box-shadow: 0 0 8px rgba(201,150,58,0.3);
  }
  .learn-btn:disabled { opacity: 0.5; cursor: default; }

  .owned-indicator {
    margin-top: auto;
    font-family: 'Cinzel', serif;
    font-size: 9px;
    color: #16a34a;
    text-align: center;
    padding: 3px;
    background: rgba(22,163,74,0.08);
    border-radius: 3px;
    border: 1px solid rgba(22,163,74,0.2);
  }

  /* Nieznana karta */
  .card-unknown-center {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 5px;
  }
  .unknown-sigil { width: 32px; height: 32px; color: var(--ink-faded); }
  .unknown-sigil svg { width: 100%; height: 100%; }
  .unknown-label {
    font-size: 9px; color: var(--ink-faded);
    font-family: 'Cinzel', serif; letter-spacing: 0.04em; opacity: 0.6;
  }

  /* Stany ładowania i pusto */
  .loading-state, .empty-state {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    min-height: 280px; gap: 12px;
  }
  .loading-runes { display: flex; gap: 8px; }
  .loading-rune {
    font-size: 20px; color: var(--ink-faded);
    animation: rune-pulse 1.5s ease-in-out infinite;
  }
  @keyframes rune-pulse {
    0%, 100% { opacity: 0.2; transform: translateY(0); }
    50%       { opacity: 1;   transform: translateY(-4px); }
  }
  .loading-text { font-family: 'Cinzel', serif; font-size: 12px; color: var(--ink-faded); letter-spacing: 0.1em; }
  .empty-icon { font-size: 36px; margin: 0; }
  .empty-text { font-family: 'Cinzel', serif; font-size: 14px; color: var(--ink); margin: 0; }
  .empty-sub  { font-size: 12px; color: var(--ink-faded); margin: 0; }

  .results-count {
    margin-top: 16px; text-align: center;
    font-family: 'Cinzel', serif; font-size: 10px;
    color: var(--ink-faded); letter-spacing: 0.05em; opacity: 0.6;
  }

  /* ── MODAL ── */
  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(44,24,16,0.7);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    z-index: 200; padding: 16px;
  }

  .spell-detail-modal {
    position: relative;
    background: var(--parchment);
    border: 2px solid var(--border-ornate);
    border-radius: 12px;
    width: 100%; max-width: 420px; max-height: 85vh;
    overflow-y: auto; padding: 24px;
    box-shadow: 0 24px 64px rgba(44,24,16,0.4), inset 0 1px 0 rgba(255,255,255,0.3);
  }

  .modal-bg-glow {
    position: absolute; top: -60px; right: -60px;
    width: 180px; height: 180px;
    background: radial-gradient(circle, var(--rarity-glow, transparent) 0%, transparent 70%);
    pointer-events: none;
  }

  .modal-close {
    position: absolute; top: 12px; right: 16px;
    font-size: 20px; color: var(--ink-faded);
    background: none; border: none; cursor: pointer;
    padding: 2px 6px; border-radius: 4px; transition: color 0.15s;
  }
  .modal-close:hover { color: var(--ink); background: rgba(44,24,16,0.07); }

  .modal-basic-badge {
    display: inline-block;
    font-family: 'Cinzel', serif;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    color: var(--gold);
    background: rgba(201,150,58,0.1);
    border: 1px solid rgba(201,150,58,0.3);
    padding: 2px 10px;
    border-radius: 12px;
    margin-bottom: 12px;
  }

  .modal-header { margin-bottom: 16px; }

  .modal-element-badge {
    display: inline-flex; align-items: center; gap: 5px;
    font-family: 'Cinzel', serif; font-size: 11px;
    color: var(--elem-color, var(--ink-faded));
    text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;
  }

  .modal-spell-name {
    font-family: 'Cinzel', serif; font-size: 20px; font-weight: 700;
    color: var(--ink); margin: 0 0 8px; line-height: 1.2;
  }

  .modal-meta-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .modal-rarity   { font-family: 'Cinzel', serif; font-size: 11px; font-weight: 600; }
  .modal-sep      { color: rgba(44,24,16,0.3); }
  .modal-pool, .modal-category { font-family: 'Cinzel', serif; font-size: 11px; color: var(--ink-faded); }

  .modal-description {
    background: rgba(44,24,16,0.04);
    border-left: 3px solid var(--gold);
    padding: 10px 12px;
    border-radius: 0 6px 6px 0;
    margin-bottom: 14px;
  }
  .modal-flavor { font-size: 14px; font-style: italic; color: var(--ink-faded); line-height: 1.6; margin: 0; }

  .modal-stats-grid { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
  .modal-stat { background: rgba(44,24,16,0.06); border-radius: 6px; padding: 7px 10px; text-align: center; }
  .modal-stat-label { display: block; font-family: 'Cinzel', serif; font-size: 9px; color: var(--ink-faded); text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 2px; }
  .modal-stat-value { font-family: 'Cinzel', serif; font-size: 15px; font-weight: 700; color: var(--ink); }

  .modal-section { margin-bottom: 12px; }
  .modal-section-title { font-family: 'Cinzel', serif; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink-faded); margin: 0 0 7px; }
  .modal-requirements, .modal-status-list { display: flex; flex-wrap: wrap; gap: 5px; }
  .modal-req-badge, .modal-status-badge {
    font-size: 11px; padding: 2px 7px; border-radius: 4px;
    background: rgba(44,24,16,0.07); color: var(--ink-faded);
    border: 1px solid rgba(139,104,64,0.2);
  }

  /* Sekcja zakupu w modalu */
  .modal-learn-section {
    margin-top: 16px;
    padding: 14px;
    background: rgba(201,150,58,0.07);
    border: 1px solid rgba(201,150,58,0.25);
    border-radius: 8px;
    text-align: center;
  }
  .modal-learn-cost {
    font-family: 'Cinzel', serif; font-size: 12px;
    color: var(--ink-faded); margin: 0 0 10px;
  }
  .modal-learn-cost strong { color: var(--ink); }
  .modal-learn-btn {
    width: 100%; padding: 10px;
    font-family: 'Cinzel', serif; font-size: 13px; font-weight: 600;
    letter-spacing: 0.07em; color: var(--gold-light);
    background: var(--ink); border: 1px solid var(--gold);
    border-radius: 6px; cursor: pointer; transition: all 0.15s;
  }
  .modal-learn-btn:hover:not(:disabled) {
    background: #3d2410;
    box-shadow: 0 0 12px rgba(201,150,58,0.35);
  }
  .modal-learn-btn:disabled { opacity: 0.5; cursor: default; }

  .modal-owned-badge {
    margin-top: 14px; text-align: center;
    font-family: 'Cinzel', serif; font-size: 12px; color: #16a34a;
    padding: 6px 12px; background: rgba(22,163,74,0.08);
    border: 1px solid rgba(22,163,74,0.2); border-radius: 6px;
  }

  .learn-btn.locked {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: rgba(139,104,64,0.3);
  color: var(--ink-faded);
}

.modal-learn-locked {
  font-family: 'Cinzel', serif;
  font-size: 11px;
  color: #dc2626;
  margin: 0 0 8px;
  opacity: 0.8;
}
  .modal-discovery {
    display: flex; justify-content: space-between; align-items: center;
    border-top: 1px solid rgba(139,104,64,0.2);
    padding-top: 10px; margin-top: 10px;
  }
  .modal-discovery-source { font-family: 'Cinzel', serif; font-size: 10px; color: var(--ink-faded); }
  .modal-discovery-date   { font-size: 11px; color: var(--ink-faded); opacity: 0.7; }
`;
