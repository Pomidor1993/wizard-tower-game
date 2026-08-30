import prisma from "../lib/prisma.js";


function rollTier(minTier: number, maxTier: number): number {
  const range = maxTier - minTier;
  const weights = Array.from({ length: range + 1 }, (_, i) => Math.pow(0.6, i));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i <= range; i++) {
    roll -= weights[i];
    if (roll <= 0) return minTier + i;
  }
  return minTier;
}

function tierMultiplier(tier: number): number {
  return 1 + (tier - 1) * 0.2;
}
function scaleValue(base: number, tier: number): number {
  return Math.round(base * tierMultiplier(tier));
}
function scaleItem(item: any, tier: number) {
  return {
    ...item,
    tier,
    bonusKnowledge:      scaleValue(item.bonusKnowledge,      tier),
    bonusIntelligence:   scaleValue(item.bonusIntelligence,   tier),
    bonusPower:          scaleValue(item.bonusPower,          tier),
    bonusEndurance:      scaleValue(item.bonusEndurance,      tier),
    bonusResistance:     scaleValue(item.bonusResistance,     tier),
    bonusInitiative:     scaleValue(item.bonusInitiative,     tier),
    bonusElementalMagic: scaleValue(item.bonusElementalMagic, tier),
    bonusAstralMagic:    scaleValue(item.bonusAstralMagic,    tier),
    bonusBloodMagic:     scaleValue(item.bonusBloodMagic,     tier),
    reqKnowledge:        scaleValue(item.reqKnowledge,        tier),
    reqIntelligence:     scaleValue(item.reqIntelligence,     tier),
    reqPower:            scaleValue(item.reqPower,            tier),
    reqEndurance:        scaleValue(item.reqEndurance,        tier),
    reqResistance:       scaleValue(item.reqResistance,       tier),
    reqInitiative:       scaleValue(item.reqInitiative,       tier),
    reqElementalMagic:   scaleValue(item.reqElementalMagic,   tier),
    reqAstralMagic:      scaleValue(item.reqAstralMagic,      tier),
    reqBloodMagic:       scaleValue(item.reqBloodMagic,       tier),
  };
}

// ── POJEMNOŚĆ KOMNATY NIEŁADU ─────────────────────────────────────────────────
// Każdy poziom Komnaty Nieładu daje +10 dostępnych ("widocznych") slotów
export function getVaultCapacity(buildingLevel: number): number {
  return buildingLevel * 10;
}

async function getChaosVaultLevel(characterId: number): Promise<number> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: { tower: { include: { buildings: true } } },
  });
  const building = character?.tower?.buildings.find(b => b.buildingType === "chaos_vault");
  return building?.level ?? 0;
}

// ── DODAJ PRZEDMIOT ────────────────────────────────────────────────────────────
// Tworzy nową instancję (OwnedItem) + wpis w Komnacie Nieładu
export async function addItemToChaosVault(characterId: number, itemId: number, tier: number = 1) {
  const owned = await prisma.ownedItem.create({
    data: { characterId, itemId, tier },
  });
  return prisma.chaosVaultItem.create({
    data: { ownedItemId: owned.id },
  });
}

// ── WIDOCZNE / SCHOWANE PRZEDMIOTY ─────────────────────────────────────────────
// "Widoczne" = najnowsze `capacity` przedmiotów w Komnacie — tylko te są
// interaktywne (można je założyć, sprzedać, zniszczyć). Reszta to "nadstan".
export async function getVisibleChaosVaultItems(characterId: number) {
  const vaultLevel = await getChaosVaultLevel(characterId);
  const capacity = getVaultCapacity(vaultLevel);

  const allEntries = await prisma.chaosVaultItem.findMany({
    where: { ownedItem: { characterId } },
    include: { ownedItem: { include: { item: true } } },
    orderBy: { addedAt: "asc" },
  });

  return {
    vaultLevel,
    capacity,
    total: allEntries.length,
    visible: allEntries.slice(0, capacity),
    hidden: allEntries.slice(capacity),
  };
}

// ── DODAJ PRZEDMIOT + KOMUNIKAT ────────────────────────────────────────────────
export async function addItemToChaosVaultWithMessage(
  characterId: number,
  itemId: number,
  itemName: string,
  minTier: number = 1,
  maxTier: number = 1
): Promise<{ message: string; overCapacity: boolean; chaosVaultItemId: number; ownedItemId: number; tier: number }> {
  const { total, capacity } = await getVisibleChaosVaultItems(characterId);

  const tier = rollTier(minTier, maxTier);  // ← losuj tier
  const created = await addItemToChaosVault(characterId, itemId, tier);

  const newTotal = total + 1;
  const overCapacity = newTotal > capacity;

  const tierSuffix = tier > 1 ? ` (tier ${tier})` : "";
  const message = overCapacity
    ? `${itemName} trafia do Twojej komnaty nieładu. Masz już za dużo artefaktów! Rozbuduj komnatę lub zniszcz bezużyteczne rzeczy w dezintegratorze, aby uzyskać dostęp do najnowszych przedmiotów.`
    : `${itemName} trafia do Twojej komnaty nieładu.`;

  return { message, overCapacity, chaosVaultItemId: created.id, ownedItemId: created.ownedItemId, tier };
}

// ── POBIERZ KOMNATĘ (widok dla frontu) ─────────────────────────────────────────
export async function getChaosVault(userId: number) {
  const character = await prisma.character.findUnique({ where: { userId } });
  if (!character) throw new Error("Postać nie znaleziona");

  const { vaultLevel, capacity, total, visible, hidden } = await getVisibleChaosVaultItems(character.id);

  return {
    vaultLevel,
    capacity,
    totalCount: total,
    hiddenCount: hidden.length,
    items: visible.map(entry => ({
      chaosVaultItemId: entry.id,
      ownedItemId: entry.ownedItemId,
      tier: entry.ownedItem.tier,
      item: scaleItem(entry.ownedItem.item, entry.ownedItem.tier),  // ← skaluj
      addedAt: entry.addedAt,
    })),
  };
}