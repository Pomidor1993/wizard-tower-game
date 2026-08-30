// ═══════════════════════════════════════════════════════════════════
// RIFT GROUP SERVICE — stabilne szczeliny (grupowe)
// ═══════════════════════════════════════════════════════════════════

import prisma from "../lib/prisma.js";
import { getRiftByKey, RiftColor } from "../data/rifts.js";
import { getRiftWorldByKey, ENTITY_TROPHY_MAP } from "../data/rift-worlds.js";
import { ENTITY_MAP } from "../data/minor-entities.js";
import { buildFighter, simulateBattle, Fighter } from "./combat.service.js";
import { buildEntityFighter } from "./pve-engine.js";
import { addItemToChaosVaultWithMessage } from "./chaos_vault.service.js";
import { addExperience } from "./character.service.js";
import { getRiftTrophyBonuses } from "./rift-trophy-bonus.service.js";
import { createReport } from "./report.service.js";

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickFromPool(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)]!;
}

// ── SPRAWDŹ DZIENNY LIMIT ─────────────────────────────────────────
// Max 1 akcja szczeliny stabilnej per gracz per dzień (łączny limit)

async function checkDailyRiftLimit(characterId: number): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Sprawdź czy brał udział w zakończonej wyprawie dziś
  const todayRun = await prisma.stableRiftRun.findFirst({
    where: {
      foughtAt: { gte: today },
      party: {
        members: { some: { characterId, status: "accepted" } },
      },
    },
  });

  // Sprawdź czy założył drużynę dziś
  const todayParty = await prisma.stableRiftParty.findFirst({
    where: {
      leaderId: characterId,
      createdAt: { gte: today },
    },
  });

  if (todayRun || todayParty) {
    throw new Error("Możesz uczestniczyć tylko w jednej wyprawie do szczeliny stabilnej dziennie.");
  }
}

// ── SPRAWDŹ DOSTĘP DO SZCZELINY ───────────────────────────────────
// Gracz musi być w szkole, która ma odblokowaną daną szczelinę w rift_chamber

async function checkRiftAccess(characterId: number, riftKey: string): Promise<number> {
  const riftDef = getRiftByKey(riftKey as RiftColor);
  if (!riftDef || riftDef.type !== "stable") throw new Error("Nieznana szczelina stabilna");

  const member = await prisma.schoolMember.findUnique({
    where: { characterId },
    include: { school: { include: { buildings: true } } },
  });

  const director = await prisma.magicSchool.findFirst({
    where: { directorId: characterId },
    include: { buildings: true },
  });

  const school = member?.school ?? director;
  if (!school) throw new Error("Musisz należeć do szkoły magii aby korzystać ze szczelin stabilnych");

  const riftChamber = school.buildings.find(b => b.buildingType === "rift_chamber");
  const chamberLevel = riftChamber?.level ?? 0;
  const required = riftDef.riftChamberLevelRequired ?? 1;

  if (chamberLevel < required) {
    throw new Error(`Komnata Szczelin szkoły wymaga poziomu ${required} (obecny: ${chamberLevel})`);
  }

  return school.id;
}

// ═══════════════════════════════════════════════════════════════════
// ZARZĄDZANIE DRUŻYNĄ
// ═══════════════════════════════════════════════════════════════════

// ── UTWÓRZ DRUŻYNĘ ────────────────────────────────────────────────

export async function createStableRiftParty(userId: number, riftKey: string): Promise<object> {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  await checkDailyRiftLimit(character.id);
  const schoolId = await checkRiftAccess(character.id, riftKey);

  // Sprawdź czy gracz nie jest już liderem aktywnej drużyny
  const existingParty = await prisma.stableRiftParty.findFirst({
    where: { leaderId: character.id, status: { in: ["forming", "ready"] } },
  });
  if (existingParty) throw new Error("Masz już aktywną drużynę. Najpierw ją rozwiąż lub rusz na wyprawę.");

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const party = await prisma.stableRiftParty.create({
    data: {
      schoolId,
      leaderId: character.id,
      riftKey,
      status: "forming",
      scheduledAt: today,
    },
  });

  return {
    partyId: party.id,
    riftKey,
    status: party.status,
    leaderId: character.id,
    leaderName: character.name,
    members: [],
  };
}

// ── POBIERZ DRUŻYNĘ ───────────────────────────────────────────────

export async function getStableRiftParty(userId: number, partyId: number): Promise<object> {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const party = await prisma.stableRiftParty.findUnique({
    where: { id: partyId },
    include: {
      leader: true,
      members: { include: { character: true } },
      run: true,
    },
  });
  if (!party) throw new Error("Drużyna nie znaleziona");

  // Sprawdź czy użytkownik jest w tej drużynie lub jej liderem
  const isMember =
    party.leaderId === character.id ||
    party.members.some(m => m.characterId === character.id);
  if (!isMember) throw new Error("Nie należysz do tej drużyny");

  return formatParty(party);
}

// ── ZGŁOŚ CHĘĆ DOŁĄCZENIA ────────────────────────────────────────

export async function requestJoinParty(userId: number, partyId: number): Promise<object> {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const party = await prisma.stableRiftParty.findUnique({
    where: { id: partyId },
    include: { members: true },
  });
  if (!party) throw new Error("Drużyna nie znaleziona");
  if (party.status !== "forming") throw new Error("Drużyna nie przyjmuje już nowych członków");
  if (party.leaderId === character.id) throw new Error("Jesteś liderem tej drużyny");

  await checkDailyRiftLimit(character.id);
  await checkRiftAccess(character.id, party.riftKey);

  // Max 5 osób łącznie (lider + 4)
  const acceptedCount = party.members.filter(m => m.status === "accepted").length;
  if (acceptedCount >= 4) throw new Error("Drużyna jest już pełna (max 5 osób)");

  const existing = party.members.find(m => m.characterId === character.id);
  if (existing) throw new Error("Już zgłosiłeś chęć dołączenia do tej drużyny");

  const member = await prisma.stableRiftMember.create({
    data: { partyId, characterId: character.id, status: "pending" },
  });

  return { memberId: member.id, status: member.status };
}

// ── AKCEPTUJ / ODRZUĆ CZŁONKA ────────────────────────────────────

export async function reviewPartyMember(
  userId: number,
  partyId: number,
  memberId: number,
  action: "accept" | "reject"
): Promise<object> {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const party = await prisma.stableRiftParty.findUnique({
    where: { id: partyId },
    include: { members: true },
  });
  if (!party) throw new Error("Drużyna nie znaleziona");
  if (party.leaderId !== character.id) throw new Error("Tylko lider może akceptować/odrzucać członków");
  if (party.status !== "forming") throw new Error("Drużyna nie jest w fazie formowania");

  const member = party.members.find(m => m.id === memberId);
  if (!member) throw new Error("Członek nie znaleziony");
  if (member.status !== "pending") throw new Error("Zgłoszenie już rozpatrzone");

  if (action === "accept") {
    const acceptedCount = party.members.filter(m => m.status === "accepted").length;
    if (acceptedCount >= 4) throw new Error("Drużyna jest pełna");
  }

  const updated = await prisma.stableRiftMember.update({
    where: { id: memberId },
    data: { status: action === "accept" ? "accepted" : "rejected" },
  });

  return { memberId, status: updated.status };
}

// ── RUSZAMY NA WYPRAWĘ ────────────────────────────────────────────

export async function launchStableRiftParty(userId: number, partyId: number): Promise<object> {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const party = await prisma.stableRiftParty.findUnique({
    where: { id: partyId },
    include: { members: { include: { character: true } } },
  });
  if (!party) throw new Error("Drużyna nie znaleziona");
  if (party.leaderId !== character.id) throw new Error("Tylko lider może odpalić wyprawę");
  if (party.status !== "forming") throw new Error("Drużyna już ruszyła lub zakończyła wyprawę");

  return await executeStableRift(party);
}

// ── AUTO-TRIGGER O PÓŁNOCY ────────────────────────────────────────
// Wywoływane przez cron lub lazy-check — odpala wszystkie drużyny
// które nie zostały ręcznie uruchomione do końca dnia.

export async function autoLaunchExpiredParties(): Promise<void> {
  const now = new Date();

  const expiredParties = await prisma.stableRiftParty.findMany({
    where: {
      status: "forming",
      scheduledAt: { lte: now },
    },
    include: { members: { include: { character: true } } },
  });

  for (const party of expiredParties) {
    try {
      await executeStableRift(party);
    } catch (e) {
      console.error(`Auto-launch failed for party ${party.id}:`, e);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// SILNIK WYPRAWY STABILNEJ
// ═══════════════════════════════════════════════════════════════════

async function executeStableRift(party: any): Promise<object> {
  const riftDef = getRiftByKey(party.riftKey as RiftColor);
  if (!riftDef) throw new Error("Nieznana szczelina");

  // Losuj krainę (stabilna ma tylko jedną na razie, ale mechanika jest)
  const { rollWorldKey } = await import("../data/rifts.js");
  // Dla stabilnej używamy historii lidera
  const leaderHistory = await prisma.riftWorldHistory.findMany({
    where: { characterId: party.leaderId, riftKey: party.riftKey },
    orderBy: { visitedAt: "desc" },
    take: 5,
  });
  const recentKeys = leaderHistory.map((h: any) => h.worldKey);
  const worldKey = rollWorldKey(riftDef, recentKeys);

  const worldDef = getRiftWorldByKey(worldKey);
  if (!worldDef) throw new Error("Nieznana kraina");

  // Zapisz wizytę lidera
  await prisma.riftWorldHistory.create({
    data: { characterId: party.leaderId, riftKey: party.riftKey, worldKey },
  });

  // Zbierz uczestników (lider + zaakceptowani członkowie)
  const acceptedMembers = (party.members as any[]).filter((m: any) => m.status === "accepted");
  const participantIds: number[] = [party.leaderId, ...acceptedMembers.map((m: any) => m.characterId)];

  // Oznacz drużynę jako "ready"
  await prisma.stableRiftParty.update({
    where: { id: party.id },
    data: { status: "ready" },
  });

  // ── WALKI ────────────────────────────────────────────────────────
  // Stabilna szczelina = seria walk bez decyzji
  // Czytamy węzeł startowy i zbieramy wszystkie walki

  const startNode = worldDef.nodes.find(n => n.key === worldDef.startNodeKey);
  if (!startNode) throw new Error("Brak węzła startowego");

  // Zbierz walki z węzła (może być jedna lub więcej w przyszłości)
  const fightEffects = collectFightEffects(startNode);

  let allWon = true;
  const battleLogs: object[] = [];

  for (const fightEffect of fightEffects) {
    const entityId = fightEffect.entityPool
      ? pickFromPool(fightEffect.entityPool)
      : fightEffect.entityId!;

const entityDef = ENTITY_MAP.get(entityId);
    if (!entityDef) continue;

    // Drużyna walczy wspólnie — budujemy fighterów dla wszystkich uczestników
    const playerFighters: Fighter[] = [];
    for (const pid of participantIds) {
      try {
        const f = await buildFighter(pid);
        playerFighters.push(f);
      } catch {
        // Gracz mógł usunąć postać — pomijamy
      }
    }

    if (playerFighters.length === 0) {
      allWon = false;
      break;
    }

    const entityFighter = buildEntityFighter(entityDef);
    const battleResult = simulateBattle(playerFighters, [entityFighter as unknown as Fighter]);

    // Wygrywają jeśli żaden z graczy nie jest winnerId === entityFighter
    const partyWon = battleResult.winnerId !== null &&
      playerFighters.some(f => f.id === battleResult.winnerId);

    battleLogs.push({
      entityId,
      entityName: entityDef.name,
      partyWon,
      log: battleResult.log,
      summary: battleResult.summary,
    });


        for (const pid of participantIds) {
      await prisma.pveEncounter.create({
        data: {
          characterId: pid,
          locationLevel: 0,
          entityId,
          entityName: entityDef.name,
          playerWon: partyWon,
          runicShardsEarned: 0,
          battleLog: JSON.stringify(battleResult.log),
          summary: battleResult.summary,
          source: "rift",
        },
      });
    }
    
    if (!partyWon) {
      allWon = false;
      break; // porażka na dowolnym etapie = koniec
    }

    // Trofeum z entityPool (biała szczelina — dynamiczne mapowanie)
    if (fightEffect.entityPool && allWon) {
      const trophyKey = ENTITY_TROPHY_MAP[entityId];
      if (trophyKey) {
        // Losuj kto dostaje trofeum spośród kwalifikujących się
        await awardGroupTrophy(participantIds, trophyKey, party.riftKey, worldKey);
      }
    }
  }

  // ── NAGRODY ───────────────────────────────────────────────────────
  const results: object[] = [];

  for (const pid of participantIds) {
    const baseXp = randomInt(riftDef.baseXpMin, riftDef.baseXpMax);
    const xpMod = allWon ? randomInt(-10, 10) : -90; // porażka = 10% XP
    const finalXp = allWon
      ? Math.max(1, Math.round(baseXp * (1 + xpMod / 100)))
      : Math.max(1, Math.round(baseXp * 0.10));

    const levelResult = await addExperience(pid, finalXp);

    let prestigeEarned = 0;
    let prestigeLost = 0;
    let itemEarned: object | null = null;

    if (allWon) {
      prestigeEarned = riftDef.basePrestigeGain;
      await prisma.character.update({
        where: { id: pid },
        data: { prestige: { increment: prestigeEarned } },
      });

      // Przedmiot — losowy z puli szczeliny
      const pool = await prisma.item.findMany({ where: { rarity: "uncommon" } });
      if (pool.length > 0) {
        const chosen = pool[randomInt(0, pool.length - 1)]!;
        const trophyBonuses = await getRiftTrophyBonuses(pid);
        const effectiveMaxTier = Math.min(riftDef.itemTierMax + trophyBonuses.itemTierBonus, 10);
        const result = await addItemToChaosVaultWithMessage(
          pid, chosen.id, chosen.name, riftDef.itemTierMin, effectiveMaxTier
        );
        itemEarned = {
          name: chosen.name,
          rarity: chosen.rarity,
          tier: result.tier,
          message: result.message,
        };
      }
    } else {
      prestigeLost = randomInt(riftDef.prestigeLossMin, riftDef.prestigeLossMax);
      await prisma.character.update({
        where: { id: pid },
        data: { prestige: { decrement: prestigeLost } },
      });
    }

    results.push({
      characterId: pid,
      xpEarned: finalXp,
      levelResult: { level: levelResult.level, levelsGained: levelResult.levelsGained },
      prestigeEarned,
      prestigeLost,
      item: itemEarned,
    });
  }

  // ── ZAPIS WYNIKU ─────────────────────────────────────────────────
  const run = await prisma.stableRiftRun.create({
    data: {
      partyId: party.id,
      riftKey: party.riftKey,
      worldKey,
      success: allWon,
      results: JSON.stringify(results),
      battleLogs: JSON.stringify(battleLogs),
    },
  });

  await prisma.stableRiftParty.update({
    where: { id: party.id },
    data: { status: "completed", finishedAt: new Date() },
  });

  const riftDef2 = getRiftByKey(party.riftKey as RiftColor);
for (const [i, pid] of participantIds.entries()) {
  const personalResult = (results as any[])[i];
  const char = await prisma.character.findUnique({ where: { id: pid }, select: { avatarIndex: true } });
  await createReport(pid, "rift_stable", {
    viewerCharacterId: pid,
    avatarIndex: char?.avatarIndex ?? 0,
    riftKey: party.riftKey,
    riftName: riftDef2?.name ?? party.riftKey,
    worldKey,
    worldName: worldDef.name,
    success: allWon,
    battleLogs,
    personalResult,
    partyResults: results,
  });
}

  return {
    runId: run.id,
    riftKey: party.riftKey,
    worldKey,
    worldName: worldDef.name,
    success: allWon,
    battleLogs,
    results,
  };
}

// ── PRZYZNAJ TROFEUM GRUPIE ───────────────────────────────────────
// Losuje spośród uczestników którzy jeszcze nie mają tego trofeum.

async function awardGroupTrophy(
  participantIds: number[],
  trophyKey: string,
  riftKey: string,
  worldKey: string
): Promise<void> {
  const trophy = await prisma.riftTrophy.findUnique({ where: { key: trophyKey } });
  if (!trophy) return;

  // Filtruj tych którzy już mają trofeum
  const alreadyHave = await prisma.characterRiftTrophy.findMany({
    where: { trophyId: trophy.id, characterId: { in: participantIds } },
    select: { characterId: true },
  });
  const alreadyHaveIds = new Set(alreadyHave.map(r => r.characterId));
  const eligible = participantIds.filter(id => !alreadyHaveIds.has(id));

  if (eligible.length === 0) return;

  // Losuj jednego z uprawnionych
  const winner = eligible[Math.floor(Math.random() * eligible.length)]!;

  await prisma.characterRiftTrophy.create({
    data: {
      characterId: winner,
      trophyId: trophy.id,
      earnedInRiftKey: riftKey,
      earnedInWorldKey: worldKey,
    },
  });
}

// ── HELPER — zbierz efekty walki z węzła ─────────────────────────

function collectFightEffects(node: any): any[] {
  const fights: any[] = [];
  for (const choice of node.choices ?? []) {
    extractFights(choice.effect, fights);
  }
  return fights;
}

function extractFights(effect: any, acc: any[]): void {
  if (!effect) return;
  if (effect.type === "fight") {
    acc.push(effect);
    // Nie zagłębiamy się w onWin/onLose — stabilna ma tylko jedną walkę
    return;
  }
  // Dla goto/test schodzimy głębiej
  if (effect.nextNodeKey) return; // goto — nie zagłębiamy
  extractFights(effect.onSuccess, acc);
  extractFights(effect.onFailure, acc);
  extractFights(effect.onWin, acc);
  extractFights(effect.onLose, acc);
}

// ── FORMAT DRUŻYNY ────────────────────────────────────────────────

function formatParty(party: any): object {
  return {
    id: party.id,
    riftKey: party.riftKey,
    status: party.status,
    leaderId: party.leaderId,
    leaderName: party.leader?.name,
    createdAt: party.createdAt,
    scheduledAt: party.scheduledAt,
    members: (party.members ?? []).map((m: any) => ({
      memberId: m.id,
      characterId: m.characterId,
      characterName: m.character?.name,
      status: m.status,
      joinedAt: m.joinedAt,
    })),
    run: party.run ?? null,
  };
}

// ── LISTA AKTYWNYCH DRUŻYN W SZKOLE ──────────────────────────────

export async function getSchoolRiftParties(userId: number): Promise<object[]> {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const member = await prisma.schoolMember.findUnique({
    where: { characterId: character.id },
    select: { schoolId: true },
  });
  const director = await prisma.magicSchool.findFirst({
    where: { directorId: character.id },
    select: { id: true },
  });
  const schoolId = member?.schoolId ?? director?.id;
  if (!schoolId) throw new Error("Nie należysz do szkoły magii");

  const parties = await prisma.stableRiftParty.findMany({
    where: { schoolId, status: { in: ["forming", "ready"] } },
    include: {
      leader: true,
      members: { include: { character: true } },
      run: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return parties.map(formatParty);
}