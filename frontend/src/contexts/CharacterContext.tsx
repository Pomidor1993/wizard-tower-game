import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../api/client";

export interface CharacterData {
  id: number;
  name: string;
  level: number;
  experience: number;
  xpToNextLevel: number;
  prestige: number;
  powerShards: number;
  runicStoneShards: number;
  skillPoints: number;
  knowledge: number;
  intelligence: number;
  power: number;
  endurance: number;
  resistance: number;
  initiative: number;
  elementalMagic: number;
  astralMagic: number;
  bloodMagic: number;
  tower?: { level: number };
}

interface CharacterCtx {
  character: CharacterData | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<CharacterCtx>({ character: null, loading: true, refresh: async () => {} });

export function CharacterProvider({ children }: { children: React.ReactNode }) {
  const [character, setCharacter] = useState<CharacterData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get("/character/me");
      setCharacter(res.data);
    } catch {
      // interceptor obsłuży 401
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return <Ctx.Provider value={{ character, loading, refresh }}>{children}</Ctx.Provider>;
}

export const useCharacter = () => useContext(Ctx);