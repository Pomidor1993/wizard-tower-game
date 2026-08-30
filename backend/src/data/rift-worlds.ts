// ═══════════════════════════════════════════════════════════════════
// KRAINY SZCZELIN
// src/data/rift-worlds.ts
//
// Każda kraina to kompletny scenariusz z drzewkiem decyzji.
//
// FORMAT WĘZŁA (RiftNode):
//   key         — unikalny identyfikator węzła w tej krainie
//   description — tekst pokazywany graczowi
//   choices     — lista opcji do wyboru (2 lub 3)
//   isEnd       — true = węzeł końcowy (podsumowanie nagrody i zamknięcie)
//
// FORMAT WYBORU (RiftChoice):
//   key         — identyfikator wyboru ("A"/"B"/"C")
//   label       — krótki tekst przycisku
//   requiredSpellName — opcjonalnie: czar wymagany do odblokowania opcji
//   effect      — co się dzieje po wyborze
//
// FORMAT EFEKTU (RiftChoiceEffect):
//   type: "goto"    — przejdź do węzła o danym key
//   type: "test"    — rzuć test z podaną szansą, sukces/porażka to kolejne goto
//   type: "fight"   — walka z podanym entityId, wygrana/przegrana to goto
//   type: "end"     — zakończenie szczeliny z opcjonalną nagrodą
//
// NAGRODY (RiftReward):
//   trophy      — klucz trofeum z rift-trophies.ts
//   item        — { rarity, tierMin, tierMax } lub null
//   xpModifier  — % modyfikator XP (np. +20, -30)
//   prestige    — czy przyznać prestiż za tę nagrodę (tylko po walce)
// ═══════════════════════════════════════════════════════════════════

// ── TYPY ────────────────────────────────────────────────────────────

export interface RiftReward {
  trophy?: string;        // klucz trofeum
  item?: {
    rarity: "common" | "uncommon" | "rare" | "unique";
    tierMin: number;
    tierMax: number;
  };
  xpModifier?: number;   // % modyfikator XP za tę ścieżkę
  prestige?: boolean;    // true = przyznaj prestiż za wygraną walkę (ustawiony na poziomie szczeliny)
  prestigeLoss?: boolean; // true = odejmij prestiż za przegraną walkę
}

export type RiftChoiceEffectType = "goto" | "test" | "fight" | "end";

export interface RiftChoiceEffect {
  type: RiftChoiceEffectType;

  // type: "goto"
  nextNodeKey?: string;

  // type: "test"
  testChance?: number;        // 0–1
  onSuccess?: RiftChoiceEffect;
  onFailure?: RiftChoiceEffect;

  // type: "fight"
  // entityId losowany z puli jeśli podana, inaczej stały
  entityId?: string;
  entityPool?: string[];      // losowanie spośród podanych entityId
  onWin?: RiftChoiceEffect;
  onLose?: RiftChoiceEffect;

  // type: "end"
  reward?: RiftReward;
  description?: string;       // tekst podsumowujący zakończenie
}

export interface RiftChoice {
  key: "A" | "B" | "C";
  label: string;              // krótki tekst przycisku
  requiredSpellName?: string; // pełna nazwa czaru wymagana do odblokowania (z bazy Spell.name)
  effect: RiftChoiceEffect;
}

export interface RiftNode {
  key: string;
  description: string;
  choices?: RiftChoice[];     // brak choices = węzeł końcowy (isEnd implied)
  isEnd?: boolean;
}

export interface RiftWorldDef {
  key: string;               // unikalny klucz krainy
  riftKey: string;           // szczelina, w której się pojawia
  name: string;              // wyświetlana nazwa
  startNodeKey: string;      // klucz węzła startowego
  nodes: RiftNode[];
  notebookDescription: string;
}

// ═══════════════════════════════════════════════════════════════════
// KRAINY — ZIELONA SZCZELINA
// ═══════════════════════════════════════════════════════════════════

const STOKROTKA: RiftWorldDef = {
  key: "stokrotka",
  riftKey: "green",
  name: "Stokrotka",
  startNodeKey: "start",
  notebookDescription: "Pachnąca polana",
  nodes: [

    {
      key: "start",
      description: "Po przejściu przez Szczelinę trafiasz na pachnącą wiosenną polanę. Gdzieś w oddali cicho strumyk płynie z wolna, a z pobliskiego gaju dochodzi wesołe pogwizdywanie. Wygląda niewinnie... podejrzanie niewinnie.",
      choices: [
        {
          key: "A",
          label: "Wejdź na polanę.",
          effect: {
            type: "test",
            testChance: 0.5,
            onSuccess: {
              type: "end",
              description: "Dostrzegasz samotny kwiat rosnący na środku polany — Stokrotkę. Podchodzisz bliżej i od razu Twoją uwagę przykuwa fakt, że ten kwiat... potrafi mówić! Żali się, że jest jej tu samotnie i pyta, czy byś jej stąd nie zabrał. Gadające kwiatki to rzadkość, więc nawet się nie zastanawiasz — delikatnie zrywasz kwiat i wracasz do swojej wieży.",
              reward: {
                trophy: "stokrotka",
                xpModifier: 20,
              },
            },
            onFailure: {
              type: "goto",
              nextNodeKey: "harcerz_fight",
            },
          },
        },
        {
          key: "B",
          label: "Wejdź do gaju.",
          effect: {
            type: "test",
            testChance: 0.6,
            onSuccess: {
              type: "end",
              description: "Rozglądając się po leśnym gaju, zauważasz, że pod drzewem leży kompletnie przez nikogo niepilnowany przedmiot. Podoba Ci się, a właściciela nie widać, więc postanawiasz zaopiekować się znaleziskiem, żeby się nie zmarnowało. Zadowolony z siebie, wracasz ze zdobyczą z powrotem do swojego świata.",
              reward: {
                item: { rarity: "uncommon", tierMin: 1, tierMax: 3 },
                xpModifier: 10,
              },
            },
            onFailure: {
              type: "end",
              description: "Wpadasz prosto w pokrzywy, które parzą całe Twoje łydki! Trzeba było ubrać dłuższe spodnie.. Zniechęcony, wracasz do siebie.",
              reward: {
                xpModifier: -10,
              },
            },
          },
        },
      ],
    },

    {
      key: "harcerz_fight",
      description: "Z krzaków wyskakuje nadgorliwy harcerz i rusza na Ciebie z bojowym okrzykiem.",
      choices: [
        {
          key: "A",
          label: "Walcz.",
          effect: {
            type: "fight",
            entityId: "rift_green_scout",
            onWin: {
              type: "end",
              description: "Harcerz próbuje zamachnąć się na Ciebie, ale straszna z niego ciamajda — potknął się i wpadł w pokrzywy! Po chwili wstał i zawstydzony odszedł wgłąb lasu, udając że w ogóle się nie spotkaliście. Zauważasz, że podczas upadku zgubił przedmiot. Podnosisz go szybko i wracasz do siebie.",
              reward: {
                item: { rarity: "uncommon", tierMin: 1, tierMax: 3 },
                prestige: true,
                xpModifier: 30,
              },
            },
            onLose: {
              type: "end",
              description: "Nie masz szczęścia. Harcerz wydawał się być łatwym przeciwnikiem, jednak jego wygląd najwyraźniej był bardzo mylący. Od ostatniego uderzenia aż zadzwoniło Ci w uszach. Nie widząc innego wyjścia, zwyczajnie uciekłeś przed przeciwnikiem. Na Twoje szczęście — potknął się przy pościgu.",
              reward: {
                prestigeLoss: true,
                xpModifier: -30,
              },
            },
          },
        },
        {
          key: "B",
          label: "Spróbuj uciec.",
          effect: {
            type: "test",
            testChance: 0.6,
            onSuccess: {
              type: "end",
              description: "Udaje Ci się zgubić harcerza w zaroślach. Wracasz bez szwanku.",
              reward: { xpModifier: 0 },
            },
            onFailure: {
              type: "fight",
              entityId: "rift_green_scout",
              onWin: {
                type: "end",
                description: "Harcerz dogonił Cię, ale w starciu okazał się nieporadny. Pokonujesz go i wracasz ze zdobyczą.",
                reward: {
                  item: { rarity: "uncommon", tierMin: 1, tierMax: 3 },
                  prestige: true,
                  xpModifier: 20,
                },
              },
              onLose: {
                type: "end",
                description: "Harcerz dogonił Cię i nie odpuścił. Wracasz poobijany.",
                reward: {
                  prestigeLoss: true,
                  xpModifier: -30,
                },
              },
            },
          },
        },
      ],
    },

  ],
};

// ─────────────────────────────────────────────────────────────────

const HOBBITON: RiftWorldDef = {
  key: "hobbiton",
  riftKey: "green",
  name: "Hobbiton",
  startNodeKey: "start",
  notebookDescription: "Sielankowa wioska z domkami wbudowanymi w pagórkach",
  nodes: [

    {
      key: "start",
      description: "Po drugiej stronie wita Cię spokojna kraina pełna soczyście zielonych pagórków. W ich zboczach ukryte są niewielkie domki z okrągłymi drzwiami i oknami, a z kominów unosi się zapach świeżo pieczonego chleba. W oddali słychać śmiech niewysokich mieszkańców i śpiew ptaków. Trudno uwierzyć, że ktokolwiek mógłby tu mieć złe zamiary... chyba że chodzi o drugie śniadanie.",
      choices: [
        {
          key: "A",
          label: "Rozglądaj się po okolicy w poszukiwaniu fantów.",
          effect: {
            type: "goto",
            nextNodeKey: "mieszkaniec_fight",
          },
        },
        {
          key: "B",
          label: "Wejdź do pobliskiego domku.",
          effect: {
            type: "goto",
            nextNodeKey: "domek",
          },
        },
        {
          key: "C",
          label: "Zejdź do piwniczki pod pagórkiem.",
          effect: {
            type: "goto",
            nextNodeKey: "piwniczka",
          },
        },
      ],
    },

    {
      key: "mieszkaniec_fight",
      description: "Gdy zaglądasz pomiędzy beczki stojące przy jednym z domków, zauważa Cię niski mieszkaniec okolicy. Z bojowym okrzykiem chwyta ciężką patelnię i rusza prosto na Ciebie.",
      choices: [
        {
          key: "A",
          label: "Walcz.",
          effect: {
            type: "fight",
            entityId: "rift_green_hobbit",
            onWin: {
              type: "end",
              description: "Właściciel patelni obrażony odchodzi, mamrocząc coś o 'bezczelnych turystach'. Zauważasz, że podczas zamieszania zgubił przedmiot. Zabierasz znalezisko i wracasz do swojej wieży.",
              reward: {
                item: { rarity: "uncommon", tierMin: 3, tierMax: 4 },
                prestige: true,
                xpModifier: 30,
              },
            },
            onLose: {
              type: "end",
              description: "Patelnia okazuje się zaskakująco skuteczną bronią. Wycofujesz się w popłochu, zanim miejscowi postanowią zaprosić Cię również na podwieczorek.",
              reward: {
                prestigeLoss: true,
                xpModifier: -30,
              },
            },
          },
        },
        {
          key: "B",
          label: "Spróbuj uciec.",
          effect: {
            type: "test",
            testChance: 0.4,
            onSuccess: {
              type: "end",
              description: "Udaje Ci się zgubić rozwścieczonego mieszkańca pomiędzy pagórkami. Wracasz do Zielonej Szczeliny.",
              reward: { xpModifier: 0 },
            },
            onFailure: {
              type: "fight",
              entityId: "rift_green_hobbit",
              onWin: {
                type: "end",
                description: "Mieszkaniec dogonił Cię, ale potknął się przy pierwszym ataku. Korzystasz z okazji i wygrywasz starcie. Wracasz ze zdobyczą.",
                reward: {
                  item: { rarity: "uncommon", tierMin: 3, tierMax: 4 },
                  prestige: true,
                  xpModifier: 20,
                },
              },
              onLose: {
                type: "end",
                description: "Mieszkaniec dogonił Cię i dał Ci porządną lekcję. Wracasz poobijany.",
                reward: {
                  prestigeLoss: true,
                  xpModifier: -30,
                },
              },
            },
          },
        },
      ],
    },

    {
      key: "domek",
      description: "W środku jest cicho i ciemno. Na półce stoi niewielki, bogato zdobiony kuferek.",
      choices: [
        {
          key: "A",
          label: "Użyj zaklęcia otwierającego.",
          requiredSpellName: "Otwieranie zamków",
          effect: {
            type: "end",
            description: "Zamek ustępuje bezgłośnie. W środku odnajdujesz Pierścień z dziwnymi znakami. Zabierasz go i dyskretnie opuszczasz domek.",
            reward: {
              trophy: "pierscien_z_dziwnymi_znakami",
              xpModifier: 20,
            },
          },
        },
        {
          key: "B",
          label: "Spróbuj otworzyć kuferek siłą.",
          effect: {
            type: "test",
            testChance: 0.25,
            onSuccess: {
              type: "end",
              description: "Po kilku mocnych szarpnięciach zamek puszcza. W środku znajduje się Pierścień z dziwnymi znakami.",
              reward: {
                trophy: "pierscien_z_dziwnymi_znakami",
                xpModifier: 10,
              },
            },
            onFailure: {
              type: "goto",
              nextNodeKey: "domek_wlasciciel",
            },
          },
        },
      ],
    },

    {
      key: "domek_wlasciciel",
      description: "Huk niesie się po całym domku. Po chwili wpada rozwścieczony właściciel z patelnią w ręku.",
      choices: [
        {
          key: "A",
          label: "Walcz.",
          effect: {
            type: "fight",
            entityId: "rift_green_hobbit",
            onWin: {
              type: "end",
              description: "Właściciel rezygnuje z walki. W zamieszaniu kuferek wypadł ze półki — w środku jest Pierścień z dziwnymi znakami. Twój.",
              reward: {
                trophy: "pierscien_z_dziwnymi_znakami",
                prestige: true,
                xpModifier: 20,
              },
            },
            onLose: {
              type: "end",
              description: "Właściciel wyrzuca Cię z domku. Bez trofeum, bez godności.",
              reward: {
                prestigeLoss: true,
                xpModifier: -30,
              },
            },
          },
        },
        {
          key: "B",
          label: "Spróbuj uciec.",
          effect: {
            type: "test",
            testChance: 0.4,
            onSuccess: {
              type: "end",
              description: "Wyskakujesz przez okno i wracasz do Zielonej Szczeliny.",
              reward: { xpModifier: 0 },
            },
            onFailure: {
              type: "fight",
              entityId: "rift_green_hobbit",
              onWin: {
                type: "end",
                description: "Złapał Cię, ale przegrał walkę. W zamieszaniu zdobywasz Pierścień.",
                reward: {
                  trophy: "pierscien_z_dziwnymi_znakami",
                  prestige: true,
                  xpModifier: 10,
                },
              },
              onLose: {
                type: "end",
                description: "Złapał Cię i wyrzucił. Wracasz z niczym.",
                reward: {
                  prestigeLoss: true,
                  xpModifier: -30,
                },
              },
            },
          },
        },
      ],
    },

    {
      key: "piwniczka",
      description: "W środku panuje przyjemny chłód. Przed Tobą rozchodzą się trzy wąskie korytarze.",
      choices: [
        {
          key: "A",
          label: "Skręć w lewo.",
          effect: {
            type: "end",
            description: "Trafiasz do niewielkiego składziku pełnego skrzynek. Jedna z nich zawiera przedmiot. Zabierasz go i wracasz do Szczeliny.",
            reward: {
              item: { rarity: "uncommon", tierMin: 3, tierMax: 4 },
              xpModifier: 10,
            },
          },
        },
        {
          key: "B",
          label: "Idź prosto.",
          effect: {
            type: "end",
            description: "Trafiasz do garderoby. Na drewnianym haczyku wisi idealnie wyprasowany Mały kaftanik. Nie masz pojęcia, kto nosi ubrania w takim rozmiarze, ale wygląda na cenną pamiątkę. Zabierasz go i wracasz do siebie.",
            reward: {
              trophy: "maly_kaftanik",
              xpModifier: 15,
            },
          },
        },
        {
          key: "C",
          label: "Skręć w prawo.",
          effect: {
            type: "test",
            testChance: 0.5,
            onSuccess: {
              type: "end",
              description: "Trafiasz do ogromnej spiżarni. Pośród zapasów znajdujesz przedmiot. Wracasz do Zielonej Szczeliny.",
              reward: {
                item: { rarity: "uncommon", tierMin: 3, tierMax: 4 },
                xpModifier: 10,
              },
            },
            onFailure: {
              type: "end",
              description: "To tylko pusta piwnica. Ktoś najwyraźniej zjadł wszystko przed Twoim przybyciem. Wracasz z pustymi rękami.",
              reward: { xpModifier: -5 },
            },
          },
        },
      ],
    },

  ],
};

// ─────────────────────────────────────────────────────────────────

const SZMARAGDOWE_MIASTO: RiftWorldDef = {
  key: "szmaragdowe_miasto",
  riftKey: "green",
  name: "Szmaragdowe Miasto",
  startNodeKey: "start",
  notebookDescription: "Kompletnie zielone miasto, w którym wszyscy noszą zielone okulary.",
  nodes: [

    {
      key: "start",
      description: "Po drugiej stronie wyrasta przed Tobą niezwykłe miasto zbudowane z lśniących zielonych wież i błyszczących pałaców. Wszystko zdaje się wykonane ze szmaragdu. Mieszkańcy spacerują w eleganckich strojach, a każdy nosi zielone okulary. Zauważasz, że Ty też nosisz takie okulary i, o dziwo, nie możesz ich ściągnąć! Na końcu szerokiej alei widać ogromny pałac.",
      choices: [
        {
          key: "A",
          label: "Ruszaj w stronę pałacu.",
          effect: {
            type: "goto",
            nextNodeKey: "palac_wejscie",
          },
        },
        {
          key: "B",
          label: "Zwiedzaj targ pełen dziwnych przedmiotów.",
          effect: {
            type: "goto",
            nextNodeKey: "targ",
          },
        },
        {
          key: "C",
          label: "Zejdź z głównej ulicy do opuszczonego ogrodu.",
          effect: {
            type: "goto",
            nextNodeKey: "ogrod",
          },
        },
      ],
    },

    {
      key: "palac_wejscie",
      description: "Przed wejściem zatrzymują Cię dwaj strażnicy w lśniących zielonych zbrojach.",
      choices: [
        {
          key: "A",
          label: "Przekonaj ich, że jesteś oczekiwanym gościem.",
          effect: {
            type: "test",
            testChance: 0.4,
            onSuccess: {
              type: "goto",
              nextNodeKey: "palac_sala",
            },
            onFailure: {
              type: "fight",
              entityId: "rift_green_guard",
              onWin: {
                type: "goto",
                nextNodeKey: "palac_sala_po_walce",
              },
              onLose: {
                type: "end",
                description: "Strażnicy wyprowadzają Cię za mury miasta, ostrzegając, abyś następnym razem umówił wizytę wcześniej.",
                reward: {
                  prestigeLoss: true,
                  xpModifier: -30,
                },
              },
            },
          },
        },
        {
          key: "B",
          label: "Od razu zaatakuj strażników.",
          effect: {
            type: "fight",
            entityId: "rift_green_guard",
            onWin: {
              type: "goto",
              nextNodeKey: "palac_sala_po_walce",
            },
            onLose: {
              type: "end",
              description: "Strażnicy wyprowadzają Cię za mury miasta.",
              reward: {
                prestigeLoss: true,
                xpModifier: -30,
              },
            },
          },
        },
      ],
    },

    {
      key: "palac_sala_po_walce",
      description: "Strażnicy uciekają w popłochu, zostawiając przy bramie niepilnowaną ozdobną skrzynię z wyposażeniem pałacowej straży. Szybko bierzesz pierwszy rzucający się w oczy przedmiot, po czym cicho pogwizdując wchodzisz do pałacu.",
      choices: [
        {
          key: "A",
          label: "Idź na środek sali i poszukaj jedzenia.",
          effect: {
            type: "goto",
            nextNodeKey: "palac_lew",
          },
        },
        {
          key: "B",
          label: "Trzymaj się na uboczu i szukaj czegoś ciekawego.",
          effect: {
            type: "end",
            description: "Gdy wszyscy są zajęci zabawą, niepostrzeżenie wymykasz się do jednej z bocznych komnat. W ozdobnej gablocie zauważasz przedmiot. Szybko chowasz zdobycz do plecaka i uciekasz przez okno tuż przed strażnikiem.",
            reward: {
              item: { rarity: "rare", tierMin: 3, tierMax: 5 },
              prestige: true,
              xpModifier: 20,
            },
          },
        },
      ],
    },

    {
      key: "palac_sala",
      description: "Strażnicy przepuszczają Cię. W ogromnej sali balowej bawią się elegancko ubrani mieszkańcy Szmaragdowego Miasta.",
      choices: [
        {
          key: "A",
          label: "Idź śmiało na środek sali.",
          effect: {
            type: "goto",
            nextNodeKey: "palac_lew",
          },
        },
        {
          key: "B",
          label: "Trzymaj się na uboczu i szukaj czegoś ciekawego.",
          effect: {
            type: "end",
            description: "Gdy wszyscy są zajęci zabawą, niepostrzeżenie wymykasz się do jednej z bocznych komnat. W ozdobnej gablocie zauważasz przedmiot. Szybko chowasz zdobycz do plecaka i uciekasz przez okno tuż przed strażnikiem.",
            reward: {
              item: { rarity: "rare", tierMin: 3, tierMax: 5 },
              xpModifier: 20,
            },
          },
        },
      ],
    },

    {
      key: "palac_lew",
      description: "Pośród gości przechadza się bardzo futrzasty jegomość z pokaźnym wąsem i medalami przypiętymi do zielonego munduru. Na Twój widok natychmiast blednie... po czym wpada w panikę.\n— To na pewno potwór! Ratujcie mnie! — wrzeszczy.",
      choices: [
        {
          key: "A",
          label: "Spróbuj uspokoić Człowieka-Lwa.",
          effect: {
            type: "test",
            testChance: 0.2,
            onSuccess: {
              type: "end",
              description: "Udaje Ci się przekonać go, że nie zamierzasz nikogo zjadać. Człowiek-Lew zawstydzony przeprasza za całe zamieszanie i w ramach przeprosin wręcza Ci swój Medal Odwagi. Nie bardzo wiedząc, co powinieneś zrobić dalej, po prostu opuszczasz pałac i wracasz do Zielonej Szczeliny.",
              reward: {
                trophy: "medal_odwagi",
                xpModifier: 20,
              },
            },
            onFailure: {
              type: "fight",
              entityId: "rift_green_cowardly_lion",
              onWin: {
                type: "end",
                description: "Po kilku ciosach Człowiek-Lew przypomina sobie, że przecież jest... tchórzliwy. Z głośnym rykiem ucieka pod najbliższy stół, zostawiając na posadzce swój Medal Odwagi. Nie czekając na nic, szybko podnosisz medal i uciekasz do szczeliny.",
                reward: {
                  trophy: "medal_odwagi",
                  prestige: true,
                  xpModifier: 30,
                },
              },
              onLose: {
                type: "end",
                description: "Okazuje się, że tchórzliwy nie oznacza słaby. Człowiek-Lew błyskawicznie powala Cię na ziemię, po czym... sam ucieka z sali. Korzystając z zamieszania, szybko wycofujesz się do Zielonej Szczeliny.",
                reward: {
                  prestigeLoss: true,
                  xpModifier: -20,
                },
              },
            },
          },
        },
      ],
    },

    {
      key: "targ",
      description: "Między stoiskami dostrzegasz starszego jubilera polerującego niewielką zieloną broszę. Widząc Twoje zainteresowanie, uśmiecha się tajemniczo.",
      choices: [
        {
          key: "A",
          label: "Grzecznie z nim porozmawiaj.",
          effect: {
            type: "end",
            description: "Starzec opowiada historię miasta, po czym stwierdza, że dawno nie spotkał kogoś, kto naprawdę słucha. Wręcza Ci Szmaragdową Broszę.",
            reward: {
              trophy: "szmaragdowa_brosza",
              xpModifier: 15,
            },
          },
        },
        {
          key: "B",
          label: "Spróbuj go okraść.",
          effect: {
            type: "test",
            testChance: 0.3,
            onSuccess: {
              type: "end",
              description: "Zręcznie chowasz broszę do kieszeni, zanim jubiler cokolwiek zauważy.",
              reward: {
                trophy: "szmaragdowa_brosza",
                xpModifier: 10,
              },
            },
            onFailure: {
              type: "goto",
              nextNodeKey: "targ_jubiler_walka",
            },
          },
        },
      ],
    },

    {
      key: "targ_jubiler_walka",
      description: "Jubiler zauważył, co próbujesz zrobić! Wyciąga zza lady piękny, zielony kostur i rzuca się na Ciebie z wściekłym krzykiem.",
      choices: [
        {
          key: "A",
          label: "Uciekaj!",
          effect: {
            type: "test",
            testChance: 0.4,
            onSuccess: {
              type: "end",
              description: "Udaje Ci się uciec. Wracasz do Zielonej Szczeliny bez broszki, ale i bez guza.",
              reward: { xpModifier: 0 },
            },
            onFailure: {
              type: "fight",
              entityId: "rift_green_jeweler",
              onWin: {
                type: "end",
                description: "Jubiler w końcu odpuszcza. W ferworze walki brosza wypadła na ziemię — Twoja.",
                reward: {
                  trophy: "szmaragdowa_brosza",
                  prestige: true,
                  xpModifier: 20,
                },
              },
              onLose: {
                type: "end",
                description: "Jubiler okazał się krzepki. Wracasz poobijany i bez broszki.",
                reward: {
                  prestigeLoss: true,
                  xpModifier: -30,
                },
              },
            },
          },
        },
        {
          key: "B",
          label: "Walcz.",
          effect: {
            type: "fight",
            entityId: "rift_green_jeweler",
            onWin: {
              type: "end",
              description: "Jubiler odpuszcza. Brosza Twoja.",
              reward: {
                trophy: "szmaragdowa_brosza",
                prestige: true,
                xpModifier: 20,
              },
            },
            onLose: {
              type: "end",
              description: "Jubiler okazał się krzepki. Wracasz poobijany.",
              reward: {
                prestigeLoss: true,
                xpModifier: -30,
              },
            },
          },
        },
      ],
    },

    {
      key: "ogrod",
      description: "W samym środku ogrodu stoi stara kamienna altana. Na marmurowym postumencie spoczywa para niezwykle eleganckich pantofelków, które delikatnie połyskują w słońcu.",
      choices: [
        {
          key: "A",
          label: "Zabierz pantofelki.",
          effect: {
            type: "end",
            description: "Gdy tylko bierzesz je do rąk, delikatny podmuch wiatru unosi wokół Ciebie zielone płatki. Wygląda na to, że nikt nie zamierza Cię zatrzymywać.",
            reward: {
              trophy: "rubinowe_pantofelki",
              xpModifier: 15,
            },
          },
        },
        {
          key: "B",
          label: "Zostaw je na miejscu.",
          effect: {
            type: "end",
            description: "Uznajesz, że nie warto ryzykować gniewu właściciela. Po krótkim spacerze opuszczasz ogród i wracasz do Zielonej Szczeliny.",
            reward: { xpModifier: 0 },
          },
        },
      ],
    },

  ],
};

// ═══════════════════════════════════════════════════════════════════
// KRAINY — BIAŁA SZCZELINA (stabilna)
// ═══════════════════════════════════════════════════════════════════

const RUST_WASTELAND: RiftWorldDef = {
  key: "rust_wasteland",
  riftKey: "white",
  name: "Rdzewiejące Pustkowie",
  startNodeKey: "start",
  notebookDescription: "Świat pełen śmieci, złomu i rdzy.",
  nodes: [

    {
      // Stabilna szczelina = brak decyzji, tylko walka
      // Silnik rift-group.service.ts czyta pierwszą walkę z węzła startowego
      key: "start",
      description: "Szczelina otwiera się na rozległe, rdzewiejące pustkowie. Niebo ma kolor rdzy, ziemia skrzypi pod nogami jak zużyty metal. W oddali widać sylwetkę człowieka, który zdecydowanie nie wygląda przyjaźnie.",
      choices: [
        {
          key: "A",
          label: "Walcz.",
          effect: {
            type: "fight",
            // Losowanie spośród dwóch przeciwników
            entityPool: ["white_golas", "white_blue_suit"],
            onWin: {
              type: "end",
              description: "Pustkowie milknie. Przeciwnik pada, zostawiając po sobie trofeum.",
              reward: {
                // Trofeum przypisywane dynamicznie w serwisie na podstawie entityId który wylosowano:
                // white_golas -> "kamien", white_blue_suit -> "swiecace_cos"
                prestige: true,
                xpModifier: 10,
              },
            },
            onLose: {
              type: "end",
              description: "Pustkowie okazało się za trudne. Wyprawa zakończona niepowodzeniem.",
              reward: {
                prestigeLoss: true,
                xpModifier: 0,
              },
            },
          },
        },
      ],
    },

  ],
};

// ═══════════════════════════════════════════════════════════════════
// KATALOG KRAIN
// ═══════════════════════════════════════════════════════════════════

export const RIFT_WORLDS: RiftWorldDef[] = [
  STOKROTKA,
  HOBBITON,
  SZMARAGDOWE_MIASTO,
  RUST_WASTELAND,
];

// ── HELPERY ──────────────────────────────────────────────────────

export function getRiftWorldByKey(key: string): RiftWorldDef | undefined {
  return RIFT_WORLDS.find(w => w.key === key);
}

export function getRiftWorldsByRift(riftKey: string): RiftWorldDef[] {
  return RIFT_WORLDS.filter(w => w.riftKey === riftKey);
}

export function getNode(world: RiftWorldDef, nodeKey: string): RiftNode | undefined {
  return world.nodes.find(n => n.key === nodeKey);
}

// Mapowanie entityId -> klucz trofeum dla białej szczeliny
// (używane przez rift-group.service gdy walka losuje z entityPool)
export const ENTITY_TROPHY_MAP: Record<string, string> = {
  "white_golas":     "kamien",
  "white_blue_suit": "swiecace_cos",
};