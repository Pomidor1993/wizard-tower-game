// ═══════════════════════════════════════════════════════════════════════════════
// SEED — CZARY WSPIERAJĄCE
// src/prisma/seed-spells-supportive.ts
//
// Czary bojowe wspierające: nigdy nie zadają obrażeń bezpośrednich.
// Dostępne statusy: heal_chance, stat_boost, clean, resist, invisibility
// ═══════════════════════════════════════════════════════════════════════════════

import type { StatusEffectDef } from "../src/types/status-types.js";

function fx(effects: StatusEffectDef[]): string {
  return JSON.stringify(effects);
}

export const SUPPORTIVE_SPELLS = [

  // ════════════════════════════════════════════════════════════════════════════
  // HEAL_CHANCE — leczenie
  // ════════════════════════════════════════════════════════════════════════════

  {
    name: "Pomniejsze leczenie",
    category: "supportive", spellPool: "chaotic",
    rarity: "common", element: "life",
    bookDescription: "Jednorazowo leczy 25% utraconego życia.",
    damage: 0, basicCost: 0,
    reqBloodMagic: 5,
    spellTarget: "self",
    special: "Życiowa energia leczy 25% utraconego życia.",
    statusEffects: fx([{
      type: "heal_chance",
      healAmount: 25,
      healMode: "percent",
      statusChance: 100,
      target: "self",
      duration: 1,
    }]),
  },

  {
    name: "Leczenie",
    category: "supportive", spellPool: "controlled",
    rarity: "common", element: "life",
    bookDescription: "Jednorazowo leczy 50% utraconego życia.",
    damage: 0, basicCost: 0,
    reqBloodMagic: 20,
    spellTarget: "self",
    special: "Potężna życiowa energia leczy 50% utraconego życia.",
    statusEffects: fx([{
      type: "heal_chance",
      healAmount: 50,
      healMode: "percent",
      statusChance: 100,
      target: "self",
      duration: 1,
    }]),
  },

  {
    name: "Potężne leczenie",
    category: "supportive", spellPool: "incantation",
    rarity: "common", element: "life",
    bookDescription: "Jednorazowo leczy 75% utraconego życia.",
    damage: 0, basicCost: 0,
    reqBloodMagic: 35,
    spellTarget: "self",
    special: "Niszcząca moc życia leczy 75% utraconego życia.",
    statusEffects: fx([{
      type: "heal_chance",
      healAmount: 75,
      healMode: "percent",
      statusChance: 100,
      target: "self",
      duration: 1,
    }]),
  },

  {
    name: "Aura życia",
    category: "supportive", spellPool: "chaotic",
    rarity: "uncommon", element: "life",
    bookDescription: "Aura co turę daje 50% szansę na odzyskanie HP.",
    damage: 0, basicCost: 0,
    reqBloodMagic: 5,
    spellTarget: "self",
    special: "Otacza się aurą życiowej energii.",
    endInfo: "Aura życia wygasa.",
    statusEffects: fx([{
      type: "heal_chance",
      healAmount: 10,
      healMode: "flat",
      statusChance: 50,
      target: "self",
      duration: 5,
      tickInfo: "Aura leczy {target} o {damage} punktów życia.",
      failTickInfo: "Aura nie zadziałała w tej turze.",
    }]),
  },

  {
    name: "Pomniejsza aura lecząca",
    category: "supportive", spellPool: "chaotic",
    rarity: "common", element: "life",
    bookDescription: "Życiowa energia leczy co turę do trzech sojuszników.",
    damage: 0, basicCost: 0,
    reqBloodMagic: 10,
    spellTarget: "nAllies",
    spellTargetCount: 3,
    special: "Życiowa energia ogarnia sojuszników.",
    endInfo: "Aura lecząca zanika.",
    statusEffects: fx([{
      type: "heal_chance",
      healAmount: 10,
      healMode: "flat",
      statusChance: 100,
      target: "nAllies",
      count: 3,
      duration: 5,
      tickInfo: "Życiowa energia leczy {target} o {damage} punktów życia.",
    }]),
  },

  {
    name: "Aura lecząca",
    category: "supportive", spellPool: "controlled",
    rarity: "common", element: "life",
    bookDescription: "Silniejsza aura lecząca dla do trzech sojuszników.",
    damage: 0, basicCost: 0,
    reqBloodMagic: 25,
    spellTarget: "nAllies",
    spellTargetCount: 3,
    special: "Potężna życiowa energia ogarnia sojuszników.",
    endInfo: "Aura lecząca zanika.",
    statusEffects: fx([{
      type: "heal_chance",
      healAmount: 20,
      healMode: "flat",
      statusChance: 100,
      target: "nAllies",
      count: 3,
      duration: 5,
      tickInfo: "Życiowa energia leczy {target} o {damage} punktów życia.",
    }]),
  },

  {
    name: "Potężna aura lecząca",
    category: "supportive", spellPool: "incantation",
    rarity: "uncommon", element: "life",
    bookDescription: "Niszcząca aura lecząca dla do trzech sojuszników.",
    damage: 0, basicCost: 0,
    reqBloodMagic: 40,
    spellTarget: "nAllies",
    spellTargetCount: 3,
    special: "Niszcząca życiowa energia ogarnia sojuszników.",
    endInfo: "Aura lecząca zanika.",
    statusEffects: fx([{
      type: "heal_chance",
      healAmount: 30,
      healMode: "flat",
      statusChance: 100,
      target: "nAllies",
      count: 3,
      duration: 5,
      tickInfo: "Życiowa energia leczy {target} o {damage} punktów życia.",
    }]),
  },

  // ════════════════════════════════════════════════════════════════════════════
  // STAT_BOOST — wzmocnienie statystyk
  // ════════════════════════════════════════════════════════════════════════════

  {
    name: "Przyspieszenie",
    category: "supportive", spellPool: "chaotic",
    rarity: "uncommon", element: "none",
    bookDescription: "Znacząco zwiększa inicjatywę wszystkich sojuszników.",
    damage: 0, basicCost: 0,
    reqElementalMagic: 10,
    spellTarget: "allAllies",
    special: "Przyjemna bryza przyspiesza ruchy sojuszników.",
    endInfo: "Przyspieszenie przemija.",
    statusEffects: fx([{
      type: "stat_boost",
      stat: "initiative",
      statMode: "flat",
      statAmount: 15,
      target: "allAllies",
      duration: 5,
      tickInfo: "Przyspieszenie wciąż działa na {target}.",
    }]),
  },

  {
    name: "Lodowaty podmuch",
    category: "supportive", spellPool: "chaotic",
    rarity: "uncommon", element: "air",
    bookDescription: "Zwalnia wszystkich przeciwników, zmniejszając ich inicjatywę.",
    damage: 0, basicCost: 0,
    reqElementalMagic: 10,
    spellTarget: "allEnemies",
    special: "Lodowaty wiatr spowalnia ruchy wszystkich przeciwników.",
    endInfo: "Lodowaty podmuch ustaje.",
    statusEffects: fx([{
      type: "stat_boost",
      stat: "initiative",
      statMode: "percent",
      statAmount: -50,
      target: "allEnemies",
      duration: 5,
      tickInfo: "Inicjatywa {target} jest obniżona przez lodowaty podmuch.",
    }]),
  },

  {
    name: "Wzmocnienie",
    category: "supportive", spellPool: "chaotic",
    rarity: "uncommon", element: "none",
    bookDescription: "Wzmacnia własną siłę i inicjatywę.",
    damage: 0, basicCost: 0,
    reqAstralMagic: 5,
    spellTarget: "self",
    special: "Aura wzmocnienia otacza maga.",
    endInfo: "Wzmocnienie przemija.",
    statusEffects: fx([
      {
        type: "stat_boost",
        stat: "power",
        statMode: "flat",
        statAmount: 10,
        target: "self",
        duration: 5,
        tickInfo: "Wzmocnienie zwiększa siłę {target}.",
      },
      {
        type: "stat_boost",
        stat: "initiative",
        statMode: "flat",
        statAmount: 5,
        target: "self",
        duration: 5,
      },
    ]),
  },

  {
    name: "Osłabienie",
    category: "supportive", spellPool: "chaotic",
    rarity: "uncommon", element: "chaos",
    bookDescription: "Osłabia siłę i inicjatywę wszystkich przeciwników.",
    damage: 0, basicCost: 0,
    reqBloodMagic: 10,
    spellTarget: "allEnemies",
    special: "Mroczna magia osłabia wszystkich przeciwników.",
    endInfo: "Osłabienie ustępuje.",
    statusEffects: fx([
      {
        type: "stat_boost",
        stat: "power",
        statMode: "percent",
        statAmount: -25,
        target: "allEnemies",
        duration: 4,
        tickInfo: "Siła {target} jest osłabiona.",
      },
      {
        type: "stat_boost",
        stat: "initiative",
        statMode: "percent",
        statAmount: -25,
        target: "allEnemies",
        duration: 4,
      },
    ]),
  },

  // ════════════════════════════════════════════════════════════════════════════
  // CLEAN — usuwanie statusów
  // ════════════════════════════════════════════════════════════════════════════

  {
    name: "Oczyszczenie",
    category: "supportive", spellPool: "chaotic",
    rarity: "uncommon", element: "life",
    bookDescription: "Usuwa wszystkie negatywne statusy z siebie.",
    damage: 0, basicCost: 0,
    reqBloodMagic: 10,
    spellTarget: "self",
    special: "Życiowa energia oczyszcza ciało z negatywnych efektów.",
    statusEffects: fx([{
      type: "clean",
      cleanMode: "negative",
      target: "self",
      duration: null,
    }]),
  },

  {
    name: "Wielkie oczyszczenie",
    category: "supportive", spellPool: "controlled",
    rarity: "rare", element: "life",
    bookDescription: "Usuwa WSZYSTKIE statusy z siebie — pozytywne i negatywne.",
    damage: 0, basicCost: 0,
    reqBloodMagic: 25,
    spellTarget: "self",
    special: "Potężna życiowa energia zmywa wszelkie efekty magiczne.",
    statusEffects: fx([{
      type: "clean",
      cleanMode: "all",
      target: "self",
      duration: null,
    }]),
  },

  {
    name: "Aura oczyszczenia",
    category: "supportive", spellPool: "controlled",
    rarity: "rare", element: "life",
    bookDescription: "Usuwa negatywne statusy ze wszystkich sojuszników.",
    damage: 0, basicCost: 0,
    reqBloodMagic: 30,
    spellTarget: "allAllies",
    special: "Fala życiowej energii oczyszcza wszystkich sojuszników.",
    statusEffects: fx([{
      type: "clean",
      cleanMode: "negative",
      target: "allAllies",
      duration: null,
    }]),
  },

  // ════════════════════════════════════════════════════════════════════════════
  // RESIST — odporność na żywioły
  // ════════════════════════════════════════════════════════════════════════════

  // Permanentne tarcze dla siebie (duration: null)
  {
    name: "Pomniejsza ochrona przed ogniem",
    category: "supportive", spellPool: "chaotic",
    rarity: "common", element: "fire",
    bookDescription: "Daje częściową odporność na obrażenia od ognia.",
    damage: 0, basicCost: 0,
    reqElementalMagic: 5,
    spellTarget: "self",
    special: "Ogniste znaki pokrywają ciało absorbując część obrażeń od ognia.",
    statusEffects: fx([{
      type: "resist",
      element: "fire",
      value: 25,
      target: "self",
      duration: null,
    }]),
  },

  {
    name: "Ochrona przed ogniem",
    category: "supportive", spellPool: "controlled",
    rarity: "common", element: "fire",
    bookDescription: "Daje solidną odporność na obrażenia od ognia.",
    damage: 0, basicCost: 0,
    reqElementalMagic: 20,
    spellTarget: "self",
    special: "Silne ogniste znaki chronią przed obrażeniami od ognia.",
    statusEffects: fx([{
      type: "resist",
      element: "fire",
      value: 50,
      target: "self",
      duration: null,
    }]),
  },

  {
    name: "Potężna ochrona przed ogniem",
    category: "supportive", spellPool: "incantation",
    rarity: "uncommon", element: "fire",
    bookDescription: "Daje wysoką odporność na obrażenia od ognia.",
    damage: 0, basicCost: 0,
    reqElementalMagic: 35,
    spellTarget: "self",
    special: "Potężne ogniste znaki prawie całkowicie chronią przed ogniem.",
    statusEffects: fx([{
      type: "resist",
      element: "fire",
      value: 75,
      target: "self",
      duration: null,
    }]),
  },

  {
    name: "Pomniejsza ochrona przed wodą",
    category: "supportive", spellPool: "chaotic",
    rarity: "common", element: "water",
    bookDescription: "Daje częściową odporność na obrażenia od wody.",
    damage: 0, basicCost: 0,
    reqElementalMagic: 5,
    spellTarget: "self",
    special: "Czerwone znaki chronią przed obrażeniami od wody.",
    statusEffects: fx([{ type: "resist", element: "water", value: 25, target: "self", duration: null }]),
  },
  {
    name: "Ochrona przed wodą",
    category: "supportive", spellPool: "controlled",
    rarity: "common", element: "water",
    bookDescription: "Solidna odporność na obrażenia od wody.",
    damage: 0, basicCost: 0,
    reqElementalMagic: 20,
    spellTarget: "self",
    special: "Silne czerwone znaki chronią przed obrażeniami od wody.",
    statusEffects: fx([{ type: "resist", element: "water", value: 50, target: "self", duration: null }]),
  },
  {
    name: "Potężna ochrona przed wodą",
    category: "supportive", spellPool: "incantation",
    rarity: "uncommon", element: "water",
    bookDescription: "Wysoka odporność na obrażenia od wody.",
    damage: 0, basicCost: 0,
    reqElementalMagic: 35,
    spellTarget: "self",
    special: "Potężne czerwone znaki prawie całkowicie chronią przed wodą.",
    statusEffects: fx([{ type: "resist", element: "water", value: 75, target: "self", duration: null }]),
  },

  {
    name: "Pomniejsza ochrona przed powietrzem",
    category: "supportive", spellPool: "chaotic",
    rarity: "common", element: "air",
    bookDescription: "Daje częściową odporność na obrażenia od powietrza.",
    damage: 0, basicCost: 0,
    reqElementalMagic: 5,
    spellTarget: "self",
    special: "Białe znaki chronią przed obrażeniami od powietrza.",
    statusEffects: fx([{ type: "resist", element: "air", value: 25, target: "self", duration: null }]),
  },
  {
    name: "Ochrona przed powietrzem",
    category: "supportive", spellPool: "controlled",
    rarity: "common", element: "air",
    bookDescription: "Solidna odporność na obrażenia od powietrza.",
    damage: 0, basicCost: 0,
    reqElementalMagic: 20,
    spellTarget: "self",
    special: "Silne białe znaki chronią przed obrażeniami od powietrza.",
    statusEffects: fx([{ type: "resist", element: "air", value: 50, target: "self", duration: null }]),
  },
  {
    name: "Potężna ochrona przed powietrzem",
    category: "supportive", spellPool: "incantation",
    rarity: "uncommon", element: "air",
    bookDescription: "Wysoka odporność na obrażenia od powietrza.",
    damage: 0, basicCost: 0,
    reqElementalMagic: 35,
    spellTarget: "self",
    special: "Potężne białe znaki prawie całkowicie chronią przed powietrzem.",
    statusEffects: fx([{ type: "resist", element: "air", value: 75, target: "self", duration: null }]),
  },

  {
    name: "Pomniejsza ochrona przed ziemią",
    category: "supportive", spellPool: "chaotic",
    rarity: "common", element: "earth",
    bookDescription: "Daje częściową odporność na obrażenia od ziemi.",
    damage: 0, basicCost: 0,
    reqElementalMagic: 5,
    spellTarget: "self",
    special: "Brązowe znaki chronią przed obrażeniami od ziemi.",
    statusEffects: fx([{ type: "resist", element: "earth", value: 25, target: "self", duration: null }]),
  },
  {
    name: "Ochrona przed ziemią",
    category: "supportive", spellPool: "controlled",
    rarity: "common", element: "earth",
    bookDescription: "Solidna odporność na obrażenia od ziemi.",
    damage: 0, basicCost: 0,
    reqElementalMagic: 20,
    spellTarget: "self",
    special: "Silne brązowe znaki chronią przed obrażeniami od ziemi.",
    statusEffects: fx([{ type: "resist", element: "earth", value: 50, target: "self", duration: null }]),
  },
  {
    name: "Potężna ochrona przed ziemią",
    category: "supportive", spellPool: "incantation",
    rarity: "uncommon", element: "earth",
    bookDescription: "Wysoka odporność na obrażenia od ziemi.",
    damage: 0, basicCost: 0,
    reqElementalMagic: 35,
    spellTarget: "self",
    special: "Potężne brązowe znaki prawie całkowicie chronią przed ziemią.",
    statusEffects: fx([{ type: "resist", element: "earth", value: 75, target: "self", duration: null }]),
  },

  {
    name: "Pomniejsza ochrona przed chaosem",
    category: "supportive", spellPool: "chaotic",
    rarity: "common", element: "chaos",
    bookDescription: "Częściowa odporność na obrażenia od chaosu.",
    damage: 0, basicCost: 0,
    reqBloodMagic: 5,
    spellTarget: "self",
    special: "Fioletowe spirale absorbują część obrażeń od chaosu.",
    statusEffects: fx([{ type: "resist", element: "chaos", value: 25, target: "self", duration: null }]),
  },
  {
    name: "Ochrona przed chaosem",
    category: "supportive", spellPool: "controlled",
    rarity: "common", element: "chaos",
    bookDescription: "Solidna odporność na obrażenia od chaosu.",
    damage: 0, basicCost: 0,
    reqBloodMagic: 20,
    spellTarget: "self",
    special: "Silne fioletowe spirale chronią przed chaosem.",
    statusEffects: fx([{ type: "resist", element: "chaos", value: 50, target: "self", duration: null }]),
  },
  {
    name: "Potężna ochrona przed chaosem",
    category: "supportive", spellPool: "incantation",
    rarity: "uncommon", element: "chaos",
    bookDescription: "Wysoka odporność na obrażenia od chaosu.",
    damage: 0, basicCost: 0,
    reqBloodMagic: 35,
    spellTarget: "self",
    special: "Potężne fioletowe spirale prawie całkowicie chronią przed chaosem.",
    statusEffects: fx([{ type: "resist", element: "chaos", value: 75, target: "self", duration: null }]),
  },

  // Tarcze łączone
  {
    name: "Ochrona przed żywiołami",
    category: "supportive", spellPool: "controlled",
    rarity: "uncommon", element: "none",
    bookDescription: "Daje częściową odporność na wszystkie cztery żywioły.",
    damage: 0, basicCost: 0,
    reqElementalMagic: 15,
    spellTarget: "self",
    special: "Kombinowane znaki żywiołów chronią przed ogniem, wodą, powietrzem i ziemią.",
    statusEffects: fx([
      { type: "resist", element: "fire",  value: 20, target: "self", duration: null },
      { type: "resist", element: "water", value: 20, target: "self", duration: null },
      { type: "resist", element: "air",   value: 20, target: "self", duration: null },
      { type: "resist", element: "earth", value: 20, target: "self", duration: null },
    ]),
  },

  {
    name: "Potężna ochrona przed żywiołami",
    category: "supportive", spellPool: "incantation",
    rarity: "rare", element: "none",
    bookDescription: "Daje solidną odporność na wszystkie cztery żywioły.",
    damage: 0, basicCost: 0,
    reqElementalMagic: 25,
    spellTarget: "self",
    special: "Potężne znaki żywiołów chronią przed ogniem, wodą, powietrzem i ziemią.",
    statusEffects: fx([
      { type: "resist", element: "fire",  value: 40, target: "self", duration: null },
      { type: "resist", element: "water", value: 40, target: "self", duration: null },
      { type: "resist", element: "air",   value: 40, target: "self", duration: null },
      { type: "resist", element: "earth", value: 40, target: "self", duration: null },
    ]),
  },

  {
    name: "Kamienna skóra",
    category: "supportive", spellPool: "chaotic",
    rarity: "rare", element: "earth",
    bookDescription: "Skóra twardnieje jak kamień — odporność na obrażenia bazowe.",
    damage: 0, basicCost: 0,
    reqElementalMagic: 10,
    spellTarget: "self",
    special: "Skóra twardnieje jak kamień!",
    statusEffects: fx([{
      type: "resist",
      element: "none",
      value: 50,
      target: "self",
      duration: null,
    }]),
  },

  // ════════════════════════════════════════════════════════════════════════════
  // INVISIBILITY — niewidzialność
  // ════════════════════════════════════════════════════════════════════════════

  {
    name: "Zasłona mgły",
    category: "supportive", spellPool: "chaotic",
    rarity: "uncommon", element: "air",
    bookDescription: "Mgła daje 30% szansę na uniknięcie bycia celem w każdej turze.",
    damage: 0, basicCost: 0,
    spellTarget: "self",
    special: "Otacza się gęstą mgłą.",
    endInfo: "Mgła opada.",
    statusEffects: fx([{
      type: "invisibility",
      statusChance: 30,
      target: "self",
      duration: 4,
      tickInfo: "{target} kryje się w mgle.",
      failTickInfo: "Mgła nie ukrywa {target} w tej turze.",
    }]),
  },

  {
    name: "Cień",
    category: "supportive", spellPool: "controlled",
    rarity: "rare", element: "none",
    bookDescription: "Cień daje 50% szansę na uniknięcie bycia celem.",
    damage: 0, basicCost: 0,
    reqAstralMagic: 15,
    spellTarget: "self",
    special: "Zlewa się z cieniami.",
    endInfo: "Cień zanika.",
    statusEffects: fx([{
      type: "invisibility",
      statusChance: 50,
      target: "self",
      duration: 3,
      tickInfo: "{target} jest niemal niewidoczny.",
      failTickInfo: "Cień nie ukrywa {target} w tej turze.",
    }]),
  },

] as const;