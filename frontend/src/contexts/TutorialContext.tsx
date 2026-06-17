import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../api/client";

// ── TYPY ─────────────────────────────────────────────────────────────────────

export interface HomeRepairTask {
  id: number;
  taskCode: string;
  name: string;
  status: "locked" | "available" | "in_progress" | "completed";
  startedAt: string | null;
  finishesAt: string | null;
  completedAt: string | null;
  durationSeconds: number;
  unmetReqs: string[];
  canStart: boolean;
}

export interface TutorialState {
  step: string;
  active: boolean;
  visibleTabs: string[];
  homeRepairTasks: HomeRepairTask[];
  pendingMessage: string | null;
}

interface TutorialCtx {
  tutorial: TutorialState | null;
  loading: boolean;
  refresh: () => Promise<void>;
  dismissMessage: () => void;
}

// ── DOMYŚLNY KONTEKST ─────────────────────────────────────────────────────────

const Ctx = createContext<TutorialCtx>({
  tutorial: null,
  loading: true,
  refresh: async () => {},
  dismissMessage: () => {},
});

// ── PROVIDER ──────────────────────────────────────────────────────────────────

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [tutorial, setTutorial] = useState<TutorialState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get("/tutorial/state");
      setTutorial(res.data);
    } catch {
      // brak tutorialu = pełny dostęp
      setTutorial(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Zamknięcie modala kasuje pendingMessage lokalnie
  // (backend już go "zużył" przy pobieraniu stanu)
  const dismissMessage = useCallback(() => {
    setTutorial(prev => prev ? { ...prev, pendingMessage: null } : prev);
  }, []);

  return (
    <Ctx.Provider value={{ tutorial, loading, refresh, dismissMessage }}>
      {children}
    </Ctx.Provider>
  );
}

export const useTutorial = () => useContext(Ctx);

// ── HELPER: czy dana trasa jest widoczna ─────────────────────────────────────

// Mapowanie: klucz z visibleTabs → ścieżka routera
const TAB_TO_PATH: Record<string, string> = {
  character:   "/overview",
  home:        "/home",
  exploration: "/exploration",
  study:       "/study",
  spellbook:   "/spellbook",
  training:    "/training",
  vault:       "/vault",
  tower:       "/tower",
  combat:      "/combat",
  school:      "/school",
  settings:    "/settings",
  premium:     "/premium",
};

export function useIsTabVisible(tabKey: string): boolean {
  const { tutorial } = useTutorial();
  // tutorial null lub nieaktywny = pełne menu
  if (!tutorial || !tutorial.active) return true;
  return tutorial.visibleTabs.includes(tabKey);
}

export { TAB_TO_PATH };