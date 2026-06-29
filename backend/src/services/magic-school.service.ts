// ═══════════════════════════════════════════════════════════════════
// SERWIS — SZKOŁA MAGII
// ═══════════════════════════════════════════════════════════════════

import prisma from "../lib/prisma.js";
import {
  SCHOOL_BUILDINGS,
  CANTEEN_BONUSES,
  getMaxMembers,
  getLibrarySlots,
  getMaxActiveBonuses,
  type BuildingType,
} from "../data/school-buildings.js";

// ── HELPERY ───────────────────────────────────────────────────────

/** Zwraca postać gracza na podstawie userId lub rzuca błąd */
async function getCharacterOrThrow(userId: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");
  return character;
}

/** Sprawdza czy postać jest dyrektorem lub zastępcą w danej szkole */
async function getSchoolRole(
  characterId: number,
  schoolId: number
): Promise<"director" | "deputy" | "member" | null> {
  const school = await prisma.magicSchool.findUnique({
    where: { id: schoolId },
    select: { directorId: true },
  });
  if (!school) return null;
  if (school.directorId === characterId) return "director";

  const membership = await prisma.schoolMember.findUnique({
    where: { characterId },
    select: { role: true, schoolId: true },
  });
  if (!membership || membership.schoolId !== schoolId) return null;
  return membership.role as "deputy" | "member";
}

/** Czy ma uprawnienia zarządzania (dyrektor lub zastępca) */
function canManage(role: "director" | "deputy" | "member" | null): boolean {
  return role === "director" || role === "deputy";
}

/** Pobiera budynek szkoły lub zwraca obiekt z level=0 */
async function getBuilding(schoolId: number, buildingType: BuildingType) {
  const building = await prisma.schoolBuilding.findUnique({
    where: { schoolId_buildingType: { schoolId, buildingType } },
  });
  return building ?? { level: 0, isUpgrading: false, upgradeFinishesAt: null };
}

/** Sprawdza czy gracz jest już w jakiejś szkole */
async function isAlreadyInSchool(characterId: number): Promise<boolean> {
  const [asMember, asDirector] = await Promise.all([
    prisma.schoolMember.findUnique({ where: { characterId } }),
    prisma.magicSchool.findUnique({ where: { directorId: characterId } }),
  ]);
  return !!(asMember || asDirector);
}

// ── TWORZENIE SZKOŁY ──────────────────────────────────────────────

export async function createSchool(
  userId: number,
  name: string,
  abbreviation: string,
  description: string
) {
  const character = await getCharacterOrThrow(userId);

  // Sprawdź warunek wieży (min. poziom 10)
  const tower = await prisma.tower.findUnique({ where: { characterId: character.id } });
  if (!tower || tower.level < 1) {
    throw new Error("Aby założyć szkołę magii, Twoja wieża musi osiągnąć poziom 10.");
  }

  // Sprawdź czy gracz nie jest już w jakiejś szkole
  if (await isAlreadyInSchool(character.id)) {
    throw new Error("Jesteś już członkiem szkoły magii.");
  }

  // Walidacja nazwy
  const trimmedName = name?.trim() ?? "";
  if (trimmedName.length < 3 || trimmedName.length > 20) {
    throw new Error("Nazwa szkoły musi mieć od 3 do 20 znaków.");
  }

  // Walidacja skrótu
  const trimmedAbbr = abbreviation?.trim().toUpperCase() ?? "";
  if (trimmedAbbr.length < 2 || trimmedAbbr.length > 5) {
    throw new Error("Skrót szkoły musi mieć od 2 do 5 znaków.");
  }

  // Sprawdź unikalność
  const [nameExists, abbrExists] = await Promise.all([
    prisma.magicSchool.findUnique({ where: { name: trimmedName } }),
    prisma.magicSchool.findFirst({ where: { abbreviation: trimmedAbbr } }),
  ]);
  if (nameExists) throw new Error("Szkoła o tej nazwie już istnieje.");
  if (abbrExists) throw new Error("Szkoła z tym skrótem już istnieje.");

  const school = await prisma.magicSchool.create({
    data: {
      name: trimmedName,
      abbreviation: trimmedAbbr,
      description: description?.trim() ?? "",
      directorId: character.id,
    },
  });

  return school;
}

// ── PROFIL SZKOŁY ─────────────────────────────────────────────────

export async function getSchoolProfile(schoolId: number) {
  const school = await prisma.magicSchool.findUnique({
    where: { id: schoolId },
    include: {
      director: { select: { id: true, name: true, level: true } },
      members: {
        include: {
          character: { select: { id: true, name: true, level: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
      buildings: true,
      activeBonus: true,
    },
  });

  if (!school) throw new Error("Szkoła nie istnieje.");

  const mainHall = school.buildings.find(b => b.buildingType === "main_hall");
  const maxMembers = getMaxMembers(mainHall?.level ?? 0);
  const currentMembers = school.members.length + 1; // +1 za dyrektora

  return { ...school, maxMembers, currentMembers };
}

export async function getMySchool(userId: number) {
  const character = await getCharacterOrThrow(userId);

  const asDirector = await prisma.magicSchool.findUnique({
    where: { directorId: character.id },
  });
  if (asDirector) return getSchoolProfile(asDirector.id);

  const membership = await prisma.schoolMember.findUnique({
    where: { characterId: character.id },
  });
  if (membership) return getSchoolProfile(membership.schoolId);

  return null;
}

// ── EDYCJA PROFILU SZKOŁY ─────────────────────────────────────────

export async function editSchoolProfile(
  userId: number,
  schoolId: number,
  data: { description?: string; emblem?: string }
) {
  const character = await getCharacterOrThrow(userId);
  const role = await getSchoolRole(character.id, schoolId);
  if (!canManage(role)) throw new Error("Brak uprawnień do edycji szkoły.");

  return prisma.magicSchool.update({
    where: { id: schoolId },
    data: {
      ...(data.description !== undefined ? { description: data.description.trim() } : {}),
      ...(data.emblem !== undefined ? { emblem: data.emblem.trim() } : {}),
    },
  });
}

// ── ROZWIĄZANIE SZKOŁY ────────────────────────────────────────────

export async function dissolveSchool(userId: number, schoolId: number) {
  const character = await getCharacterOrThrow(userId);
  const role = await getSchoolRole(character.id, schoolId);
  if (role !== "director") {
    throw new Error("Tylko dyrektor może rozwiązać szkołę.");
  }

  // Usuń w odpowiedniej kolejności (relacje)
  await prisma.$transaction([
    prisma.schoolActiveBonus.deleteMany({ where: { schoolId } }),
    prisma.schoolLibrarySpell.deleteMany({ where: { schoolId } }),
    prisma.schoolBuilding.deleteMany({ where: { schoolId } }),
    prisma.schoolMember.deleteMany({ where: { schoolId } }),
    prisma.magicSchool.delete({ where: { id: schoolId } }),
  ]);

  return { dissolved: true };
}

// ── ZARZĄDZANIE CZŁONKAMI ─────────────────────────────────────────

/** Dyrektor/zastępca zaprasza konkretnego gracza (po characterId) */
export async function inviteMember(userId: number, schoolId: number, targetCharacterId: number) {
  const character = await getCharacterOrThrow(userId);
  const role = await getSchoolRole(character.id, schoolId);
  if (!canManage(role)) throw new Error("Brak uprawnień do zapraszania członków.");

  const school = await prisma.magicSchool.findUnique({
    where: { id: schoolId },
    include: { members: true, buildings: true },
  });
  if (!school) throw new Error("Szkoła nie istnieje.");

  const mainHall = school.buildings.find(b => b.buildingType === "main_hall");
  const maxMembers = getMaxMembers(mainHall?.level ?? 0);
  const currentCount = school.members.length + 1;
  if (currentCount >= maxMembers) {
    throw new Error(`Szkoła jest pełna (${currentCount}/${maxMembers}). Rozbuduj Salę Główną.`);
  }

  if (await isAlreadyInSchool(targetCharacterId)) {
    throw new Error("Ten gracz jest już członkiem innej szkoły.");
  }

  // Sprawdź czy target istnieje
  const target = await prisma.character.findUnique({ where: { id: targetCharacterId } });
  if (!target) throw new Error("Gracz nie istnieje.");

// Zamiast dodawać od razu — wyślij zaproszenie przez wiadomość systemową
  // i utwórz wpis z zaproszeniem (approve od razu, ale gracz musi sam dołączyć)
  // Usuń ewentualną poprzednią odrzuconą/pending prośbę, by zaproszenie działało
  await prisma.schoolJoinRequest.upsert({
    where: { schoolId_characterId: { schoolId, characterId: targetCharacterId } },
    update: { status: "invited", updatedAt: new Date() },
    create: { schoolId, characterId: targetCharacterId, status: "invited" },
  });

  await prisma.systemMessage.create({
    data: {
      characterId: targetCharacterId,
      type: "school",
      title: "Zaproszenie do szkoły magii",
      content: `Zostałeś zaproszony do szkoły magii. Kliknij, aby dołączyć: [DOŁĄCZ:${schoolId}]`,
    },
  });

  return { invited: true, characterId: targetCharacterId };
}


/** Gracz akceptuje zaproszenie do szkoły (status "invited") */
export async function acceptInvite(userId: number, schoolId: number) {
  const character = await getCharacterOrThrow(userId);

  if (await isAlreadyInSchool(character.id)) {
    throw new Error("Jesteś już członkiem szkoły magii.");
  }

  const request = await prisma.schoolJoinRequest.findUnique({
    where: { schoolId_characterId: { schoolId, characterId: character.id } },
  });
  if (!request || request.status !== "invited") {
    throw new Error("Brak aktywnego zaproszenia do tej szkoły.");
  }

  const school = await prisma.magicSchool.findUnique({
    where: { id: schoolId },
    include: { members: true, buildings: true, director: { select: { id: true } } },
  });
  if (!school) throw new Error("Szkoła nie istnieje.");

  const mainHall = school.buildings.find(b => b.buildingType === "main_hall");
  const maxMembers = getMaxMembers(mainHall?.level ?? 0);
  if (school.members.length + 1 >= maxMembers) {
    throw new Error("Szkoła jest pełna.");
  }

  await prisma.$transaction([
    prisma.schoolMember.create({
      data: { schoolId, characterId: character.id, role: "member" },
    }),
    prisma.schoolJoinRequest.update({
      where: { id: request.id },
      data: { status: "approved" },
    }),
  ]);

  // Powiadomienie do dyrektora i zastępców
  const deputies = await prisma.schoolMember.findMany({
    where: { schoolId, role: "deputy" },
    select: { characterId: true },
  });
  const notifyIds = [school.director.id, ...deputies.map(d => d.characterId)];
  await prisma.systemMessage.createMany({
    data: notifyIds.map(charId => ({
      characterId: charId,
      type: "Magiczne wieści" as const,
      title: "Nowy członek szkoły",
      content: `[PROFIL:${character.id}:${character.name}] dołączył do Twojej szkoły magii.`,
    })),
  });

  return { joined: true };
}

/** Gracz wysyła prośbę o dołączenie do szkoły (wymaga akceptacji zarządu) */
export async function requestJoinSchool(userId: number, schoolId: number) {
  const character = await getCharacterOrThrow(userId);

  if (await isAlreadyInSchool(character.id)) {
    throw new Error("Jesteś już członkiem szkoły magii.");
  }

  const school = await prisma.magicSchool.findUnique({
    where: { id: schoolId },
    include: {
      members: true,
      buildings: true,
      director: { select: { id: true, name: true } },
    },
  });
  if (!school) throw new Error("Szkoła nie istnieje.");

  const mainHall = school.buildings.find(b => b.buildingType === "main_hall");
  const maxMembers = getMaxMembers(mainHall?.level ?? 0);
  const currentCount = school.members.length + 1;
  if (currentCount >= maxMembers) {
    throw new Error(`Szkoła jest pełna (${currentCount}/${maxMembers} członków).`);
  }

  // Sprawdź czy prośba już istnieje
  const existing = await prisma.schoolJoinRequest.findUnique({
    where: { schoolId_characterId: { schoolId, characterId: character.id } },
  });
  if (existing) {
    if (existing.status === "pending") throw new Error("Twoja prośba o dołączenie oczekuje już na rozpatrzenie.");
    // Jeśli odrzucona — pozwól wysłać ponownie (upsert poniżej)
  }

  const request = await prisma.schoolJoinRequest.upsert({
    where: { schoolId_characterId: { schoolId, characterId: character.id } },
    update: { status: "pending", updatedAt: new Date() },
    create: { schoolId, characterId: character.id, status: "pending" },
  });

  // Powiadomienie do dyrektora i zastępców
  const deputies = await prisma.schoolMember.findMany({
    where: { schoolId, role: "deputy" },
    select: { characterId: true },
  });
  const notifyIds = [school.directorId, ...deputies.map(d => d.characterId)];

  await prisma.systemMessage.createMany({
    data: notifyIds.map(charId => ({
      characterId: charId,
      type: "Magiczne wieści" as const,
      title: "Prośba o dołączenie do szkoły",
      content: `[PROFIL:${character.id}:${character.name}] złożył wniosek o dołączenie do Twojej szkoły magii.`,
    })),
  });

  return request;
}

/** Dyrektor/zastępca akceptuje lub odrzuca prośbę o dołączenie */
export async function reviewJoinRequest(
  userId: number,
  schoolId: number,
  requestId: number,
  action: "approve" | "reject"
) {
  const character = await getCharacterOrThrow(userId);
  const role = await getSchoolRole(character.id, schoolId);
  if (!canManage(role)) throw new Error("Brak uprawnień do zarządzania prośbami o dołączenie.");

  const request = await prisma.schoolJoinRequest.findUnique({
    where: { id: requestId },
    include: { character: { select: { id: true, name: true } } },
  });
  if (!request || request.schoolId !== schoolId) throw new Error("Prośba nie istnieje.");
  if (request.status !== "pending") throw new Error("Ta prośba została już rozpatrzona.");

  if (action === "approve") {
    if (await isAlreadyInSchool(request.characterId)) {
      await prisma.schoolJoinRequest.update({ where: { id: requestId }, data: { status: "rejected" } });
      throw new Error("Ten gracz dołączył już do innej szkoły.");
    }

    const school = await prisma.magicSchool.findUnique({
      where: { id: schoolId },
      include: { members: true, buildings: true },
    });
    if (!school) throw new Error("Szkoła nie istnieje.");

    const mainHall = school.buildings.find(b => b.buildingType === "main_hall");
    const maxMembers = getMaxMembers(mainHall?.level ?? 0);
    if (school.members.length + 1 >= maxMembers) {
      throw new Error("Szkoła jest pełna. Nie można zaakceptować prośby.");
    }

    await prisma.$transaction([
      prisma.schoolMember.create({
        data: { schoolId, characterId: request.characterId, role: "member" },
      }),
      prisma.schoolJoinRequest.update({
        where: { id: requestId },
        data: { status: "approved" },
      }),
      // Powiadomienie dla wnioskującego gracza
      prisma.systemMessage.create({
        data: {
          characterId: request.characterId,
          type: "tutorial",
          title: "Prośba zaakceptowana!",
          content: `Twoja prośba o dołączenie do szkoły magii została zaakceptowana. Witaj w szeregach!`,
        },
      }),
    ]);

    // Powiadomienie do dyrektora i zastępców o nowym członku
    const deputies = await prisma.schoolMember.findMany({
      where: { schoolId, role: "deputy" },
      select: { characterId: true },
    });
    const school2 = await prisma.magicSchool.findUnique({ where: { id: schoolId }, select: { directorId: true } });
    const notifyIds = [school2!.directorId, ...deputies.map(d => d.characterId)].filter(id => id !== character.id);
    if (notifyIds.length > 0) {
      await prisma.systemMessage.createMany({
        data: notifyIds.map(charId => ({
          characterId: charId,
          type: "Magiczne wieści" as const,
          title: "Nowy członek szkoły",
          content: `[PROFIL:${request.characterId}:${request.character.name}] dołączył do Twojej szkoły magii.`,
        })),
      });
    }
  } else {
    await prisma.$transaction([
      prisma.schoolJoinRequest.update({
        where: { id: requestId },
        data: { status: "rejected" },
      }),
      prisma.systemMessage.create({
        data: {
          characterId: request.characterId,
          type: "school",
          title: "Prośba odrzucona",
          content: `Twoja prośba o dołączenie do szkoły magii została odrzucona.`,
        },
      }),
    ]);
  }

  return { requestId, action };
}

/** Zwraca listę oczekujących próśb o dołączenie do szkoły */
export async function getJoinRequests(userId: number, schoolId: number) {
  const character = await getCharacterOrThrow(userId);
  const role = await getSchoolRole(character.id, schoolId);
  if (!canManage(role)) throw new Error("Brak uprawnień.");

  return prisma.schoolJoinRequest.findMany({
    where: { schoolId, status: "pending" },
    include: {
      character: { select: { id: true, name: true, level: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

/** Zwraca status prośby gracza dla danej szkoły (null = brak prośby) */
export async function getMyJoinRequestStatus(userId: number, schoolId: number) {
  const character = await getCharacterOrThrow(userId);
  const request = await prisma.schoolJoinRequest.findUnique({
    where: { schoolId_characterId: { schoolId, characterId: character.id } },
    select: { id: true, status: true, createdAt: true },
  });
  return request ?? null;
}

export async function kickMember(userId: number, schoolId: number, targetCharacterId: number) {
  const character = await getCharacterOrThrow(userId);
  const role = await getSchoolRole(character.id, schoolId);
  if (!canManage(role)) throw new Error("Brak uprawnień.");

  const school = await prisma.magicSchool.findUnique({
    where: { id: schoolId },
    select: { directorId: true },
  });

  if (!school) throw new Error("Szkoła nie istnieje.");

  if (targetCharacterId === school.directorId) {
    throw new Error("Nie można wyrzucić dyrektora.");
  }

  if (role === "deputy") {
    const targetMembership = await prisma.schoolMember.findUnique({
      where: { characterId: targetCharacterId },
    });
    if (targetMembership?.role === "deputy") {
      throw new Error("Zastępca nie może wyrzucić innego zastępcy.");
    }
  }

  return prisma.schoolMember.delete({ where: { characterId: targetCharacterId } });
}

export async function leaveSchool(userId: number) {
  const character = await getCharacterOrThrow(userId);

  const asDirector = await prisma.magicSchool.findUnique({
    where: { directorId: character.id },
  });
  if (asDirector) {
    throw new Error("Dyrektor nie może opuścić szkoły. Najpierw przekaż stanowisko lub rozwiąż szkołę.");
  }

  const membership = await prisma.schoolMember.findUnique({
    where: { characterId: character.id },
  });
  if (!membership) throw new Error("Nie jesteś członkiem żadnej szkoły.");

  const schoolId = membership.schoolId;

  await prisma.schoolMember.delete({ where: { characterId: character.id } });

  const school = await prisma.magicSchool.findUnique({
    where: { id: schoolId },
    select: { directorId: true },
  });
  const deputies = await prisma.schoolMember.findMany({
    where: { schoolId, role: "deputy" },
    select: { characterId: true },
  });
  const notifyIds = [school!.directorId, ...deputies.map(d => d.characterId)];
  await prisma.systemMessage.createMany({
    data: notifyIds.map(charId => ({
      characterId: charId,
      type: "Magiczne wieści" as const,
      title: "Gracz opuścił szkołę",
      content: `[PROFIL:${character.id}:${character.name}] opuścił Twoją szkołę magii.`,
    })),
  });

  return { left: true };
}

export async function setDeputy(userId: number, schoolId: number, targetCharacterId: number) {
  const character = await getCharacterOrThrow(userId);
  const role = await getSchoolRole(character.id, schoolId);
  if (role !== "director") throw new Error("Tylko dyrektor może nadawać uprawnienia zastępcy.");

  const currentDeputies = await prisma.schoolMember.count({
    where: { schoolId, role: "deputy" },
  });
  if (currentDeputies >= 2) {
    throw new Error("Szkoła może mieć maksymalnie 2 zastępców.");
  }

  const targetMembership = await prisma.schoolMember.findUnique({
    where: { characterId: targetCharacterId },
  });
  if (!targetMembership || targetMembership.schoolId !== schoolId) {
    throw new Error("Ten gracz nie jest członkiem tej szkoły.");
  }

  return prisma.schoolMember.update({
    where: { characterId: targetCharacterId },
    data: { role: "deputy" },
  });
}

export async function removeDeputy(userId: number, schoolId: number, targetCharacterId: number) {
  const character = await getCharacterOrThrow(userId);
  const role = await getSchoolRole(character.id, schoolId);
  if (role !== "director") throw new Error("Tylko dyrektor może odbierać uprawnienia zastępcy.");

  return prisma.schoolMember.update({
    where: { characterId: targetCharacterId },
    data: { role: "member" },
  });
}

// ── WYSZUKIWANIE GRACZY (do zapraszania) ──────────────────────────

export async function searchCharacters(query: string) {
  if (!query || query.trim().length < 2) {
    throw new Error("Wyszukiwanie wymaga co najmniej 2 znaków.");
  }

  const results = await prisma.character.findMany({
    where: {
      name: { contains: query.trim(), mode: "insensitive" },
    },
    select: { id: true, name: true, level: true },
    orderBy: { name: "asc" },
    take: 8,
  });

  return results;
}

// ── BUDYNKI ───────────────────────────────────────────────────────

export async function upgradeBuilding(
  userId: number,
  schoolId: number,
  buildingType: BuildingType
) {
  const character = await getCharacterOrThrow(userId);
  const role = await getSchoolRole(character.id, schoolId);
  if (!canManage(role)) throw new Error("Brak uprawnień do rozbudowy budynków.");

  const config = SCHOOL_BUILDINGS[buildingType];
  if (!config) throw new Error("Nieznany typ budynku.");

  const currentBuilding = await getBuilding(schoolId, buildingType);

  if (currentBuilding.isUpgrading) {
    throw new Error("Budynek jest już w trakcie rozbudowy.");
  }
  if (currentBuilding.level >= config.maxLevel) {
    throw new Error(`Budynek osiągnął maksymalny poziom (${config.maxLevel}).`);
  }

  const nextLevel = currentBuilding.level + 1;
  const levelConfig = config.levels.find(l => l.level === nextLevel);
  if (!levelConfig) throw new Error("Błąd konfiguracji budynku.");

  if (character.runicStoneShards < levelConfig.costRunicShards) {
    throw new Error(
      `Potrzebujesz ${levelConfig.costRunicShards} okruchów runicznych, masz ${character.runicStoneShards}.`
    );
  }

  await prisma.character.update({
    where: { id: character.id },
    data: { runicStoneShards: { decrement: levelConfig.costRunicShards } },
  });

  const updated = await prisma.schoolBuilding.upsert({
    where: { schoolId_buildingType: { schoolId, buildingType } },
    update: { level: nextLevel, updatedAt: new Date() },
    create: { schoolId, buildingType, level: nextLevel },
  });

  return {
    building: updated,
    cost: levelConfig.costRunicShards,
    description: levelConfig.description,
  };
}

export async function getSchoolBuildings(schoolId: number) {
  const buildings = await prisma.schoolBuilding.findMany({ where: { schoolId } });

  return Object.values(SCHOOL_BUILDINGS).map(config => {
    const existing = buildings.find(b => b.buildingType === config.type);
    const currentLevel = existing?.level ?? 0;
    const nextLevel = currentLevel + 1;
    const nextLevelConfig = config.levels.find(l => l.level === nextLevel);

    return {
      type: config.type,
      name: config.name,
      currentLevel,
      maxLevel: config.maxLevel,
      isUpgrading: existing?.isUpgrading ?? false,
      upgradeFinishesAt: existing?.upgradeFinishesAt ?? null,
      nextLevelCost: nextLevelConfig?.costRunicShards ?? null,
      nextLevelDescription: nextLevelConfig?.description ?? null,
      levels: config.levels,
    };
  });
}

// ── BIBLIOTEKA CZARÓW ─────────────────────────────────────────────

export async function proposeLibrarySpell(userId: number, schoolId: number, spellId: number) {
  const character = await getCharacterOrThrow(userId);
  const role = await getSchoolRole(character.id, schoolId);
  if (role === null) throw new Error("Nie jesteś członkiem tej szkoły.");

  const library = await getBuilding(schoolId, "library");
  if (library.level === 0) throw new Error("Biblioteka nie jest jeszcze wybudowana.");

  const approvedCount = await prisma.schoolLibrarySpell.count({
    where: { schoolId, status: "approved" },
  });
  const maxSlots = getLibrarySlots(library.level);
  if (approvedCount >= maxSlots) {
    throw new Error(`Biblioteka jest pełna (${approvedCount}/${maxSlots} slotów). Rozbuduj bibliotekę.`);
  }

  const discovered = await prisma.spellbookEntry.findUnique({
    where: { characterId_spellId: { characterId: character.id, spellId } },
  });
  if (!discovered) throw new Error("Nie odkryłeś jeszcze tego czaru.");

  const existing = await prisma.schoolLibrarySpell.findUnique({
    where: { schoolId_spellId: { schoolId, spellId } },
  });
  if (existing) throw new Error("Ten czar jest już w bibliotece lub oczekuje na akceptację.");

  return prisma.schoolLibrarySpell.create({
    data: { schoolId, spellId, proposedById: character.id, status: "pending" },
  });
}

export async function reviewLibrarySpell(
  userId: number,
  schoolId: number,
  entryId: number,
  action: "approve" | "reject"
) {
  const character = await getCharacterOrThrow(userId);
  const role = await getSchoolRole(character.id, schoolId);
  if (!canManage(role)) throw new Error("Brak uprawnień do zarządzania biblioteką.");

  const entry = await prisma.schoolLibrarySpell.findUnique({ where: { id: entryId } });
  if (!entry || entry.schoolId !== schoolId) throw new Error("Wpis nie istnieje.");
  if (entry.status !== "pending") throw new Error("Ten wpis został już rozpatrzony.");

  if (action === "approve") {
    const library = await getBuilding(schoolId, "library");
    const approvedCount = await prisma.schoolLibrarySpell.count({
      where: { schoolId, status: "approved" },
    });
    if (approvedCount >= getLibrarySlots(library.level)) {
      throw new Error("Brak wolnych slotów w bibliotece.");
    }
  }

  return prisma.schoolLibrarySpell.update({
    where: { id: entryId },
    data: {
      status: action === "approve" ? "approved" : "rejected",
      reviewedById: character.id,
      reviewedAt: new Date(),
    },
  });
}

export async function removeLibrarySpell(userId: number, schoolId: number, entryId: number) {
  const character = await getCharacterOrThrow(userId);
  const role = await getSchoolRole(character.id, schoolId);
  if (!canManage(role)) throw new Error("Brak uprawnień.");

  const entry = await prisma.schoolLibrarySpell.findUnique({ where: { id: entryId } });
  if (!entry || entry.schoolId !== schoolId) throw new Error("Wpis nie istnieje.");

  return prisma.schoolLibrarySpell.delete({ where: { id: entryId } });
}

export async function learnFromLibrary(userId: number, schoolId: number, spellId: number) {
  const character = await getCharacterOrThrow(userId);
  const role = await getSchoolRole(character.id, schoolId);
  if (role === null) throw new Error("Nie jesteś członkiem tej szkoły.");

  const entry = await prisma.schoolLibrarySpell.findUnique({
    where: { schoolId_spellId: { schoolId, spellId } },
    include: { spell: true },
  });
  if (!entry || entry.status !== "approved") {
    throw new Error("Ten czar nie jest dostępny w bibliotece szkoły.");
  }

  const alreadyOwned = await prisma.characterSpell.findUnique({
    where: { characterId_spellId: { characterId: character.id, spellId } },
  });
  if (alreadyOwned) throw new Error("Już posiadasz ten czar.");

  const cost = entry.spell.basicCost;
  if (cost > 0 && character.powerShards < cost) {
    throw new Error(`Potrzebujesz ${cost} okruchów mocy, masz ${character.powerShards}.`);
  }

  await prisma.$transaction([
    ...(cost > 0
      ? [prisma.character.update({
          where: { id: character.id },
          data: { powerShards: { decrement: cost } },
        })]
      : []),
    prisma.characterSpell.create({
      data: { characterId: character.id, spellId },
    }),
    prisma.spellbookEntry.upsert({
      where: { characterId_spellId: { characterId: character.id, spellId } },
      update: {},
      create: { characterId: character.id, spellId, source: "school" },
    }),
  ]);

  return { spellId, cost, spellName: entry.spell.name };
}

export async function getLibrary(schoolId: number) {
  return prisma.schoolLibrarySpell.findMany({
    where: { schoolId },
    include: {
      spell: {
        select: {
          id: true, name: true, element: true, rarity: true,
          category: true, basicCost: true, bookDescription: true,
        },
      },
      proposedBy: { select: { id: true, name: true } },
    },
    orderBy: { proposedAt: "asc" },
  });
}

// ── BONUSY STOŁÓWKI ───────────────────────────────────────────────

export async function setActiveBonus(
  userId: number,
  schoolId: number,
  bonusKey: string,
  active: boolean
) {
  const character = await getCharacterOrThrow(userId);
  const role = await getSchoolRole(character.id, schoolId);
  if (!canManage(role)) throw new Error("Brak uprawnień do zarządzania bonusami.");

  const canteen = await getBuilding(schoolId, "canteen");
  if (canteen.level === 0) throw new Error("Stołówka nie jest wybudowana.");

  const bonusDef = CANTEEN_BONUSES.find(b => b.key === bonusKey);
  if (!bonusDef) throw new Error("Nieznany bonus.");
  if (canteen.level < bonusDef.unlockedAtLevel) {
    throw new Error(`Ten bonus wymaga stołówki na poziomie ${bonusDef.unlockedAtLevel}.`);
  }

  if (active) {
    const currentActive = await prisma.schoolActiveBonus.count({ where: { schoolId } });
    const maxActive = getMaxActiveBonuses(canteen.level);
    if (currentActive >= maxActive) {
      throw new Error(`Możesz aktywować maksymalnie ${maxActive} bonusy na tym poziomie stołówki.`);
    }

    await prisma.schoolActiveBonus.upsert({
      where: { schoolId_bonusKey: { schoolId, bonusKey } },
      update: {},
      create: { schoolId, bonusKey },
    });
  } else {
    await prisma.schoolActiveBonus.deleteMany({ where: { schoolId, bonusKey } });
  }

  return { bonusKey, active };
}

export async function getActiveBonuses(schoolId: number) {
  const school = await prisma.magicSchool.findUnique({
    where: { id: schoolId },
    include: { buildings: true, activeBonus: true },
  });
  if (!school) throw new Error("Szkoła nie istnieje.");

  const canteen = school.buildings.find(b => b.buildingType === "canteen");
  const canteenLevel = canteen?.level ?? 0;

  return CANTEEN_BONUSES
    .filter(b => b.unlockedAtLevel <= canteenLevel)
    .map(b => ({
      key: b.key,
      name: b.name,
      unit: b.unit,
      value: b.getValue(canteenLevel),
      isActive: school.activeBonus.some(a => a.bonusKey === b.key),
      unlockedAtLevel: b.unlockedAtLevel,
    }));
}

export async function getCharacterSchoolBonuses(characterId: number) {
  const asDirector = await prisma.magicSchool.findUnique({
    where: { directorId: characterId },
    include: { buildings: true, activeBonus: true },
  });

  const asMember = !asDirector
    ? await prisma.schoolMember.findUnique({
        where: { characterId },
        include: {
          school: { include: { buildings: true, activeBonus: true } },
        },
      })
    : null;

  const school = asDirector ?? asMember?.school ?? null;
  if (!school) return null;

  const canteen = school.buildings.find((b: { buildingType: string }) => b.buildingType === "canteen");
  const canteenLevel = canteen?.level ?? 0;
  if (canteenLevel === 0) return null;

  const result: Record<string, number> = {};
  for (const bonus of CANTEEN_BONUSES) {
    const isActive = school.activeBonus.some((a: { bonusKey: string }) => a.bonusKey === bonus.key);
    if (isActive && canteenLevel >= bonus.unlockedAtLevel) {
      result[bonus.key] = bonus.getValue(canteenLevel);
    }
  }
  return result;
}

export async function getExplorationLevelUnlock(
  characterId: number,
  explorationLevel: number
): Promise<boolean> {
  if (explorationLevel <= 2) return true;

  const requiredAstroLevel = explorationLevel - 2;

  const asDirector = await prisma.magicSchool.findUnique({
    where: { directorId: characterId },
    include: { buildings: { where: { buildingType: "astro_tower" } } },
  });

  const school = asDirector ?? await (async () => {
    const membership = await prisma.schoolMember.findUnique({
      where: { characterId },
      include: {
        school: {
          include: { buildings: { where: { buildingType: "astro_tower" } } },
        },
      },
    });
    return membership?.school ?? null;
  })();

  if (!school) return false;

  const astroTower = school.buildings.find(
    (b: { buildingType: string }) => b.buildingType === "astro_tower"
  );
  return (astroTower?.level ?? 0) >= requiredAstroLevel;
}

// ── LISTA SZKÓŁ (ranking/wyszukiwanie) ────────────────────────────

export async function listSchools(search?: string) {
  return prisma.magicSchool.findMany({
    where: search
      ? { name: { contains: search, mode: "insensitive" } }
      : undefined,
    include: {
      director: { select: { id: true, name: true, level: true } },
      members: { select: { id: true } },
      buildings: { where: { buildingType: "main_hall" } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

// --- Odrzucenie zaproszenia przez gracza ---
export async function rejectInvite(userId: number, schoolId: number) {
  const character = await getCharacterOrThrow(userId);
  const request = await prisma.schoolJoinRequest.findUnique({
    where: { schoolId_characterId: { schoolId, characterId: character.id } },
  });
  if (!request || request.status !== "invited") {
    throw new Error("Brak aktywnego zaproszenia do tej szkoły.");
  }
  await prisma.schoolJoinRequest.update({
    where: { id: request.id },
    data: { status: "rejected" },
  });
  return { rejected: true };
}