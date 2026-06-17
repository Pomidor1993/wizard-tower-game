import prisma from "../lib/prisma.js";

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
export async function addItemToChaosVault(characterId: number, itemId: number) {
  const owned = await prisma.ownedItem.create({
    data: { characterId, itemId },
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
    orderBy: { addedAt: "desc" },
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
  itemName: string
): Promise<{ message: string; overCapacity: boolean; chaosVaultItemId: number; ownedItemId: number }> {
  const { total, capacity } = await getVisibleChaosVaultItems(characterId);

  const created = await addItemToChaosVault(characterId, itemId);

  const newTotal = total + 1;
  const overCapacity = newTotal > capacity;

  const message = overCapacity
    ? `${itemName} trafia do Twojej komnaty nieładu. Masz już za dużo artefaktów! Rozbuduj komnatę lub zniszcz bezużyteczne rzeczy w dezintegratorze, aby uzyskać dostęp do najnowszych przedmiotów.`
    : `${itemName} trafia do Twojej komnaty nieładu.`;

  return { message, overCapacity, chaosVaultItemId: created.id, ownedItemId: created.ownedItemId };
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
      item: entry.ownedItem.item,
      addedAt: entry.addedAt,
    })),
  };
}