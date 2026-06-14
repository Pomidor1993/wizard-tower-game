import { useCallback, useEffect, useState } from "react";
import api from "../api/client";

import vault1 from "../assets/chaosvault1.png";
import vault2 from "../assets/chaosvault2.png";
import vault3 from "../assets/chaosvault3.png";
import vault4 from "../assets/chaosvault4.png";

// ── TYPY ────────────────────────────────────────────────────────────────────

interface VaultItem {
  id: number;
  itemId: number;
  addedAt: string;
  item: {
    id: number;
    name: string;
    rarity: string;
    slot: string;
    weaponType: string | null;
    element: string | null;
    bonusKnowledge: number;
    bonusIntelligence: number;
    bonusPower: number;
    bonusEndurance: number;
    bonusResistance: number;
    bonusInitiative: number;
    bonusElementalMagic: number;
    bonusAstralMagic: number;
    bonusBloodMagic: number;
    reqKnowledge: number;
    reqIntelligence: number;
    reqPower: number;
    reqEndurance: number;
    reqResistance: number;
    reqInitiative: number;
    reqElementalMagic: number;
    reqAstralMagic: number;
    reqBloodMagic: number;
  };
}

interface EquippedSlots {
  robe:     any | null;
  boots:    any | null;
  hat:      any | null;
  amulet:   any | null;
  mainHand: any | null;
  offHand:  any | null;
  offHand2: any | null;
}

interface CharacterStats {
  knowledge: number; intelligence: number; power: number;
  endurance: number; resistance: number; initiative: number;
  elementalMagic: number; astralMagic: number; bloodMagic: number;
}

// ── KONFIGURACJE ─────────────────────────────────────────────────────────────

const RARITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  common:   { label: "Pospolity",  color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  uncommon: { label: "Nietypowy",  color: "#4ade80", bg: "rgba(74,222,128,0.12)"  },
  rare:     { label: "Rzadki",     color: "#60a5fa", bg: "rgba(96,165,250,0.12)"  },
  unique:   { label: "Unikalny",   color: "#fbbf24", bg: "rgba(251,191,36,0.12)"  },
};

const SLOT_CONFIG: Record<string, { label: string; icon: string }> = {
  hat:        { label: "Okrycia głowy",  icon: "🎩" },
  robe:       { label: "Szaty",   icon: "👘" },
  boots:      { label: "Buty",    icon: "👢" },
  amulet:     { label: "Amulety", icon: "📿" },
  weapon_one: { label: "Broń jednoręczna",    icon: "⚔️" },
  weapon_two: { label: "Broń dwuręczna",      icon: "⚔️" },
};

const BODY_SLOTS: { key: keyof EquippedSlots; label: string; icon: string; top: string; left: string }[] = [
  { key: "hat",      label: "Czapka",     icon: "🎩", top: "6%",  left: "50%" },
  { key: "amulet",   label: "Amulet",     icon: "📿", top: "22%", left: "50%" },
  { key: "robe",     label: "Szata",      icon: "👘", top: "42%", left: "50%" },
  { key: "mainHand", label: "Prawa ręka", icon: "⚔️", top: "42%", left: "18%" },
  { key: "offHand",  label: "Lewa ręka",  icon: "🛡", top: "42%", left: "82%" },
  { key: "boots",    label: "Buty",       icon: "👢", top: "78%", left: "50%" },
];

const ALL_SLOTS = Object.keys(SLOT_CONFIG);

function getVaultBackground(total: number): string {
  if (total >= 60) return vault4;
  if (total >= 25) return vault3;
  if (total >= 10) return vault2;
  return vault1;
}

function meetsRequirements(item: VaultItem["item"], stats: CharacterStats | null): boolean {
  if (!stats) return false;
  return (
    item.reqKnowledge      <= stats.knowledge &&
    item.reqIntelligence   <= stats.intelligence &&
    item.reqPower          <= stats.power &&
    item.reqEndurance      <= stats.endurance &&
    item.reqResistance     <= stats.resistance &&
    item.reqInitiative     <= stats.initiative &&
    item.reqElementalMagic <= stats.elementalMagic &&
    item.reqAstralMagic    <= stats.astralMagic &&
    item.reqBloodMagic     <= stats.bloodMagic
  );
}

// ── POPUP PRZEDMIOTU ──────────────────────────────────────────────────────────

function ItemPopup({
  entry,
  equipped,
  meetsReqs,
  onClose,
  onEquip,
  onUnequip,
  equipping,
}: {
  entry: VaultItem;
  equipped: EquippedSlots;
  meetsReqs: boolean;
  onClose: () => void;
  onEquip: (itemId: number) => Promise<void>;
  onUnequip: (slot: string) => Promise<void>;
  equipping: boolean;
}) {
  const item = entry.item;
  const rar  = RARITY_CONFIG[item.rarity] ?? RARITY_CONFIG.common;

  const isEquipped = Object.values(equipped).some((eq: any) => eq?.id === item.id);
  const equippedSlotKey = Object.entries(equipped).find(([, eq]: any) => eq?.id === item.id)?.[0];

  const bonuses = [
    { label: "Wiedza",         val: item.bonusKnowledge },
    { label: "Inteligencja",   val: item.bonusIntelligence },
    { label: "Moc",            val: item.bonusPower },
    { label: "Wytrzymałość",   val: item.bonusEndurance },
    { label: "Odporność",      val: item.bonusResistance },
    { label: "Inicjatywa",     val: item.bonusInitiative },
    { label: "Magia Żywiołów", val: item.bonusElementalMagic },
    { label: "Magia Astralna", val: item.bonusAstralMagic },
    { label: "Magia Krwi",     val: item.bonusBloodMagic },
  ].filter(b => b.val > 0);

  const reqs = [
    { label: "Wiedza",         val: item.reqKnowledge },
    { label: "Inteligencja",   val: item.reqIntelligence },
    { label: "Moc",            val: item.reqPower },
    { label: "Wytrzymałość",   val: item.reqEndurance },
    { label: "Odporność",      val: item.reqResistance },
    { label: "Inicjatywa",     val: item.reqInitiative },
    { label: "Magia Żywiołów", val: item.reqElementalMagic },
    { label: "Magia Astralna", val: item.reqAstralMagic },
    { label: "Magia Krwi",     val: item.reqBloodMagic },
  ].filter(r => r.val > 0);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(16,14,32,0.75)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 300, padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#2D2450",
          border: `1px solid ${rar.color}`,
          borderRadius: 14,
          width: 360, maxHeight: "85vh", overflowY: "auto",
          padding: 24,
          boxShadow: `0 0 40px ${rar.bg}`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <p style={{ fontFamily: "Cinzel, serif", fontSize: 17, fontWeight: 700, color: "#F7F0DD", marginBottom: 4 }}>
              {item.name}
            </p>
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 10,
              background: rar.bg, color: rar.color,
              fontFamily: "Cinzel, serif", letterSpacing: "0.06em",
            }}>
              {rar.label}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(247,240,221,0.4)", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        <div style={{
          height: 140, borderRadius: 10, marginBottom: 16,
          background: `linear-gradient(135deg, ${rar.bg}, rgba(0,0,0,0.3))`,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: `1px solid ${rar.color}25`,
        }}>
          <span style={{ fontSize: 52 }}>{SLOT_CONFIG[item.slot]?.icon ?? "🎒"}</span>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <Tag>{SLOT_CONFIG[item.slot]?.label ?? item.slot}</Tag>
          {item.element && <Tag color="#59D4D0">{item.element}</Tag>}
          {item.weaponType && <Tag>{item.weaponType}</Tag>}
        </div>

        {bonuses.length > 0 && (
          <Section title="Bonusy">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
              {bonuses.map(b => (
                <div key={b.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "rgba(247,240,221,0.5)" }}>{b.label}</span>
                  <span style={{ color: "#59D4D0", fontWeight: 600 }}>+{b.val}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {reqs.length > 0 && (
          <Section title="Wymagania">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
              {reqs.map(r => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "rgba(247,240,221,0.5)" }}>{r.label}</span>
                  <span style={{ color: meetsReqs ? "#59D4D0" : "#F46A4E", fontWeight: 600 }}>{r.val}</span>
                </div>
              ))}
            </div>
            {!meetsReqs && (
              <p style={{ fontSize: 11, color: "#F46A4E", marginTop: 8, fontStyle: "italic" }}>
                ✕ Nie spełniasz wymagań tego przedmiotu
              </p>
            )}
          </Section>
        )}

        <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
          {isEquipped ? (
            <button
              onClick={() => equippedSlotKey && onUnequip(equippedSlotKey)}
              disabled={equipping}
              style={btnStyle("#F46A4E", "#161d38")}
            >
              {equipping ? "..." : "Zdejmij"}
            </button>
          ) : (
            <button
              onClick={() => onEquip(item.id)}
              disabled={equipping || !meetsReqs}
              style={btnStyle(meetsReqs ? "#F5C451" : "rgba(245,196,81,0.2)", meetsReqs ? "#161d38" : "rgba(247,240,221,0.3)")}
            >
              {equipping ? "..." : meetsReqs ? "Załóż" : "Nie spełniasz wymagań"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Tag({ children, color = "rgba(247,240,221,0.5)" }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      fontSize: 11, padding: "2px 8px", borderRadius: 8,
      background: "rgba(0,0,0,0.2)", color,
      border: "1px solid rgba(247,240,221,0.1)",
    }}>
      {children}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ fontSize: 10, color: "rgba(247,240,221,0.35)", fontFamily: "Cinzel, serif", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function btnStyle(bg: string, color: string): React.CSSProperties {
  return {
    flex: 1, padding: "10px 0",
    background: bg, color, border: "none", borderRadius: 8,
    fontSize: 13, fontWeight: 700, fontFamily: "Cinzel, serif",
    cursor: "pointer", letterSpacing: "0.05em",
  };
}

// ── KARTA PRZEDMIOTU (na grafice) ─────────────────────────────────────────────

function ItemCard({
  entry,
  isEquipped,
  meetsReqs,
  onClick,
}: {
  entry: VaultItem;
  isEquipped: boolean;
  meetsReqs: boolean;
  onClick: () => void;
}) {
  const item = entry.item;
  const rar  = RARITY_CONFIG[item.rarity] ?? RARITY_CONFIG.common;

  return (
    <div
      onClick={onClick}
      style={{
        padding: "8px 10px",
        borderRadius: 8,
        cursor: "pointer",
        background: isEquipped ? "rgba(89,212,208,0.18)" : "rgba(16,14,32,0.72)",
        border: `1px solid ${isEquipped ? "#59D4D0" : rar.color + "55"}`,
        backdropFilter: "blur(2px)",
        opacity: meetsReqs ? 1 : 0.55,
        transition: "transform 0.12s, background 0.12s",
        flexShrink: 0,
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = "translateX(2px)")}
      onMouseLeave={e => (e.currentTarget.style.transform = "translateX(0)")}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: rar.color, flexShrink: 0 }} />
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "#F7F0DD", lineHeight: 1.2 }}>
          {item.name}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 9, color: rar.color, fontFamily: "Cinzel, serif" }}>{rar.label}</span>
        {isEquipped && <span style={{ fontSize: 9, color: "#59D4D0" }}>● Założony</span>}
        {!meetsReqs && !isEquipped && <span style={{ fontSize: 9, color: "#F46A4E" }}>✕</span>}
      </div>
    </div>
  );
}

// ── GŁÓWNY KOMPONENT ─────────────────────────────────────────────────────────

export default function ChaosVault() {
  const [vaultData, setVaultData] = useState<any>(null);
  const [equipped, setEquipped]   = useState<EquippedSlots | null>(null);
  const [charStats, setCharStats] = useState<CharacterStats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<VaultItem | null>(null);
  const [equipping, setEquipping] = useState(false);

  const [filters, setFilters] = useState({
    rarity: "all",
    slot:   "all",
    onlyMeetsReqs: false,
  });

  const fetchAll = useCallback(async () => {
    try {
      const [vaultRes, eqRes, statsRes] = await Promise.all([
        api.get("/tower/chaos-vault"),
        api.get("/equipment"),
        api.get("/character/effective-stats"),
      ]);
      setVaultData(vaultRes.data);
      setEquipped(eqRes.data.equipped);
      setCharStats(statsRes.data.effective);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleEquip(itemId: number) {
    setEquipping(true);
    try {
      await api.post("/equipment/item/equip", { itemId });
      await fetchAll();
      setSelected(null);
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd zakładania przedmiotu");
    } finally {
      setEquipping(false);
    }
  }

  async function handleUnequip(slot: string) {
    setEquipping(true);
    try {
      await api.post("/equipment/item/unequip", { slot });
      await fetchAll();
      setSelected(null);
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd zdejmowania przedmiotu");
    } finally {
      setEquipping(false);
    }
  }

  const allItems: VaultItem[] = vaultData?.items ?? [];
  const total = vaultData?.totalCount ?? 0;
  const capacity = vaultData?.capacity ?? 0;
  const hiddenCount = vaultData?.hiddenCount ?? 0;

  const filtered = allItems.filter(entry => {
    const item = entry.item;
    if (filters.rarity !== "all" && item.rarity !== filters.rarity) return false;
    if (filters.slot   !== "all" && item.slot   !== filters.slot)   return false;
    if (filters.onlyMeetsReqs && !meetsRequirements(item, charStats)) return false;
    return true;
  });

  const slotGroups = ALL_SLOTS.reduce<Record<string, VaultItem[]>>((acc, slot) => {
    acc[slot] = filtered.filter(e => e.item.slot === slot);
    return acc;
  }, {});
  const usedSlots = ALL_SLOTS.filter(s => slotGroups[s].length > 0);

  if (loading) return <p style={{ color: "rgba(247,240,221,0.4)" }}>Ładowanie...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── FILTRY (góra) ── */}
      <div style={{
        background: "#372b5d",
        borderRadius: 10,
        padding: "12px 16px",
        border: "1px solid rgba(245,196,81,0.1)",
        display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center",
      }}>
        <span style={{ fontFamily: "Cinzel, serif", fontSize: 13, color: "#F5C451", letterSpacing: "0.06em" }}>
          Komnata Nieładu
        </span>

        <div style={{ width: 1, height: 20, background: "rgba(247,240,221,0.1)" }} />

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "rgba(247,240,221,0.4)" }}>Jakość:</span>
          {["all", ...Object.keys(RARITY_CONFIG)].map(r => (
            <button
              key={r}
              onClick={() => setFilters(f => ({ ...f, rarity: r }))}
              style={{
                padding: "3px 9px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                background: filters.rarity === r ? "#F5C451" : "rgba(0,0,0,0.2)",
                color: filters.rarity === r ? "#161d38" : "rgba(247,240,221,0.5)",
                border: "1px solid rgba(245,196,81,0.15)",
                fontWeight: filters.rarity === r ? 700 : 400,
              }}
            >
              {r === "all" ? "Wszystkie" : RARITY_CONFIG[r].label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "rgba(247,240,221,0.4)" }}>Typ:</span>
          {["all", ...ALL_SLOTS].map(s => (
            <button
              key={s}
              onClick={() => setFilters(f => ({ ...f, slot: s }))}
              style={{
                padding: "3px 9px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                background: filters.slot === s ? "#59D4D0" : "rgba(0,0,0,0.2)",
                color: filters.slot === s ? "#161d38" : "rgba(247,240,221,0.5)",
                border: "1px solid rgba(89,212,208,0.15)",
                fontWeight: filters.slot === s ? 700 : 400,
              }}
            >
              {s === "all" ? "Wszystkie" : SLOT_CONFIG[s]?.label ?? s}
            </button>
          ))}
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginLeft: "auto" }}>
          <input
            type="checkbox"
            checked={filters.onlyMeetsReqs}
            onChange={e => setFilters(f => ({ ...f, onlyMeetsReqs: e.target.checked }))}
            style={{ accentColor: "#F5C451", width: 14, height: 14, cursor: "pointer" }}
          />
          <span style={{ fontSize: 11, color: "rgba(247,240,221,0.6)" }}>Spełniasz wymagania</span>
        </label>

        <div style={{ fontSize: 11, color: "rgba(247,240,221,0.4)" }}>
          {total} / {capacity} przedmiotów
          {hiddenCount > 0 && <span style={{ color: "#F46A4E", marginLeft: 6 }}>({hiddenCount} ukrytych)</span>}
        </div>
      </div>

      {/* ── GRAFIKA + KOLUMNY PRZEDMIOTÓW + POSTAĆ ── */}
      <div style={{
        position: "relative",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid rgba(245,196,81,0.12)",
        aspectRatio: "1800 / 1200",
        width: "100%",
      }}>
        <img
          src={getVaultBackground(total)}
          alt="Komnata Nieładu"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />

        {/* Gradient u dołu dla czytelności */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(16,14,32,0.55) 0%, transparent 45%)",
          pointerEvents: "none",
        }} />

        {/* ── POSTAĆ Z EKWIPUNKIEM (lewy panel, nałożony) ── */}
        <div style={{
          position: "absolute", top: 16, left: 16,
          width: 180, height: "60%",
          background: "rgba(16,14,32,0.55)",
          borderRadius: 12,
          border: "1px solid rgba(245,196,81,0.15)",
          backdropFilter: "blur(3px)",
        }}>
          <p style={{ fontFamily: "Cinzel, serif", fontSize: 10, color: "rgba(245,196,81,0.7)", textAlign: "center", padding: "8px 0 0", letterSpacing: "0.06em" }}>
            EKWIPUNEK
          </p>
          <div style={{ position: "relative", width: "100%", height: "calc(100% - 24px)" }}>
            <div style={{
              position: "absolute", inset: "10px 10px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 48, opacity: 0.15 }}>🧙</span>
            </div>
            {equipped && BODY_SLOTS.map(slot => {
              const item = equipped[slot.key];
              return (
                <div
                  key={slot.key}
                  title={item ? item.name : slot.label}
                  onClick={() => {
                    if (item) {
                      const entry = allItems.find(e => e.item.id === item.id);
                      if (entry) setSelected(entry);
                    }
                  }}
                  style={{
                    position: "absolute",
                    top: slot.top, left: slot.left,
                    transform: "translate(-50%, -50%)",
                    width: 30, height: 30, borderRadius: 7,
                    background: item ? "rgba(89,212,208,0.25)" : "rgba(0,0,0,0.4)",
                    border: item ? "1px solid #59D4D0" : "1px dashed rgba(247,240,221,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, cursor: item ? "pointer" : "default", zIndex: 5,
                  }}
                >
                  {item ? SLOT_CONFIG[item.slot]?.icon ?? "◆" : slot.icon}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── KOLUMNY PRZEDMIOTÓW ── */}
        {allItems.length === 0 ? (
          <div style={{
            position: "absolute", bottom: 24, left: 220, right: 24,
            textAlign: "center",
          }}>
            <p style={{ fontSize: 14, color: "rgba(247,240,221,0.5)", fontStyle: "italic", background: "rgba(16,14,32,0.5)", display: "inline-block", padding: "8px 20px", borderRadius: 8 }}>
              Komnata jest pusta — znajdź przedmioty podczas eksploracji
            </p>
          </div>
        ) : usedSlots.length === 0 ? (
          <div style={{
            position: "absolute", bottom: 24, left: 220, right: 24,
            textAlign: "center",
          }}>
            <p style={{ fontSize: 14, color: "rgba(247,240,221,0.5)", fontStyle: "italic", background: "rgba(16,14,32,0.5)", display: "inline-block", padding: "8px 20px", borderRadius: 8 }}>
              Brak przedmiotów pasujących do filtrów
            </p>
          </div>
        ) : (
          <div style={{
            position: "absolute",
            top: 16, right: 16, bottom: 16,
            left: 212,
            display: "flex", gap: 10,
          }}>
            {usedSlots.map(slot => (
              <div
                key={slot}
                style={{
                  flex: 1, minWidth: 0,
                  display: "flex", flexDirection: "column",
                  background: "rgba(16,14,32,0.35)",
                  borderRadius: 10,
                  border: "1px solid rgba(245,196,81,0.08)",
                  overflow: "hidden",
                }}
              >
                {/* Nagłówek kolumny */}
                <div style={{
                  padding: "8px 10px",
                  background: "rgba(0,0,0,0.3)",
                  borderBottom: "1px solid rgba(245,196,81,0.1)",
                  display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                }}>
                  <span style={{ fontSize: 13 }}>{SLOT_CONFIG[slot]?.icon}</span>
                  <span style={{ fontFamily: "Cinzel, serif", fontSize: 10.5, color: "#F5C451", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    {SLOT_CONFIG[slot]?.label ?? slot}
                  </span>
                  <span style={{ fontSize: 10, color: "rgba(247,240,221,0.35)", marginLeft: "auto" }}>
                    {slotGroups[slot].length}
                  </span>
                </div>

                {/* Lista — scrollowalna */}
                <div style={{
                  flex: 1, overflowY: "auto",
                  padding: 8, display: "flex", flexDirection: "column", gap: 6,
                }}>
                  {slotGroups[slot].map(entry => (
                    <ItemCard
                      key={entry.id}
                      entry={entry}
                      isEquipped={Object.values(equipped ?? {}).some((eq: any) => eq?.id === entry.item.id)}
                      meetsReqs={meetsRequirements(entry.item, charStats)}
                      onClick={() => setSelected(entry)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── POPUP ── */}
      {selected && equipped && (
        <ItemPopup
          entry={selected}
          equipped={equipped}
          meetsReqs={meetsRequirements(selected.item, charStats)}
          onClose={() => setSelected(null)}
          onEquip={handleEquip}
          onUnequip={handleUnequip}
          equipping={equipping}
        />
      )}
    </div>
  );
}