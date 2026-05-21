import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getMyCharacter, getUpgradeCosts, upgradeStat } from "../api/character";
import api from "../api/client";
import StudyPanel from "../components/StudyPanel";
import TowerView from "../components/TowerView";
import ExplorationPanel from "../components/ExplorationPanel";
import CombatPanel from "../components/CombatPanel";

type Page = "overview" | "training" | "equipment" | "tower" | "study" | "exploration" | "combat" | "guild" | "settings";

const NAV_ITEMS: { id: Page; label: string }[] = [
  { id: "overview",    label: "Przegląd konta" },
  { id: "training",    label: "Trening" },
  { id: "equipment",   label: "Ekwipunek" },
  { id: "tower",       label: "Wieża" },
  { id: "study",       label: "Studia" },
  { id: "exploration", label: "Eksploracja" },
  { id: "combat",      label: "Pojedynek" },
  { id: "guild",       label: "Gildia" },
];

const RARITY_COLORS: Record<string, string> = {
  common:   "text-gray-500 bg-gray-100",
  uncommon: "text-green-700 bg-green-100",
  rare:     "text-blue-700 bg-blue-100",
  unique:   "text-yellow-700 bg-yellow-100",
};

const RARITY_LABELS: Record<string, string> = {
  common: "Pospolity", uncommon: "Nietypowy", rare: "Rzadki", unique: "Unikalny",
};

const SLOT_LABELS: Record<string, string> = {
  hat:      "Czapka",
  robe:     "Szata",
  boots:    "Buty",
  amulet:   "Amulet",
  mainHand: "Prawa ręka",
  offHand:  "Lewa ręka",
};

// ── KOMPONENTY POMOCNICZE ────────────────────────────

function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-40 border-2 border-dashed border-gray-200 rounded-xl">
      <p className="text-gray-400 text-sm">{title} — wizualizacja wkrótce</p>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
      {children}
    </h3>
  );
}

function PageLayout({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[280px_1fr] gap-6 items-start">
      <div className="space-y-4">{left}</div>
      <div>{right}</div>
    </div>
  );
}

// ── MODAL PRZEDMIOTU / CZARU ─────────────────────────

function ItemModal({ item, onClose }: { item: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl border border-gray-200 p-6 w-80 shadow-lg" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="font-semibold text-gray-900">{item.name}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${RARITY_COLORS[item.rarity]}`}>
              {RARITY_LABELS[item.rarity]}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <Placeholder title="Grafika przedmiotu" />
        <div className="mt-4 space-y-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Statystyki</p>
          {item.slot    && <p className="text-xs text-gray-600">Slot: {SLOT_LABELS[item.slot] ?? item.slot}</p>}
          {item.element && <p className="text-xs text-gray-600">Żywioł: {item.element}</p>}
          {item.damage  > 0 && <p className="text-xs text-gray-600">Obrażenia: {item.damage}</p>}
          {item.bonusKnowledge    > 0 && <p className="text-xs text-gray-600">+{item.bonusKnowledge} Wiedza</p>}
          {item.bonusIntelligence > 0 && <p className="text-xs text-gray-600">+{item.bonusIntelligence} Inteligencja</p>}
          {item.bonusEndurance    > 0 && <p className="text-xs text-gray-600">+{item.bonusEndurance} Wytrzymałość</p>}
          {item.bonusPower        > 0 && <p className="text-xs text-gray-600">+{item.bonusPower} Moc</p>}
          {item.bonusInitiative   > 0 && <p className="text-xs text-gray-600">+{item.bonusInitiative} Inicjatywa</p>}
          {item.bonusFireMagic    > 0 && <p className="text-xs text-gray-600">+{item.bonusFireMagic} Żywioł ognia</p>}
          {item.bonusWaterMagic   > 0 && <p className="text-xs text-gray-600">+{item.bonusWaterMagic} Żywioł wody</p>}
          {item.bonusEarthMagic   > 0 && <p className="text-xs text-gray-600">+{item.bonusEarthMagic} Żywioł ziemi</p>}
          {item.bonusAirMagic     > 0 && <p className="text-xs text-gray-600">+{item.bonusAirMagic} Żywioł powietrza</p>}
          {item.bonusChaosMagic   > 0 && <p className="text-xs text-gray-600">+{item.bonusChaosMagic} Chaos</p>}
          {item.bonusEnergyMagic  > 0 && <p className="text-xs text-gray-600">+{item.bonusEnergyMagic} Energia</p>}
          {item.bonusLifeMagic    > 0 && <p className="text-xs text-gray-600">+{item.bonusLifeMagic} Życie</p>}
          {item.bonusDeathMagic   > 0 && <p className="text-xs text-gray-600">+{item.bonusDeathMagic} Śmierć</p>}
          {(item.reqKnowledge > 0 || item.reqFireMagic > 0 || item.reqWaterMagic > 0 ||
            item.reqEarthMagic > 0 || item.reqAirMagic > 0 || item.reqChaosMagic > 0) && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Wymagania</p>
              {item.reqKnowledge    > 0 && <p className="text-xs text-gray-600">Wiedza: {item.reqKnowledge}</p>}
              {item.reqIntelligence > 0 && <p className="text-xs text-gray-600">Inteligencja: {item.reqIntelligence}</p>}
              {item.reqPower        > 0 && <p className="text-xs text-gray-600">Moc: {item.reqPower}</p>}
              {item.reqEndurance    > 0 && <p className="text-xs text-gray-600">Wytrzymałość: {item.reqEndurance}</p>}
              {item.reqResistance   > 0 && <p className="text-xs text-gray-600">Odporność: {item.reqResistance}</p>}
              {item.reqInitiative   > 0 && <p className="text-xs text-gray-600">Inicjatywa: {item.reqInitiative}</p>}
              {item.reqFireMagic    > 0 && <p className="text-xs text-gray-600">Żywioł ognia: {item.reqFireMagic}</p>}
              {item.reqWaterMagic   > 0 && <p className="text-xs text-gray-600">Żywioł wody: {item.reqWaterMagic}</p>}
              {item.reqEarthMagic   > 0 && <p className="text-xs text-gray-600">Żywioł ziemi: {item.reqEarthMagic}</p>}
              {item.reqAirMagic     > 0 && <p className="text-xs text-gray-600">Żywioł powietrza: {item.reqAirMagic}</p>}
              {item.reqChaosMagic   > 0 && <p className="text-xs text-gray-600">Chaos: {item.reqChaosMagic}</p>}
              {item.reqEnergyMagic  > 0 && <p className="text-xs text-gray-600">Energia: {item.reqEnergyMagic}</p>}
              {item.reqLifeMagic    > 0 && <p className="text-xs text-gray-600">Życie: {item.reqLifeMagic}</p>}
              {item.reqDeathMagic   > 0 && <p className="text-xs text-gray-600">Śmierć: {item.reqDeathMagic}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── KOMNATA NIEŁADU — MODAL ──────────────────────────

function ChaosVaultModal({
  onClose,
  character,
  onRefresh,
  disintegratorAvailable,
}: {
  onClose: () => void;
  character: any;
  onRefresh: () => void;
  disintegratorAvailable: boolean;
}) {
  const [vaultData, setVaultData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"spells" | "items">("spells");
  const [filterRarity, setFilterRarity] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [moving, setMoving] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [confirming, setConfirming] = useState(false);
  const [selectedForDezint, setSelectedForDezint] = useState<{ id: number; name: string; rarity: string; type: string }[]>([]);
  const [dezintMode, setDezintMode] = useState(false);

  const fetchVault = useCallback(async () => {
    try {
      const res = await api.get("/tower/chaos-vault");
      setVaultData(res.data);
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd ładowania Komnaty Nieładu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVault(); }, [fetchVault]);

  async function handleMoveSpell(vaultItemId: number) {
    setMoving(vaultItemId);
    try {
      await api.post("/tower/chaos-vault/move-spell", { vaultItemId });
      await fetchVault();
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd przenoszenia czaru");
    } finally {
      setMoving(null);
    }
  }

  async function handleMoveItem(vaultItemId: number) {
    setMoving(vaultItemId);
    try {
      await api.post("/tower/chaos-vault/move-item", { vaultItemId });
      await fetchVault();
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd przenoszenia przedmiotu");
    } finally {
      setMoving(null);
    }
  }

  async function handleDezintPreview() {
    if (selectedForDezint.length === 0) return;
    try {
      const res = await api.post("/tower/disintegrator/preview", {
        targets: selectedForDezint.map(s => ({
          type: s.type === "spell" ? "vault_spell" : "vault_item",
          id: s.id,
        })),
      });
      setPreviewData(res.data);
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd");
    }
  }

  async function handleDezintConfirm() {
    setConfirming(true);
    try {
      const res = await api.post("/tower/disintegrator/confirm", {
        targets: selectedForDezint.map(s => ({
          type: s.type === "spell" ? "vault_spell" : "vault_item",
          id: s.id,
        })),
      });
      alert(res.data.message);
      setSelectedForDezint([]);
      setPreviewData(null);
      setDezintMode(false);
      await fetchVault();
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd dezintegracji");
    } finally {
      setConfirming(false);
    }
  }

  function toggleDezint(id: number, name: string, rarity: string, type: string) {
    setSelectedForDezint(prev => {
      const exists = prev.find(s => s.id === id && s.type === type);
      if (exists) return prev.filter(s => !(s.id === id && s.type === type));
      return [...prev, { id, name, rarity, type }];
    });
  }

  function isDezintSelected(id: number, type: string) {
    return selectedForDezint.some(s => s.id === id && s.type === type);
  }

  const bgClass = !vaultData ? "bg-gray-900" :
    vaultData.totalCount > 100 ? "bg-gradient-to-br from-gray-950 via-red-950 to-gray-900" :
    vaultData.totalCount > 50  ? "bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900" :
                                  "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900";

  const allSpells = vaultData?.items.filter((i: any) => i.spell) ?? [];
  const allItems  = vaultData?.items.filter((i: any) => i.item)  ?? [];

  function applyFilters(list: any[], _nameKey: string) {
    return list.filter(entry => {
      const obj = entry.spell ?? entry.item;
      const matchRarity = filterRarity === "all" || obj.rarity === filterRarity;
      const matchSearch = obj.name.toLowerCase().includes(search.toLowerCase());
      return matchRarity && matchSearch;
    });
  }

  const filteredSpells = applyFilters(allSpells, "spell");
  const filteredItems  = applyFilters(allItems,  "item");

  const spellsFull = character ? character.spells?.length >= character.maxSpells : false;
  const itemsFull  = character ? character.items?.length  >= character.maxItems  : false;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className={`${bgClass} rounded-2xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {/* Nagłówek */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold text-white">Komnata Nieładu</h2>
            {vaultData && (
              <p className="text-xs text-gray-400 mt-0.5">
                {vaultData.totalCount} przedmiotów · widoczne: {vaultData.visibleSlots} slotów (poziom {vaultData.vaultLevel})
                {vaultData.hiddenCount > 0 && (
                  <span className="text-yellow-400 ml-1">· {vaultData.hiddenCount} ukrytych — rozbuduj komnatę</span>
                )}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none transition-colors">×</button>
        </div>

        {/* Filtry */}
        <div className="px-6 py-3 border-b border-white/10 flex items-center gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Szukaj po nazwie..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-white/10 text-white text-xs placeholder-gray-500 border border-white/10 rounded-lg px-3 py-1.5 w-44 focus:outline-none focus:border-white/30"
          />
          <div className="flex items-center gap-1">
            {["all", "common", "uncommon", "rare", "unique"].map(r => (
              <button
                key={r}
                onClick={() => setFilterRarity(r)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                  filterRarity === r
                    ? "bg-white text-gray-900 font-medium"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {r === "all" ? "Wszystkie" : RARITY_LABELS[r]}
              </button>
            ))}
          </div>

          {disintegratorAvailable && (
            <button
              onClick={() => { setDezintMode(m => !m); setSelectedForDezint([]); }}
              className={`ml-auto text-xs px-3 py-1.5 rounded-md border transition-colors ${
                dezintMode
                  ? "bg-red-600 text-white border-red-600"
                  : "border-white/20 text-gray-400 hover:text-white hover:border-white/40"
              }`}
            >
              {dezintMode ? "Anuluj dezintegrację" : "Dezintegruj"}
            </button>
          )}
          {dezintMode && selectedForDezint.length > 0 && (
            <button
              onClick={handleDezintPreview}
              className="text-xs px-3 py-1.5 bg-red-700 text-white rounded-md hover:bg-red-800 transition-colors"
            >
              Wrzuć do dezintegratora ({selectedForDezint.length})
            </button>
          )}
        </div>

        {/* Zakładki */}
        <div className="flex border-b border-white/10 px-6">
          <button
            onClick={() => setActiveTab("spells")}
            className={`text-sm py-3 px-4 border-b-2 transition-colors ${
              activeTab === "spells"
                ? "border-white text-white"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            Czary ({allSpells.length})
          </button>
          <button
            onClick={() => setActiveTab("items")}
            className={`text-sm py-3 px-4 border-b-2 transition-colors ${
              activeTab === "items"
                ? "border-white text-white"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            Artefakty ({allItems.length})
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && <p className="text-gray-400 text-sm text-center py-8">Ładowanie...</p>}

          {!loading && activeTab === "spells" && (
            filteredSpells.length === 0
              ? <p className="text-gray-500 text-sm text-center py-8">Brak czarów w komnacie</p>
              : <div className="space-y-2">
                  {filteredSpells.map((entry: any) => {
                    const spell = entry.spell;
                    const isFull = spellsFull;
                    const isSelected = isDezintSelected(entry.id, "spell");
                    return (
                      <div
                        key={entry.id}
                        onClick={() => dezintMode && toggleDezint(entry.id, spell.name, spell.rarity, "spell")}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          dezintMode
                            ? isSelected
                              ? "border-red-500 bg-red-900/30 cursor-pointer"
                              : "border-white/10 bg-white/5 hover:border-white/20 cursor-pointer"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium text-white">{spell.name}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${RARITY_COLORS[spell.rarity]}`}>
                              {RARITY_LABELS[spell.rarity]}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">{spell.element} · {spell.damage} obrażeń</p>
                        </div>
                        {!dezintMode && (
                          <button
                            onClick={() => !isFull && handleMoveSpell(entry.id)}
                            disabled={isFull || moving === entry.id}
                            className={`text-xs px-3 py-1.5 rounded-md border transition-colors shrink-0 ml-3 ${
                              isFull
                                ? "border-red-800 text-red-500 cursor-not-allowed opacity-60"
                                : "border-green-700 text-green-400 hover:bg-green-900/30"
                            }`}
                          >
                            {moving === entry.id ? "..." : isFull ? "Biblioteka pełna" : "Przenieś do biblioteki"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
          )}

          {!loading && activeTab === "items" && (
            filteredItems.length === 0
              ? <p className="text-gray-500 text-sm text-center py-8">Brak artefaktów w komnacie</p>
              : <div className="space-y-2">
                  {filteredItems.map((entry: any) => {
                    const item = entry.item;
                    const isFull = itemsFull;
                    const isSelected = isDezintSelected(entry.id, "item");
                    return (
                      <div
                        key={entry.id}
                        onClick={() => dezintMode && toggleDezint(entry.id, item.name, item.rarity, "item")}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          dezintMode
                            ? isSelected
                              ? "border-red-500 bg-red-900/30 cursor-pointer"
                              : "border-white/10 bg-white/5 hover:border-white/20 cursor-pointer"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium text-white">{item.name}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${RARITY_COLORS[item.rarity]}`}>
                              {RARITY_LABELS[item.rarity]}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">{SLOT_LABELS[item.slot] ?? item.slot}</p>
                        </div>
                        {!dezintMode && (
                          <button
                            onClick={() => !isFull && handleMoveItem(entry.id)}
                            disabled={isFull || moving === entry.id}
                            className={`text-xs px-3 py-1.5 rounded-md border transition-colors shrink-0 ml-3 ${
                              isFull
                                ? "border-red-800 text-red-500 cursor-not-allowed opacity-60"
                                : "border-green-700 text-green-400 hover:bg-green-900/30"
                            }`}
                          >
                            {moving === entry.id ? "..." : isFull ? "Graciarnia pełna" : "Przenieś do graciarni"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
          )}
        </div>
      </div>

      {/* Modal dezintegratora */}
      {previewData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60" onClick={() => setPreviewData(null)}>
          <div className="bg-white rounded-xl border border-gray-200 p-6 w-96 shadow-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-3">Potwierdź dezintegrację</h3>
            <p className="text-xs text-gray-500 mb-3">Czy na pewno chcesz zniszczyć następujące przedmioty?</p>
            <div className="overflow-y-auto flex-1 space-y-1 mb-4">
              {previewData.items.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900">{item.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${RARITY_COLORS[item.rarity]}`}>{RARITY_LABELS[item.rarity]}</span>
                  </div>
                  <span className="text-xs text-gray-500">+{item.value} okruchów</span>
                </div>
              ))}
            </div>
            <div className="p-3 bg-gray-50 rounded-lg mb-4">
              <p className="text-sm font-semibold text-gray-900">Łącznie: +{previewData.totalShards} okruchów mocy</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPreviewData(null)} className="flex-1 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Anuluj</button>
              <button onClick={handleDezintConfirm} disabled={confirming} className="flex-1 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {confirming ? "..." : "Zniszcz"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── LEWA KOLUMNA — statystyki postaci ───────────────

function StatRow({ cost, onRefresh }: { cost: any; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      await upgradeStat(cost.stat);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 w-32">{cost.stat}</span>
        <span className="text-sm font-semibold text-gray-900 w-6 text-center">{cost.currentLevel}</span>
      </div>
      <button
        onClick={handleUpgrade}
        disabled={!cost.canAfford || loading}
        className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "..." : `+1 (${cost.upgradeCost})`}
      </button>
    </div>
  );
}

function LeftPanel({ character, effectiveStats, upgradeCosts }: {
  character: any;
  effectiveStats: any;
  upgradeCosts: any;
}) {
  const stats = effectiveStats?.effective ?? {};
  const base  = effectiveStats?.base ?? {};

  const STAT_LABELS: Record<string, string> = {
    knowledge: "Wiedza", intelligence: "Inteligencja", power: "Moc",
    endurance: "Wytrzymałość", resistance: "Odporność", initiative: "Inicjatywa",
    fireMagic: "Żywioł ognia", earthMagic: "Żywioł ziemi",
    airMagic: "Żywioł powietrza", waterMagic: "Żywioł wody",
    chaosMagic: "Chaos", energyMagic: "Energia", lifeMagic: "Życie", deathMagic: "Śmierć",
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-lg font-bold text-gray-400">
            {character.name[0]}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{character.name}</p>
            <p className="text-xs text-gray-500">Prestiż: {character.prestige}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="p-2.5 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-0.5">Okruchy mocy</p>
            <p className="font-semibold text-sm text-gray-900">{character.powerShards}</p>
          </div>
          <div className="p-2.5 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-0.5">Złoto</p>
            <p className="font-semibold text-sm text-gray-900">{character.gold}</p>
          </div>
        </div>
        <div className="p-3 bg-gray-900 rounded-lg text-white">
          <p className="text-xs text-gray-400 mb-0.5">Punkty umiejętności</p>
          <p className="text-xl font-bold">{upgradeCosts.skillPoints}</p>
        </div>
      </Card>

      <Card>
        <SectionTitle>Statystyki</SectionTitle>
        <div className="space-y-1">
          {Object.entries(STAT_LABELS).map(([key, label]) => {
            const effective = stats[key] ?? 0;
            const baseVal   = base[key] ?? 0;
            const bonus     = effective - baseVal;
            return (
              <div key={key} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-600 w-32">{label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-gray-900">{effective}</span>
                  {bonus > 0 && <span className="text-xs text-green-600 font-medium">(+{bonus})</span>}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-50">
          Wartości w nawiasach to bonusy z ekwipunku
        </p>
      </Card>
    </div>
  );
}

// ── LEWA KOLUMNA EKWIPUNKU ───────────────────────────

function EquipmentLeftPanel({ equipmentData, onRefresh }: {
  equipmentData: any;
  onRefresh: () => void;
}) {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [unequipping, setUnequipping] = useState<string | null>(null);
  const [unequippingSpell, setUnequippingSpell] = useState<number | null>(null);

  async function handleUnequipItem(slot: string) {
    setUnequipping(slot);
    try {
      await api.post("/equipment/item/unequip", { slot });
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd zdejmowania przedmiotu");
    } finally {
      setUnequipping(null);
    }
  }

  async function handleUnequipSpell(slotIndex: number) {
    setUnequippingSpell(slotIndex);
    try {
      await api.post("/equipment/spell/unequip", { slotIndex });
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd zdejmowania czaru");
    } finally {
      setUnequippingSpell(null);
    }
  }

  if (!equipmentData) return null;

  return (
    <>
      {selectedItem && <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />}
      <div className="space-y-4">

        {/* Wizualizacja postaci — teraz po lewej */}
        <Card className="p-3">
          <Placeholder title="Wizualizacja postaci z ekwipunkiem" />
        </Card>

        <Card>
          <SectionTitle>Założony ekwipunek</SectionTitle>
          <div className="space-y-1">
            {Object.entries(SLOT_LABELS).map(([slot, label]) => {
              const item = equipmentData.equipped?.[slot];
              return (
                <div key={slot} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-400 w-20 shrink-0">{label}</span>
                  {item ? (
                    <div className="flex items-center gap-2 justify-end flex-1 min-w-0">
                      <span
                        className="text-sm text-gray-900 truncate cursor-pointer hover:opacity-70 transition-opacity"
                        onClick={() => setSelectedItem(item)}
                      >
                        {item.name}
                      </span>
                      <button
                        onClick={() => handleUnequipItem(slot)}
                        disabled={unequipping === slot}
                        className="text-gray-300 hover:text-red-400 transition-colors shrink-0 text-base leading-none"
                      >
                        {unequipping === slot ? "..." : "×"}
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-300 text-right">— pusty —</span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <SectionTitle>Aktywne czary</SectionTitle>
          <div className="space-y-1">
            {Array.from({ length: 10 }, (_, i) => {
              const slot = equipmentData.spellSlots?.find((s: any) => s.slotIndex === i);
              return slot ? (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-400 shrink-0">Slot {i + 1}</span>
                  <div className="flex items-center gap-2 justify-end flex-1 min-w-0">
                    <span
                      className="text-sm text-gray-900 truncate cursor-pointer hover:opacity-70 transition-opacity"
                      onClick={() => setSelectedItem(slot.spell)}
                    >
                      {slot.spell.name}
                    </span>
                    <button
                      onClick={() => handleUnequipSpell(i)}
                      disabled={unequippingSpell === i}
                      className="text-gray-300 hover:text-red-400 transition-colors shrink-0 text-base leading-none"
                    >
                      {unequippingSpell === i ? "..." : "×"}
                    </button>
                  </div>
                </div>
              ) : null;
            }).filter(Boolean)}
            {!equipmentData.spellSlots?.length && (
              <p className="text-xs text-gray-300 py-1">Brak aktywnych czarów</p>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

// ── PRAWA KOLUMNA — graciarnia, biblioteka, komnata ──

function EquipmentView({ onRefresh, onDataLoaded, character }: {
  onRefresh: () => void;
  onDataLoaded: (data: any) => void;
  character: any;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [equipping, setEquipping] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<{ type: string; id: number; name: string; rarity: string }[]>([]);
  const [disintegratorAvailable, setDisintegratorAvailable] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [confirming, setConfirming] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const [, setSendingToVault] = useState<number | null>(null);
  const [vaultMode, setVaultMode] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [eqRes, towerRes] = await Promise.all([
        api.get("/equipment"),
        api.get("/tower"),
      ]);
      const di = towerRes.data.buildings.disintegrator;
      setDisintegratorAvailable(di?.level > 0);
      setData(eqRes.data);
      onDataLoaded(eqRes.data);
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd ładowania ekwipunku");
    } finally {
      setLoading(false);
    }
  }, [onDataLoaded]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function getUnmetRequirements(item: any): string[] {
    if (!character) return [];
    const unmet: string[] = [];
    if (item.reqKnowledge    > 0 && character.knowledge    < item.reqKnowledge)    unmet.push(`Wiedza ${item.reqKnowledge}`);
    if (item.reqIntelligence > 0 && character.intelligence < item.reqIntelligence) unmet.push(`Inteligencja ${item.reqIntelligence}`);
    if (item.reqPower        > 0 && character.power        < item.reqPower)        unmet.push(`Moc ${item.reqPower}`);
    if (item.reqEndurance    > 0 && character.endurance    < item.reqEndurance)    unmet.push(`Wytrzymałość ${item.reqEndurance}`);
    if (item.reqResistance   > 0 && character.resistance   < item.reqResistance)   unmet.push(`Odporność ${item.reqResistance}`);
    if (item.reqInitiative   > 0 && character.initiative   < item.reqInitiative)   unmet.push(`Inicjatywa ${item.reqInitiative}`);
    if (item.reqFireMagic    > 0 && character.fireMagic    < item.reqFireMagic)    unmet.push(`Ogień ${item.reqFireMagic}`);
    if (item.reqWaterMagic   > 0 && character.waterMagic   < item.reqWaterMagic)   unmet.push(`Woda ${item.reqWaterMagic}`);
    if (item.reqEarthMagic   > 0 && character.earthMagic   < item.reqEarthMagic)   unmet.push(`Ziemia ${item.reqEarthMagic}`);
    if (item.reqAirMagic     > 0 && character.airMagic     < item.reqAirMagic)     unmet.push(`Powietrze ${item.reqAirMagic}`);
    if (item.reqLifeMagic    > 0 && character.lifeMagic    < item.reqLifeMagic)    unmet.push(`Życie ${item.reqLifeMagic}`);
    if (item.reqDeathMagic   > 0 && character.deathMagic   < item.reqDeathMagic)   unmet.push(`Śmierć ${item.reqDeathMagic}`);
    if (item.reqEnergyMagic  > 0 && character.energyMagic  < item.reqEnergyMagic)  unmet.push(`Energia ${item.reqEnergyMagic}`);
    if (item.reqChaosMagic   > 0 && character.chaosMagic   < item.reqChaosMagic)   unmet.push(`Chaos ${item.reqChaosMagic}`);
    return unmet;
  }

  async function handleEquipItem(itemId: number, item: any) {
    const unmet = getUnmetRequirements(item);
    if (unmet.length > 0) {
      alert(`Nie spełniasz wymagań!\n\nBrakuje Ci:\n${unmet.map(r => `• ${r}`).join("\n")}`);
      return;
    }
    setEquipping(itemId);
    try {
      await api.post("/equipment/item/equip", { itemId });
      await fetchData();
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd zakładania przedmiotu");
    } finally {
      setEquipping(null);
    }
  }

  async function handleEquipSpell(spellId: number, slotIndex: number, spell: any) {
    const unmet = getUnmetRequirements(spell);
    if (unmet.length > 0) {
      alert(`Nie spełniasz wymagań!\n\nBrakuje Ci:\n${unmet.map(r => `• ${r}`).join("\n")}`);
      return;
    }
    try {
      await api.post("/equipment/spell/equip", { spellId, slotIndex });
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd zakładania czaru");
    }
  }

  async function handleSendToVault(type: "item" | "spell", sourceId: number) {
    setSendingToVault(sourceId);
    try {
      await api.post("/tower/chaos-vault/add", { type, sourceId });
      await fetchData();
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd przenoszenia do Komnaty");
    } finally {
      setSendingToVault(null);
    }
  }

  function toggleSelect(type: string, id: number, name: string, rarity: string) {
    setSelected(prev => {
      const exists = prev.find(s => s.type === type && s.id === id);
      if (exists) return prev.filter(s => !(s.type === type && s.id === id));
      return [...prev, { type, id, name, rarity }];
    });
  }

  function isSelected(type: string, id: number) {
    return selected.some(s => s.type === type && s.id === id);
  }

  async function handlePreview() {
    if (selected.length === 0) return;
    try {
      const res = await api.post("/tower/disintegrator/preview", {
        targets: selected.map(s => ({ type: s.type, id: s.id })),
      });
      setPreviewData(res.data);
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd");
    }
  }

  async function handleConfirm() {
    setConfirming(true);
    try {
      const res = await api.post("/tower/disintegrator/confirm", {
        targets: selected.map(s => ({ type: s.type, id: s.id })),
      });
      alert(res.data.message);
      setSelected([]);
      setPreviewData(null);
      setSelectMode(false);
      await fetchData();
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Błąd");
    } finally {
      setConfirming(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-400">Ładowanie...</p>;
  if (!data) return null;

  const equippedSpellIds = new Set(data.spellSlots.map((s: any) => s.spellId));
  const equippedItemIds  = new Set(Object.values(data.equipped).filter(Boolean).map((i: any) => i.id));
  const inventoryItems   = data.inventory.filter((item: any) => !equippedItemIds.has(item.id));
  const inventorySpells  = data.knownSpells.filter((spell: any) => !equippedSpellIds.has(spell.id));

  // Dla każdego przedmiotu w inventory potrzebujemy characterItemId do "wrzuć do komnaty"
  // getEquipment zwraca items jako Item[], ale potrzebujemy CharacterItem.id
  // Zakładamy że endpoint /equipment zwraca inventory z polem characterItemId lub id z CharacterItem
  // Jeśli nie — trzeba to dodać do equipment.service.ts (patrz uwaga poniżej)

  return (
    <>
      {selectedItem && <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />}

      {showVault && (
        <ChaosVaultModal
          onClose={() => setShowVault(false)}
          character={character}
          onRefresh={() => { fetchData(); onRefresh(); }}
          disintegratorAvailable={disintegratorAvailable}
        />
      )}

      {/* Modal dezintegratora */}
      {previewData && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-gray-200 p-6 w-96 shadow-lg max-h-[80vh] flex flex-col">
            <h3 className="font-semibold text-gray-900 mb-3">Potwierdź dezintegrację</h3>
            <p className="text-xs text-gray-500 mb-3">Czy na pewno chcesz zniszczyć następujące przedmioty?</p>
            <div className="overflow-y-auto flex-1 space-y-1 mb-4">
              {previewData.items.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900">{item.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${RARITY_COLORS[item.rarity]}`}>{RARITY_LABELS[item.rarity]}</span>
                  </div>
                  <span className="text-xs text-gray-500">+{item.value} okruchów</span>
                </div>
              ))}
            </div>
            <div className="p-3 bg-gray-50 rounded-lg mb-4">
              <p className="text-sm font-semibold text-gray-900">Łącznie: +{previewData.totalShards} okruchów mocy</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPreviewData(null)} className="flex-1 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Anuluj</button>
              <button onClick={handleConfirm} disabled={confirming} className="flex-1 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {confirming ? "..." : "Zniszcz"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pasek trybu selekcji — dezintegrator */}
      {disintegratorAvailable && (
        <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setSelectMode(m => !m); setVaultMode(false); setSelected([]); }}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                selectMode ? "bg-gray-900 text-white border-gray-900" : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {selectMode ? "Anuluj dezintegrację" : "Wybierz do dezintegracji"}
            </button>
            <button
              onClick={() => { setVaultMode(m => !m); setSelectMode(false); setSelected([]); }}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                vaultMode ? "bg-purple-900 text-white border-purple-900" : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {vaultMode ? "Anuluj" : "Wrzuć do Komnaty"}
            </button>
            {(selectMode || vaultMode) && selected.length > 0 && (
              <span className="text-xs text-gray-500">Wybrano: {selected.length}</span>
            )}
          </div>
          <div className="flex gap-2">
            {selectMode && selected.length > 0 && (
              <button onClick={handlePreview} className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                Dezintegruj ({selected.length})
              </button>
            )}
            {vaultMode && selected.length > 0 && (
              <button
                onClick={async () => {
                  for (const s of selected) {
                    await handleSendToVault(s.type as "item" | "spell", s.id);
                  }
                  setSelected([]);
                  setVaultMode(false);
                }}
                className="text-xs px-3 py-1.5 bg-purple-700 text-white rounded-md hover:bg-purple-800 transition-colors"
              >
                Przenieś do Komnaty ({selected.length})
              </button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Graciarnia */}
        <Card>
          <SectionTitle>Graciarnia ({inventoryItems.length} / {character?.maxItems ?? "?"})</SectionTitle>
          {inventoryItems.length === 0 ? (
            <p className="text-sm text-gray-300 text-center py-3">Brak przedmiotów w graciarni</p>
          ) : (
            <div className="space-y-2">
              {inventoryItems.map((item: any) => {
                const unmet    = getUnmetRequirements(item);
                const canEquip = unmet.length === 0;
                const activeMode = selectMode ? "dezint" : vaultMode ? "vault" : null;
                const selType = "item";
                // UWAGA: item.characterItemId musi być zwracany przez /equipment endpoint
                // Dodaj to pole do getEquipment w equipment.service.ts (patrz komentarz na końcu)
                const selId = item.characterItemId ?? item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => activeMode && toggleSelect(selType, selId, item.name, item.rarity)}
                    className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                      activeMode
                        ? isSelected(selType, selId)
                          ? activeMode === "dezint" ? "border-red-300 bg-red-50 cursor-pointer" : "border-purple-300 bg-purple-50 cursor-pointer"
                          : "border-gray-100 hover:border-gray-300 cursor-pointer"
                        : "border-gray-100"
                    }`}
                  >
                    <div className="cursor-pointer hover:opacity-70 transition-opacity" onClick={() => !activeMode && setSelectedItem(item)}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-gray-900">{item.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${RARITY_COLORS[item.rarity]}`}>
                          {RARITY_LABELS[item.rarity]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{SLOT_LABELS[item.slot] ?? item.slot}</p>
                    </div>
                    {!activeMode && (
                      <button
                        onClick={() => handleEquipItem(item.id, item)}
                        disabled={equipping === item.id}
                        className={`text-xs px-3 py-1.5 rounded-md border transition-colors shrink-0 ml-3 ${
                          !canEquip ? "border-red-100 text-red-400 hover:bg-red-50" : "border-gray-300 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {equipping === item.id ? "..." : canEquip ? "Załóż" : "Wymagania ✕"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Biblioteka czarów */}
        <Card>
          <SectionTitle>Biblioteka czarów ({inventorySpells.length} / {character?.maxSpells ?? "?"})</SectionTitle>
          {inventorySpells.length === 0 ? (
            <p className="text-sm text-gray-300 text-center py-3">
              {data.knownSpells.length === 0 ? "Nie znasz jeszcze żadnych czarów" : "Wszystkie czary są w slotach"}
            </p>
          ) : (
            <div className="space-y-2">
              {inventorySpells.map((spell: any) => {
                const unmet    = getUnmetRequirements(spell);
                const canEquip = unmet.length === 0;
                const freeSlot = Array.from({ length: 10 }, (_, i) => i)
                  .find(i => !data.spellSlots.find((s: any) => s.slotIndex === i));
                const activeMode = selectMode ? "dezint" : vaultMode ? "vault" : null;
                const selType = "spell";
                // UWAGA: spell.characterSpellId musi być zwracany przez /equipment endpoint
                const selId = spell.characterSpellId ?? spell.id;
                return (
                  <div
                    key={spell.id}
                    onClick={() => activeMode && toggleSelect(selType, selId, spell.name, spell.rarity)}
                    className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                      activeMode
                        ? isSelected(selType, selId)
                          ? activeMode === "dezint" ? "border-red-300 bg-red-50 cursor-pointer" : "border-purple-300 bg-purple-50 cursor-pointer"
                          : "border-gray-100 hover:border-gray-300 cursor-pointer"
                        : "border-gray-100"
                    }`}
                  >
                    <div className="cursor-pointer hover:opacity-70 transition-opacity" onClick={() => !activeMode && setSelectedItem(spell)}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-gray-900">{spell.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${RARITY_COLORS[spell.rarity]}`}>
                          {RARITY_LABELS[spell.rarity]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{spell.element} · {spell.damage} obrażeń</p>
                    </div>
                    {!activeMode && (
                      <button
                        onClick={() => canEquip && freeSlot !== undefined && handleEquipSpell(spell.id, freeSlot, spell)}
                        disabled={freeSlot === undefined}
                        className={`text-xs px-3 py-1.5 rounded-md border transition-colors shrink-0 ml-3 ${
                          freeSlot === undefined ? "border-gray-100 text-gray-300 cursor-default"
                          : !canEquip ? "border-red-100 text-red-400 hover:bg-red-50"
                          : "border-gray-300 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {freeSlot === undefined ? "Brak slotów" : canEquip ? "Dodaj do slotu" : "Wymagania ✕"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Przycisk Komnaty Nieładu */}
        <button
          onClick={() => setShowVault(true)}
          className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all text-sm font-medium"
        >
          ✦ Otwórz Komnatę Nieładu
        </button>
      </div>
    </>
  );
}

// ── TRENING ──────────────────────────────────────────

function TrainingView({ upgradeCosts, onRefresh }: { upgradeCosts: any; onRefresh: () => void }) {
  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Trening statystyk</SectionTitle>
        <p className="text-xs text-gray-500 mb-3">
          Wydaj punkty umiejętności na rozwinięcie statystyk bazowych.
        </p>
        <div className="mb-4 p-3 bg-gray-900 rounded-lg text-white flex justify-between items-center">
          <p className="text-xs text-gray-400">Dostępne punkty umiejętności</p>
          <p className="text-xl font-bold">{upgradeCosts.skillPoints}</p>
        </div>
        <div>
          {upgradeCosts.costs.map((cost: any) => (
            <StatRow key={cost.stat} cost={cost} onRefresh={onRefresh} />
          ))}
        </div>
      </Card>
      <Placeholder title="Wizualizacja postaci w trakcie treningu" />
    </div>
  );
}

// ── GŁÓWNY KOMPONENT ─────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const [page, setPage]             = useState<Page>("overview");
  const [character, setCharacter]   = useState<any>(null);
  const [upgradeCosts, setUpgradeCosts] = useState<any>(null);
  const [actions, setActions]       = useState<any>(null);
  const [effectiveStats, setEffectiveStats] = useState<any>(null);
  const [equipmentData, setEquipmentData]   = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [equipmentRefreshKey, setEquipmentRefreshKey] = useState(0);

  const fetchAll = useCallback(async () => {
    try {
      const [char, costs, acts, effStats] = await Promise.all([
        getMyCharacter(),
        getUpgradeCosts(),
        api.get("/actions").then(r => r.data),
        api.get("/character/effective-stats").then(r => r.data),
      ]);
      setCharacter(char);
      setUpgradeCosts(costs);
      setActions(acts);
      setEffectiveStats(effStats);
    } catch {
      // interceptor przekieruje przy 401
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Ładowanie...</p>
      </div>
    );
  }

  const leftPanel = character && upgradeCosts && effectiveStats ? (
    <LeftPanel character={character} effectiveStats={effectiveStats} upgradeCosts={upgradeCosts} />
  ) : null;

  function renderContent() {
    switch (page) {
      case "overview":
        return (
          <PageLayout
            left={leftPanel}
            right={<Placeholder title="Grafika / wizualizacja postaci" />}
          />
        );

      case "equipment":
        return (
          <PageLayout
            left={
              <EquipmentLeftPanel
                equipmentData={equipmentData}
                onRefresh={() => { setEquipmentRefreshKey(k => k + 1); fetchAll(); }}
              />
            }
            right={
              <EquipmentView
                key={equipmentRefreshKey}
                onRefresh={fetchAll}
                onDataLoaded={setEquipmentData}
                character={character}
              />
            }
          />
        );

      case "tower":
        return <TowerView onResourcesUpdated={fetchAll} />;

      case "training":
        return (
          <PageLayout
            left={leftPanel}
            right={upgradeCosts ? <TrainingView upgradeCosts={upgradeCosts} onRefresh={fetchAll} /> : null}
          />
        );

      case "combat":
        return <CombatPanel onRefresh={fetchAll} />;

      case "study":
        return (
          <PageLayout
            left={
              actions ? (
                <StudyPanel
                  studyActions={actions.studyActionsAvailable}
                  studyActionsMax={30}
                  activeActions={actions.activeActions}
                  onRefresh={fetchAll}
                />
              ) : null
            }
            right={<Placeholder title="Animacja studiowania" />}
          />
        );

      case "exploration":
        return <ExplorationPanel onRefresh={fetchAll} />;

      case "guild":
        return (
          <PageLayout
            left={<Placeholder title="Menu gildii" />}
            right={<Placeholder title="Widok gildii" />}
          />
        );

      case "settings":
        return (
          <PageLayout
            left={<Placeholder title="Opcje ustawień" />}
            right={<Placeholder title="Podgląd layoutu" />}
          />
        );
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <span className="font-bold text-gray-900">Wieża Magów</span>
            <nav className="flex items-center gap-1">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => setPage(item.id)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    page === item.id ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage("settings")} className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                Ustawienia
              </button>
              <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                Wyloguj
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-6">
        {renderContent()}
      </main>
    </div>
  );
}