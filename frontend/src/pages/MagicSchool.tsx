import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useCharacter } from "../contexts/CharacterContext";

// ── PALETA ────────────────────────────────────────────────────────────────────

const C = {
  panel:      "#372b5d",
  panelAlt:   "rgba(0,0,0,0.18)",
  border:     "rgba(245,196,81,0.12)",
  borderSoft: "rgba(247,240,221,0.08)",
  gold:       "#F5C451",
  teal:       "#59D4D0",
  red:        "#F46A4E",
  purple:     "#B681E0",
  text:       "#F7F0DD",
  textDim:    "rgba(247,240,221,0.55)",
  textFaint:  "rgba(247,240,221,0.35)",
  textGhost:  "rgba(247,240,221,0.2)",
};

const RARITY_COLORS: Record<string, string> = {
  common:   "#aaa",
  uncommon: "#59D4D0",
  rare:     "#B681E0",
  unique:   "#F5C451",
};

const ELEMENT_ICONS: Record<string, string> = {
  fire: "🔥", water: "💧", earth: "🌿", air: "💨",
  chaos: "🌀", life: "✨", death: "💀", harmony: "☯", none: "◈",
};

const BUILDING_INFO: Record<string, { name: string; icon: string; desc: string }> = {
  main_hall:    { name: "Sala Główna",          icon: "🏛",  desc: "Zwiększa limit członków szkoły (+5 osób za poziom)" },
  astro_tower:  { name: "Wieża Astronomiczna",  icon: "🔭",  desc: "Odblokowuje wyższe poziomy eksploracji dla wszystkich" },
  library:      { name: "Szkolna Biblioteka",   icon: "📚",  desc: "Umożliwia wymianę odkrytych czarów między członkami" },
  rift_chamber: { name: "Komnata Szczelin",     icon: "🌀",  desc: "Odblokowuje dostęp do Szczelin" },
  canteen:      { name: "Stołówka",             icon: "🍲",  desc: "Zapewnia bonusy dla wszystkich członków szkoły" },
};

const BONUS_LABELS: Record<string, string> = {
  stats:        "Bonus do statystyk",
  item_find:    "Szansa na przedmiot",
  spell_find:   "Szansa na odkrycie czaru",
  hp:           "Bonus do punktów życia",
  rift:         "Szansa na unikalną szczelinę",
  dodge:        "Szansa na unik w walce",
  spell_slot:   "Dodatkowy slot czaru bojowego",
  utility_slot: "Dodatkowy slot czaru użytkowego",
};

const MAX_LEVELS: Record<string, number> = {
  main_hall: 5, astro_tower: 3, library: 10, rift_chamber: 3, canteen: 6,
};

function getMaxActiveBonuses(canteenLevel: number): number {
  if (canteenLevel <= 2) return 1;
  if (canteenLevel <= 4) return 2;
  return 3;
}

// ── KOMPONENTY POMOCNICZE ─────────────────────────────────────────────────────

function Panel({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.panel, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, ...style }}>
      {children}
    </div>
  );
}

function SectionTitle({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{ fontFamily: "Cinzel, serif", fontSize: 12, color: C.gold, letterSpacing: "0.1em", marginBottom: 14, marginTop: 0, ...style }}>
      {children}
    </p>
  );
}

function Badge({ label, color = C.teal }: { label: string; color?: string }) {
  return (
    <span style={{
      fontSize: 10, fontFamily: "Cinzel, serif", fontWeight: 600,
      padding: "2px 9px", borderRadius: 20,
      border: `1px solid ${color}`, color,
      letterSpacing: "0.04em", display: "inline-block",
    }}>
      {label}
    </span>
  );
}

function ActionBtn({
  onClick, disabled = false, children, color = C.teal, style = {}, title,
}: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode;
  color?: string; style?: React.CSSProperties; title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: "7px 16px", borderRadius: 8, border: `1px solid ${color}`,
        background: "transparent", color, fontFamily: "Cinzel, serif",
        fontSize: 11, fontWeight: 600, letterSpacing: "0.05em",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1, transition: "all 0.15s",
        whiteSpace: "nowrap", ...style,
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = `${color}22`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{ padding: "9px 14px", borderRadius: 8, marginTop: 8, background: "rgba(244,106,78,0.08)", border: "1px solid rgba(244,106,78,0.25)" }}>
      <p style={{ fontSize: 12, color: C.red, margin: 0 }}>{message}</p>
    </div>
  );
}

function SuccessBox({ message }: { message: string }) {
  return (
    <div style={{ padding: "9px 14px", borderRadius: 8, marginTop: 8, background: "rgba(89,212,208,0.08)", border: "1px solid rgba(89,212,208,0.25)" }}>
      <p style={{ fontSize: 12, color: C.teal, margin: 0 }}>{message}</p>
    </div>
  );
}

function ConfirmModal({
  message, onConfirm, onCancel, confirmLabel = "Potwierdź", confirmColor = C.red,
}: {
  message: string; onConfirm: () => void; onCancel: () => void;
  confirmLabel?: string; confirmColor?: string;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
      <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: "24px 28px", maxWidth: 380, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <p style={{ fontFamily: "Cinzel, serif", fontSize: 13, color: C.gold, marginBottom: 12 }}>Potwierdzenie</p>
        <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6, marginBottom: 20 }}>{message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <ActionBtn onClick={onCancel} color={C.textFaint}>Anuluj</ActionBtn>
          <ActionBtn onClick={onConfirm} color={confirmColor}>{confirmLabel}</ActionBtn>
        </div>
      </div>
    </div>
  );
}

// ── MODAL — PODGLĄD SZKOŁY ────────────────────────────────────────────────────

function SchoolPreviewModal({ school, onClose, mySchoolId }: {
  school: any;
  onClose: () => void;
  mySchoolId: number | null;
}) {
  const memberCount = (school.members?.length ?? 0) + 1;
  const mainHall    = school.buildings?.find((b: any) => b.buildingType === "main_hall");
  const maxMembers  = 5 + (mainHall?.level ?? 0) * 5;
  const isFull      = memberCount >= maxMembers;
  const isMine      = mySchoolId === school.id;
  const inAnySchool = mySchoolId !== null;

  const [joinStatus, setJoinStatus] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMsg, setActionMsg]   = useState<string | null>(null);

  useEffect(() => {
    if (inAnySchool) return;
    api.get(`/schools/${school.id}/my-join-request`)
      .then(r => setJoinStatus(r.data?.status ?? null))
      .catch(() => setJoinStatus(null));
  }, [school.id, inAnySchool]);

  async function handleRequestJoin() {
    setActionBusy(true); setActionMsg(null);
    try {
      await api.post(`/schools/${school.id}/join-request`);
      setJoinStatus("pending");
      setActionMsg("Prośba o dołączenie została wysłana!");
    } catch (e: any) {
      setActionMsg(e.response?.data?.error ?? "Błąd wysyłania prośby.");
    } finally { setActionBusy(false); }
  }

  async function handleAcceptInvite() {
    setActionBusy(true); setActionMsg(null);
    try {
      await api.post(`/schools/${school.id}/accept-invite`);
      setActionMsg("Dołączyłeś do szkoły!");
      setTimeout(onClose, 1200);
    } catch (e: any) {
      setActionMsg(e.response?.data?.error ?? "Błąd dołączania.");
    } finally { setActionBusy(false); }
  }

  async function handleRejectInvite() {
    setActionBusy(true); setActionMsg(null);
    try {
      await api.post(`/schools/${school.id}/reject-invite`);
      setJoinStatus("rejected");
      setActionMsg("Zaproszenie odrzucone.");
    } catch (e: any) {
      setActionMsg(e.response?.data?.error ?? "Błąd.");
    } finally { setActionBusy(false); }
  }

  function renderJoinArea() {
    if (isMine || inAnySchool) return null;

    if (joinStatus === "invited") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          <p style={{ fontSize: 12, color: C.gold, margin: 0 }}>Masz zaproszenie do tej szkoły!</p>
          <div style={{ display: "flex", gap: 8 }}>
            <ActionBtn onClick={handleRejectInvite} disabled={actionBusy} color={C.red}>Odrzuć zaproszenie</ActionBtn>
            <ActionBtn onClick={handleAcceptInvite} disabled={actionBusy || isFull} color={C.teal}>
              {actionBusy ? "..." : "Dołącz do szkoły"}
            </ActionBtn>
          </div>
        </div>
      );
    }

    if (joinStatus === "pending") {
      return <p style={{ fontSize: 12, color: C.textFaint, margin: 0, textAlign: "right" }}>⏳ Twoja prośba oczekuje na rozpatrzenie</p>;
    }

    return (
      <ActionBtn onClick={handleRequestJoin} disabled={isFull || actionBusy} color={isFull ? C.textGhost : C.teal}>
        {actionBusy ? "Wysyłanie..." : isFull ? "Szkoła pełna" : "Wyślij prośbę o przyjęcie"}
      </ActionBtn>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: "28px 32px", maxWidth: 480, width: "90%", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              {school.emblem && <span style={{ fontSize: 28 }}>{school.emblem}</span>}
              <h2 style={{ fontFamily: "Cinzel, serif", fontSize: 18, color: C.gold, margin: 0 }}>{school.name}</h2>
              {school.abbreviation && (
                <span style={{ fontSize: 11, fontFamily: "Cinzel, serif", color: C.textFaint, background: "rgba(0,0,0,0.2)", padding: "2px 8px", borderRadius: 6, border: `1px solid ${C.borderSoft}` }}>
                  [{school.abbreviation}]
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge label={`Dyrektor: ${school.director?.name ?? "—"}`} color={C.gold} />
              <Badge label={`Poz. dyrektora: ${school.director?.level ?? "?"}`} color={C.textFaint} />
              <Badge label={`${memberCount}/${maxMembers} członków`} color={isFull ? C.red : C.teal} />
              {isMine && <Badge label="Twoja szkoła" color={C.purple} />}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textGhost, fontSize: 18, cursor: "pointer", padding: "0 4px" }}>✕</button>
        </div>

        {school.description ? (
          <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.7, margin: "0 0 20px" }}>{school.description}</p>
        ) : (
          <p style={{ fontSize: 12, color: C.textGhost, fontStyle: "italic", margin: "0 0 20px" }}>Brak opisu.</p>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 20 }}>
          {Object.entries(BUILDING_INFO).map(([type, info]) => {
            const b     = school.buildings?.find((bd: any) => bd.buildingType === type);
            const level = b?.level ?? 0;
            return (
              <div key={type} style={{ textAlign: "center", opacity: level === 0 ? 0.35 : 1 }}>
                <div style={{ fontSize: 18, marginBottom: 2 }}>{info.icon}</div>
                <p style={{ fontSize: 9, color: C.textGhost, margin: "0 0 1px", fontFamily: "Cinzel, serif" }}>
                  {info.name.split(" ")[0]}
                </p>
                <p style={{ fontSize: 11, color: level > 0 ? C.text : C.textGhost, fontWeight: 600, margin: 0 }}>
                  {level === 0 ? "—" : `Poz. ${level}`}
                </p>
              </div>
            );
          })}
        </div>

        {actionMsg && (
          <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(89,212,208,0.08)", border: "1px solid rgba(89,212,208,0.2)" }}>
            <p style={{ fontSize: 12, color: C.teal, margin: 0 }}>{actionMsg}</p>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <ActionBtn onClick={onClose} color={C.textFaint}>Zamknij</ActionBtn>
          {renderJoinArea()}
        </div>
      </div>
    </div>
  );
}

// ── ZAKŁADKI ─────────────────────────────────────────────────────────────────

type Tab = "overview" | "members" | "buildings" | "library" | "bonuses" | "allschools";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview",   label: "Przegląd" },
  { key: "members",    label: "Członkowie" },
  { key: "buildings",  label: "Budynki" },
  { key: "library",    label: "Biblioteka Czarów" },
  { key: "bonuses",    label: "Bonusy Stołówki" },
  { key: "allschools", label: "Wszystkie Szkoły" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// WIDOK — BRAK SZKOŁY
// ═══════════════════════════════════════════════════════════════════════════════

function NoSchoolView({ towerLevel, onCreated }: {
  towerLevel: number; onCreated: () => void;
}) {
  const [name, setName]                 = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [description, setDescription]   = useState("");
  const [creating, setCreating]         = useState(false);
  const [createError, setCreateError]   = useState<string | null>(null);
  const [searchQuery, setSearchQuery]   = useState("");
  const [schools, setSchools]           = useState<any[]>([]);
  const [previewSchool, setPreviewSchool] = useState<any | null>(null);

  const canCreate = towerLevel >= 10;

  const fetchSchools = useCallback(async (q?: string) => {
    try {
      const res = await api.get("/schools", { params: q ? { search: q } : {} });
      setSchools(res.data);
    } catch {}
  }, []);

  useEffect(() => { fetchSchools(); }, [fetchSchools]);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true); setCreateError(null);
    try {
      await api.post("/schools", { name: name.trim(), abbreviation: abbreviation.trim(), description: description.trim() });
      onCreated();
    } catch (e: any) {
      setCreateError(e.response?.data?.error ?? "Błąd tworzenia szkoły.");
    } finally { setCreating(false); }
  }

  async function openPreview(schoolId: number) {
    try {
      const res = await api.get(`/schools/${schoolId}`);
      setPreviewSchool(res.data);
    } catch {}
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {previewSchool && (
        <SchoolPreviewModal
          school={previewSchool}
          onClose={() => setPreviewSchool(null)}
          mySchoolId={null}
        />
      )}

      <div>
        <h1 style={{ fontFamily: "Cinzel, serif", color: C.gold, fontSize: 22, letterSpacing: "0.06em", margin: "0 0 6px" }}>
          Szkoła Magii
        </h1>
        <p style={{ fontSize: 13, color: C.textFaint, margin: 0 }}>
          Nie należysz jeszcze do żadnej szkoły magii. Możesz założyć własną lub dołączyć do istniejącej.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Panel>
          <SectionTitle>ZAŁÓŻ SZKOŁĘ</SectionTitle>
          {!canCreate && (
            <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 14, background: "rgba(244,106,78,0.08)", border: "1px solid rgba(244,106,78,0.2)" }}>
              <p style={{ fontSize: 12, color: C.red, margin: 0 }}>🔒 Wymagany poziom 10 Wieży (masz poziom {towerLevel})</p>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input type="text" placeholder="Nazwa szkoły (3–20 znaków)" value={name} onChange={e => setName(e.target.value)} disabled={!canCreate} maxLength={20}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, boxSizing: "border-box", background: "rgba(0,0,0,0.2)", border: `1px solid ${C.borderSoft}`, color: C.text, fontSize: 13, fontFamily: "Inter, sans-serif", opacity: canCreate ? 1 : 0.4 }} />
            <input type="text" placeholder="Skrót szkoły (2–5 znaków, np. WM)" value={abbreviation} onChange={e => setAbbreviation(e.target.value.toUpperCase())} disabled={!canCreate} maxLength={5}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, boxSizing: "border-box", background: "rgba(0,0,0,0.2)", border: `1px solid ${C.borderSoft}`, color: C.gold, fontSize: 13, fontFamily: "Cinzel, serif", letterSpacing: "0.1em", opacity: canCreate ? 1 : 0.4 }} />
            <textarea placeholder="Opis szkoły (opcjonalnie, max 300 znaków)" value={description} onChange={e => setDescription(e.target.value)} disabled={!canCreate} maxLength={300} rows={3}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, boxSizing: "border-box", background: "rgba(0,0,0,0.2)", border: `1px solid ${C.borderSoft}`, color: C.text, fontSize: 13, fontFamily: "Inter, sans-serif", resize: "vertical", opacity: canCreate ? 1 : 0.4 }} />
            {createError && <ErrorBox message={createError} />}
            <ActionBtn onClick={handleCreate} disabled={!canCreate || name.trim().length < 3 || abbreviation.trim().length < 2 || creating} color={C.gold}>
              {creating ? "Tworzenie..." : "✦ Załóż Szkołę"}
            </ActionBtn>
          </div>
        </Panel>

        <Panel>
          <SectionTitle>ISTNIEJĄCE SZKOŁY</SectionTitle>
          <div style={{ marginBottom: 12 }}>
            <input type="text" placeholder="Szukaj po nazwie..." value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); fetchSchools(e.target.value); }}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, boxSizing: "border-box", background: "rgba(0,0,0,0.2)", border: `1px solid ${C.borderSoft}`, color: C.text, fontSize: 12, fontFamily: "Inter, sans-serif" }} />
          </div>
          {schools.length === 0 ? (
            <p style={{ fontSize: 12, color: C.textGhost, fontStyle: "italic", marginTop: 8 }}>Brak szkół. Bądź pierwszy!</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {schools.slice(0, 8).map((s: any) => {
                const memberCount = (s.members?.length ?? 0) + 1;
                const mainHall    = s.buildings?.find((b: any) => b.buildingType === "main_hall");
                const maxMembers  = 5 + (mainHall?.level ?? 0) * 5;
                const isFull      = memberCount >= maxMembers;
                return (
                  <div key={s.id} style={{ padding: "10px 12px", borderRadius: 8, background: C.panelAlt, border: `1px solid ${C.borderSoft}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ cursor: "pointer" }} onClick={() => openPreview(s.id)}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>
                        {s.name}
                        {s.abbreviation && <span style={{ fontSize: 10, color: C.textGhost, marginLeft: 6 }}>[{s.abbreviation}]</span>}
                      </p>
                      <p style={{ fontSize: 11, color: C.textFaint, margin: "3px 0 0" }}>
                        Dyrektor: {s.director?.name} · poz. {s.director?.level} ·{" "}
                        <span style={{ color: isFull ? C.red : C.textFaint }}>{memberCount}/{maxMembers}</span>
                      </p>
                    </div>
                    <ActionBtn onClick={() => openPreview(s.id)} color={C.teal} style={{ fontSize: 10 }}>Info</ActionBtn>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZAKŁADKA — WSZYSTKIE SZKOŁY
// ═══════════════════════════════════════════════════════════════════════════════

function AllSchoolsTab({ mySchoolId }: { mySchoolId: number }) {
  const [schools, setSchools]             = useState<any[]>([]);
  const [searchQuery, setSearchQuery]     = useState("");
  const [previewSchool, setPreviewSchool] = useState<any | null>(null);
  const [loading, setLoading]             = useState(true);

  const fetchSchools = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const res = await api.get("/schools", { params: q ? { search: q } : {} });
      setSchools(res.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSchools(); }, [fetchSchools]);

  async function openPreview(schoolId: number) {
    try {
      const res = await api.get(`/schools/${schoolId}`);
      setPreviewSchool(res.data);
    } catch {}
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {previewSchool && (
        <SchoolPreviewModal
          school={previewSchool}
          onClose={() => setPreviewSchool(null)}
          mySchoolId={mySchoolId}
        />
      )}

      <Panel>
        <SectionTitle>WSZYSTKIE SZKOŁY MAGII</SectionTitle>
        <div style={{ marginBottom: 16 }}>
          <input type="text" placeholder="Szukaj po nazwie..." value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); fetchSchools(e.target.value); }}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, boxSizing: "border-box", background: "rgba(0,0,0,0.2)", border: `1px solid ${C.borderSoft}`, color: C.text, fontSize: 12, fontFamily: "Inter, sans-serif" }} />
        </div>

        {loading ? (
          <p style={{ fontSize: 12, color: C.textGhost, fontStyle: "italic" }}>Ładowanie...</p>
        ) : schools.length === 0 ? (
          <p style={{ fontSize: 12, color: C.textGhost, fontStyle: "italic" }}>Brak szkół.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {schools.map((s: any, idx: number) => {
              const memberCount = (s.members?.length ?? 0) + 1;
              const mainHall    = s.buildings?.find((b: any) => b.buildingType === "main_hall");
              const maxMembers  = 5 + (mainHall?.level ?? 0) * 5;
              const isMySchool  = s.id === mySchoolId;
              return (
                <div key={s.id} onClick={() => openPreview(s.id)}
                  style={{ padding: "12px 16px", borderRadius: 10, cursor: "pointer", background: isMySchool ? "rgba(245,196,81,0.05)" : C.panelAlt, border: `1px solid ${isMySchool ? "rgba(245,196,81,0.2)" : C.borderSoft}`, display: "flex", justifyContent: "space-between", alignItems: "center", transition: "background 0.15s" }}
                  onMouseEnter={e => { if (!isMySchool) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isMySchool ? "rgba(245,196,81,0.05)" : C.panelAlt; }}
                >
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontFamily: "Cinzel, serif", color: C.textGhost, width: 20, textAlign: "right" }}>{idx + 1}.</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: isMySchool ? C.gold : C.text, margin: "0 0 3px" }}>
                        {s.name}
                        {s.abbreviation && <span style={{ fontSize: 10, color: C.textGhost, marginLeft: 8, fontFamily: "Cinzel, serif" }}>[{s.abbreviation}]</span>}
                        {isMySchool && <span style={{ fontSize: 10, color: C.gold, marginLeft: 8 }}>← Twoja szkoła</span>}
                      </p>
                      <p style={{ fontSize: 11, color: C.textFaint, margin: 0 }}>
                        Dyrektor: <strong style={{ color: C.textDim }}>{s.director?.name}</strong>{" "}· poz. {s.director?.level}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: 12, color: C.textDim, margin: "0 0 2px", fontWeight: 600 }}>{memberCount}/{maxMembers}</p>
                    <p style={{ fontSize: 10, color: C.textGhost, margin: 0 }}>członków</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZAKŁADKA — PRZEGLĄD
// pkt 1: przycisk "Opuść szkołę" przeniesiony tutaj z MembersTab
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewTab({ school, myRole, onRefresh }: {
  school: any; myRole: string; onRefresh: () => void;
}) {
  const canManage  = myRole === "director" || myRole === "deputy";
  const canLeave   = myRole === "member" || myRole === "deputy";
  const [editing, setEditing]     = useState(false);
  const [desc, setDesc]           = useState(school.description ?? "");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [confirm, setConfirm]     = useState<"dissolve" | "leave" | null>(null);
  const [dissolving, setDissolving] = useState(false);
  const [leaving, setLeaving]     = useState(false);

  const canteenLevel = school.buildings?.find((b: any) => b.buildingType === "canteen")?.level ?? 0;

  async function handleSave() {
    setSaving(true); setError(null);
    try {
      await api.patch(`/schools/${school.id}`, { description: desc });
      setEditing(false); onRefresh();
    } catch (e: any) {
      setError(e.response?.data?.error ?? "Błąd zapisu.");
    } finally { setSaving(false); }
  }

  async function handleDissolve() {
    setConfirm(null); setDissolving(true);
    try {
      await api.delete(`/schools/${school.id}`);
      onRefresh();
    } catch (e: any) {
      setError(e.response?.data?.error ?? "Błąd rozwiązania szkoły.");
      setDissolving(false);
    }
  }

  async function handleLeave() {
    setConfirm(null); setLeaving(true);
    try {
      await api.post(`/schools/${school.id}/leave`);
      onRefresh();
    } catch (e: any) {
      setError(e.response?.data?.error ?? "Błąd opuszczania szkoły.");
      setLeaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {confirm === "dissolve" && (
        <ConfirmModal
          message={`Czy na pewno chcesz rozwiązać szkołę „${school.name}"? Ta operacja jest nieodwracalna — wszystkie budynki, biblioteka i bonusy zostaną usunięte.`}
          onConfirm={handleDissolve} onCancel={() => setConfirm(null)} confirmLabel="Rozwiąż szkołę"
        />
      )}
      {confirm === "leave" && (
        <ConfirmModal
          message="Czy na pewno chcesz opuścić tę szkołę magii?"
          onConfirm={handleLeave} onCancel={() => setConfirm(null)} confirmLabel="Opuść szkołę"
        />
      )}

      <Panel>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              {school.emblem && <span style={{ fontSize: 28 }}>{school.emblem}</span>}
              <h2 style={{ fontFamily: "Cinzel, serif", fontSize: 20, color: C.gold, margin: 0 }}>{school.name}</h2>
              {school.abbreviation && (
                <span style={{ fontSize: 11, fontFamily: "Cinzel, serif", color: C.textFaint, background: "rgba(0,0,0,0.2)", padding: "2px 8px", borderRadius: 6, border: `1px solid ${C.borderSoft}` }}>
                  [{school.abbreviation}]
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              <Badge label={`Dyrektor: ${school.director?.name}`} color={C.gold} />
              <Badge label={`${school.currentMembers}/${school.maxMembers} członków`} color={C.teal} />
              {myRole === "director" && <Badge label="Twoja szkoła" color={C.purple} />}
              {myRole === "deputy"   && <Badge label="Zastępca dyrektora" color={C.purple} />}
            </div>

            {editing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4} maxLength={300}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, boxSizing: "border-box", background: "rgba(0,0,0,0.2)", border: `1px solid ${C.borderSoft}`, color: C.text, fontSize: 13, fontFamily: "Inter, sans-serif", resize: "vertical" }} />
                {error && <ErrorBox message={error} />}
                <div style={{ display: "flex", gap: 8 }}>
                  <ActionBtn onClick={handleSave} disabled={saving} color={C.gold}>{saving ? "Zapisywanie..." : "Zapisz opis"}</ActionBtn>
                  <ActionBtn onClick={() => { setEditing(false); setDesc(school.description ?? ""); }} color={C.textFaint}>Anuluj</ActionBtn>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: school.description ? C.textDim : C.textGhost, fontStyle: school.description ? "normal" : "italic", lineHeight: 1.7, margin: 0 }}>
                {school.description || "Brak opisu szkoły."}
              </p>
            )}
          </div>

          {/* Przyciski zarządzania po prawej */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
            {canManage && !editing && (
              <ActionBtn onClick={() => setEditing(true)} color={C.textFaint}>Edytuj opis</ActionBtn>
            )}
            {/* pkt 1: opuść szkołę — dla członka i zastępcy */}
            {canLeave && (
              <ActionBtn onClick={() => setConfirm("leave")} disabled={leaving} color={C.red} style={{ fontSize: 10 }}>
                {leaving ? "Opuszczanie..." : "Opuść szkołę"}
              </ActionBtn>
            )}
            {myRole === "director" && (
              <ActionBtn onClick={() => setConfirm("dissolve")} disabled={dissolving} color={C.red} style={{ fontSize: 10 }}>
                {dissolving ? "Rozwiązywanie..." : "Rozwiąż szkołę"}
              </ActionBtn>
            )}
          </div>
        </div>
        {error && !editing && <ErrorBox message={error} />}
      </Panel>

      <Panel>
        <SectionTitle>BUDYNKI SZKOŁY</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          {Object.entries(BUILDING_INFO).map(([type, info]) => {
            const b     = school.buildings?.find((bd: any) => bd.buildingType === type);
            const level = b?.level ?? 0;
            const max   = MAX_LEVELS[type] ?? 1;
            return (
              <div key={type} style={{ padding: "14px 12px", borderRadius: 8, background: level > 0 ? C.panelAlt : "rgba(0,0,0,0.1)", border: `1px solid ${level > 0 ? C.borderSoft : "rgba(247,240,221,0.04)"}`, textAlign: "center", opacity: level === 0 ? 0.5 : 1 }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{info.icon}</div>
                <p style={{ fontSize: 10, fontFamily: "Cinzel, serif", color: C.gold, margin: "0 0 3px", letterSpacing: "0.05em" }}>{info.name}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: level > 0 ? C.text : C.textGhost, margin: 0 }}>
                  {level === 0 ? "—" : `Poz. ${level}/${max}`}
                </p>
              </div>
            );
          })}
        </div>
      </Panel>

      {canteenLevel > 0 && (
        <Panel>
          <SectionTitle>AKTYWNE BONUSY STOŁÓWKI</SectionTitle>
          <ActiveBonusesSummary school={school} />
        </Panel>
      )}
    </div>
  );
}

function ActiveBonusesSummary({ school }: { school: any }) {
  const [bonuses, setBonuses] = useState<any[]>([]);
  useEffect(() => {
    api.get(`/schools/${school.id}/bonuses`)
      .then(r => setBonuses((r.data ?? []).filter((b: any) => b.isActive)))
      .catch(() => {});
  }, [school.id]);

  if (bonuses.length === 0) return <p style={{ fontSize: 12, color: C.textGhost, fontStyle: "italic", margin: 0 }}>Brak aktywnych bonusów.</p>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {bonuses.map((b: any) => (
        <div key={b.key} style={{ padding: "7px 12px", borderRadius: 8, background: "rgba(89,212,208,0.06)", border: "1px solid rgba(89,212,208,0.2)" }}>
          <span style={{ fontSize: 12, color: C.teal }}>✓ {BONUS_LABELS[b.key] ?? b.key}</span>
          <span style={{ fontSize: 11, color: C.textFaint, marginLeft: 6 }}>+{b.value} {b.unit}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZAKŁADKA — CZŁONKOWIE
// pkt 1: usunięto przycisk "Opuść szkołę" (przeniesiony do OverviewTab)
// pkt 5: własny nick też klikalny
// ═══════════════════════════════════════════════════════════════════════════════

function MembersTab({ school, myRole, myCharacterId, onRefresh }: {
  school: any; myRole: string; myCharacterId: number; onRefresh: () => void;
}) {
  const navigate   = useNavigate();
  const canManage  = myRole === "director" || myRole === "deputy";
  const isDirector = myRole === "director";

  const [inviteSearch, setInviteSearch]   = useState("");
  const [inviteResults, setInviteResults] = useState<any[]>([]);
  const [inviting, setInviting]           = useState<number | null>(null);
  const [acting, setActing]               = useState<number | null>(null);
  const [error, setError]                 = useState<string | null>(null);
  const [success, setSuccess]             = useState<string | null>(null);
  const [confirm, setConfirm]             = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [joinRequests, setJoinRequests]   = useState<any[]>([]);
  const [reviewingId, setReviewingId]     = useState<number | null>(null);

  const fetchJoinRequests = useCallback(async () => {
    if (!canManage) return;
    try {
      const res = await api.get(`/schools/${school.id}/join-requests`);
      setJoinRequests(res.data ?? []);
    } catch {}
  }, [school.id, canManage]);

  useEffect(() => { fetchJoinRequests(); }, [fetchJoinRequests]);

  function flash(msg: string, type: "ok" | "err") {
    if (type === "ok") { setSuccess(msg); setError(null); }
    else               { setError(msg); setSuccess(null); }
    setTimeout(() => { setSuccess(null); setError(null); }, 4000);
  }

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleInviteSearchChange(value: string) {
    setInviteSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.trim().length < 2) { setInviteResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await api.get("/schools/search-characters", { params: { q: value.trim() } });
        setInviteResults(res.data ?? []);
      } catch {}
    }, 300);
  }

  async function handleInvite(characterId: number) {
    setInviting(characterId); setError(null);
    try {
      await api.post(`/schools/${school.id}/members`, { characterId });
      onRefresh(); setInviteResults([]); setInviteSearch("");
      flash("Gracz otrzymał zaproszenie do szkoły.", "ok");
    } catch (e: any) {
      flash(e.response?.data?.error ?? "Błąd zapraszania.", "err");
    } finally { setInviting(null); }
  }

  async function handleReviewJoinRequest(requestId: number, action: "approve" | "reject") {
    setReviewingId(requestId);
    try {
      await api.post(`/schools/${school.id}/join-request/${requestId}/review`, { action });
      flash(action === "approve" ? "Prośba zaakceptowana." : "Prośba odrzucona.", "ok");
      fetchJoinRequests(); onRefresh();
    } catch (e: any) {
      flash(e.response?.data?.error ?? "Błąd.", "err");
    } finally { setReviewingId(null); }
  }

  function confirmKick(characterId: number, name: string) {
    setConfirm({
      message: `Czy na pewno chcesz wyrzucić gracza „${name}" ze szkoły?`,
      onConfirm: async () => {
        setConfirm(null); setActing(characterId);
        try {
          await api.delete(`/schools/${school.id}/members/${characterId}`);
          onRefresh(); flash(`Gracz „${name}" został wyrzucony.`, "ok");
        } catch (e: any) {
          flash(e.response?.data?.error ?? "Błąd.", "err");
        } finally { setActing(null); }
      },
    });
  }

  async function handleSetDeputy(characterId: number, name: string) {
    setActing(characterId);
    try {
      await api.post(`/schools/${school.id}/deputy`, { characterId });
      onRefresh(); flash(`${name} został mianowany zastępcą.`, "ok");
    } catch (e: any) { flash(e.response?.data?.error ?? "Błąd.", "err"); }
    finally { setActing(null); }
  }

  async function handleRemoveDeputy(characterId: number, name: string) {
    setActing(characterId);
    try {
      await api.delete(`/schools/${school.id}/deputy/${characterId}`);
      onRefresh(); flash(`${name} utracił tytuł zastępcy.`, "ok");
    } catch (e: any) { flash(e.response?.data?.error ?? "Błąd.", "err"); }
    finally { setActing(null); }
  }

  const allMembers = [
    { character: school.director, role: "director" as const },
    ...(school.members ?? []).map((m: any) => ({ character: m.character, role: m.role as string })),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} confirmLabel="Tak, potwierdź" />}

      {canManage && joinRequests.length > 0 && (
        <Panel>
          <SectionTitle>PROŚBY O DOŁĄCZENIE ({joinRequests.length})</SectionTitle>
          {error && <ErrorBox message={error} />}
          {success && <SuccessBox message={success} />}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {joinRequests.map((r: any) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 8, background: "rgba(245,196,81,0.05)", border: "1px solid rgba(245,196,81,0.15)" }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.gold, cursor: "pointer", textDecoration: "underline", textDecorationColor: "rgba(245,196,81,0.4)" }}
                    onClick={() => navigate(`/profile/${r.character.id}`)}>
                    {r.character.name}
                  </span>
                  <span style={{ fontSize: 11, color: C.textFaint, marginLeft: 8 }}>poz. {r.character.level}</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <ActionBtn onClick={() => handleReviewJoinRequest(r.id, "approve")} disabled={reviewingId === r.id} color={C.teal} style={{ fontSize: 10 }}>Akceptuj</ActionBtn>
                  <ActionBtn onClick={() => handleReviewJoinRequest(r.id, "reject")} disabled={reviewingId === r.id} color={C.red} style={{ fontSize: 10 }}>Odrzuć</ActionBtn>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel>
        <SectionTitle>CZŁONKOWIE ({school.currentMembers}/{school.maxMembers})</SectionTitle>
        {!(canManage && joinRequests.length > 0) && (
          <>
            {error && <ErrorBox message={error} />}
            {success && <SuccessBox message={success} />}
          </>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {allMembers.map(({ character: ch, role }) => {
            if (!ch) return null;
            const roleLabel = role === "director" ? "Dyrektor" : role === "deputy" ? "Zastępca" : "Członek";
            const roleColor = role === "director" ? C.gold : role === "deputy" ? C.purple : C.textFaint;
            const isMe     = ch.id === myCharacterId;
            const isDeputy = role === "deputy";
            const isDir    = role === "director";
            return (
              <div key={ch.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, background: isMe ? "rgba(245,196,81,0.04)" : C.panelAlt, border: `1px solid ${isMe ? "rgba(245,196,81,0.15)" : C.borderSoft}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${roleColor}20`, border: `1px solid ${roleColor}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: roleColor, flexShrink: 0 }}>
                    {ch.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>
                      {/* pkt 5: własny nick też klikalny */}
                      <span
                        onClick={() => navigate(`/profile/${ch.id}`)}
                        style={{ cursor: "pointer", textDecoration: "underline", textDecorationColor: C.textGhost }}
                      >
                        {ch.name}
                      </span>
                      {isMe && <span style={{ fontSize: 10, color: C.textGhost, marginLeft: 6 }}>(ja)</span>}
                    </p>
                    <p style={{ fontSize: 11, color: roleColor, margin: "2px 0 0" }}>{roleLabel} · Poziom {ch.level}</p>
                  </div>
                </div>
                {canManage && !isMe && !isDir && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {isDirector && (
                      isDeputy
                        ? <ActionBtn onClick={() => handleRemoveDeputy(ch.id, ch.name)} disabled={acting === ch.id} color={C.textFaint} style={{ fontSize: 10 }}>Odbierz zastępstwo</ActionBtn>
                        : <ActionBtn onClick={() => handleSetDeputy(ch.id, ch.name)} disabled={acting === ch.id} color={C.purple} style={{ fontSize: 10 }}>Mianuj zastępcę</ActionBtn>
                    )}
                    {!(myRole === "deputy" && isDeputy) && (
                      <ActionBtn onClick={() => confirmKick(ch.id, ch.name)} disabled={acting === ch.id} color={C.red} style={{ fontSize: 10 }}>Wyrzuć</ActionBtn>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      {canManage && (
        <Panel>
          <SectionTitle>ZAPROŚ GRACZA</SectionTitle>
          <p style={{ fontSize: 12, color: C.textFaint, margin: "0 0 10px" }}>
            Zaproszony gracz otrzyma wiadomość i będzie musiał samodzielnie zaakceptować zaproszenie.
          </p>
          <div style={{ marginBottom: 10 }}>
            <input type="text" placeholder="Wyszukaj gracza po nicku (min. 2 znaki)..." value={inviteSearch}
              onChange={e => handleInviteSearchChange(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, boxSizing: "border-box", background: "rgba(0,0,0,0.2)", border: `1px solid ${C.borderSoft}`, color: C.text, fontSize: 13, fontFamily: "Inter, sans-serif" }} />
          </div>
          {inviteResults.length === 0 && inviteSearch.length >= 2 && (
            <p style={{ fontSize: 12, color: C.textGhost, fontStyle: "italic" }}>Brak wyników.</p>
          )}
          {inviteResults.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {inviteResults.map((r: any) => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, background: C.panelAlt, border: `1px solid ${C.borderSoft}` }}>
                  <span style={{ fontSize: 13, color: C.text, cursor: "pointer" }} onClick={() => navigate(`/profile/${r.id}`)}>
                    {r.name}<span style={{ color: C.textFaint, fontSize: 11, marginLeft: 8 }}>poz. {r.level}</span>
                  </span>
                  <ActionBtn onClick={() => handleInvite(r.id)} disabled={inviting === r.id} color={C.teal} style={{ fontSize: 10 }}>
                    {inviting === r.id ? "..." : "Zaproś"}
                  </ActionBtn>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZAKŁADKA — BUDYNKI
// ═══════════════════════════════════════════════════════════════════════════════

function BuildingsTab({ school, myRole, myRunicShards, onRefresh }: {
  school: any; myRole: string; myRunicShards: number; onRefresh: () => void;
}) {
  const canManage = myRole === "director" || myRole === "deputy";
  const [buildings, setBuildings] = useState<any[]>([]);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);

  const fetchBuildings = useCallback(async () => {
    try {
      const res = await api.get(`/schools/${school.id}/buildings`);
      setBuildings(res.data);
    } catch {}
  }, [school.id]);

  useEffect(() => { fetchBuildings(); }, [fetchBuildings]);

  async function handleUpgrade(buildingType: string) {
    setUpgrading(buildingType); setError(null); setSuccess(null);
    try {
      const res = await api.post(`/schools/${school.id}/buildings/upgrade`, { buildingType });
      await fetchBuildings(); onRefresh();
      setSuccess(`Rozbudowa zakończona! ${res.data.description ?? ""}`);
    } catch (e: any) {
      setError(e.response?.data?.error ?? "Błąd rozbudowy.");
    } finally { setUpgrading(null); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {error && <ErrorBox message={error} />}
      {success && <SuccessBox message={success} />}
      {buildings.map((b: any) => {
        const info      = BUILDING_INFO[b.type] ?? { name: b.type, icon: "🏗", desc: "" };
        const canAfford = myRunicShards >= (b.nextLevelCost ?? Infinity);
        const atMax     = b.currentLevel >= b.maxLevel;
        return (
          <Panel key={b.type}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flex: 1 }}>
                <span style={{ fontSize: 30, lineHeight: 1, flexShrink: 0 }}>{info.icon}</span>
                <div>
                  <p style={{ fontFamily: "Cinzel, serif", fontSize: 14, color: C.gold, margin: "0 0 3px" }}>
                    {info.name}
                    <span style={{ fontSize: 11, color: C.textFaint, fontFamily: "Inter, sans-serif", fontWeight: 400, marginLeft: 8 }}>Poziom {b.currentLevel}/{b.maxLevel}</span>
                  </p>
                  <p style={{ fontSize: 12, color: C.textDim, margin: "0 0 6px" }}>{info.desc}</p>
                  {!atMax && b.nextLevelDescription && (
                    <p style={{ fontSize: 11, color: C.teal, margin: 0 }}>▸ Po rozbudowie: {b.nextLevelDescription}</p>
                  )}
                </div>
              </div>
              <div style={{ flexShrink: 0, textAlign: "right" }}>
                {atMax ? <Badge label="MAX" color={C.gold} /> : canManage ? (
                  <>
                    <p style={{ fontSize: 11, color: canAfford ? C.textFaint : C.red, margin: "0 0 6px" }}>
                      ◈ {b.nextLevelCost} okruchów
                      {!canAfford && <span style={{ display: "block", fontSize: 10, color: C.textGhost }}>(masz {myRunicShards})</span>}
                    </p>
                    <ActionBtn onClick={() => handleUpgrade(b.type)} disabled={!canAfford || upgrading === b.type || b.isUpgrading} color={canAfford ? C.gold : C.textGhost}>
                      {upgrading === b.type || b.isUpgrading ? "Rozbudowywanie..." : "Rozbuduj"}
                    </ActionBtn>
                  </>
                ) : null}
              </div>
            </div>
            <div style={{ marginTop: 14, height: 4, borderRadius: 2, background: "rgba(247,240,221,0.07)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.round((b.currentLevel / b.maxLevel) * 100)}%`, background: atMax ? `linear-gradient(90deg, ${C.gold}, #F5A451)` : `linear-gradient(90deg, ${C.gold}, ${C.teal})`, borderRadius: 2, transition: "width 0.5s ease" }} />
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZAKŁADKA — BIBLIOTEKA CZARÓW
// ═══════════════════════════════════════════════════════════════════════════════

function LibraryTab({ school, myRole, onRefresh }: {
  school: any; myRole: string; onRefresh: () => void;
}) {
  const canManage = myRole === "director" || myRole === "deputy";
  const [entries, setEntries]                 = useState<any[]>([]);
  const [mySpells, setMySpells]               = useState<any[]>([]);
  const [selectedSpellId, setSelectedSpellId] = useState<number | null>(null);
  const [proposing, setProposing]             = useState(false);
  const [acting, setActing]                   = useState<number | null>(null);
  const [learning, setLearning]               = useState<number | null>(null);
  const [error, setError]                     = useState<string | null>(null);
  const [success, setSuccess]                 = useState<string | null>(null);

  const libraryLevel = school.buildings?.find((b: any) => b.buildingType === "library")?.level ?? 0;
  const libraryBuilt = libraryLevel > 0;

  function flash(msg: string, type: "ok" | "err") {
    if (type === "ok") { setSuccess(msg); setError(null); }
    else               { setError(msg); setSuccess(null); }
    setTimeout(() => { setSuccess(null); setError(null); }, 5000);
  }

  const fetchLibrary = useCallback(async () => {
    try {
      const res = await api.get(`/schools/${school.id}/library`);
      setEntries(res.data);
    } catch {}
  }, [school.id]);

  useEffect(() => { fetchLibrary(); }, [fetchLibrary]);
  useEffect(() => {
    api.get("/spellbook")
      .then(r => {
        const spells = r.data.spells ?? r.data;
        setMySpells(Array.isArray(spells) ? spells.filter((s: any) => s.discovered !== false) : []);
      }).catch(() => {});
  }, []);

  async function handlePropose() {
    if (!selectedSpellId || !libraryBuilt) return;
    setProposing(true); setError(null);
    try {
      await api.post(`/schools/${school.id}/library/propose`, { spellId: selectedSpellId });
      setSelectedSpellId(null);
      flash("Czar został zaproponowany. Oczekuje na akceptację.", "ok");
      fetchLibrary();
    } catch (e: any) { flash(e.response?.data?.error ?? "Błąd propozycji.", "err"); }
    finally { setProposing(false); }
  }

  async function handleReview(entryId: number, action: "approve" | "reject") {
    setActing(entryId);
    try {
      await api.patch(`/schools/${school.id}/library/${entryId}/review`, { action });
      flash(action === "approve" ? "Czar zaakceptowany." : "Czar odrzucony.", "ok");
      fetchLibrary();
    } catch (e: any) { flash(e.response?.data?.error ?? "Błąd.", "err"); }
    finally { setActing(null); }
  }

  async function handleRemove(entryId: number) {
    setActing(entryId);
    try {
      await api.delete(`/schools/${school.id}/library/${entryId}`);
      flash("Czar usunięty z biblioteki.", "ok"); fetchLibrary();
    } catch (e: any) { flash(e.response?.data?.error ?? "Błąd.", "err"); }
    finally { setActing(null); }
  }

  async function handleLearn(spellId: number, spellName: string, cost: number) {
    setLearning(spellId);
    try {
      await api.post(`/schools/${school.id}/library/learn`, { spellId });
      flash(`Nauczyłeś się czaru „${spellName}"!${cost > 0 ? ` Zapłacono ${cost} ✦ okruchów mocy.` : ""}`, "ok");
      fetchLibrary(); onRefresh();
    } catch (e: any) { flash(e.response?.data?.error ?? "Błąd nauki.", "err"); }
    finally { setLearning(null); }
  }

  const pending    = entries.filter(e => e.status === "pending");
  const approved   = entries.filter(e => e.status === "approved");
  const rejected   = entries.filter(e => e.status === "rejected");
  const mySpellIds = new Set(mySpells.map((s: any) => s.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && <ErrorBox message={error} />}
      {success && <SuccessBox message={success} />}

      <Panel>
        <SectionTitle>ZAPROPONUJ CZAR DO BIBLIOTEKI</SectionTitle>
        {!libraryBuilt && (
          <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 12, background: "rgba(244,106,78,0.08)", border: "1px solid rgba(244,106,78,0.2)" }}>
            <p style={{ fontSize: 12, color: C.red, margin: 0 }}>🔒 Wybuduj Szkolną Bibliotekę, aby móc proponować czary.</p>
          </div>
        )}
        <p style={{ fontSize: 12, color: C.textFaint, margin: "0 0 12px" }}>Możesz zaproponować każdy odkryty czar. Po akceptacji zarządu inni członkowie będą mogli się go nauczyć.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={selectedSpellId ?? ""} onChange={e => setSelectedSpellId(e.target.value ? Number(e.target.value) : null)} disabled={!libraryBuilt}
            style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: "rgba(0,0,0,0.25)", border: `1px solid ${C.borderSoft}`, color: selectedSpellId ? C.text : C.textFaint, fontSize: 13, fontFamily: "Inter, sans-serif", opacity: libraryBuilt ? 1 : 0.4 }}>
            <option value="">— Wybierz czar z Twojej Księgi —</option>
            {mySpells.map((s: any) => (
              <option key={s.id} value={s.id} style={{ background: C.panel }}>{s.name} ({s.element ?? "—"}, {s.rarity ?? "—"})</option>
            ))}
          </select>
          <ActionBtn onClick={handlePropose} disabled={!selectedSpellId || proposing || !libraryBuilt} color={C.gold}
            title={!libraryBuilt ? "Biblioteka nie jest jeszcze wybudowana" : undefined}>
            {proposing ? "..." : "Zaproponuj"}
          </ActionBtn>
        </div>
      </Panel>

      {canManage && pending.length > 0 && (
        <Panel>
          <SectionTitle>OCZEKUJĄCE NA AKCEPTACJĘ ({pending.length})</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pending.map((e: any) => (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 8, background: "rgba(245,196,81,0.05)", border: "1px solid rgba(245,196,81,0.15)" }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: "0 0 3px" }}>{ELEMENT_ICONS[e.spell?.element ?? "none"] ?? ""} {e.spell?.name}</p>
                  <p style={{ fontSize: 11, color: C.textFaint, margin: 0 }}>
                    <span style={{ color: RARITY_COLORS[e.spell?.rarity] ?? C.textFaint }}>{e.spell?.rarity}</span>
                    &nbsp;· Zaproponował: <strong style={{ color: C.textDim }}>{e.proposedBy?.name}</strong>
                    {e.spell?.basicCost > 0 && <span style={{ color: C.gold }}> · ✦ {e.spell.basicCost}</span>}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <ActionBtn onClick={() => handleReview(e.id, "approve")} disabled={acting === e.id} color={C.teal} style={{ fontSize: 10 }}>Akceptuj</ActionBtn>
                  <ActionBtn onClick={() => handleReview(e.id, "reject")} disabled={acting === e.id} color={C.red} style={{ fontSize: 10 }}>Odrzuć</ActionBtn>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel>
        <SectionTitle>CZARY W BIBLIOTECE ({approved.length})</SectionTitle>
        {approved.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <p style={{ fontSize: 22, margin: "0 0 8px" }}>📚</p>
            <p style={{ fontSize: 13, color: C.textGhost, fontStyle: "italic" }}>
              {libraryBuilt ? "Biblioteka jest pusta. Zaproponuj pierwszy czar!" : "Biblioteka nie jest jeszcze wybudowana."}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {approved.map((e: any) => {
              const alreadyOwned = mySpellIds.has(e.spell?.id);
              const rarityColor  = RARITY_COLORS[e.spell?.rarity] ?? C.textFaint;
              return (
                <div key={e.id} style={{ padding: "13px", borderRadius: 8, background: C.panelAlt, border: `1px solid ${C.borderSoft}`, display: "flex", flexDirection: "column", gap: 6, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: rarityColor, opacity: 0.6 }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{ELEMENT_ICONS[e.spell?.element ?? "none"]} {e.spell?.name}</p>
                  <p style={{ fontSize: 11, color: C.textFaint, margin: 0 }}><span style={{ color: rarityColor }}>{e.spell?.rarity}</span> · {e.spell?.element}</p>
                  {e.spell?.bookDescription && <p style={{ fontSize: 11, color: C.textDim, margin: "2px 0 0", lineHeight: 1.5, flexGrow: 1 }}>{e.spell.bookDescription}</p>}
                  {e.spell?.basicCost > 0 && <p style={{ fontSize: 11, color: C.gold, margin: 0 }}>✦ {e.spell.basicCost} okruchów mocy</p>}
                  <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    {alreadyOwned ? (
                      <span style={{ fontSize: 10, color: C.textGhost, fontStyle: "italic" }}>Już posiadasz</span>
                    ) : (
                      <ActionBtn onClick={() => handleLearn(e.spell.id, e.spell.name, e.spell.basicCost ?? 0)} disabled={learning === e.spell.id} color={C.teal} style={{ fontSize: 10 }}>
                        {learning === e.spell.id ? "..." : "Naucz się"}
                      </ActionBtn>
                    )}
                    {canManage && <ActionBtn onClick={() => handleRemove(e.id)} disabled={acting === e.id} color={C.red} style={{ fontSize: 10 }}>Usuń</ActionBtn>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {canManage && rejected.length > 0 && (
        <Panel>
          <SectionTitle>ODRZUCONE ({rejected.length})</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rejected.map((e: any) => (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, background: "rgba(244,106,78,0.04)", border: "1px solid rgba(244,106,78,0.12)" }}>
                <p style={{ fontSize: 12, color: C.textFaint, margin: 0 }}>
                  {e.spell?.name}<span style={{ marginLeft: 8, fontSize: 10, color: C.textGhost }}>od {e.proposedBy?.name}</span>
                </p>
                <ActionBtn onClick={() => handleRemove(e.id)} disabled={acting === e.id} color={C.textGhost} style={{ fontSize: 10 }}>Usuń wpis</ActionBtn>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZAKŁADKA — BONUSY STOŁÓWKI
// ═══════════════════════════════════════════════════════════════════════════════

function BonusesTab({ school, myRole }: { school: any; myRole: string }) {
  const canManage = myRole === "director" || myRole === "deputy";
  const [bonuses, setBonuses]   = useState<any[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  const canteenLevel = school.buildings?.find((b: any) => b.buildingType === "canteen")?.level ?? 0;
  const maxActive    = getMaxActiveBonuses(canteenLevel);

  const fetchBonuses = useCallback(async () => {
    try {
      const res = await api.get(`/schools/${school.id}/bonuses`);
      setBonuses(res.data);
    } catch {}
  }, [school.id]);

  useEffect(() => { fetchBonuses(); }, [fetchBonuses]);

  async function handleToggle(bonusKey: string, currentlyActive: boolean) {
    setToggling(bonusKey); setError(null); setSuccess(null);
    try {
      await api.post(`/schools/${school.id}/bonuses`, { bonusKey, active: !currentlyActive });
      const label = BONUS_LABELS[bonusKey] ?? bonusKey;
      setSuccess(currentlyActive ? `Bonus „${label}" dezaktywowany.` : `Bonus „${label}" aktywowany!`);
      fetchBonuses();
    } catch (e: any) { setError(e.response?.data?.error ?? "Błąd zmiany bonusu."); }
    finally { setToggling(null); }
  }

  if (canteenLevel === 0) {
    return (
      <Panel>
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <p style={{ fontSize: 32, margin: "0 0 12px" }}>🍲</p>
          <p style={{ fontFamily: "Cinzel, serif", fontSize: 13, color: C.gold, margin: "0 0 8px" }}>STOŁÓWKA NIEWYBUDOWANA</p>
          <p style={{ fontSize: 13, color: C.textFaint, maxWidth: 340, margin: "0 auto" }}>Wybuduj Stołówkę w zakładce Budynki, aby odblokować bonusy dla wszystkich członków szkoły.</p>
        </div>
      </Panel>
    );
  }

  const activeCount = bonuses.filter(b => b.isActive).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && <ErrorBox message={error} />}
      {success && <SuccessBox message={success} />}
      <Panel>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <SectionTitle style={{ marginBottom: 0 }}>BONUSY STOŁÓWKI</SectionTitle>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: C.textFaint }}>Stołówka poz. {canteenLevel}</span>
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, border: `1px solid ${activeCount >= maxActive ? C.red : C.borderSoft}`, color: activeCount >= maxActive ? C.red : C.textFaint }}>
              {activeCount}/{maxActive} aktywnych
            </span>
          </div>
        </div>
        <p style={{ fontSize: 12, color: C.textFaint, marginBottom: 16, lineHeight: 1.6 }}>
          Aktywne bonusy działają dla wszystkich członków szkoły podczas walk, eksploracji i studiów.
          {canManage ? " Jako zarząd możesz zmieniać aktywne bonusy." : ""}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {bonuses.map((b: any) => {
            const label       = BONUS_LABELS[b.key] ?? b.key;
            const canActivate = !b.isActive && activeCount < maxActive;
            return (
              <div key={b.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: 10, background: b.isActive ? "rgba(89,212,208,0.06)" : C.panelAlt, border: `1px solid ${b.isActive ? "rgba(89,212,208,0.25)" : C.borderSoft}`, transition: "all 0.2s" }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 3px", color: b.isActive ? C.teal : C.text }}>
                    {b.isActive ? "✓ " : ""}{label}
                  </p>
                  <p style={{ fontSize: 11, color: C.textFaint, margin: 0 }}>
                    +{b.value} {b.unit}
                    {!b.isActive && !canActivate && <span style={{ color: C.red, marginLeft: 8 }}>Limit aktywnych bonusów osiągnięty</span>}
                  </p>
                </div>
                {canManage ? (
                  <ActionBtn onClick={() => handleToggle(b.key, b.isActive)} disabled={toggling === b.key || (!b.isActive && !canActivate)} color={b.isActive ? C.red : C.teal} style={{ fontSize: 10, minWidth: 80 }}>
                    {toggling === b.key ? "..." : b.isActive ? "Dezaktywuj" : "Aktywuj"}
                  </ActionBtn>
                ) : (
                  <span style={{ fontSize: 11, color: b.isActive ? C.teal : C.textGhost, fontFamily: "Cinzel, serif", letterSpacing: "0.03em" }}>
                    {b.isActive ? "AKTYWNY" : "—"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GŁÓWNY KOMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function MagicSchool() {
  const { character } = useCharacter();
  const [school, setSchool]         = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<Tab>("overview");
  const [towerLevel, setTowerLevel] = useState(0);

  const fetchSchool = useCallback(async () => {
    try {
      const res = await api.get("/schools/my");
      setSchool(res.data);
    } catch {
      setSchool(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchool();
    api.get("/tower").then(r => setTowerLevel(r.data.tower?.level ?? 0)).catch(() => {});
  }, [fetchSchool]);

  if (!character) return null;

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
        <p style={{ fontFamily: "Cinzel, serif", color: C.gold, fontSize: 13, letterSpacing: "0.12em" }}>Ładowanie szkoły magii...</p>
      </div>
    );
  }

  if (!school) {
    return <NoSchoolView towerLevel={towerLevel} onCreated={fetchSchool} />;
  }

  const myRole: string =
    school.directorId === character.id
      ? "director"
      : (school.members ?? []).find((m: any) => m.characterId === character.id)?.role ?? "member";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontFamily: "Cinzel, serif", color: C.gold, fontSize: 22, letterSpacing: "0.06em", margin: 0 }}>
        Szkoła Magii
      </h1>

      <div style={{ display: "flex", gap: 2, borderBottom: `1px solid ${C.border}` }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: "10px 16px", fontSize: 12, fontFamily: "Cinzel, serif", fontWeight: 600, letterSpacing: "0.05em", background: "none", border: "none", borderBottom: tab === t.key ? `2px solid ${C.gold}` : "2px solid transparent", color: tab === t.key ? C.gold : C.textFaint, cursor: "pointer", transition: "color 0.15s", whiteSpace: "nowrap", marginBottom: -1 }}
            onMouseEnter={e => { if (tab !== t.key) (e.currentTarget as HTMLButtonElement).style.color = C.text; }}
            onMouseLeave={e => { if (tab !== t.key) (e.currentTarget as HTMLButtonElement).style.color = C.textFaint; }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview"   && <OverviewTab   school={school} myRole={myRole} onRefresh={fetchSchool} />}
      {tab === "members"    && <MembersTab    school={school} myRole={myRole} myCharacterId={character.id} onRefresh={fetchSchool} />}
      {tab === "buildings"  && <BuildingsTab  school={school} myRole={myRole} myRunicShards={character.runicStoneShards} onRefresh={fetchSchool} />}
      {tab === "library"    && <LibraryTab    school={school} myRole={myRole} onRefresh={fetchSchool} />}
      {tab === "bonuses"    && <BonusesTab    school={school} myRole={myRole} />}
      {tab === "allschools" && <AllSchoolsTab mySchoolId={school.id} />}
    </div>
  );
}
