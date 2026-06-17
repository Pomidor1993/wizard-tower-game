import { useEffect, useState, useCallback, useMemo } from "react";
import api from "../api/client";

// ── TYPY ─────────────────────────────────────────────────────────────────────

interface SpellbookSpell {
  id: number;
  discovered: boolean;
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
  reqElementalMagic?: number;
  reqAstralMagic?: number;
  reqBloodMagic?: number;
  summonCount?: number;
  summonElement?: string | null;
  discoveredAt?: string;
  source?: string;
  equippedSlot?: number | null;
}

interface SpellSlotEntry {
  slotIndex: number;
  spell: { id: number; name: string; element: string; rarity: string } | null;
}

interface CharacterStats {
  elementalMagic: number; astralMagic: number; bloodMagic: number;
}

// ── KONFIGURACJE ──────────────────────────────────────────────────────────────

const ELEMENT_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  fire:    { label: "Ogień",     color: "#F46A4E", bg: "rgba(244,106,78,0.12)",  icon: "🔥" },
  water:   { label: "Woda",      color: "#59D4D0", bg: "rgba(89,212,208,0.12)",  icon: "💧" },
  earth:   { label: "Ziemia",    color: "#8BAA5C", bg: "rgba(139,170,92,0.12)",  icon: "🌿" },
  air:     { label: "Powietrze", color: "#C9D6E8", bg: "rgba(201,214,232,0.12)", icon: "🌪" },
  chaos:   { label: "Chaos",     color: "#B681E0", bg: "rgba(182,129,224,0.12)", icon: "🌀" },
  life:    { label: "Życie",     color: "#7FCB7F", bg: "rgba(127,203,127,0.12)", icon: "✨" },
  death:   { label: "Śmierć",    color: "#9C9CB0", bg: "rgba(156,156,176,0.12)", icon: "💀" },
  harmony: { label: "Harmonia",  color: "#F5C451", bg: "rgba(245,196,81,0.12)",  icon: "☯" },
  none:    { label: "Brak",      color: "#9C9CB0", bg: "rgba(156,156,176,0.12)", icon: "○" },
};

const POOL_CONFIG: Record<string, { label: string; difficulty: number }> = {
  chaotic:      { label: "Banalne",         difficulty: 1 },
  controlled:   { label: "Proste",          difficulty: 2 },
  incantation:  { label: "Wymagające",      difficulty: 3 },
  professional: { label: "Skomplikowane",   difficulty: 4 },
  master:       { label: "Szalenie trudne", difficulty: 5 },
};

const RARITY_CONFIG: Record<string, { label: string; color: string; glow: string }> = {
  common:   { label: "Pospolity",  color: "#9C9CB0", glow: "rgba(156,156,176,0.3)" },
  uncommon: { label: "Nietypowy",  color: "#7FCB7F", glow: "rgba(127,203,127,0.3)" },
  rare:     { label: "Rzadki",     color: "#59D4D0", glow: "rgba(89,212,208,0.3)"  },
  unique:   { label: "Unikalny",   color: "#F5C451", glow: "rgba(245,196,81,0.4)" },
};

const CATEGORY_CONFIG: Record<string, { label: string; icon: string }> = {
  summoner:  { label: "Przywołujący", icon: "👁" },
  offensive: { label: "Ofensywny",    icon: "⚔" },
  defensive: { label: "Defensywny",   icon: "🛡" },
  unknown:   { label: "Nieznany",     icon: "?" },
};

const SOURCE_LABELS: Record<string, string> = {
  study: "Studia",
};

function meetsRequirements(spell: SpellbookSpell, stats: CharacterStats | null): boolean {
  if (!stats) return false;
  return (
    (spell.reqElementalMagic ?? 0) <= stats.elementalMagic &&
    (spell.reqAstralMagic    ?? 0) <= stats.astralMagic &&
    (spell.reqBloodMagic     ?? 0) <= stats.bloodMagic
  );
}

// ── PASEK AKTYWNYCH CZARÓW ────────────────────────────────────────────────────

function ActiveSpellsBar({
  slots,
  maxSlots,
  onMove,
  onUnequip,
  moving,
}: {
  slots: SpellSlotEntry[];
  maxSlots: number;
  onMove: (fromIndex: number, direction: -1 | 1) => void;
  onUnequip: (slotIndex: number) => void;
  moving: boolean;
}) {
  const [lockedTooltip, setLockedTooltip] = useState<{ x: number; y: number } | null>(null);
  const TOTAL_SLOTS = 5;
  const bySlot = new Map(slots.map(s => [s.slotIndex, s.spell]));

  return (
    <div className="active-spells-bar">
      <p className="active-spells-title">Aktywne czary <span className="active-spells-sub">— kolejność decyduje o pierwszeństwie w walce</span></p>
      <div className="active-spells-row">
        {Array.from({ length: TOTAL_SLOTS }, (_, i) => {
          const spell = bySlot.get(i) ?? null;
          const unlocked = i < maxSlots;
          const elem = spell ? (ELEMENT_CONFIG[spell.element] ?? ELEMENT_CONFIG.none) : null;

          return (
            <div className="active-slot-group" key={i}>
<div
  className={`active-slot ${!unlocked ? "locked" : spell ? "filled" : "empty"}`}
  onMouseMove={!unlocked ? (e => setLockedTooltip({ x: e.clientX + 12, y: e.clientY + 16 })) : undefined}
  onMouseLeave={!unlocked ? (() => setLockedTooltip(null)) : undefined}
  onClick={() => spell && unlocked && onUnequip(i)}
>
                <span className="active-slot-index">{i + 1}</span>
                {spell ? (
                  <>
                    <span className="active-slot-icon">{elem!.icon}</span>
                    <span className="active-slot-name">{spell.name}</span>
                  </>
                ) : unlocked ? (
                  <span className="active-slot-empty-label">—</span>
                ) : (
                  <span className="active-slot-lock">🔒</span>
                )}
              </div>

              {/* Strzałki przesuwania — pomiędzy slotami */}
              {i < TOTAL_SLOTS - 1 && (
                <div className="active-slot-arrows">
                  <button
                    className="arrow-btn"
                    disabled={!spell || moving}
                    onClick={() => onMove(i, 1)}
                    title="Przesuń w prawo"
                  >›</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
            {lockedTooltip && (
        <div style={{
          position: "fixed",
          top: lockedTooltip.y,
          left: lockedTooltip.x,
          zIndex: 9999,
          background: "#161d38",
          color: "#F7F0DD",
          fontSize: 12,
          fontFamily: "Cinzel, serif",
          padding: "8px 12px",
          borderRadius: 6,
          border: "1px solid rgba(245,196,81,0.3)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}>
          Rozbuduj bibliotekę aby odblokować slot
        </div>
      )}
    </div>
  );
}

// ── KARTA ODKRYTEGO CZARU ─────────────────────────────────────────────────────

function DiscoveredCard({
  spell,
  onClick,
  onEquip,
  equipping,
  hasFreeSlot,
  meetsReqs
}: {
  spell: SpellbookSpell;
  onClick: () => void;
  onEquip: (e: React.MouseEvent) => void;
  equipping: boolean;
  hasFreeSlot: boolean;
  meetsReqs: boolean;
}) {
  const elem   = ELEMENT_CONFIG[spell.element]   ?? ELEMENT_CONFIG.none;
  const rarity = RARITY_CONFIG[spell.rarity]     ?? RARITY_CONFIG.common;
  const pool   = POOL_CONFIG[spell.spellPool]    ?? { label: spell.spellPool, difficulty: 1 };
  const cat    = CATEGORY_CONFIG[spell.category] ?? CATEGORY_CONFIG.unknown;
  const isEquipped = spell.equippedSlot != null;

  return (
    <div
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

<div className="equip-btn-wrapper" onClick={e => e.stopPropagation()}>
  {isEquipped ? (
    <div className="equipped-indicator">✓ Slot {spell.equippedSlot! + 1}</div>
  ) : (
    <button
      onClick={meetsReqs && hasFreeSlot ? onEquip : undefined}
      disabled={equipping || !meetsReqs || !hasFreeSlot}
      className={`equip-btn ${(!meetsReqs || !hasFreeSlot) ? "locked" : ""}`}
    >
      {equipping
        ? "..."
        : !meetsReqs
        ? "Nie spełniasz wymagań"
        : !hasFreeSlot
        ? "Brak wolnego slotu"
        : "Ekwipuj"}
    </button>
  )}
</div>
    </div>
  );
}

// ── KARTA NIEPOZNANEGO CZARU ──────────────────────────────────────────────────

function UnknownCard({ spell }: { spell: SpellbookSpell }) {
  const elem   = ELEMENT_CONFIG[spell.element] ?? ELEMENT_CONFIG.none;
  const pool   = POOL_CONFIG[spell.spellPool]  ?? { label: spell.spellPool, difficulty: 1 };
  const rarity = RARITY_CONFIG[spell.rarity]   ?? RARITY_CONFIG.common;

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
  onEquip,
  onUnequip,
  canEquip,
  equipping,
  meetsReqs
}: {
  spell: SpellbookSpell;
  onClose: () => void;
  onEquip: () => void;
  onUnequip: () => void;
  canEquip: boolean;
  equipping: boolean;
  meetsReqs: boolean;
}) {
  const elem   = ELEMENT_CONFIG[spell.element]   ?? ELEMENT_CONFIG.none;
  const rarity = RARITY_CONFIG[spell.rarity]     ?? RARITY_CONFIG.common;
  const pool   = POOL_CONFIG[spell.spellPool]    ?? { label: spell.spellPool, difficulty: 1 };
  const cat    = CATEGORY_CONFIG[spell.category] ?? CATEGORY_CONFIG.unknown;
  const isEquipped = spell.equippedSlot != null;

  const requirements = [
    { label: "Magia Żywiołów", val: spell.reqElementalMagic },
    { label: "Magia Astralna", val: spell.reqAstralMagic },
    { label: "Magia Krwi",     val: spell.reqBloodMagic },
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
          {spell.basicCost != null && spell.basicCost > 0 && (
            <div className="modal-stat">
              <span className="modal-stat-label">Koszt rzucenia</span>
              <span className="modal-stat-value">{spell.basicCost} ✦</span>
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

        <div className="modal-equip-section">
          {isEquipped ? (
            <>
              <p className="modal-equip-info">Czar wyekwipowany w slocie {spell.equippedSlot! + 1}</p>
              <button onClick={onUnequip} disabled={equipping} className="modal-unequip-btn">
                {equipping ? "..." : "Zdejmij ze slotu"}
              </button>
            </>
          ) : (
            <>
              {!meetsReqs ? (
                <p className="modal-equip-locked">✕ Nie spełniasz wymagań</p>
              ) : !canEquip ? (
                <p className="modal-equip-locked">✕ Brak wolnego slotu</p>
              ) : null}
              <button onClick={onEquip} disabled={equipping || !canEquip} className="modal-equip-btn">
                {equipping ? "Ekwipowanie..." : "✦ Ekwipuj jako aktywny"}
              </button>
            </>
          )}
        </div>

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

export default function Spellbook() {
  const [spells, setSpells]               = useState<SpellbookSpell[]>([]);
  const [spellSlots, setSpellSlots]        = useState<SpellSlotEntry[]>([]);
  const [maxSlots, setMaxSlots]            = useState(0);
  const [loading, setLoading]              = useState(true);
  const [selectedSpell, setSelectedSpell]  = useState<SpellbookSpell | null>(null);
  const [equippingId, setEquippingId]      = useState<number | null>(null);
  const [moving, setMoving]                = useState(false);
  const [filterElement, setFilterElement]  = useState("all");
  const [filterPool, setFilterPool]        = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showOnlyDiscovered, setShowOnlyDiscovered] = useState(false);
  const [charStats, setCharStats]          = useState<CharacterStats | null>(null);
  const [filterMeetsReqs, setFilterMeetsReqs] = useState(false);

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

  const fetchEquipment = useCallback(async () => {
    try {
      const res = await api.get("/equipment");
      setSpellSlots(res.data.spellSlots ?? []);
      setMaxSlots(res.data.maxSlots ?? 0);
    } catch { /* noop */ }
  }, []);

  useEffect(() => { fetchSpellbook(); fetchEquipment(); }, [fetchSpellbook, fetchEquipment]);
  useEffect(() => {
    api.get("/character/effective-stats")
      .then(res => setCharStats(res.data.effective))
      .catch(() => {});
  }, []);

  const hasFreeSlot = spellSlots.length < maxSlots;

  async function refreshAll() {
    await Promise.all([fetchSpellbook(), fetchEquipment()]);
  }

  async function handleEquip(spell: SpellbookSpell, e?: React.MouseEvent) {
    e?.stopPropagation();
    setEquippingId(spell.id);
    try {
      await api.post("/equipment/spell/equip-auto", { spellId: spell.id });
      await refreshAll();
      if (selectedSpell?.id === spell.id) {
        setSelectedSpell(null);
      }
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd podczas ekwipowania czaru");
    } finally {
      setEquippingId(null);
    }
  }

  async function handleUnequip(slotIndex: number) {
    setEquippingId(-1); // blokada wszystkich przycisków na czas operacji
    try {
      await api.post("/equipment/spell/unequip", { slotIndex });
      await refreshAll();
      setSelectedSpell(null);
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd podczas zdejmowania czaru");
    } finally {
      setEquippingId(null);
    }
  }

  // Przesuwanie kolejności: zamiana zawartości slotu i+1 z i (lub i z i+1, zależnie od direction)
  async function handleMove(fromIndex: number, direction: -1 | 1) {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= 5) return;

    const fromEntry = spellSlots.find(s => s.slotIndex === fromIndex);
    const toEntry   = spellSlots.find(s => s.slotIndex === toIndex);

    if (!fromEntry?.spell) return;

    setMoving(true);
    try {
      // equipSpell z upsert nadpisuje slotIndex -> wystarczy zamienić oba (lub przenieść jeśli toIndex pusty)
      if (toEntry?.spell) {
        // zamiana miejscami: tymczasowo zdejmij "from", przenieś "to" na "from", przenieś oryginalny "from" na "to"
        const fromSpellId = fromEntry.spell.id;
        const toSpellId   = toEntry.spell.id;

        await api.post("/equipment/spell/unequip", { slotIndex: fromIndex });
        await api.post("/equipment/spell/equip", { spellId: toSpellId, slotIndex: fromIndex });
        await api.post("/equipment/spell/equip", { spellId: fromSpellId, slotIndex: toIndex });
      } else {
        // toIndex pusty -> proste przeniesienie
        await api.post("/equipment/spell/unequip", { slotIndex: fromIndex });
        await api.post("/equipment/spell/equip", { spellId: fromEntry.spell.id, slotIndex: toIndex });
      }
      await fetchEquipment();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd podczas zmiany kolejności");
    } finally {
      setMoving(false);
    }
  }
  
  // Wzbogać czary o equippedSlot na podstawie spellSlots (na wypadek gdyby backend nie dosłał tego pola)
  const enrichedSpells = useMemo(() => {
    const slotMap = new Map(spellSlots.filter(s => s.spell).map(s => [s.spell!.id, s.slotIndex]));
    return spells.map(s => ({
      ...s,
      equippedSlot: s.equippedSlot ?? slotMap.get(s.id) ?? null,
    }));
  }, [spells, spellSlots]);

  const filtered = useMemo(() => {
    return enrichedSpells.filter(s => {
      if (showOnlyDiscovered && !s.discovered) return false;
      if (filterElement  !== "all" && s.element  !== filterElement)  return false;
      if (filterPool     !== "all" && s.spellPool !== filterPool)     return false;
      if (filterCategory !== "all" && s.category  !== filterCategory) return false;
      if (filterMeetsReqs && s.discovered && !meetsRequirements(s, charStats)) return false;
      return true;
    });
  }, [enrichedSpells, filterElement, filterPool, filterCategory, showOnlyDiscovered, filterMeetsReqs, charStats]);

  const discoveredCount = enrichedSpells.filter(s => s.discovered).length;
  const totalCount = enrichedSpells.length;

  return (
    <>
      <style>{SPELLBOOK_CSS}</style>

      {selectedSpell?.discovered && (
        <SpellDetailModal
          spell={selectedSpell}
          onClose={() => setSelectedSpell(null)}
          onEquip={() => handleEquip(selectedSpell)}
          onUnequip={() => handleUnequip(selectedSpell.equippedSlot!)}
          canEquip={hasFreeSlot && meetsRequirements(selectedSpell, charStats)}
          equipping={equippingId === selectedSpell.id || equippingId === -1}
          meetsReqs={meetsRequirements(selectedSpell, charStats)}
        />
      )}

      <div className="spellbook-root">

        {/* ── PASEK AKTYWNYCH CZARÓW ── */}
        <ActiveSpellsBar
          slots={spellSlots}
          maxSlots={maxSlots}
          onMove={handleMove}
          onUnequip={handleUnequip}
          moving={moving}
        />

        {/* ── NAGŁÓWEK ── */}
        <div className="spellbook-header">
          <div className="book-title-area">
            <div className="book-ornament">✦</div>
            <h1 className="book-title">Księga Magii</h1>
            <div className="book-ornament">✦</div>
          </div>
          <p className="tab-description">
            Odkryte czary możesz ekwipować jako aktywne. Pozostałe czeka na odkrycie podczas Studiów.
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
              {Object.entries(ELEMENT_CONFIG).filter(([k]) => k !== "none").map(([key, cfg]) => (
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

          <div className="filter-group filter-toggle-group">
            <label className="toggle-label">
              <input type="checkbox" checked={showOnlyDiscovered} onChange={e => setShowOnlyDiscovered(e.target.checked)} className="toggle-input" />
              <span className="toggle-track"><span className="toggle-thumb" /></span>
              <span className="toggle-text">Tylko odkryte</span>
            </label>
            <div className="filter-group filter-toggle-group">
  <label className="toggle-label">
    <input
      type="checkbox"
      checked={filterMeetsReqs}
      onChange={e => setFilterMeetsReqs(e.target.checked)}
      className="toggle-input"
    />
    <span className="toggle-track"><span className="toggle-thumb" /></span>
    <span className="toggle-text">Spełniasz wymagania</span>
  </label>
</div>
          </div>
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
                      onEquip={(e) => handleEquip(spell, e)}
                      equipping={equippingId === spell.id}
                      hasFreeSlot={hasFreeSlot}
                      meetsReqs={meetsRequirements(spell, charStats)}
                    />
                  ) : (
                    <UnknownCard key={spell.id} spell={spell} />
                  )
                )}
              </div>
            )}

            {!loading && (
              <div className="results-count">
                {filtered.length} czarów · {discoveredCount}/{totalCount} odkrytych
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
  .spellbook-root {
    --bg-deep:        #161d38;
    --panel:          #372b5d;
    --panel-dark:     #3A3158;
    --gold:           #F5C451;
    --gold-soft:      rgba(245,196,81,0.6);
    --turquoise:      #59D4D0;
    --cta:            #F46A4E;
    --parchment:      #F7F0DD;
    --ink:            #161d38;
    --ink-faded:      rgba(32,38,63,0.6);
    --border-ornate:  rgba(245,196,81,0.3);
  }

  .spellbook-root {
    font-family: 'Crimson Text', Georgia, serif;
    color: var(--parchment);
    max-width: 100%;
  }

  /* ── PASEK AKTYWNYCH CZARÓW ── */
  .active-spells-bar {
    background: var(--panel);
    border: 1px solid var(--border-ornate);
    border-radius: 12px;
    padding: 16px 18px;
    margin-bottom: 16px;
  }
  .active-spells-title {
    font-family: 'Cinzel', serif;
    font-size: 12px;
    color: var(--gold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin: 0 0 12px;
  }
  .active-spells-sub {
    font-family: 'Crimson Text', serif;
    text-transform: none;
    letter-spacing: normal;
    color: rgba(247,240,221,0.4);
    font-size: 11px;
    font-style: italic;
  }
  .active-spells-row {
    display: flex;
    align-items: center;
    gap: 0;
    overflow-x: auto;
    padding-bottom: 4px;
  }
  .active-slot-group {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }
  .active-slot {
    width: 96px;
    min-height: 64px;
    border-radius: 8px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    text-align: center;
    position: relative;
    transition: all 0.15s;
  }
  .active-slot.filled {
    background: linear-gradient(135deg, var(--elem-bg, rgba(245,196,81,0.1)), rgba(0,0,0,0.15));
    border: 1px solid var(--elem-color, var(--gold));
    cursor: pointer;
  }
  .active-slot.filled:hover {
    box-shadow: 0 0 12px var(--elem-color, var(--gold));
  }
  .active-slot.empty {
    background: rgba(0,0,0,0.15);
    border: 1px dashed rgba(247,240,221,0.2);
  }
  .active-slot.locked {
    background: rgba(0,0,0,0.25);
    border: 1px dashed rgba(247,240,221,0.08);
    opacity: 0.4;
    cursor: help;
    position: relative;
  }
  .active-slot-index {
    position: absolute; top: 4px; left: 6px;
    font-family: 'Cinzel', serif; font-size: 9px;
    color: rgba(247,240,221,0.35);
  }
  .active-slot-icon { font-size: 16px; margin-top: 6px; }
  .active-slot-name {
    font-size: 10px; font-weight: 600; color: var(--parchment);
    line-height: 1.2;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .active-slot-empty-label { color: rgba(247,240,221,0.2); font-size: 16px; }
  .active-slot-lock { font-size: 14px; opacity: 0.5; }

  .active-slot-arrows {
    display: flex; flex-direction: column;
    padding: 0 2px;
  }
  .arrow-btn {
    background: none; border: none; cursor: pointer;
    color: var(--turquoise); font-size: 16px; font-weight: 700;
    padding: 2px 4px; line-height: 1;
    transition: opacity 0.15s, transform 0.1s;
  }
  .arrow-btn:hover:not(:disabled) { transform: scale(1.2); }
  .arrow-btn:disabled { opacity: 0.15; cursor: default; }

  /* ── NAGŁÓWEK ── */
  .spellbook-header {
    text-align: center;
    padding: 24px 24px 0;
    background: linear-gradient(180deg, var(--bg-deep) 0%, var(--panel-dark) 100%);
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
    font-size: 26px;
    font-weight: 700;
    color: var(--gold);
    letter-spacing: 0.1em;
    margin: 0;
    text-shadow: 0 0 30px rgba(245,196,81,0.4);
  }

  .book-ornament { font-size: 16px; color: var(--gold); opacity: 0.7; }

  .tab-description {
    font-size: 12px;
    color: rgba(247,240,221,0.45);
    margin: 0;
    padding: 0 0 16px;
    font-style: italic;
    font-family: 'Crimson Text', serif;
  }

  /* ── FILTRY ── */
  .spellbook-filters {
    background: var(--panel-dark);
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
    color: var(--gold-soft);
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
    border: 1px solid rgba(245,196,81,0.2);
    background: transparent;
    color: rgba(247,240,221,0.6);
    cursor: pointer;
    transition: all 0.15s;
  }

  .filter-pill:hover { background: rgba(245,196,81,0.1); border-color: var(--gold); color: var(--parchment); }
  .filter-pill.active { background: var(--gold); border-color: var(--gold); color: var(--ink); font-weight: 600; }

  .filter-pill.element-pill.active {
    background: var(--pill-color, var(--gold));
    border-color: var(--pill-color, var(--gold));
    color: var(--ink);
  }
  .filter-pill.element-pill:hover:not(.active) {
    background: var(--pill-bg, rgba(245,196,81,0.1));
    border-color: var(--pill-color, var(--gold));
    color: var(--parchment);
  }

  .filter-toggle-group { margin-top: 2px; }

  .toggle-label { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
  .toggle-input { display: none; }
  .toggle-track {
    width: 34px; height: 18px;
    background: rgba(245,196,81,0.15);
    border-radius: 9px;
    position: relative;
    border: 1px solid rgba(245,196,81,0.3);
    transition: background 0.2s;
  }
  .toggle-input:checked + .toggle-track { background: var(--turquoise); }
  .toggle-thumb {
    position: absolute; top: 2px; left: 2px;
    width: 12px; height: 12px;
    background: var(--gold); border-radius: 50%;
    transition: transform 0.2s;
  }
  .toggle-input:checked + .toggle-track .toggle-thumb { transform: translateX(16px); background: var(--ink); }
  .toggle-text {
    font-family: 'Cinzel', serif; font-size: 11px; font-weight: 600;
    color: rgba(247,240,221,0.6); letter-spacing: 0.06em; text-transform: uppercase;
  }

  /* ── TREŚĆ KSIĘGI ── */
  .spellbook-body {
    display: flex;
    min-height: 400px;
    border: 1px solid var(--border-ornate);
    border-radius: 0 0 12px 12px;
    overflow: visible;
    box-shadow: 0 8px 32px rgba(16,14,32,0.3);
  }

  .book-spine {
    width: 20px;
    flex-shrink: 0;
    background: linear-gradient(90deg, var(--bg-deep) 0%, var(--panel) 50%, var(--bg-deep) 100%);
    position: relative;
  }
  .book-spine::after {
    content: '';
    position: absolute;
    top: 0; left: 50%; width: 2px; height: 100%;
    background: linear-gradient(180deg, transparent, rgba(245,196,81,0.3), transparent);
    transform: translateX(-50%);
  }

  .book-pages {
    flex: 1;
    background:
      radial-gradient(ellipse at 10% 20%, rgba(245,196,81,0.05) 0%, transparent 60%),
      var(--panel);
    padding: 20px;
    overflow: visible;
    position: relative;
  }

  .book-page-texture {
    position: absolute; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
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
    border: 1px solid rgba(245,196,81,0.15);
    background: var(--bg-deep);
    display: flex;
    flex-direction: column;
    gap: 7px;
    text-align: left;
    font-family: 'Crimson Text', serif;
    transition: transform 0.15s, box-shadow 0.15s;
    min-height: 150px;
    overflow: visible;
    color: var(--parchment);
  }

  .spellbook-card.discovered {
    cursor: pointer;
    background: linear-gradient(135deg, color-mix(in srgb, var(--bg-deep) 85%, var(--elem-bg, transparent)) 0%, var(--bg-deep) 100%);
  }

  .spellbook-card.discovered:hover {
    transform: translateY(-3px);
    box-shadow:
      0 8px 20px rgba(16,14,32,0.4),
      0 0 0 1px var(--rarity-color, rgba(245,196,81,0.3)),
      0 0 14px var(--rarity-glow, transparent);
    border-color: var(--rarity-color, rgba(245,196,81,0.3));
  }

  .spellbook-card.unknown {
    background: repeating-linear-gradient(45deg, rgba(245,196,81,0.02), rgba(245,196,81,0.02) 2px, transparent 2px, transparent 8px), var(--bg-deep);
    opacity: 0.6;
    cursor: default;
  }

  .rarity-corner {
    position: absolute; top: 0; right: 0;
    width: 0; height: 0;
    border-style: solid;
    border-width: 0 18px 18px 0;
    border-color: transparent var(--rarity-color, rgba(156,156,176,0.5)) transparent transparent;
    opacity: 0.8;
  }

  .card-element-bar { display: flex; align-items: center; gap: 4px; }
  .card-element-bar.muted { opacity: 0.6; }
  .element-icon  { font-size: 12px; line-height: 1; }
  .element-label { font-size: 10px; color: rgba(247,240,221,0.5); font-family: 'Cinzel', serif; flex: 1; }
  .category-badge { font-size: 11px; opacity: 0.6; }

  .card-name { flex: 1; }
  .spell-name {
    font-family: 'Cinzel', serif;
    font-size: 12px;
    font-weight: 600;
    color: var(--parchment);
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-difficulty { display: flex; align-items: center; gap: 2px; }
  .difficulty-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: var(--gold); display: inline-block; flex-shrink: 0;
  }
  .difficulty-label {
    font-size: 9px; color: rgba(247,240,221,0.5); margin-left: 3px;
    font-family: 'Cinzel', serif; letter-spacing: 0.03em;
  }

  .card-footer { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
  .rarity-label { font-family: 'Cinzel', serif; font-size: 9px; letter-spacing: 0.05em; font-weight: 600; }
  .damage-badge {
    font-size: 9px; color: rgba(247,240,221,0.5);
    background: rgba(0,0,0,0.25); padding: 1px 4px; border-radius: 3px; margin-left: auto;
  }

  /* Przycisk ekwipowania na karcie */
  .equip-btn-wrapper { margin-top: auto; }
  .equip-btn {
    width: 100%;
    padding: 5px 8px;
    font-family: 'Cinzel', serif;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.05em;
    color: var(--ink);
    background: var(--turquoise);
    border: 1px solid var(--turquoise);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .equip-btn:hover:not(:disabled) {
    background: #7be0dd;
    box-shadow: 0 0 8px rgba(89,212,208,0.4);
  }
  .equip-btn.locked, .equip-btn:disabled {
    opacity: 0.35; cursor: not-allowed;
    background: rgba(156,156,176,0.2);
    border-color: rgba(156,156,176,0.2);
    color: rgba(247,240,221,0.4);
  }

  .equipped-indicator {
    margin-top: auto;
    font-family: 'Cinzel', serif;
    font-size: 9px;
    color: var(--turquoise);
    text-align: center;
    padding: 3px;
    background: rgba(89,212,208,0.1);
    border-radius: 3px;
    border: 1px solid rgba(89,212,208,0.25);
  }

  /* Nieznana karta */
  .card-unknown-center {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 5px;
  }
  .unknown-sigil { width: 32px; height: 32px; color: rgba(247,240,221,0.3); }
  .unknown-sigil svg { width: 100%; height: 100%; }
  .unknown-label {
    font-size: 9px; color: rgba(247,240,221,0.3);
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
    font-size: 20px; color: var(--gold);
    animation: rune-pulse 1.5s ease-in-out infinite;
  }
  @keyframes rune-pulse {
    0%, 100% { opacity: 0.2; transform: translateY(0); }
    50%       { opacity: 1;   transform: translateY(-4px); }
  }
  .loading-text { font-family: 'Cinzel', serif; font-size: 12px; color: rgba(247,240,221,0.5); letter-spacing: 0.1em; }
  .empty-icon { font-size: 36px; margin: 0; }
  .empty-text { font-family: 'Cinzel', serif; font-size: 14px; color: var(--parchment); margin: 0; }
  .empty-sub  { font-size: 12px; color: rgba(247,240,221,0.4); margin: 0; }

  .results-count {
    margin-top: 16px; text-align: center;
    font-family: 'Cinzel', serif; font-size: 10px;
    color: rgba(247,240,221,0.4); letter-spacing: 0.05em; opacity: 0.8;
  }

  /* ── MODAL ── */
  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(16,14,32,0.75);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    z-index: 200; padding: 16px;
  }

  .spell-detail-modal {
    position: relative;
    background: var(--panel);
    border: 2px solid var(--border-ornate);
    border-radius: 12px;
    width: 100%; max-width: 420px; max-height: 85vh;
    overflow-y: auto; padding: 24px;
    box-shadow: 0 24px 64px rgba(16,14,32,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
    color: var(--parchment);
  }

  .modal-bg-glow {
    position: absolute; top: -60px; right: -60px;
    width: 180px; height: 180px;
    background: radial-gradient(circle, var(--rarity-glow, transparent) 0%, transparent 70%);
    pointer-events: none;
  }

  .modal-close {
    position: absolute; top: 12px; right: 16px;
    font-size: 20px; color: rgba(247,240,221,0.5);
    background: none; border: none; cursor: pointer;
    padding: 2px 6px; border-radius: 4px; transition: color 0.15s;
  }
  .modal-close:hover { color: var(--parchment); background: rgba(0,0,0,0.2); }

  .modal-header { margin-bottom: 16px; }

  .modal-element-badge {
    display: inline-flex; align-items: center; gap: 5px;
    font-family: 'Cinzel', serif; font-size: 11px;
    color: var(--elem-color, var(--gold-soft));
    text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;
  }

  .modal-spell-name {
    font-family: 'Cinzel', serif; font-size: 20px; font-weight: 700;
    color: var(--parchment); margin: 0 0 8px; line-height: 1.2;
  }

  .modal-meta-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .modal-rarity   { font-family: 'Cinzel', serif; font-size: 11px; font-weight: 600; }
  .modal-separator { color: rgba(247,240,221,0.25); }
  .modal-pool, .modal-category { font-family: 'Cinzel', serif; font-size: 11px; color: rgba(247,240,221,0.5); }

  .modal-description {
    background: rgba(0,0,0,0.18);
    border-left: 3px solid var(--gold);
    padding: 10px 12px;
    border-radius: 0 6px 6px 0;
    margin-bottom: 14px;
  }
  .modal-flavor { font-size: 14px; font-style: italic; color: rgba(247,240,221,0.7); line-height: 1.6; margin: 0; }

  .modal-stats-grid { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
  .modal-stat { background: rgba(0,0,0,0.2); border-radius: 6px; padding: 7px 10px; text-align: center; }
  .modal-stat-label { display: block; font-family: 'Cinzel', serif; font-size: 9px; color: rgba(247,240,221,0.45); text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 2px; }
  .modal-stat-value { font-family: 'Cinzel', serif; font-size: 15px; font-weight: 700; color: var(--parchment); }

  .modal-section { margin-bottom: 12px; }
  .modal-section-title { font-family: 'Cinzel', serif; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(247,240,221,0.45); margin: 0 0 7px; }
  .modal-requirements, .modal-status-list { display: flex; flex-wrap: wrap; gap: 5px; }
  .modal-req-badge, .modal-status-badge {
    font-size: 11px; padding: 2px 7px; border-radius: 4px;
    background: rgba(0,0,0,0.2); color: rgba(247,240,221,0.6);
    border: 1px solid rgba(245,196,81,0.15);
  }

  /* Sekcja ekwipowania w modalu */
  .modal-equip-section {
    margin-top: 16px;
    padding: 14px;
    background: rgba(89,212,208,0.06);
    border: 1px solid rgba(89,212,208,0.2);
    border-radius: 8px;
    text-align: center;
  }
  .modal-equip-info {
    font-family: 'Cinzel', serif; font-size: 12px;
    color: var(--turquoise); margin: 0 0 10px;
  }
  .modal-equip-btn, .modal-unequip-btn {
    width: 100%; padding: 10px;
    font-family: 'Cinzel', serif; font-size: 13px; font-weight: 600;
    letter-spacing: 0.07em;
    border-radius: 6px; cursor: pointer; transition: all 0.15s;
  }
  .modal-equip-btn {
    color: var(--ink); background: var(--turquoise); border: 1px solid var(--turquoise);
  }
  .modal-equip-btn:hover:not(:disabled) {
    background: #7be0dd; box-shadow: 0 0 12px rgba(89,212,208,0.4);
  }
  .modal-unequip-btn {
    color: var(--cta); background: transparent; border: 1px solid var(--cta);
  }
  .modal-unequip-btn:hover:not(:disabled) {
    background: rgba(244,106,78,0.1);
  }
  .modal-equip-btn:disabled, .modal-unequip-btn:disabled { opacity: 0.5; cursor: default; }

  .modal-equip-locked {
    font-family: 'Cinzel', serif;
    font-size: 11px;
    color: var(--cta);
    margin: 0 0 8px;
    opacity: 0.9;
  }

  .modal-discovery {
    display: flex; justify-content: space-between; align-items: center;
    border-top: 1px solid rgba(245,196,81,0.15);
    padding-top: 10px; margin-top: 14px;
  }
  .modal-discovery-source { font-family: 'Cinzel', serif; font-size: 10px; color: rgba(247,240,221,0.5); }
  .modal-discovery-date   { font-size: 11px; color: rgba(247,240,221,0.4); }
`;
