// ═══════════════════════════════════════════════════════════════════
// PLAYER PROFILE SERVICE
// src/services/profile.service.ts
//
// Publiczny profil gracza (B.1) — dostępny z poziomu rankingów (klik na nick)
// i pojedynków (przycisk "Wyświetl profil"). Zawiera tylko dane, które gracz
// powinien móc zobaczyć u innych: nick, daty, poziom, prestiż, poziom wieży,
// placeholder na tytuły i grafikę postaci.
// ═══════════════════════════════════════════════════════════════════

import prisma from "../lib/prisma.js";

export interface PlayerProfile {
  characterId: number;
  name: string;
  level: number;
  prestige: number;
  towerLevel: number | null;
  registeredAt: Date;     // "Stał się magiem dnia: ..."
  lastSeenAt: Date | null; // "Ostatnio widziany: ..." — null jeśli brak danych (np. konto sprzed migracji)
  titles: string[];        // placeholder — mechanika tytułów jeszcze nie istnieje
  portraitUrl: string | null; // placeholder — mechanika grafik postaci jeszcze nie istnieje
  isSelf: boolean;
  isBlocked: boolean; // czy PYTAJĄCY zablokował tego gracza
}

export async function getPlayerProfile(viewerCharacterId: number, targetCharacterId: number): Promise<PlayerProfile> {
  const target = await prisma.character.findUnique({
    where: { id: targetCharacterId },
    include: {
      user: { select: { createdAt: true, lastLoginAt: true } },
      tower: { select: { level: true } },
    },
  });

  if (!target) throw new Error("Postać nie znaleziona");

  const blockEntry = await prisma.blockedPlayer.findUnique({
    where: { blockerId_blockedId: { blockerId: viewerCharacterId, blockedId: targetCharacterId } },
  });

  return {
    characterId: target.id,
    name: target.name,
    level: target.level,
    prestige: target.prestige,
    towerLevel: target.tower?.level ?? null,
    registeredAt: target.user.createdAt,
    lastSeenAt: target.user.lastLoginAt,
    titles: [], // TODO: podłączyć gdy powstanie mechanika tytułów
    portraitUrl: null, // TODO: podłączyć gdy powstanie mechanika grafik postaci
    isSelf: viewerCharacterId === targetCharacterId,
    isBlocked: blockEntry !== null,
  };
}