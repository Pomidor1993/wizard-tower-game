import { useEffect, useState, useCallback, useMemo } from "react";
import api from "../api/client";

// ── TYPY ─────────────────────────────────────────────────────────────────────

interface SpellbookSpell {
  id: number;
  discovered: boolean;
  element: string;
  spellPool: string;
  rarity: string;
  category: string;
  // Tylko dla discovered
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

// ── DANE KONFIGURACYJNE ───────────────────────────────────────────────────────

const ELEMENT_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  fire:   { label: "Ogień",       color: "#ef4444", bg: "rgba(239,68,68,0.12)",   icon: "🔥" },
  water:  { label: "Woda",        color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  icon: "💧" },
  earth:  { label: "Ziemia",      color: "#84cc16", bg: "rgba(132,204,22,0.12)",  icon: "🌿" },
  air:    { label: "Powietrze",   color: "#a3e635", bg: "rgba(163,230,53,0.12)",  icon: "🌪" },
  chaos:  { label: "Chaos",       color: "#a855f7", bg: "rgba(168,85,247,0.12)",  icon: "⚡" },
  life:   { label: "Życie",       color: "#22c55e", bg: "rgba(34,197,94,0.12)",   icon: "✨" },
  death:  { label: "Śmierć",      color: "#64748b", bg: "rgba(100,116,139,0.12)", icon: "💀" },
  energy: { label: "Energia",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  icon: "⚡" },
  basic:  { label: "Podstawowy",  color: "#94a3b8", bg: "rgba(148,163,184,0.12)", icon: "○" },
};

const POOL_CONFIG: Record<string, { label: string; difficulty: string }> = {
  chaotic:      { label: "Banalne",          difficulty: "1" },
  controlled:   { label: "Proste",           difficulty: "2" },
  incantation:  { label: "Wymagające",       difficulty: "3" },
  professional: { label: "Skomplikowane",    difficulty: "4" },
  master:       { label: "Szalenie trudne",  difficulty: "5" },
};

const RARITY_CONFIG: Record<string, { label: string; color: string; glow: string }> = {
  common:   { label: "Pospolity",  color: "#94a3b8", glow: "rgba(148,163,184,0.3)" },
  uncommon: { label: "Nietypowy",  color: "#4ade80", glow: "rgba(74,222,128,0.3)" },
  rare:     { label: "Rzadki",     color: "#60a5fa", glow: "rgba(96,165,250,0.3)" },
  unique:   { label: "Unikalny",   color: "#fbbf24", glow: "rgba(251,191,36,0.4)" },
};

const CATEGORY_CONFIG: Record<string, { label: string; icon: string }> = {
  summoner:  { label: "Przywołujący", icon: "👁" },
  offensive: { label: "Ofensywny",    icon: "⚔" },
  defensive: { label: "Defensywny",   icon: "🛡" },
  unknown:   { label: "Nieznany",     icon: "?" },
};

const SOURCE_LABELS: Record<string, string> = {
  study:       "Studia",
  battle_cast: "Walka",
  school:      "Szkoła Magii",
};

// ── KOMPONENTY KART ───────────────────────────────────────────────────────────

function DiscoveredCard({ spell, onClick }: { spell: SpellbookSpell; onClick: () => void }) {
  const elem    = ELEMENT_CONFIG[spell.element]   ?? ELEMENT_CONFIG.basic!;
  const rarity  = RARITY_CONFIG[spell.rarity]    ?? RARITY_CONFIG.common!;
  const pool    = POOL_CONFIG[spell.spellPool]    ?? { label: spell.spellPool, difficulty: "?" };
  const cat     = CATEGORY_CONFIG[spell.category] ?? CATEGORY_CONFIG.unknown!;

  return (
    <button
      onClick={onClick}
      className="spellbook-card discovered"
      style={{
        "--elem-color": elem.color,
        "--elem-bg":    elem.bg,
        "--rarity-color": rarity.color,
        "--rarity-glow":  rarity.glow,
      } as React.CSSProperties}
    >
      {/* Ozdobny narożnik rzadkości */}
      <div className="rarity-corner" />

      {/* Górny pasek z żywiołem */}
      <div className="card-element-bar">
        <span className="element-icon">{elem.icon}</span>
        <span className="element-label">{elem.label}</span>
        <span className="category-badge">{cat.icon}</span>
      </div>

      {/* Nazwa czaru */}
      <div className="card-name">
        <span className="spell-name">{spell.name}</span>
      </div>

      {/* Trudność gwiazdkami */}
      <div className="card-difficulty">
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className="difficulty-dot"
            style={{ opacity: i < parseInt(pool.difficulty) ? 1 : 0.2 }}
          />
        ))}
        <span className="difficulty-label">{pool.label}</span>
      </div>

      {/* Dolny pasek — obrażenia i rzadkość */}
      <div className="card-footer">
        <span className="rarity-label" style={{ color: rarity.color }}>
          {rarity.label}
        </span>
        {spell.damage != null && spell.damage > 0 && (
          <span className="damage-badge">⚔ {spell.damage}</span>
        )}
        {spell.owned && (
          <span className="owned-badge">W bibliotece</span>
        )}
      </div>
    </button>
  );
}

function UnknownCard({ spell }: { spell: SpellbookSpell }) {
  const elem   = ELEMENT_CONFIG[spell.element] ?? ELEMENT_CONFIG.basic!;
  const pool   = POOL_CONFIG[spell.spellPool]  ?? { label: spell.spellPool, difficulty: "?" };
  const rarity = RARITY_CONFIG[spell.rarity]   ?? RARITY_CONFIG.common!;

  return (
    <div className="spellbook-card unknown">
      {/* Górny pasek z żywiołem (widoczny) */}
      <div className="card-element-bar muted">
        <span className="element-icon" style={{ filter: "grayscale(1) opacity(0.5)" }}>{elem.icon}</span>
        <span className="element-label" style={{ opacity: 0.5 }}>{elem.label}</span>
      </div>

      {/* Środek — kłódka / nieznany symbol */}
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

      {/* Trudność */}
      <div className="card-difficulty muted">
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className="difficulty-dot"
            style={{ opacity: i < parseInt(pool.difficulty) ? 0.35 : 0.1 }}
          />
        ))}
        <span className="difficulty-label" style={{ opacity: 0.4 }}>{pool.label}</span>
      </div>

      {/* Rzadkość (widoczna jako wskazówka) */}
      <div className="card-footer">
        <span className="rarity-label" style={{ color: rarity.color, opacity: 0.5 }}>
          {rarity.label}
        </span>
      </div>
    </div>
  );
}

// ── MODAL SZCZEGÓŁÓW ──────────────────────────────────────────────────────────

function SpellDetailModal({ spell, onClose }: { spell: SpellbookSpell; onClose: () => void }) {
  const elem   = ELEMENT_CONFIG[spell.element]   ?? ELEMENT_CONFIG.basic!;
  const rarity = RARITY_CONFIG[spell.rarity]     ?? RARITY_CONFIG.common!;
  const pool   = POOL_CONFIG[spell.spellPool]    ?? { label: spell.spellPool, difficulty: "?" };
  const cat    = CATEGORY_CONFIG[spell.category] ?? CATEGORY_CONFIG.unknown!;

  const requirements = [
    { label: "Ogień",      val: spell.reqFireMagic },
    { label: "Woda",       val: spell.reqWaterMagic },
    { label: "Ziemia",     val: spell.reqEarthMagic },
    { label: "Powietrze",  val: spell.reqAirMagic },
    { label: "Chaos",      val: spell.reqChaosMagic },
    { label: "Życie",      val: spell.reqLifeMagic },
    { label: "Śmierć",     val: spell.reqDeathMagic },
    { label: "Energia",    val: spell.reqEnergyMagic },
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
        {/* Dekoracyjne tło */}
        <div className="modal-bg-glow" />

        <button className="modal-close" onClick={onClose}>×</button>

        {/* Nagłówek */}
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

        {/* Opis czaru */}
        {spell.special && (
          <div className="modal-description">
            <p className="modal-flavor">{spell.special}</p>
          </div>
        )}

        {/* Statystyki */}
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

        {/* Wymagania */}
        {requirements.length > 0 && (
          <div className="modal-section">
            <h4 className="modal-section-title">Wymagania</h4>
            <div className="modal-requirements">
              {requirements.map(r => (
                <div key={r.label} className="modal-req-badge">
                  {r.label} {r.val}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Efekty statusów */}
        {parsedStatuses.length > 0 && (
          <div className="modal-section">
            <h4 className="modal-section-title">Efekty statusów</h4>
            <div className="modal-status-list">
              {parsedStatuses.map((s: any, i: number) => (
                <div key={i} className="modal-status-badge">
                  {describeStatus(s)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Źródło odkrycia */}
        {spell.discoveredAt && (
          <div className="modal-discovery">
            <span className="modal-discovery-source">
              Odkryto przez: {SOURCE_LABELS[spell.source ?? ""] ?? spell.source}
            </span>
            <span className="modal-discovery-date">
              {new Date(spell.discoveredAt).toLocaleDateString("pl-PL")}
            </span>
          </div>
        )}

        {spell.owned && (
          <div className="modal-owned-badge">
            ✓ Czar w Twojej bibliotece
          </div>
        )}
      </div>
    </div>
  );
}

function describeStatus(s: any): string {
  switch (s.type) {
    case "dot":        return `DOT: ${s.damage} ${s.element}/tura`;
    case "resist":     return `Odporność ${s.element}: +${s.value}%`;
    case "vulnerable": return `Podatność ${s.element}: +${s.value}%`;
    case "stun":       return `Ogłuszenie: ${s.stunChance}% (${s.stunDuration}T)`;
    case "heal_chance":return `Leczenie: ${s.healChance}% → +${s.healAmount}HP`;
    case "miss_chance":return `Szansa chybienia: ${s.missChance}%`;
    case "stat_boost": return `${s.stat}: ${s.statAmount > 0 ? "+" : ""}${s.statAmount}${s.statMode === "percent" ? "%" : ""}`;
    case "invisibility":return `Niewidzialność: ${s.invisChance}%`;
    case "damage_on_move": return `Poślizg: ${s.moveChance}% → ${s.moveDamage}dmg`;
    default:           return s.type;
  }
}

// ── GŁÓWNY KOMPONENT ──────────────────────────────────────────────────────────

export default function SpellbookPanel() {
  const [spells, setSpells]               = useState<SpellbookSpell[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selectedSpell, setSelectedSpell] = useState<SpellbookSpell | null>(null);
  const [filterElement, setFilterElement] = useState<string>("all");
  const [filterPool, setFilterPool]       = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showOnlyDiscovered, setShowOnlyDiscovered] = useState(false);

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

  const filtered = useMemo(() => {
    return spells.filter(s => {
      if (showOnlyDiscovered && !s.discovered) return false;
      if (filterElement !== "all" && s.element !== filterElement) return false;
      if (filterPool !== "all" && s.spellPool !== filterPool) return false;
      if (filterCategory !== "all" && s.category !== filterCategory) return false;
      return true;
    });
  }, [spells, filterElement, filterPool, filterCategory, showOnlyDiscovered]);

  const stats = useMemo(() => {
    const total      = spells.length;
    const discovered = spells.filter(s => s.discovered).length;
    return { total, discovered, pct: total > 0 ? Math.round(discovered / total * 100) : 0 };
  }, [spells]);

  return (
    <>
      <style>{SPELLBOOK_CSS}</style>

      {selectedSpell?.discovered && (
        <SpellDetailModal
          spell={selectedSpell}
          onClose={() => setSelectedSpell(null)}
        />
      )}

      <div className="spellbook-root">
        {/* ── NAGŁÓWEK KSIĘGI ─────────────────────────────────────── */}
        <div className="spellbook-header">
          <div className="book-title-area">
            <div className="book-ornament">✦</div>
            <h1 className="book-title">Księga Magii</h1>
            <div className="book-ornament">✦</div>
          </div>
          <div className="book-progress">
            <div className="progress-text">
              <span className="progress-discovered">{stats.discovered}</span>
              <span className="progress-sep"> / </span>
              <span className="progress-total">{stats.total}</span>
              <span className="progress-label"> czarów odkrytych</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${stats.pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── FILTRY ──────────────────────────────────────────────── */}
        <div className="spellbook-filters">
          {/* Trudność */}
          <div className="filter-group">
            <span className="filter-group-label">Trudność</span>
            <div className="filter-pills">
              <button
                className={`filter-pill ${filterPool === "all" ? "active" : ""}`}
                onClick={() => setFilterPool("all")}
              >Wszystkie</button>
              {Object.entries(POOL_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  className={`filter-pill ${filterPool === key ? "active" : ""}`}
                  onClick={() => setFilterPool(key)}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Żywioł */}
          <div className="filter-group">
            <span className="filter-group-label">Żywioł</span>
            <div className="filter-pills">
              <button
                className={`filter-pill ${filterElement === "all" ? "active" : ""}`}
                onClick={() => setFilterElement("all")}
              >Wszystkie</button>
              {Object.entries(ELEMENT_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  className={`filter-pill element-pill ${filterElement === key ? "active" : ""}`}
                  style={{
                    "--pill-color": cfg.color,
                    "--pill-bg": cfg.bg,
                  } as React.CSSProperties}
                  onClick={() => setFilterElement(key)}
                >
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Kategoria */}
          <div className="filter-group">
            <span className="filter-group-label">Kategoria</span>
            <div className="filter-pills">
              <button
                className={`filter-pill ${filterCategory === "all" ? "active" : ""}`}
                onClick={() => setFilterCategory("all")}
              >Wszystkie</button>
              {Object.entries(CATEGORY_CONFIG).filter(([k]) => k !== "unknown").map(([key, cfg]) => (
                <button
                  key={key}
                  className={`filter-pill ${filterCategory === key ? "active" : ""}`}
                  onClick={() => setFilterCategory(key)}
                >
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tylko odkryte */}
          <div className="filter-group filter-toggle-group">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showOnlyDiscovered}
                onChange={e => setShowOnlyDiscovered(e.target.checked)}
                className="toggle-input"
              />
              <span className="toggle-track">
                <span className="toggle-thumb" />
              </span>
              <span className="toggle-text">Tylko odkryte</span>
            </label>
          </div>
        </div>

        {/* ── TREŚĆ KSIĘGI ────────────────────────────────────────── */}
        <div className="spellbook-body">
          {/* Dekoracyjna oprawa */}
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
                    />
                  ) : (
                    <UnknownCard key={spell.id} spell={spell} />
                  )
                )}
              </div>
            )}

            {/* Licznik rezultatów */}
            {!loading && (
              <div className="results-count">
                {filtered.length} czarów · {filtered.filter(s => s.discovered).length} odkrytych
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
    --parchment:     #f5efe0;
    --parchment-dark:#e8ddc8;
    --ink:           #2c1810;
    --ink-faded:     #6b4c3b;
    --gold:          #c9963a;
    --gold-light:    #e8c06a;
    --spine-color:   #3d1f0a;
    --border-ornate: #8b6840;
  }

  /* ── ROOT ── */
  .spellbook-root {
    font-family: 'Crimson Text', Georgia, serif;
    color: var(--ink);
    max-width: 100%;
  }

  /* ── NAGŁÓWEK ── */
  .spellbook-header {
    text-align: center;
    padding: 28px 24px 20px;
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
    margin-bottom: 14px;
  }

  .book-title {
    font-family: 'Cinzel', serif;
    font-size: 28px;
    font-weight: 700;
    color: var(--gold-light);
    letter-spacing: 0.1em;
    margin: 0;
    text-shadow: 0 0 30px rgba(201, 150, 58, 0.5);
  }

  .book-ornament {
    font-size: 18px;
    color: var(--gold);
    opacity: 0.7;
  }

  .book-progress {
    max-width: 320px;
    margin: 0 auto;
  }

  .progress-text {
    font-family: 'Cinzel', serif;
    font-size: 12px;
    color: rgba(232, 192, 106, 0.7);
    margin-bottom: 6px;
  }

  .progress-discovered { color: var(--gold-light); font-weight: 600; font-size: 15px; }
  .progress-sep        { color: rgba(232,192,106,0.4); }
  .progress-total      { color: rgba(232,192,106,0.6); }
  .progress-label      { color: rgba(232,192,106,0.5); }

  .progress-bar {
    height: 4px;
    background: rgba(255,255,255,0.1);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--gold), var(--gold-light));
    border-radius: 2px;
    transition: width 0.8s ease;
  }

  /* ── FILTRY ── */
  .spellbook-filters {
    background: var(--parchment-dark);
    border: 1px solid var(--border-ornate);
    border-top: none;
    border-bottom: none;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
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

  .filter-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .filter-pill {
    font-family: 'Crimson Text', serif;
    font-size: 13px;
    padding: 3px 10px;
    border-radius: 20px;
    border: 1px solid rgba(139, 104, 64, 0.4);
    background: transparent;
    color: var(--ink-faded);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .filter-pill:hover {
    background: rgba(201,150,58,0.1);
    border-color: var(--gold);
    color: var(--ink);
  }

  .filter-pill.active {
    background: var(--ink);
    border-color: var(--ink);
    color: var(--gold-light);
  }

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

  /* Toggle */
  .filter-toggle-group { margin-top: 2px; }

  .toggle-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    user-select: none;
  }

  .toggle-input { display: none; }

  .toggle-track {
    width: 34px;
    height: 18px;
    background: rgba(139,104,64,0.3);
    border-radius: 9px;
    position: relative;
    border: 1px solid rgba(139,104,64,0.5);
    transition: background 0.2s;
  }

  .toggle-input:checked + .toggle-track {
    background: var(--ink);
  }

  .toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 12px;
    height: 12px;
    background: var(--gold);
    border-radius: 50%;
    transition: transform 0.2s;
  }

  .toggle-input:checked + .toggle-track .toggle-thumb {
    transform: translateX(16px);
  }

  .toggle-text {
    font-family: 'Cinzel', serif;
    font-size: 11px;
    font-weight: 600;
    color: var(--ink-faded);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  /* ── TREŚĆ KSIĘGI ── */
  .spellbook-body {
    display: flex;
    min-height: 500px;
    border: 1px solid var(--border-ornate);
    border-radius: 0 0 12px 12px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(44, 24, 16, 0.2);
  }

  .book-spine {
    width: 24px;
    flex-shrink: 0;
    background: linear-gradient(90deg, #3d1f0a 0%, #6b3a1a 50%, #3d1f0a 100%);
    position: relative;
  }

  .book-spine::after {
    content: '';
    position: absolute;
    top: 0; left: 50%;
    width: 2px; height: 100%;
    background: linear-gradient(180deg, transparent, rgba(201,150,58,0.3), transparent);
    transform: translateX(-50%);
  }

  .book-pages {
    flex: 1;
    background:
      radial-gradient(ellipse at 10% 20%, rgba(201,150,58,0.04) 0%, transparent 60%),
      radial-gradient(ellipse at 90% 80%, rgba(44,24,16,0.04) 0%, transparent 60%),
      var(--parchment);
    padding: 24px;
    position: relative;
  }

  .book-page-texture {
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
    pointer-events: none;
  }

  /* ── SIATKA CZARÓW ── */
  .spell-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 14px;
    position: relative;
    z-index: 1;
  }

  /* ── KARTA CZARU ── */
  .spellbook-card {
    position: relative;
    border-radius: 8px;
    padding: 12px;
    border: 1px solid rgba(139,104,64,0.35);
    background: white;
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-align: left;
    font-family: 'Crimson Text', serif;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    min-height: 140px;
    overflow: hidden;
  }

  .spellbook-card.discovered {
    cursor: pointer;
    background: linear-gradient(
      135deg,
      color-mix(in srgb, white 92%, var(--elem-bg, white)) 0%,
      white 100%
    );
  }

  .spellbook-card.discovered:hover {
    transform: translateY(-3px);
    box-shadow:
      0 8px 24px rgba(44,24,16,0.12),
      0 0 0 1px var(--rarity-color, rgba(139,104,64,0.4)),
      0 0 16px var(--rarity-glow, transparent);
    border-color: var(--rarity-color, rgba(139,104,64,0.35));
  }

  .spellbook-card.unknown {
    background: repeating-linear-gradient(
      45deg,
      rgba(139,104,64,0.03),
      rgba(139,104,64,0.03) 2px,
      transparent 2px,
      transparent 8px
    ),
    white;
    opacity: 0.75;
    cursor: default;
  }

  /* Narożnik rzadkości */
  .rarity-corner {
    position: absolute;
    top: 0; right: 0;
    width: 0; height: 0;
    border-style: solid;
    border-width: 0 20px 20px 0;
    border-color: transparent var(--rarity-color, rgba(148,163,184,0.6)) transparent transparent;
    opacity: 0.8;
  }

  /* Górny pasek */
  .card-element-bar {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .card-element-bar.muted { opacity: 0.6; }

  .element-icon  { font-size: 13px; line-height: 1; }
  .element-label { font-size: 11px; color: var(--ink-faded); font-family: 'Cinzel', serif; flex: 1; }
  .category-badge { font-size: 12px; opacity: 0.6; }

  /* Nazwa */
  .card-name { flex: 1; }

  .spell-name {
    font-family: 'Cinzel', serif;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink);
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Trudność */
  .card-difficulty {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .difficulty-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--ink);
    display: inline-block;
    flex-shrink: 0;
  }

  .difficulty-label {
    font-size: 10px;
    color: var(--ink-faded);
    margin-left: 4px;
    font-family: 'Cinzel', serif;
    letter-spacing: 0.03em;
  }

  /* Stopka */
  .card-footer {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .rarity-label {
    font-family: 'Cinzel', serif;
    font-size: 10px;
    letter-spacing: 0.05em;
    font-weight: 600;
  }

  .damage-badge {
    font-size: 10px;
    color: var(--ink-faded);
    background: rgba(44,24,16,0.07);
    padding: 1px 5px;
    border-radius: 4px;
    margin-left: auto;
  }

  .owned-badge {
    font-size: 9px;
    color: #16a34a;
    background: rgba(22,163,74,0.1);
    padding: 1px 5px;
    border-radius: 4px;
    border: 1px solid rgba(22,163,74,0.2);
  }

  /* Nieznana karta */
  .card-unknown-center {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .unknown-sigil {
    width: 36px;
    height: 36px;
    color: var(--ink-faded);
  }

  .unknown-sigil svg { width: 100%; height: 100%; }

  .unknown-label {
    font-size: 10px;
    color: var(--ink-faded);
    font-family: 'Cinzel', serif;
    letter-spacing: 0.04em;
    opacity: 0.6;
  }

  /* ── STANY PUSTOŚCI I ŁADOWANIA ── */
  .loading-state, .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    gap: 12px;
  }

  .loading-runes {
    display: flex;
    gap: 8px;
  }

  .loading-rune {
    font-size: 22px;
    color: var(--ink-faded);
    animation: rune-pulse 1.5s ease-in-out infinite;
  }

  @keyframes rune-pulse {
    0%, 100% { opacity: 0.2; transform: translateY(0); }
    50%       { opacity: 1;   transform: translateY(-4px); }
  }

  .loading-text {
    font-family: 'Cinzel', serif;
    font-size: 13px;
    color: var(--ink-faded);
    letter-spacing: 0.1em;
  }

  .empty-icon { font-size: 40px; margin: 0; }
  .empty-text {
    font-family: 'Cinzel', serif;
    font-size: 15px;
    color: var(--ink);
  }
  .empty-sub { font-size: 13px; color: var(--ink-faded); margin: 0; }

  .results-count {
    margin-top: 20px;
    text-align: center;
    font-family: 'Cinzel', serif;
    font-size: 11px;
    color: var(--ink-faded);
    letter-spacing: 0.05em;
    opacity: 0.6;
  }

  /* ── MODAL ── */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(44, 24, 16, 0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    padding: 16px;
  }

  .spell-detail-modal {
    position: relative;
    background: var(--parchment);
    border: 2px solid var(--border-ornate);
    border-radius: 12px;
    width: 100%;
    max-width: 440px;
    max-height: 85vh;
    overflow-y: auto;
    padding: 28px 28px 24px;
    box-shadow:
      0 24px 64px rgba(44,24,16,0.4),
      0 0 0 4px rgba(201,150,58,0.1),
      inset 0 1px 0 rgba(255,255,255,0.3);
  }

  .modal-bg-glow {
    position: absolute;
    top: -60px; right: -60px;
    width: 200px; height: 200px;
    background: radial-gradient(circle, var(--rarity-glow, transparent) 0%, transparent 70%);
    pointer-events: none;
  }

  .modal-close {
    position: absolute;
    top: 14px; right: 18px;
    font-size: 22px;
    color: var(--ink-faded);
    background: none;
    border: none;
    cursor: pointer;
    line-height: 1;
    padding: 2px 6px;
    border-radius: 4px;
    transition: color 0.15s;
  }
  .modal-close:hover { color: var(--ink); background: rgba(44,24,16,0.07); }

  .modal-header { margin-bottom: 20px; }

  .modal-element-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: 'Cinzel', serif;
    font-size: 11px;
    color: var(--elem-color, var(--ink-faded));
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
  }

  .modal-spell-name {
    font-family: 'Cinzel', serif;
    font-size: 22px;
    font-weight: 700;
    color: var(--ink);
    margin: 0 0 10px;
    line-height: 1.2;
  }

  .modal-meta-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .modal-rarity { font-family: 'Cinzel', serif; font-size: 12px; font-weight: 600; }
  .modal-sep    { color: rgba(44,24,16,0.3); }
  .modal-pool, .modal-category {
    font-family: 'Cinzel', serif;
    font-size: 12px;
    color: var(--ink-faded);
  }

  .modal-description {
    background: rgba(44,24,16,0.04);
    border-left: 3px solid var(--gold);
    padding: 12px 14px;
    border-radius: 0 6px 6px 0;
    margin-bottom: 16px;
  }

  .modal-flavor {
    font-size: 15px;
    font-style: italic;
    color: var(--ink-faded);
    line-height: 1.6;
    margin: 0;
  }

  .modal-stats-grid {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }

  .modal-stat {
    background: rgba(44,24,16,0.06);
    border-radius: 6px;
    padding: 8px 12px;
    text-align: center;
  }

  .modal-stat-label {
    display: block;
    font-family: 'Cinzel', serif;
    font-size: 10px;
    color: var(--ink-faded);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-bottom: 3px;
  }

  .modal-stat-value {
    font-family: 'Cinzel', serif;
    font-size: 16px;
    font-weight: 700;
    color: var(--ink);
  }

  .modal-section { margin-bottom: 14px; }

  .modal-section-title {
    font-family: 'Cinzel', serif;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ink-faded);
    margin: 0 0 8px;
  }

  .modal-requirements, .modal-status-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .modal-req-badge, .modal-status-badge {
    font-size: 12px;
    padding: 3px 8px;
    border-radius: 4px;
    background: rgba(44,24,16,0.07);
    color: var(--ink-faded);
    border: 1px solid rgba(139,104,64,0.2);
  }

  .modal-discovery {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid rgba(139,104,64,0.2);
    padding-top: 12px;
    margin-top: 12px;
  }

  .modal-discovery-source {
    font-family: 'Cinzel', serif;
    font-size: 11px;
    color: var(--ink-faded);
  }

  .modal-discovery-date {
    font-size: 12px;
    color: var(--ink-faded);
    opacity: 0.7;
  }

  .modal-owned-badge {
    margin-top: 10px;
    text-align: center;
    font-family: 'Cinzel', serif;
    font-size: 12px;
    color: #16a34a;
    padding: 6px 12px;
    background: rgba(22,163,74,0.08);
    border: 1px solid rgba(22,163,74,0.2);
    border-radius: 6px;
  }
`;