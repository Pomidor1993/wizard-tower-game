import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding items...");

  await prisma.item.createMany({
    skipDuplicates: true,
    data: [
      // ── SZATY ──
      { name: "Podarta szata nowicjusza",   rarity: "common",   slot: "robe",       bonusEndurance: 3 },
      { name: "Szata ucznia magii",          rarity: "uncommon", slot: "robe",       reqKnowledge: 5,  bonusEndurance: 8,  bonusPower: 2 },
      { name: "Szata arcymaga",              rarity: "rare",     slot: "robe",       reqKnowledge: 20, bonusEndurance: 20, bonusPower: 8 },
      // ── BUTY ──
      { name: "Znoszone buty",              rarity: "common",   slot: "boots",      bonusEndurance: 5 },
      { name: "Buty wędrowca",              rarity: "uncommon", slot: "boots",      reqKnowledge: 5,  bonusEndurance: 10, bonusAirMagic: 2 },
      // ── CZAPKI ──
      { name: "Słomkowy kapelusz",          rarity: "common",   slot: "hat",        bonusPower: 1 },
      { name: "Spiczasta czapka maga",      rarity: "uncommon", slot: "hat",        reqKnowledge: 5,  bonusPower: 4,  bonusInitiative: 2 },
      { name: "Kaptur chaosu",              rarity: "rare",     slot: "hat",        reqChaosMagic: 10,     bonusChaosMagic: 5,  bonusPower: 6 },
      // ── AMULETY ──
      { name: "Sznurek z kamieniem",        rarity: "common",   slot: "amulet",     bonusFireMagic: 1 },
      { name: "Magiczny łańcuch",           rarity: "uncommon", slot: "amulet",     reqKnowledge: 5,  bonusFireMagic: 3, bonusWaterMagic: 3, bonusEarthMagic: 3, bonusAirMagic: 3, bonusChaosMagic: 3 },
      // ── BRONIE JEDNORĘCZNE ──
      { name: "Chyba-magiczny-patyk",       rarity: "common",   slot: "weapon_one", weaponType: "one_handed", bonusEarthMagic: 1 },
      { name: "Różdżka ucznia",             rarity: "common",   slot: "weapon_one", weaponType: "one_handed", bonusInitiative: 2 },
      { name: "Kryształowa różdżka",        rarity: "uncommon", slot: "weapon_one", weaponType: "one_handed", reqKnowledge: 10, bonusInitiative: 5, bonusPower: 3 },
      // ── BRONIE DWURĘCZNE ──
      { name: "Drewniany kij",              rarity: "common",   slot: "weapon_two", weaponType: "two_handed", bonusEndurance: 5, bonusPower: 2 },
      { name: "Kostur wędrowca",            rarity: "uncommon", slot: "weapon_two", weaponType: "two_handed", reqKnowledge: 8,  bonusPower: 8, bonusInitiative: 4 },
      { name: "Wypełniony magią kostur",    rarity: "rare",     slot: "weapon_two", weaponType: "two_handed", reqKnowledge: 25, bonusPower: 18, bonusInitiative: 10 },
    ],
  });

  console.log("Seeding spells...");

  await prisma.spell.createMany({
    skipDuplicates: true,
    data: [
      { name: "Jamnik",                    element: "death", rarity: "common",   damage: 1,  spellPool: "chaotic", reqDeathMagic: 5, summonCount: 1, summonHp: 2, summonDamage: 1, summonElement: "death", summonInitiative: 2, summonTargetType: "randomEnemy", special: "Przywołujesz ożywiony szkielet jamnika, który atakuje przeciwnika zadając 1 pkt obrażeń, po czym rozpada się." },
      { name: "Kamienny Golem",            element: "earth", rarity: "common",   damage: 0,  spellPool: "chaotic", reqEarthMagic: 5, summonCount: 1, summonHp: 8, summonDamage: 2, summonElement: "earth", summonInitiative: 1, summonTargetType: "randomEnemy", special: "Przyzwałeś kamiennego golema. Jest tak kamienny, jak to tylko możliwe." },
      { name: "Mag",                       element: "life",  rarity: "rare",     damage: 0,  spellPool: "chaotic", reqLifeMagic: 50, reqEnergyMagic: 50, summonCount: 1, summonHp: 12, summonDamage: 3, summonElement: "life", summonInitiative: 5, summonTargetType: "randomEnemy", special: "Przywołałeś innego maga na pobojowisko!" },
      { name: "Modliszka",                 element: "earth", rarity: "common",   damage: 0,  spellPool: "chaotic", special: "Przywołałeś regularnych rozmiarów modliszkę, która zarysowała skórę na butach Twojego przeciwnika." },
      { name: "Karaluch",                  element: "earth", rarity: "common",   damage: 0,  spellPool: "chaotic", special: "Przywołałeś bardzo dużo karaluchów. Chodzenie po nich jest trochę nieprzyjemne." },
      { name: "Tygrys",                    element: "earth", rarity: "uncommon", damage: 3,  spellPool: "chaotic", reqLifeMagic: 10, summonCount: 1, summonHp: 6, summonDamage: 3, summonElement: "earth", summonInitiative: 4, summonTargetType: "randomEnemy", special: "Przywołałeś tygrysa! Nie wygląda na zbyt zachwyconego tą sytuacją..." },
      { name: "Biały Smok",                element: "fire",  rarity: "uncommon", damage: 2,  spellPool: "chaotic", reqLifeMagic: 10, reqFireMagic: 5, summonCount: 1, summonHp: 5, summonDamage: 2, summonElement: "fire", summonInitiative: 4, summonTargetType: "randomAlly", special: "Przywołałeś małego, białego smoka. Mimo rozmiarów, zieje on całkim gorącym ogniem." },
      { name: "Gestral",                   element: "life",  rarity: "common",   damage: 2,  spellPool: "chaotic", reqLifeMagic: 5, summonCount: 1, summonHp: 3, summonDamage: 2, summonElement: "life", summonInitiative: 3, summonTargetType: "randomAlly", special: "Przywołałeś Gestrala, który z radością dołącza do walki po Twojej stronie!" },
      { name: "Pełzacz",                   element: "chaos", rarity: "common",   damage: 2,  spellPool: "chaotic", summonCount: 1, summonHp: 2, summonDamage: 2, summonElement: "chaos", summonInitiative: 2, summonTargetType: "randomEnemy", special: "Przywołałeś Pełzacza, który atakuje Twoich przeciwników." },
      { name: "Szarzełek",                 element: "chaos", rarity: "common",   damage: 1,  spellPool: "chaotic", summonCount: 1, summonHp: 2, summonDamage: 1, summonElement: "chaos", summonInitiative: 1, summonTargetType: "randomEnemy", special: "Przywołałeś Szarzełka, który atakuje Twoich przeciwników." },
      { name: "Draugr",                    element: "death", rarity: "uncommon", damage: 3,  spellPool: "chaotic", reqDeathMagic: 5, summonCount: 1, summonHp: 5, summonDamage: 3, summonElement: "death", summonInitiative: 3, summonTargetType: "randomEnemy", special: "Przywołałeś Draugra, który z furią rzuca się na losowego przeciwnika." },
      { name: "Centaur",                   element: "earth", rarity: "common",   damage: 0,  spellPool: "chaotic", reqLifeMagic: 10, summonCount: 1, summonHp: 7, summonDamage: 2, summonElement: "earth", summonInitiative: 5, summonTargetType: "randomEnemy", special: "Przywołałeś Centaura. Nie wygląda na zbyt zadowolonego..." },
      { name: "Harpia",                    element: "air",   rarity: "common",   damage: 1,  spellPool: "chaotic", reqLifeMagic: 10, summonCount: 1, summonHp: 4, summonDamage: 1, summonElement: "air", summonInitiative: 5, summonTargetType: "randomEnemy", special: "Przywołałeś Harpię, która atakuje Twoich przeciwników." },
      { name: "Sklepikarz ze wsi",         element: "chaos", rarity: "common",   damage: 0,  spellPool: "chaotic", special: "Przywołałeś sklepikarza z okolicznej wsi. Patrzy na Ciebie z politowaniem, po czym odchodzi, jakby nic się nie wydarzyło." },
      { name: "Utopiec",                   element: "water", rarity: "uncommon", damage: 0,  spellPool: "chaotic", reqDeathMagic: 5, reqWaterMagic: 5, summonCount: 3, summonHp: 2, summonDamage: 1, summonElement: "water", summonInitiative: 1, summonTargetType: "randomEnemy", special: "Przywołałeś Utopce, które od razu rzucają się na wszystko, co wydaje się żyć." },
      { name: "Kaczka",                    element: "water", rarity: "common",   damage: 0,  spellPool: "chaotic", special: "Przywołujesz nad głową przeciwnika gumową kaczkę, która spadając, zadaje mu 0 obrażeń." },
      { name: "Jajko",                     element: "earth", rarity: "common",   damage: 0,  spellPool: "chaotic", special: "Przywołujesz nad głową przeciwnika jajko, które spadając, zadaje mu 0 obrażeń." },
      { name: "Prześcieradło",             element: "air",   rarity: "common",   damage: 0,  spellPool: "chaotic", special: "Przywołujesz nad głową przeciwnika ogromne prześcieradło, które spadając, blokuje jego ruchy." },
      { name: "Rój much",                  element: "chaos", rarity: "common",   damage: 0,  spellPool: "chaotic", special: "Przywołujesz nad głową przeciwnika ogromny rój much, które zmniejszają celność jego ataków o 25%." },
      { name: "Cegła",                     element: "earth", rarity: "common",   damage: 2,  spellPool: "chaotic", special: "Przywołujesz nad głową przeciwnika cegłę, która spadając zadaje 2 pkt obrażeń." },
      { name: "Kłoda",                     element: "earth", rarity: "common",   damage: 3,  spellPool: "chaotic", special: "Przywołujesz nad głową przeciwnika pokaźną kłodę, która spadając zadaje 3 pkt obrażeń." },
      { name: "Drzwi",                     element: "earth", rarity: "common",   damage: 2,  spellPool: "chaotic", special: "Przywołujesz nad głową przeciwnika rozpadające się drzwi, które spadając, zadają 2 pkt obrażeń." },
      { name: "Jabłka",                    element: "earth", rarity: "common",   damage: 1,  spellPool: "chaotic", special: "Przywołujesz nad głową przeciwnika kilkanaście jabłek, które spadając zadają 1 pkt obrażeń." },
      { name: "Mały wybuch",               element: "fire",  rarity: "common",   damage: 1,  spellPool: "chaotic", special: "Wywołujesz wybuch, który zadaje Ci 1 pkt obrażeń." },
      { name: "Motyle",                    element: "air",   rarity: "common",   damage: 0,  spellPool: "chaotic", reqLifeMagic: 5, special: "Przywołujesz chmarę pięknych, kolorowych motyli - przez chwilę wszyscy stoicie zauroczeni." },
      { name: "Sztabki złota",             element: "chaos", rarity: "common",   damage: 5,  spellPool: "chaotic", reqEnergyMagic: 15, special: "Przywołujesz deszcz sztabek złota." },
      { name: "Krasnale",                  element: "earth", rarity: "common",   damage: 0,  spellPool: "chaotic", reqLifeMagic: 10, summonCount: 3, summonHp: 1, summonDamage: 1, summonElement: "earth", summonInitiative: 2, summonTargetType: "randomEnemy", special: "Przywołujesz miniaturowe, żywe krasnale ogrodowe." },
      { name: "Wściekłe kurczaki",         element: "chaos", rarity: "common",   damage: 2,  spellPool: "chaotic", reqLifeMagic: 10, special: "Przywołujesz stado wściekłych kurczaków, które atakują przeciwnika." },
      { name: "Krzesło",                   element: "earth", rarity: "common",   damage: 0,  spellPool: "chaotic", special: "Przywołujesz krzesło, które bardzo agresywnie stoi." },
      { name: "Pomidorowy grad",           element: "water", rarity: "common",   damage: 1,  spellPool: "chaotic", reqEnergyMagic: 5, special: "Przywołujesz grad pomidorów, które spadając zadają wszystkim 1 pkt obrażeń." },
      { name: "Miecz dwuręczny",           element: "earth", rarity: "common",   damage: 0,  spellPool: "chaotic", special: "Przywołujesz potężny miecz dwuręczny. Tak potężny, że nie masz siły go podnieść." },
      { name: "Dzika roślina",             element: "life",  rarity: "common",   damage: 0,  spellPool: "chaotic", summonCount: 1, summonHp: 1, summonDamage: 1, summonElement: "life", summonInitiative: 0, summonTargetType: "randomAny", special: "Przywołujesz ogromną, dziką roślinę." },
      { name: "Porywisty wiatr",           element: "air",   rarity: "common",   damage: 0,  spellPool: "chaotic", special: "Przywołujesz porywisty wiatr." },
      { name: "Lodowisko",                 element: "water", rarity: "common",   damage: 0,  spellPool: "chaotic", special: "Udało Ci się sprawić, że całe podłoże zostało skute lotem." },
      { name: "Stado wron",                element: "air",   rarity: "common",   damage: 1,  spellPool: "chaotic", summonCount: 5, summonHp: 1, summonDamage: 1, summonElement: "air", summonInitiative: 3, summonTargetType: "randomEnemy", special: "Przywołujesz nad głową przeciwnika stado wron, które zaczynają go dziobać." },
      { name: "Własny cień",               element: "death", rarity: "common",   damage: 0,  spellPool: "chaotic", special: "Przywołujesz własny cień, który zaczyna Cię przedrzeźniać." },
      { name: "Iskierki",                  element: "fire",  rarity: "common",   damage: 0,  spellPool: "chaotic", reqFireMagic: 1, statusEffect: "burn", special: "Przywołujesz ogniste iskierki. Lekko się poparzyłeś." },
    ],
  });

  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());