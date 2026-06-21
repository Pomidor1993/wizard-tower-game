import { useCallback, useEffect, useState } from "react";
import api from "../api/client";

import vault1 from "../assets/chaosvault1.png";
import vault2 from "../assets/chaosvault2.png";
import vault3 from "../assets/chaosvault3.png";
import vault4 from "../assets/chaosvault4.png";

// ── TYPY ────────────────────────────────────────────────────────────────────

interface VaultItem {
  chaosVaultItemId: number;
  ownedItemId: number;
  tier: number;
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
  talisman:   any | null;
  mainHand: any | null;
  offHand:  any | null;
  offHand2: any | null;
}

interface CharacterStats {
  knowledge: number; intelligence: number; power: number;
  endurance: number; resistance: number; initiative: number;
  elementalMagic: number; astralMagic: number; bloodMagic: number;
}

interface EquipmentPreset {
  slotIndex: number;
  name: string;
  hatItemId: number | null;
  robeItemId: number | null;
  bootsItemId: number | null;
  talismanItemId: number | null;
  mainHandItemId: number | null;
  offHandItemId: number | null;
}

// ── KONFIGURACJE ─────────────────────────────────────────────────────────────

const RARITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  common:   { label: "Pospolity",  color: "#94a3b8", bg: "rgba(148,163,184,0.18)" },
  uncommon: { label: "Nietypowy",  color: "#4ade80", bg: "rgba(74,222,128,0.18)"  },
  rare:     { label: "Rzadki",     color: "#60a5fa", bg: "rgba(96,165,250,0.18)"  },
  unique:   { label: "Unikalny",   color: "#fbbf24", bg: "rgba(251,191,36,0.18)"  },
};

const SLOT_CONFIG: Record<string, { label: string; icon: string }> = {
  hat:        { label: "Okrycia głowy", icon: "🎩" },
  robe:       { label: "Szaty",         icon: "👘" },
  boots:      { label: "Buty",          icon: "👢" },
  talisman:   { label: "talizmany",     icon: "📿" },
  weapon_one: { label: "Broń jednoręczna", icon: "⚔️" },
  weapon_two: { label: "Broń dwuręczna",   icon: "⚔️" },
};

const BODY_SLOTS: { key: keyof EquippedSlots; label: string; icon: string; top: string; left: string }[] = [
  { key: "hat",      label: "Czapka",     icon: "🎩", top: "6%",  left: "50%" },
  { key: "talisman", label: "Talizman",   icon: "📿", top: "14%", left: "78%" },
  { key: "robe",     label: "Szata",      icon: "👘", top: "42%", left: "50%" },
  { key: "mainHand", label: "Prawa ręka", icon: "⚔️", top: "42%", left: "18%" },
  { key: "offHand",  label: "Lewa ręka",  icon: "🛡", top: "42%", left: "82%" },
  { key: "boots",    label: "Buty",       icon: "👢", top: "78%", left: "50%" },
];

const RARITY_VALUE: Record<string, number> = {
  common: 10, uncommon: 25, rare: 50, unique: 100,
};

const ALL_SLOTS = Object.keys(SLOT_CONFIG);

function getVaultBackground(total: number): string {
  if (total >= 60) return vault4;
  if (total >= 25) return vault3;
  if (total >= 10) return vault2;
  return vault1;
}

function isEntryEquipped(entry: VaultItem, equipped: EquippedSlots): boolean {
  return Object.values(equipped).some((eq: any) => eq?.ownedItemId === entry.ownedItemId);
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

// ── LOGIKA EKWIPOWANIA ZAZNACZONYCH ─────────────────────────────────────────

function canEquipSelected(
  selected: Set<number>,
  allItems: VaultItem[],
  equipped: EquippedSlots | null,
): { canEquip: boolean; reason: string } {
  if (selected.size === 0) return { canEquip: false, reason: "Nic nie zaznaczono" };

  const selectedItems = allItems.filter(e => selected.has(e.chaosVaultItemId));

  // Sprawdź każdy slot osobno
const slotGroups: Record<string, VaultItem[]> = {};
for (const item of selectedItems) {
  const s = item.item.slot;
  if (!slotGroups[s]) slotGroups[s] = [];
  slotGroups[s].push(item);
}

// ← tutaj, przed pętlą for...of
if (slotGroups["weapon_one"] && slotGroups["weapon_two"]) {
  return { canEquip: false, reason: "Nie możesz założyć jednocześnie broni jednoręcznej i dwuręcznej" };
}

for (const [slot, items] of Object.entries(slotGroups)) {
    if (slot === "weapon_one") {
      if (items.length > 2) return { canEquip: false, reason: "Możesz trzymać maksymalnie 2 bronie jednoręczne" };
      if (items.length === 2 && (!equipped || equipped.mainHand || equipped.offHand)) {
        return { canEquip: false, reason: "Nie masz 2 wolnych slotów na broń" };
      }
      if (items.length === 1 && equipped && equipped.mainHand && equipped.offHand) {
        return { canEquip: false, reason: "Zdejmij najpierw broń" };
      }
    } else {
      if (items.length > 1) return { canEquip: false, reason: `Za dużo przedmiotów kategorii: ${SLOT_CONFIG[slot]?.label ?? slot}` };
      const slotToEquipKey: Record<string, keyof EquippedSlots> = {
        robe: "robe", boots: "boots", hat: "hat", talisman: "talisman", weapon_two: "mainHand",
      };
      const equipKey = slotToEquipKey[slot];
      if (equipKey && equipped?.[equipKey]) {
        return { canEquip: false, reason: `Zdejmij najpierw założony przedmiot (${SLOT_CONFIG[slot]?.label ?? slot})` };
      }
    }
  }

  return { canEquip: true, reason: "" };
}

// ── SHARED ───────────────────────────────────────────────────────────────────

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

function btnStyle(bg: string, color: string, disabled = false): React.CSSProperties {
  return {
    flex: 1, padding: "10px 0",
    background: bg, color, border: "none", borderRadius: 8,
    fontSize: 13, fontWeight: 700, fontFamily: "Cinzel, serif",
    cursor: disabled ? "not-allowed" : "pointer", letterSpacing: "0.05em",
    opacity: disabled ? 0.6 : 1,
  };
}

// ── POPUP PRZEDMIOTU ──────────────────────────────────────────────────────────

function ItemPopup({
  entry, equipped, meetsReqs, onClose, onEquip, onUnequip, equipping,
}: {
  entry: VaultItem;
  equipped: EquippedSlots;
  meetsReqs: boolean;
  onClose: () => void;
  onEquip: (ownedItemId: number) => Promise<void>;
  onUnequip: (slot: string) => Promise<void>;
  equipping: boolean;
}) {
  const item = entry.item;
  const rar  = RARITY_CONFIG[item.rarity] ?? RARITY_CONFIG.common;

  const isEquipped = Object.entries(equipped).some(([, eq]: any) => eq?.ownedItemId === entry.ownedItemId);
  const equippedSlotKey = Object.entries(equipped).find(([, eq]: any) => eq?.ownedItemId === entry.ownedItemId)?.[0];

  const slotToEquipmentKey: Record<string, keyof EquippedSlots> = {
    robe: "robe", boots: "boots", hat: "hat", talisman: "talisman",
    weapon_one: "mainHand", weapon_two: "mainHand",
  };
  const slotOccupied = !isEquipped && !!equipped[slotToEquipmentKey[item.slot]];

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
          background: "#2D2450", border: `1px solid ${rar.color}`,
          borderRadius: 14, width: 360, maxHeight: "85vh", overflowY: "auto",
          padding: 24, boxShadow: `0 0 40px ${rar.bg}`,
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
  {(entry.tier ?? 1) > 1 && <Tag color="#e5e900">Tier {entry.tier}</Tag>}
  {item.element && <Tag color="#59D4D0">{item.element}</Tag>}
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

        <div style={{ marginTop: 20, display: "flex", gap: 10, flexDirection: "column" }}>
          {isEquipped ? (
            <button
              onClick={() => equippedSlotKey && onUnequip(equippedSlotKey)}
              disabled={equipping}
              style={btnStyle("#F46A4E", "#161d38", equipping)}
            >
              {equipping ? "..." : "Zdejmij"}
            </button>
          ) : slotOccupied ? (
            <button disabled style={btnStyle("rgba(247,240,221,0.08)", "rgba(247,240,221,0.3)", true)}>
              Najpierw zdejmij założony przedmiot
            </button>
          ) : (
            <button
              onClick={() => onEquip(entry.ownedItemId)}
              disabled={equipping || !meetsReqs}
              style={btnStyle(meetsReqs ? "#F5C451" : "rgba(245,196,81,0.2)", meetsReqs ? "#161d38" : "rgba(247,240,221,0.3)", equipping || !meetsReqs)}
            >
              {equipping ? "..." : meetsReqs ? "Załóż" : "Nie spełniasz wymagań"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── POPUP DEZINTEGRATORA ──────────────────────────────────────────────────────

function DisintegratorPopup({
  items,
  totalReward,
  currency,
  onConfirm,
  onClose,
  loading,
}: {
  items: { chaosVaultItemId: number; name: string; rarity: string; value: number }[];
  totalReward: number;
  currency: "shards" | "prestige";
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  const currencyIcon  = currency === "prestige" ? "♛" : "✦";
  const currencyLabel = currency === "prestige" ? "prestiżu" : "okruchów mocy";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(16,14,32,0.80)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 400, padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#2D2450",
          border: "1px solid rgba(244,106,78,0.5)",
          borderRadius: 14, width: 400, maxHeight: "80vh",
          display: "flex", flexDirection: "column",
          padding: 24, boxShadow: "0 0 40px rgba(244,106,78,0.15)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <p style={{ fontFamily: "Cinzel, serif", fontSize: 16, fontWeight: 700, color: "#F46A4E", margin: 0 }}>
              💥 Dezintegrator
            </p>
            <p style={{ fontSize: 11, color: "rgba(247,240,221,0.4)", margin: "4px 0 0" }}>
              Ta operacja jest nieodwracalna
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(247,240,221,0.4)", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", marginBottom: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {items.map(item => {
              const rar = RARITY_CONFIG[item.rarity] ?? RARITY_CONFIG.common;
              return (
                <div
                  key={item.chaosVaultItemId}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 12px", borderRadius: 8,
                    background: rar.bg, border: `1px solid ${rar.color}44`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: rar.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "#F7F0DD", fontWeight: 500 }}>{item.name}</span>
                  </div>
<span style={{ fontSize: 12, fontWeight: 700, color: "#F5C451" }}>+{item.value} {currencyIcon}</span>                </div>
              );
            })}
          </div>
        </div>

        <div style={{
          padding: "12px 16px", borderRadius: 10,
          background: "rgba(245,196,81,0.08)", border: "1px solid rgba(245,196,81,0.2)",
          marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
<span style={{ fontSize: 13, color: "rgba(247,240,221,0.7)" }}>Łączny zysk:</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#F5C451", fontFamily: "Cinzel, serif" }}>
            {totalReward} {currencyLabel}
          </span>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: "10px 0", background: "rgba(247,240,221,0.08)", color: "rgba(247,240,221,0.6)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, fontFamily: "Cinzel, serif", cursor: "pointer" }}
          >
            Anuluj
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={btnStyle(loading ? "rgba(244,106,78,0.3)" : "#F46A4E", "#fff", loading)}
          >
            {loading ? "Niszczę..." : `Zniszcz ${items.length} przedmiot${items.length === 1 ? "" : items.length < 5 ? "y" : "ów"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── KARTA PRZEDMIOTU ──────────────────────────────────────────────────────────

function ItemCard({
  entry, isEquipped, meetsReqs, isSelected, onToggleSelect, onOpenDetail,
}: {
  entry: VaultItem;
  isEquipped: boolean;
  meetsReqs: boolean;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onOpenDetail: (entry: VaultItem) => void;
}) {
  const item = entry.item;
  const rar  = RARITY_CONFIG[item.rarity] ?? RARITY_CONFIG.common;

  const bonuses = [
    { label: "Wie", val: item.bonusKnowledge },
    { label: "Int", val: item.bonusIntelligence },
    { label: "Moc", val: item.bonusPower },
    { label: "Wyt", val: item.bonusEndurance },
    { label: "Odp", val: item.bonusResistance },
    { label: "Ini", val: item.bonusInitiative },
    { label: "MŻ",  val: item.bonusElementalMagic },
    { label: "MA",  val: item.bonusAstralMagic },
    { label: "MK",  val: item.bonusBloodMagic },
  ].filter(b => b.val > 0);

  return (
    <div
      style={{
        borderRadius: 8, flexShrink: 0,
        background: isSelected
          ? "rgba(245,196,81,0.18)"
          : isEquipped
          ? "rgba(89,212,208,0.22)"
          : rar.bg,
        border: `1px solid ${isSelected ? "#F5C451" : isEquipped ? "#59D4D0" : rar.color + "66"}`,
        opacity: meetsReqs ? 1 : 0.55,
        transition: "transform 0.12s, background 0.12s",
        overflow: "hidden",
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = "translateX(2px)")}
      onMouseLeave={e => (e.currentTarget.style.transform = "translateX(0)")}
    >
      {/* Wiersz górny: checkbox + nazwa */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 8px 4px" }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(entry.chaosVaultItemId)}
          onClick={e => e.stopPropagation()}
          style={{ accentColor: "#F5C451", width: 13, height: 13, flexShrink: 0, cursor: "pointer" }}
        />
        <span
          onClick={() => onOpenDetail(entry)}
          style={{
            fontSize: 11.5, fontWeight: 600, color: "#F7F0DD", lineHeight: 1.2,
            flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            cursor: "pointer", textDecoration: "underline", textDecorationColor: "rgba(247,240,221,0.2)",
          }}
        >
          {item.name}
          {(entry.tier ?? 1) > 1 && (
  <span style={{ fontSize: 9, color: "#e7aa00", flexShrink: 0, fontWeight: 700 }}>
    T{entry.tier}
  </span>
)}
        </span>
        
        {isEquipped && <span style={{ fontSize: 9, color: "#59D4D0", flexShrink: 0 }}>●</span>}
        {!meetsReqs && !isEquipped && <span style={{ fontSize: 9, color: "#F46A4E", flexShrink: 0 }}>✕</span>}
      </div>

      {/* Bonusy — nie klikalne */}
      <div style={{ padding: "0 8px 7px" }}>
        {bonuses.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 8px" }}>
            {bonuses.map(b => (
              <span key={b.label} style={{ fontSize: 10, color: "#59D4D0", fontWeight: 600 }}>
                +{b.val} {b.label}
              </span>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: 10, color: "rgba(247,240,221,0.3)", fontStyle: "italic" }}>brak bonusów</span>
        )}
      </div>
    </div>
  );
}


function SavePresetModal({ presets, onSave, onClose }: {
  presets: EquipmentPreset[];
  onSave: (slotIndex: number, name: string) => Promise<void>;
  onClose: () => void;
}) {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (selectedSlot === null || !name.trim()) return;
    setSaving(true);
    try { await onSave(selectedSlot, name.trim()); }
    finally { setSaving(false); }
  }

  const presetMap = Object.fromEntries(presets.map(p => [p.slotIndex, p]));

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(16,14,32,0.8)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#2D2450", border: "1px solid rgba(245,196,81,0.3)", borderRadius: 14, width: 420, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <p style={{ fontFamily: "Cinzel, serif", fontSize: 15, fontWeight: 700, color: "#F5C451", margin: 0 }}>Zapisz zestaw</p>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(247,240,221,0.4)", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        <p style={{ fontSize: 11, color: "rgba(247,240,221,0.4)", margin: "0 0 12px" }}>Wybierz slot (1–10):</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 20 }}>
          {Array.from({ length: 10 }, (_, i) => {
            const existing = presetMap[i];
            const isSelected = selectedSlot === i;
            return (
              <button
                key={i}
                onClick={() => { setSelectedSlot(i); if (existing) setName(existing.name); }}
                style={{
                  padding: "10px 4px", borderRadius: 8, border: `1px solid ${isSelected ? "#F5C451" : "rgba(247,240,221,0.15)"}`,
                  background: isSelected ? "rgba(245,196,81,0.15)" : existing ? "rgba(89,212,208,0.08)" : "rgba(0,0,0,0.2)",
                  color: isSelected ? "#F5C451" : existing ? "#59D4D0" : "rgba(247,240,221,0.4)",
                  cursor: "pointer", fontSize: 11, fontFamily: "Cinzel, serif",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                }}
              >
                <span style={{ fontWeight: 700 }}>{i + 1}</span>
                {existing && <span style={{ fontSize: 9, maxWidth: 48, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{existing.name}</span>}
              </button>
            );
          })}
        </div>

        {selectedSlot !== null && (
          <>
            <p style={{ fontSize: 11, color: "rgba(247,240,221,0.4)", margin: "0 0 8px" }}>Nazwa zestawu (max 8 znaków):</p>
            <input
              value={name}
              onChange={e => setName(e.target.value.slice(0, 8))}
              placeholder="np. Ogień"
              maxLength={8}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8, marginBottom: 16,
                background: "rgba(0,0,0,0.3)", border: "1px solid rgba(247,240,221,0.2)",
                color: "#F7F0DD", fontSize: 13, fontFamily: "Inter, sans-serif",
                boxSizing: "border-box",
              }}
            />
            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              style={{
                width: "100%", padding: "11px 0", borderRadius: 8, border: "none",
                background: name.trim() ? "#F5C451" : "rgba(245,196,81,0.2)",
                color: name.trim() ? "#161d38" : "rgba(247,240,221,0.3)",
                fontSize: 13, fontWeight: 700, fontFamily: "Cinzel, serif", cursor: name.trim() ? "pointer" : "not-allowed",
              }}
            >
              {saving ? "Zapisuję..." : `Zapisz w slocie ${selectedSlot + 1}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ApplyPresetConfirm({ preset, onConfirm, onClose }: {
  preset: EquipmentPreset;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(16,14,32,0.8)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#2D2450", border: "1px solid rgba(89,212,208,0.3)", borderRadius: 14, width: 360, padding: 24 }}>
        <p style={{ fontFamily: "Cinzel, serif", fontSize: 15, fontWeight: 700, color: "#F7F0DD", margin: "0 0 12px" }}>
          Założyć zestaw „{preset.name}"?
        </p>
        <p style={{ fontSize: 12, color: "rgba(247,240,221,0.5)", margin: "0 0 20px" }}>
          Aktualny ekwipunek zostanie zdjęty i zastąpiony zapisanym zestawem. Brakujące przedmioty zostaną pominięte.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px 0", background: "rgba(247,240,221,0.08)", color: "rgba(247,240,221,0.6)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, fontFamily: "Cinzel, serif", cursor: "pointer" }}>
            Nie
          </button>
          <button
            onClick={async () => { setLoading(true); await onConfirm(); setLoading(false); }}
            disabled={loading}
            style={{ flex: 1, padding: "10px 0", background: loading ? "rgba(89,212,208,0.2)" : "#59D4D0", color: "#161d38", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, fontFamily: "Cinzel, serif", cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "..." : "Tak, załóż"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── GŁÓWNY KOMPONENT ─────────────────────────────────────────────────────────

export default function ChaosVault() {
  const [vaultData, setVaultData]   = useState<any>(null);
  const [equipped, setEquipped]     = useState<EquippedSlots | null>(null);
  const [charStats, setCharStats]   = useState<CharacterStats | null>(null);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<VaultItem | null>(null);
  const [equipping, setEquipping]   = useState(false);

const [checkedIds, setCheckedIds]       = useState<Set<number>>(new Set());
  const [disintPreview, setDisintPreview] = useState<{ items: any[]; totalReward: number; currency: "shards" | "prestige" } | null>(null);
  const [disintLoading, setDisintLoading] = useState(false);
  const [disintegratorLevel, setDisintegratorLevel] = useState(0);

  const [presets, setPresets] = useState<EquipmentPreset[]>([]);
  const [savePresetModal, setSavePresetModal] = useState(false);
  const [applyConfirm, setApplyConfirm] = useState<EquipmentPreset | null>(null);

  const [filters, setFilters] = useState({
    rarity: "all",
    slot:   "all",
    onlyMeetsReqs: false,
  });

const fetchAll = useCallback(async () => {
    try {
const [vaultRes, eqRes, statsRes, presetsRes, towerRes] = await Promise.all([
  api.get("/tower/chaos-vault"),
  api.get("/equipment"),
  api.get("/character/effective-stats"),
  api.get("/equipment/presets"),
  api.get("/tower"),
]);
setPresets(presetsRes.data);
      setVaultData(vaultRes.data);
      setEquipped(eqRes.data.equipped);
      setCharStats(statsRes.data.effective);
      const disintegratorBuilding = towerRes.data.buildings?.disintegrator;
      setDisintegratorLevel(disintegratorBuilding?.level ?? 0);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Odznacz przedmioty których już nie ma po odświeżeniu
  useEffect(() => {
    if (!vaultData) return;
    const ids = new Set((vaultData.items as VaultItem[]).map(i => i.chaosVaultItemId));
    setCheckedIds(prev => new Set([...prev].filter(id => ids.has(id))));
  }, [vaultData]);

  async function handleEquip(ownedItemId: number) {
    setEquipping(true);
    try {
      await api.post("/equipment/item/equip", { ownedItemId });
      await fetchAll();
      setSelected(null);
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd zakładania przedmiotu");
    } finally { setEquipping(false); }
  }

  async function handleUnequip(slot: string) {
    setEquipping(true);
    try {
      await api.post("/equipment/item/unequip", { slot });
      await fetchAll();
      setSelected(null);
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd zdejmowania przedmiotu");
    } finally { setEquipping(false); }
  }

  async function handleEquipSelected() {
    const selectedItems = allItems.filter(e => checkedIds.has(e.chaosVaultItemId));
    for (const entry of selectedItems) {
      await handleEquip(entry.ownedItemId);
    }
    setCheckedIds(new Set());
  }

async function handleDisintegratePreview(currency: "shards" | "prestige") {
    if (checkedIds.size === 0) return;
    setDisintLoading(true);
    try {
      const res = await api.post("/tower/disintegrator/preview", { targets: [...checkedIds], currency });
      setDisintPreview(res.data);
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd dezintegratora");
    } finally { setDisintLoading(false); }
  }

  async function handleDisintegrateConfirm() {
    if (!disintPreview) return;
    setDisintLoading(true);
    try {
      await api.post("/tower/disintegrator/confirm", { targets: [...checkedIds], currency: disintPreview.currency });
      setCheckedIds(new Set());
      setDisintPreview(null);
      await fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd dezintegratora");
    } finally { setDisintLoading(false); }
  }

  function toggleCheck(id: number) {
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const visibleIds = filtered.map(e => e.chaosVaultItemId);
    const allChecked = visibleIds.every(id => checkedIds.has(id));
    if (allChecked) {
      setCheckedIds(prev => {
        const next = new Set(prev);
        visibleIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setCheckedIds(prev => new Set([...prev, ...visibleIds]));
    }
  }

  const allItems: VaultItem[] = vaultData?.items ?? [];
  const total      = vaultData?.totalCount ?? 0;
  const capacity   = vaultData?.capacity ?? 0;
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

  const filteringBySlot = filters.slot !== "all";
  const visibleIds = filtered.map(e => e.chaosVaultItemId);
  const allVisibleChecked = visibleIds.length > 0 && visibleIds.every(id => checkedIds.has(id));

  const equipCheck = equipped ? canEquipSelected(checkedIds, allItems, equipped) : { canEquip: false, reason: "Ładowanie..." };

const RARITY_VALUE_PRESTIGE: Record<string, number> = {
  common: 1, uncommon: 5, rare: 10, unique: 30,
};

function tierRewardMultiplier(tier: number): number {
  return 1 + (tier - 1) * 0.1;
}

const checkedItems = allItems.filter(e => checkedIds.has(e.chaosVaultItemId));
const checkedShardsPreview = checkedItems.reduce(
  (sum, e) => sum + Math.floor((RARITY_VALUE[e.item.rarity] ?? 10) * tierRewardMultiplier(e.tier ?? 1)),
  0
);
const checkedPrestigePreview = checkedItems.reduce(
  (sum, e) => sum + Math.floor((RARITY_VALUE_PRESTIGE[e.item.rarity] ?? 1) * tierRewardMultiplier(e.tier ?? 1)),
  0
);

  if (loading) return <p style={{ color: "rgba(247,240,221,0.4)" }}>Ładowanie...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── GÓRNY PASEK: WYEKWIPOWANE + FILTRY ── */}
      <div style={{ display: "grid", gridTemplateColumns: "35fr 65fr", gap: 16, alignItems: "stretch" }}>

        {/* BOX: Wyekwipowane (35%) */}
        <div style={{
          background: "#372b5d",
          borderRadius: 10,
          border: "1px solid rgba(245,196,81,0.1)",
          padding: "12px 16px",
          minHeight: 420,
        }}>
          <p style={{ fontFamily: "Cinzel, serif", fontSize: 11, color: "rgba(245,196,81,0.7)", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 10px" }}>
            Wyekwipowane
          </p>
          <div style={{ position: "relative", width: "100%", height: 360 }}>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 140, opacity: 0.06 }}>🧙</span>
            </div>

            {equipped && BODY_SLOTS.map(slot => {
              const item = equipped[slot.key];
              const rar = item ? (RARITY_CONFIG[item.rarity] ?? RARITY_CONFIG.common) : null;
              return (
                <div
                  key={slot.key}
                  title={item ? item.name : slot.label}
                    onClick={() => item && setSelected({ chaosVaultItemId: -1, ownedItemId: item.ownedItemId, tier: item.tier ?? 1, addedAt: "", item })}                  style={{
                    position: "absolute",
                    top: slot.top, left: slot.left,
                    transform: "translate(-50%, -50%)",
                    width: 52, height: 52, borderRadius: 10,
                    background: item ? rar!.bg : "rgba(0,0,0,0.35)",
                    border: `1px solid ${item ? rar!.color + "99" : "rgba(247,240,221,0.15)"}`,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    cursor: item ? "pointer" : "default",
                    transition: "transform 0.12s",
                    zIndex: 5, gap: 2,
                    boxShadow: item ? `0 0 12px ${rar!.color}33` : "none",
                  }}
                  onMouseEnter={e => { if (item) e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translate(-50%, -50%)"; }}
                >
                  <span style={{ fontSize: item ? 22 : 18, opacity: item ? 1 : 0.2 }}>{slot.icon}</span>
                  {item && (
                    <span style={{
                      fontSize: 8, color: rar!.color, fontWeight: 700,
                      maxWidth: 48, overflow: "hidden", textOverflow: "ellipsis",
                      whiteSpace: "nowrap", textAlign: "center", lineHeight: 1.2,
                    }}>
                      {item.name}
                    </span>
                  )}
                  {!item && (
                    <span style={{ fontSize: 8, color: "rgba(247,240,221,0.2)", textAlign: "center" }}>{slot.label}</span>
                  )}
                </div>
              );
            })}
          </div>
          {/* Zestawy */}
<div style={{ marginTop: 12, borderTop: "1px solid rgba(247,240,221,0.08)", paddingTop: 10 }}>
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
    <span style={{ fontSize: 9, color: "rgba(247,240,221,0.3)", fontFamily: "Cinzel, serif", letterSpacing: "0.06em", textTransform: "uppercase" }}>Zestawy</span>
    <button
      onClick={() => setSavePresetModal(true)}
      style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(245,196,81,0.12)", border: "1px solid rgba(245,196,81,0.25)", color: "#F5C451", cursor: "pointer", fontFamily: "Cinzel, serif" }}
    >
      + Zapisz zestaw
    </button>
  </div>
  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4 }}>
    {Array.from({ length: 10 }, (_, i) => {
      const preset = presets.find(p => p.slotIndex === i);
      return (
        <button
          key={i}
          onClick={() => preset && setApplyConfirm(preset)}
          disabled={!preset}
          title={preset ? `Założyć zestaw "${preset.name}"?` : `Slot ${i + 1} — pusty`}
          style={{
            padding: "6px 4px", borderRadius: 6,
            background: preset ? "rgba(89,212,208,0.1)" : "rgba(0,0,0,0.2)",
            border: `1px solid ${preset ? "rgba(89,212,208,0.3)" : "rgba(247,240,221,0.06)"}`,
            color: preset ? "#59D4D0" : "rgba(247,240,221,0.2)",
            fontSize: 9, fontFamily: "Cinzel, serif", cursor: preset ? "pointer" : "default",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { if (preset) e.currentTarget.style.background = "rgba(89,212,208,0.2)"; }}
          onMouseLeave={e => { if (preset) e.currentTarget.style.background = "rgba(89,212,208,0.1)"; }}
        >
          {preset ? preset.name : `${i + 1}`}
        </button>
      );
    })}
  </div>
</div>
        </div>

        {/* BOX: Filtry + akcje (65%) */}
        <div style={{
          background: "#372b5d",
          borderRadius: 10,
          border: "1px solid rgba(245,196,81,0.1)",
          padding: "12px 16px",
          display: "flex", flexDirection: "column", gap: 12,
          minHeight: 420,
        }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontFamily: "Cinzel, serif", fontSize: 11, color: "rgba(245,196,81,0.7)", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>
              Filtry i akcje
            </p>
            <span style={{ fontSize: 11, color: "rgba(247,240,221,0.5)", fontFamily: "Cinzel, serif" }}>
              Artefakty w komnacie: <span style={{ color: "#F5C451", fontWeight: 700 }}>{total}/{capacity}</span>
            </span>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "rgba(247,240,221,0.4)", minWidth: 52 }}>Jakość:</span>
            {["all", ...Object.keys(RARITY_CONFIG)].map(r => (
              <button key={r} onClick={() => setFilters(f => ({ ...f, rarity: r }))} style={{
                padding: "3px 9px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                background: filters.rarity === r ? "#F5C451" : "rgba(0,0,0,0.2)",
                color: filters.rarity === r ? "#161d38" : "rgba(247,240,221,0.5)",
                border: "1px solid rgba(245,196,81,0.15)",
                fontWeight: filters.rarity === r ? 700 : 400,
              }}>
                {r === "all" ? "Wszystkie" : RARITY_CONFIG[r].label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "rgba(247,240,221,0.4)", minWidth: 52 }}>Typ:</span>
            {["all", ...ALL_SLOTS].map(s => (
              <button key={s} onClick={() => setFilters(f => ({ ...f, slot: s }))} style={{
                padding: "3px 9px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                background: filters.slot === s ? "#59D4D0" : "rgba(0,0,0,0.2)",
                color: filters.slot === s ? "#161d38" : "rgba(247,240,221,0.5)",
                border: "1px solid rgba(89,212,208,0.15)",
                fontWeight: filters.slot === s ? 700 : 400,
              }}>
                {s === "all" ? "Wszystkie" : SLOT_CONFIG[s]?.label ?? s}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={filters.onlyMeetsReqs}
                onChange={e => setFilters(f => ({ ...f, onlyMeetsReqs: e.target.checked }))}
                style={{ accentColor: "#F5C451", width: 14, height: 14, cursor: "pointer" }}
              />
              <span style={{ fontSize: 11, color: "rgba(247,240,221,0.6)" }}>Spełniasz wymagania</span>
            </label>
          </div>

          {/* Separator */}
          <div style={{ height: 1, background: "rgba(247,240,221,0.08)" }} />

          {/* Zaznaczanie */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={allVisibleChecked}
                onChange={toggleSelectAll}
                style={{ accentColor: "#F5C451", width: 14, height: 14, cursor: "pointer" }}
              />
              <span style={{ fontSize: 11, color: "rgba(247,240,221,0.6)" }}>
                Zaznacz wszystkie ({visibleIds.length})
              </span>
            </label>
            {checkedIds.size > 0 && (
              <span style={{ fontSize: 11, color: "#F5C451", marginLeft: "auto" }}>
                Zaznaczono: {checkedIds.size}
              </span>
            )}
          </div>

          {/* Przyciski akcji */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
            {/* Ekwipuj zaznaczone */}
            <div style={{ position: "relative" }}>
              <button
                onClick={handleEquipSelected}
                disabled={checkedIds.size === 0 || !equipCheck.canEquip || equipping}
                style={{
                  width: "100%", padding: "10px 0", borderRadius: 8, border: "none",
                  fontSize: 12, fontWeight: 700, fontFamily: "Cinzel, serif",
                  cursor: (checkedIds.size === 0 || !equipCheck.canEquip || equipping) ? "not-allowed" : "pointer",
                  background: (checkedIds.size === 0 || !equipCheck.canEquip || equipping)
                    ? "rgba(245,196,81,0.1)" : "#F5C451",
                  color: (checkedIds.size === 0 || !equipCheck.canEquip || equipping)
                    ? "rgba(247,240,221,0.3)" : "#161d38",
                  transition: "all 0.2s",
                }}
              >
                {equipping ? "Zakładam..." : "Załóż zaznaczone"}
              </button>
              {checkedIds.size > 0 && !equipCheck.canEquip && (
                <p style={{ fontSize: 10, color: "#F46A4E", margin: "4px 0 0", textAlign: "center" }}>
                  {equipCheck.reason}
                </p>
              )}
            </div>

{/* Dezintegrator — wydzielona sekcja */}
            <div style={{
              borderTop: "1px solid rgba(247,240,221,0.08)",
              paddingTop: 10,
              marginTop: 4,
            }}>
              <p style={{
                fontSize: 9, color: "rgba(244,106,78,0.7)", fontFamily: "Cinzel, serif",
                letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 8px",
              }}>
                💥 Dezintegrator
              </p>

              {disintegratorLevel === 0 ? (
                <p style={{
                  fontSize: 11, color: "rgba(247,240,221,0.35)", fontStyle: "italic",
                  textAlign: "center", padding: "10px 8px", margin: 0,
                  background: "rgba(0,0,0,0.15)", borderRadius: 8,
                  border: "1px dashed rgba(247,240,221,0.1)",
                }}>
                  Wybuduj Dezintegrator w Wieży, aby niszczyć przedmioty za surowce
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button
                    onClick={() => handleDisintegratePreview("shards")}
                    disabled={checkedIds.size === 0 || disintLoading}
                    style={{
                      width: "100%", padding: "10px 0", borderRadius: 8, border: "none",
                      fontSize: 12, fontWeight: 700, fontFamily: "Cinzel, serif",
                      cursor: (checkedIds.size === 0 || disintLoading) ? "not-allowed" : "pointer",
                      background: (checkedIds.size === 0 || disintLoading)
                        ? "rgba(244,106,78,0.1)" : "rgba(244,106,78,0.85)",
                      color: (checkedIds.size === 0 || disintLoading)
                        ? "rgba(247,240,221,0.3)" : "#fff",
                      transition: "all 0.2s",
                    }}
                  >
                    {disintLoading
                      ? "Obliczam..."
                      : checkedIds.size > 0
                      ? `Zniszcz za okruchy (${checkedIds.size}) — +${checkedShardsPreview} ✦`
                      : "Zniszcz za okruchy mocy"}
                  </button>

                  <button
                    onClick={() => handleDisintegratePreview("prestige")}
                    disabled={checkedIds.size === 0 || disintLoading}
                    style={{
                      width: "100%", padding: "10px 0", borderRadius: 8,
                      border: `1px solid ${(checkedIds.size === 0 || disintLoading) ? "rgba(245,196,81,0.15)" : "rgba(245,196,81,0.4)"}`,
                      fontSize: 12, fontWeight: 700, fontFamily: "Cinzel, serif",
                      cursor: (checkedIds.size === 0 || disintLoading) ? "not-allowed" : "pointer",
                      background: (checkedIds.size === 0 || disintLoading)
                        ? "rgba(245,196,81,0.05)" : "rgba(245,196,81,0.12)",
                      color: (checkedIds.size === 0 || disintLoading)
                        ? "rgba(247,240,221,0.3)" : "#F5C451",
                      transition: "all 0.2s",
                    }}
                  >
                    {disintLoading
                      ? "Obliczam..."
                      : checkedIds.size > 0
                      ? `Zniszcz za prestiż (${checkedIds.size}) — +${checkedPrestigePreview} ♛`
                      : "Zniszcz za prestiż"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
{/* ── OSTRZEŻENIE: PRZEPEŁNIONA KOMNATA ── */}
      {hiddenCount > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 16px", borderRadius: 10,
          background: "rgba(244,106,78,0.1)", border: "1px solid rgba(244,106,78,0.3)",
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
          <p style={{ fontSize: 12, color: "#F7F0DD", margin: 0, lineHeight: 1.5 }}>
            Twoja komnata jest za mała, żeby pomieścić wszystkie znalezione artefakty! Rozbuduj komnatę na wyższy poziom lub wrzuć zbędne przedmioty do dezintegratora, żeby uzyskać dostęp do nowo zdobytych artefaktów.
            <span style={{ color: "#F46A4E", fontWeight: 700, marginLeft: 6 }}>({hiddenCount} ukrytych)</span>
          </p>
        </div>
      )}
      {/* ── GRAFIKA ZBROJOWNI ── */}
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
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(16,14,32,0.55) 0%, transparent 45%)",
          pointerEvents: "none",
        }} />

        <div style={{
          position: "absolute",
          top: 16, right: 16, bottom: 16, left: 16,
        }}>
          {/* Widok wszystkich slotów — 6 kolumn */}
          {!filteringBySlot && (
            <div style={{ display: "flex", gap: 10, height: "100%" }}>
              {ALL_SLOTS.map(slot => (
                <div key={slot} style={{
                  flex: 1, minWidth: 0,
                  display: "flex", flexDirection: "column",
                  background: "rgba(16,14,32,0.35)",
                  borderRadius: 10,
                  border: "1px solid rgba(245,196,81,0.08)",
                  overflow: "hidden",
                }}>
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
                  <div style={{ flex: 1, overflowY: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    {slotGroups[slot].length === 0 ? (
                      <p style={{ fontSize: 11, color: "rgba(247,240,221,0.25)", fontStyle: "italic", textAlign: "center", padding: "12px 4px" }}>
                        Brak przedmiotów
                      </p>
                    ) : (
                      slotGroups[slot].map(entry => (
                        <ItemCard
                          key={entry.chaosVaultItemId}
                          entry={entry}
                          isEquipped={isEntryEquipped(entry, equipped!)}
                          meetsReqs={meetsRequirements(entry.item, charStats)}
                          isSelected={checkedIds.has(entry.chaosVaultItemId)}
                          onToggleSelect={toggleCheck}
                          onOpenDetail={setSelected}
                        />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Widok pojedynczego slotu — siatka */}
          {filteringBySlot && (
            <div style={{
              height: "100%",
              background: "rgba(16,14,32,0.35)",
              borderRadius: 10,
              border: "1px solid rgba(245,196,81,0.08)",
              overflow: "hidden",
              display: "flex", flexDirection: "column",
            }}>
              <div style={{
                padding: "8px 14px",
                background: "rgba(0,0,0,0.3)",
                borderBottom: "1px solid rgba(245,196,81,0.1)",
                display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
              }}>
                <span style={{ fontSize: 16 }}>{SLOT_CONFIG[filters.slot]?.icon}</span>
                <span style={{ fontFamily: "Cinzel, serif", fontSize: 12, color: "#F5C451", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  {SLOT_CONFIG[filters.slot]?.label ?? filters.slot}
                </span>
                <span style={{ fontSize: 11, color: "rgba(247,240,221,0.35)", marginLeft: "auto" }}>
                  {filtered.length} przedmiotów
                </span>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
                {filtered.length === 0 ? (
                  <p style={{ fontSize: 13, color: "rgba(247,240,221,0.25)", fontStyle: "italic", textAlign: "center", padding: "32px 0" }}>
                    Brak przedmiotów w tej kategorii
                  </p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
                    {filtered.map(entry => (
                      <ItemCard
                        key={entry.chaosVaultItemId}
                        entry={entry}
                        isEquipped={isEntryEquipped(entry, equipped!)}
                        meetsReqs={meetsRequirements(entry.item, charStats)}
                        isSelected={checkedIds.has(entry.chaosVaultItemId)}
                        onToggleSelect={toggleCheck}
                        onOpenDetail={setSelected}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── POPUP PRZEDMIOTU ── */}
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

{/* ── POPUP DEZINTEGRATORA ── */}
      {disintPreview && (
        <DisintegratorPopup
          items={disintPreview.items}
          totalReward={disintPreview.totalReward}
          currency={disintPreview.currency}
          onConfirm={handleDisintegrateConfirm}
          onClose={() => setDisintPreview(null)}
          loading={disintLoading}
        />
      )}
      
      {/* ── MODAL ZAPISU ZESTAWU ── */}
{savePresetModal && (
  <SavePresetModal
    presets={presets}
    onSave={async (slotIndex, name) => {
      await api.post("/equipment/presets/save", { slotIndex, name });
      setSavePresetModal(false);
      await fetchAll();
    }}
    onClose={() => setSavePresetModal(false)}
  />
)}

{/* ── MODAL POTWIERDZENIA ZESTAWU ── */}
{applyConfirm && (
  <ApplyPresetConfirm
    preset={applyConfirm}
    onConfirm={async () => {
      const res = await api.post("/equipment/presets/apply", { slotIndex: applyConfirm.slotIndex });
      setApplyConfirm(null);
      await fetchAll();
      if (res.data.outdated) alert(res.data.message);
    }}
    onClose={() => setApplyConfirm(null)}
  />
)}
    </div>
  );
}