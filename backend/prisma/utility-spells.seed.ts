// ═══════════════════════════════════════════════════════════════════════════════
// SEED — CZARY UŻYTKOWE
// Dodaj do swojego seed.ts (np. w sekcji po seedowaniu czarów bojowych)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Struktura:
//   spellType: "utility"
//   utilityEffect: JSON UtilityEffectDef
//   utilityDescriptions: JSON { "1": "...", "2": "...", "3": "...", "4": "...", "5": "..." }
//   category: "utility" (wyłącza czar z puli bojowej)
//   damage: 0, statusEffects: "[]", basicCost: 0 (brak kosztów bojowych)

import type { UtilityEffectDef } from "../src/types/utility-types.js";

function uEff(def: UtilityEffectDef): string {
  return JSON.stringify(def);
}

function uDesc(descs: Record<1|2|3|4|5, string>): string {
  return JSON.stringify(descs);
}

export const UTILITY_SPELLS = [
  // ── 1. Otwieranie zamków ──────────────────────────────────────────────────
  {
    name: "Otwieranie zamków",
    spellType: "utility",
    category: "utility",
    spellPool: "controlled",
    rarity: "common",
    element: "none",
    damage: 0,
    isDirectional: false,
    statusEffects: "[]",
    basicCost: 0,
    special: null,
    utilityEffect: uEff({ bonusItemFindChance: 10 }),
    utilityDescriptions: uDesc({
      1: "Próbuje za pomocą magii otworzyć przygotowaną skrzynię..Zamek drgnął! I to by było na tyle...",
      2: "Próbuje za pomocą magii otworzyć przygotowaną skrzynię..Zamek zaczyna podskakiwać, szarpać się, ale nie ustępuje.",
      3: "Próbuje za pomocą magii otworzyć przygotowaną skrzynię..Wysadził go.. Ale hej, brawa! Skrzynia jest otwarta!",
      4: "Próbuje za pomocą magii otworzyć przygotowaną skrzynię..Klik. Zamek płynnie odskoczył - piękna robota!",
      5: "Próbuje za pomocą magii otworzyć przygotowaną skrzynię..Klik. Klik. Klik. Klik...Otworzył wszystkie kłódki/zamki/blokady w okolicy! Nawet pobliskie drzewo się otworzyło!",
    }),
  },

  // ── 2. Telekineza ─────────────────────────────────────────────────────────
  {
    name: "Telekineza",
    spellType: "utility",
    category: "utility",
    spellPool: "controlled",
    rarity: "uncommon",
    element: "none",
    damage: 0,
    isDirectional: false,
    statusEffects: "[]",
    basicCost: 0,
    special: null,
    reqAstralMagic: 10,
    utilityEffect: uEff({ bonusItemFindChance: 20 }),
    utilityDescriptions: uDesc({
      1: "Próbuje za pomocą magii przyciągnąć {item}.. Drgnął! Chociaż nie bardzo wiadomo, czy to przez czar, czy przez mocniejszy wiatr..",
      2: "Próbuje za pomocą magii przyciągnąć {item}.. Ewidentnie go poruszył! Tylko niestety nie w tym kierunku, co trzeba.",
      3: "Próbuje za pomocą magii przyciągnąć {item}.. Udało się! Tylko trochę za mocno, przyciągnął go do siebie z taką siłą, że uderzenie zwaliło go z nóg!",
      4: "Próbuje za pomocą magii przyciągnąć {item}.. Udało się! {item} spokojnie ląduje we wskazanym miejscu.",
      5: "Próbuje za pomocą magii przyciągnąć {item}.. Udało się! {item} spokojnie ląduje we wskazanym miejscu.. wraz z kolejnymi pięcioma innymi przedmiotami, które przyciągnął przy okazji - brawo!",
    }),
  },

  // ── 3. Teleportacja ───────────────────────────────────────────────────────
  {
    name: "Teleportacja",
    spellType: "utility",
    category: "utility",
    spellPool: "chaotic",
    rarity: "uncommon",
    element: "chaos",
    damage: 0,
    isDirectional: false,
    statusEffects: "[]",
    basicCost: 0,
    special: null,
    utilityEffect: uEff({ bonusEncounterChance: 10 }),
    utilityDescriptions: uDesc({
      1: "Próbuje teleportować się za pomocą magii.. I udało mu się! Teleportował się o całe 2 centymetry. Nikt nic nie zauważył.",
      2: "Próbuje teleportować się za pomocą magii.. I udało mu się! Teleportował się o krok w bok, tylko niestety do góry nogami - upadek był dość bolesny..",
      3: "Próbuje teleportować się za pomocą magii.. I udało mu się! Teleportował się 3 kroki w bok. Niestety buty i szata zostały tam, gdzie był wcześniej..",
      4: "Próbuje teleportować się za pomocą magii.. I udało mu się! Teleportował się o 10 kroków do przodu - bardzo profesjonalnie!",
      5: "Próbuje teleportować się za pomocą magii.. I udało mu się! Teleportował się na drugi koniec areny, idealnie na środku przypadkowo wyrysowanego okręgu - perfekcyjnie!",
    }),
  },

  // ── 4. Lewitacja ─────────────────────────────────────────────────────────
  {
    name: "Lewitacja",
    spellType: "utility",
    category: "utility",
    spellPool: "controlled",
    rarity: "common",
    element: "air",
    damage: 0,
    isDirectional: false,
    statusEffects: "[]",
    basicCost: 0,
    special: null,
    utilityEffect: uEff({ avoidHitChance: 10 }),
    utilityDescriptions: uDesc({
      1: "Próbuje unieść się w powietrzu - Wydaje mu się, że na chwilę przestał dotykać ziemi, ale nikt poza nim nie jest w stanie tego potwierdzić.",
      2: "Próbuje unieść się w powietrzu - Odrywa się od podłoża na kilka centymetrów, ale traci przy tym równowagę i szybko wraca boleśnie na ziemię.",
      3: "Próbuje unieść się w powietrzu - Wznosi się na metr, po czym powoli, aczkolwiek niezbyt elegancko, wraca na ziemię.",
      4: "Próbuje unieść się w powietrzu - Wznosi się na kilka metrów po czym elegancko wraca na ziemię - wyglądało całkiem profesjonalnie!",
      5: "Próbuje unieść się w powietrzu - Wznosi się na kilkanaście metrów i z gracją przelatuje nad areną, po czym spokojnie ląduje na ziemi. - mógłby uczyć ptaki, jak latać!",
    }),
  },

  // ── 5. Jasnowidztwo ───────────────────────────────────────────────────────
  {
    name: "Jasnowidztwo",
    spellType: "utility",
    category: "utility",
    spellPool: "incantation",
    rarity: "rare",
    element: "astral",
    damage: 0,
    isDirectional: false,
    statusEffects: "[]",
    basicCost: 0,
    special: null,
    reqAstralMagic: 20,
    utilityEffect: uEff({ alwaysFirstInPve: true }),
    utilityDescriptions: uDesc({
      1: "W przygotowanej kuli próbuje wyczytać najbliższą przyszłość - ale chyba pomylił czary, bo kula pękła.",
      2: "W przygotowanej kuli próbuje wyczytać najbliższą przyszłość - i zgodnie z tym, co widać w kuli, w za chwilę będzie bardzo mgliście - szkoda, że akurat jest środek słonecznego dnia..",
      3: "W przygotowanej kuli próbuje wyczytać przyszłość - różne kształty w kuli zaczynają się ruszać.. Niezidentyfikowane, losowe, nic nie przypominające kształty.",
      4: "W przygotowanej kuli próbuje wyczytać przyszłość - w kuli wyraźnie widać jego przeciwnika, który rzuca kolejny czar.",
      5: "W przygotowanej kuli próbuje wyczytać przyszłość, po czym bez słowa robi dwa kroki w tył. Po chwili w miejscu, w którym stał, ląduje ptasia kupa.",
    }),
  },

  // ── 6. Naprawa ────────────────────────────────────────────────────────────
  {
    name: "Naprawa",
    spellType: "utility",
    category: "utility",
    spellPool: "controlled",
    rarity: "uncommon",
    element: "none",
    damage: 0,
    isDirectional: false,
    statusEffects: "[]",
    basicCost: 0,
    special: null,
    utilityEffect: uEff({ bonusItemTier: 1 }),
    utilityDescriptions: uDesc({
      1: "Próbuje za pomocą magii naprawić wskazane zniszczone krzesło - i jakimś cudem połamał je jeszcze bardziej..",
      2: "Próbuje za pomocą magii naprawić wskazane zniszczone krzesło - kilka elementów połączyło się ze sobą, ale w ogóle nie przypominają krzesła.",
      3: "Próbuje za pomocą magii naprawić wskazane zniszczone krzesło - udało mu się skleić przyzwoity taboret, ale oparcie niestety postanowiło go zignorować i pozostało na ziemi.",
      4: "Próbuje za pomocą magii naprawić wskazane zniszczone krzesło - po chwili mebel wygląda dokładnie tak, jak przed zniszczeniem.",
      5: "Próbuje za pomocą magii naprawić wskazane zniszczone krzesło - po chwili krzesło nie dość, że jest całe, to jeszcze zostało w pełni odrestaurowane i wygląda jak świeżo malowane!",
    }),
  },

  // ── 7. Ukrycie ────────────────────────────────────────────────────────────
  {
    name: "Ukrycie",
    spellType: "utility",
    category: "utility",
    spellPool: "chaotic",
    rarity: "common",
    element: "none",
    damage: 0,
    isDirectional: false,
    statusEffects: "[]",
    basicCost: 0,
    special: null,
    utilityEffect: uEff({ avoidEncounterChance: 10 }),
    utilityDescriptions: uDesc({
      1: "Próbuje za pomocą magii ukryć wskazany {item}... W efekcie świeci się tak bardzo, że teraz widać go nawet z kilometra.",
      2: "Próbuje za pomocą magii ukryć wskazany {item}... Wydaje się, że jego odcień jest trochę ciemniejszy, ale nikt nie jest w stanie tego stwierdzić na pewno.",
      3: "Próbuje za pomocą magii ukryć wskazany {item}, który w efekcie wyblakł.",
      4: "Próbuje za pomocą magii ukryć wskazany {item}, który w efekcie praktycznie wtapia się w otoczenie.",
      5: "Próbuje za pomocą magii ukryć wskazany {item}...jaki {item}?",
    }),
  },

  // ── 8. Niewidzialność ─────────────────────────────────────────────────────
  {
    name: "Niewidzialność",
    spellType: "utility",
    category: "utility",
    spellPool: "incantation",
    rarity: "rare",
    element: "none",
    damage: 0,
    isDirectional: false,
    statusEffects: "[]",
    basicCost: 0,
    special: null,
    reqAstralMagic: 15,
    utilityEffect: uEff({ avoidEncounterChance: 20 }),
    utilityDescriptions: uDesc({
      1: "Próbuje stać się niewidzialny.. Jedyne, co się zmieniło, to żyłka na jego czole, która zaczęła niebezpiecznie pulsować.",
      2: "Próbuje stać się niewidzialny.. Sprawił, że nie widać jego kapelusza, szaty i butów - smutny widok..",
      3: "Próbuje stać się niewidzialny.. Jego ciało i ubiór zaczynają wydawać się lekko przezroczyste, ale nadal można go zobaczyć.",
      4: "Próbuje stać się niewidzialny.. I udało mu się! Zapomniał tylko o swoim cieniu, którego radosne podskoki zdradzają jego pozycję.",
      5: "Próbuje stać się niewidzialny.. I teraz mamy problem, bo nikt nie wie, gdzie się podział.",
    }),
  },

  // ── 9. Portal ─────────────────────────────────────────────────────────────
  {
    name: "Portal",
    spellType: "utility",
    category: "utility",
    spellPool: "professional",
    rarity: "rare",
    element: "chaos",
    damage: 0,
    isDirectional: false,
    statusEffects: "[]",
    basicCost: 0,
    special: null,
    reqElementalMagic: 15,
    utilityEffect: uEff({ explorationTimeReduction: 20 }),
    utilityDescriptions: uDesc({
      1: "Próbuje stworzyć magiczny portal.. Efekt jest tak niestabilny, że już lepiej byłoby rzucić się z gołymi pięściami na tygrysa.",
      2: "Próbuje stworzyć magiczny portal.. Otworzyło się magiczne przejście, jednak jest tak małe, że skorzystać z niego mogą tylko okoliczne owady i małe myszy.",
      3: "Próbuje stworzyć magiczny portal.. Otworzyło się magiczne przejście, które wygląda całkiem solidnie, jednak trzeba kucać żeby przez nie przejść.",
      4: "Próbuje stworzyć magiczny portal.. Otworzone magiczne przejście pozwala na spokojne wejście i wyjście z drugiej strony areny.",
      5: "Próbuje stworzyć magiczny portal.. Magiczna brama jest tak potężna, że możnaby przez nią wysyłać słonie!",
    }),
  },

  // ── 10. Lot ───────────────────────────────────────────────────────────────
  {
    name: "Fajerwerki",
    spellType: "utility",
    category: "utility",
    spellPool: "controlled",
    rarity: "uncommon",
    element: "air",
    damage: 0,
    isDirectional: false,
    statusEffects: "[]",
    basicCost: 0,
    special: null,
    utilityEffect: uEff({ explorationTimeReduction: 10 }),
    utilityDescriptions: uDesc({
      1: "Próbuje wyczarować sztuczne ognie... Ups! Chyba spalił sobie brwi..",
      2: "Próbuje wyczarować sztuczne ognie... Mały fajerwerk wznosi się w powietrze, ale po chwili znika.",
      3: "Próbuje wyczarować sztuczne ognie... Mały fajerwerk wznosi się w powietrze i po chwili wybucha bardzo głośnym hukiem i biednym efektem wizualnym.",
      4: "Próbuje wyczarować sztuczne ognie... W niebo wzlatuje całkiem spory fajerwerk, który po wybuchu rozświetla niebo kolorowymi kwiatami!",
      5: "Próbuje wyczarować sztuczne ognie... W niebo wzlatuje cała seria fajerwerków, które przez kolejnych kilka minut rozświetlają niebo niebywałymi wzorami!.",
    }),
  },

  // ── 11. Luminescencja ─────────────────────────────────────────────────────
  {
    name: "Luminescencja",
    spellType: "utility",
    category: "utility",
    spellPool: "chaotic",
    rarity: "uncommon",
    element: "none",
    damage: 0,
    isDirectional: false,
    statusEffects: "[]",
    basicCost: 0,
    special: null,
    utilityEffect: uEff({ bonusItemFindChance: 10, bonusEncounterChance: 20 }),
    utilityDescriptions: uDesc({
      1: "Świecisz jak zgaszona latarnia. Nikogo i niczego nie przyciągasz.",
      2: "Delikatna poświata pomaga ci dostrzec więcej — i parę rzeczy dostrzega ciebie.",
      3: "Jasne światło wydobywa ukryte skarby i przyciąga różne stworzenia. Zyski i ryzyko w parze.",
      4: "Rozświetlasz okolicę jak pochodnia na wieży. Znajdujesz dużo — i dużo cię szuka.",
      5: "Jesteś widoczny z kilometra i zbierasz wszystko, co do ciebie leci — skarby i wrogów bez wyjątku.",
    }),
  },

  // ── 12. Czary-mary ────────────────────────────────────────────────────────
  {
    name: "Czary-mary",
    spellType: "utility",
    category: "utility",
    spellPool: "chaotic",
    rarity: "common",
    element: "chaos",
    damage: 0,
    isDirectional: false,
    statusEffects: "[]",
    basicCost: 0,
    special: null,
    utilityEffect: uEff({
      randomFrom: ["bonusItemFindChance", "bonusEncounterChance", "avoidEncounterChance", "avoidHitChance"],
      randomValue: 10,
    }),
    utilityDescriptions: uDesc({
      1: "Machasz rękoma i nic się nie dzieje. Może i lepiej — chaos rzadko kończy się dobrze.",
      2: "Coś zaiskrzyło. Trudno powiedzieć co, ale czujesz że byłeś szczęściarzem przez chwilę.",
      3: "Przypadkowa magia zadziałała — i to całkiem przyzwoicie.",
      4: "Szczęście sprzyja odważnym. Twój losowy czar dał dokładnie to, czego potrzebowałeś.",
      5: "Perfekcyjna improwizacja. Przypadek zadziałał jak plan — i to lepszy niż jakikolwiek mógłbyś ułożyć.",
    }),
  },

  // ── 13. Hokus-pokus ───────────────────────────────────────────────────────
  {
    name: "Hokus-pokus",
    spellType: "utility",
    category: "utility",
    spellPool: "chaotic",
    rarity: "uncommon",
    element: "chaos",
    damage: 0,
    isDirectional: false,
    statusEffects: "[]",
    basicCost: 0,
    special: null,
    utilityEffect: uEff({
      randomFrom: ["bonusItemFindChance", "bonusEncounterChance", "avoidEncounterChance", "avoidHitChance"],
      randomValue: 20,
    }),
    utilityDescriptions: uDesc({
      1: "Mówisz hokus-pokus i... nic. Przynajmniej ładnie brzmi.",
      2: "Kilka iskier i jeden efekt, który trudno opisać. Ale był!",
      3: "Solidna dawka losowej magii. Twoja sytuacja jest zdecydowanie lepsza.",
      4: "Cokolwiek zrobiłeś — zadziałało i to solidnie. Nie pytaj jak.",
      5: "Dwadzieścia procent na wszystko naraz. Chaos skoncentrowany w tobie. Niepowtarzalne.",
    }),
  },
] as const;