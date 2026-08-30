// src/data/shared-messages.ts

// ── WSPÓLNE KOMUNIKATY DLA RAPORTÓW PVE (studia, eksploracja, szczeliny niestabilne) ──

export const PVE_LOSS_OR_DRAFT_SUMMARY_MESSAGE =
  "Dziwna ta magia.. Niby taka potężna, a jednak nie mogłeś z jej pomocą pokonać swojego przeciwnika. Ale nie kłopocz się, na pewno następnym razem wrócisz silniejszy!";

export const PVE_WIN_SUMMARY_MESSAGE =
  "Pokonałeś przeciwnika! O twojej potędze powinno się opowiadać legendy! Co prawda niestety nikt tego nie zrobi, bo nie było świadków, ale i tak możesz być z siebie dumny.";  

export const PVP_DRAFT_SUMMARY_MESSAGE = 
  "Wyczerpani bojem, postanowiliście zgodnie zaprzestać walki — dokończycie ją kiedy indziej.";

export const PVP_LOSS_SUMMARY_MESSAGE =
  "Skąd Twój przeciwnik znał tak dobrze sztuki magiczne? Tego nie wiesz, ale może kiedyś się dowiesz... albo nie. W każdym razie, nie poddawaj się!";

export const PVP_WIN_SUMMARY_MESSAGE =
  "Pokonałeś innego maga! Twoja duma i ego mogą teraz szybować w przestworzach!";  

// -------- STUDIA -----------//
// ── WIADOMOŚCI STARTowe
// Indeksy: [poziom][subkategoria-1]
export const STUDY_START_MESSAGES: Record<number, [string, string, string]> = {
  1: [
    "Postanowiłeś spróbować odkryć jakiś nowy czar poprzez chaotyczne machanie rękoma. Kto wie, może coś z tego wyjdzie…",
    "Postanowiłeś… bełkotać? No, dobra, każdy ma swój styl.",
    "Postanowiłeś zaimprowizować przedstawienie kukiełkowe - tylko niestety nie masz kukiełek.. Więc czas na teatrzyk cieni!",
  ],
  2: [
    "Zacząłeś wykonywać pozornie sensowne gesty dłońmi - wygląda, jakbyś próbował nakreślić w powietrzu kształt nowego kapelusza.",
    "Cicho mamroczesz pod nosem, starając się nadać swoim słowom tajemniczy wydźwięk.",
    "Twoje szalone wygibasy przypominają taniec ćmy wokół świecy. Może to zadziała?",
  ],
  3: [
    "Twoje wymachy sprawiają wrażenie, jakbyś dyrygował orkiestrą - kto wie, może to właśnie jest metoda?",
    "Mamroczesz słowa w innych językach - może akurat trafisz w coś odpowiednio magicznego?",
    "Skoro taniec deszczu przywołuje deszcz, a taniec śmierci śmierć, to energiczny taniec przywołuje energię..prawda?",
  ],
  4: [
    "Wykonujesz opanowane, konsekwentne ruchy dłońmi - sprawiasz wrażenie, jakbyś dokładnie wiedział, co robisz - oby magia też tak uważała.",
    "Chcesz stworzyć czar rymowany, trudnymi słowami opisany, potężną mocą wypełniony, oby nie wyszły z tego wredne demony..",
    "Te kocie ruchy można podziwiać! Może magia też je doceni?",
  ],
  5: [
    "Wykonywane przez Ciebie gesty wyglądają iście magicznie! To ma naprawdę potencjał na coś potężnego.",
    "Księga ze starożytnymi formułami, którą znalazłeś jakiś czas temu, w końcu daje się odczytać - zobaczymy, co z tego wyniknie.",
    "Zaczynasz wykonywać rytuał, którego moc jest tak potężna, że aż trzęsą się ściany - to może zaowocować wyjątkową magią!",
  ],
};

// ── WIADOMOŚCI O NIEpowodzeniu (losowane, gdy nie odkryto czaru) ──
// Tablica tablic: [poziom][subkategoria-1] = string[]
export const STUDY_FAIL_MESSAGES: Record<number, [string[], string[], string[]]> = {
  1: [
    [
      "Machałeś, machałeś… i przypadkiem uderzyłeś się o kant stojącego obok regału. Poza tym, nic magicznego się nie wydarzyło.",
      "Machałeś bardzo energicznie! Magia zaczęła się kumulować wokół, aż w końcu, dzięki Twojej skoncentrowanej aktywności… powstało coś, co jest tak bezużyteczne, że nawet nie wiesz jak to skomentować. Najlepiej wyrzucić to przez i udawać, że nic się nie wydarzyło.",
    ],
    [
      "Próbowałeś bełkotać coś pod nosem… 'ble ble ble'… i totalnie nic się nie wydarzyło.",
      "Próbowałeś bełkotać coś pod nosem… 'abrakadabra hokus pokus'… i usłyszałeś w swojej głowie głos pytający, dlaczego przeszkadzasz mu w porannej kawie. Stałeś przez chwilę w ciszy udając, że to wcale nie Ty.",
    ],
    [
      "Twoje wygibasy przypominały taniec połamanej marionetki. Niby nikt tego nie widział, ale i tak czułeś na sobie współczujące spojrzenia.",
      "Wykonałeś serię tak szalonych piruetów, że straciłeś równowagę i runąłeś na podłogę. Czy to było magiczne? Niekoniecznie. Czy to było bolesne? Zdecydowanie tak.",
    ],
  ],
  2: [
    [
      "Twoje gesty były tak precyzyjne, że przypadkiem stworzyłeś papierową żabkę. Żabka ożyła, wyskoczyła przez okno i… tyle.",
      "Machałeś jak natchniony, ale jedyne co osiągnąłeś to przewrócenie kałamarza. Atrament rozlał się po całym stole - magia zniszczenia, ale nie taka, o jaką Ci chodziło.",
    ],
    [
      "Mamrotałeś, mamrotałeś… aż w końcu usłyszałeś echo swojego głosu w pustej sali. Nie, to nie magia, to po prostu akustyka.",
      "Twoje słowa brzmiały tak obco, że nawet Ty nie wiedziałeś, co mówisz. Magia nie wiedziała tego na pewno.",
    ],
    [
      "Tańczyłeś tak dziko, że potknąłeś się o własną szatę i wylądowałeś na podłodze. Z magii nic nie wyszło, ale za to poczułeś, że żyjesz.",
      "Wygibasy, które wykonałeś, były tak skomplikowane, że sam nie wiedziałeś, że tak można. Nic magicznego się nie wydarzyło, ale z taką ilością ruchu czujesz się o wiele lepiej!.",
    ],
  ],
  3: [
    [
      "Machanie było tak gwałtowne, że prawie wywróciłeś świecznik. Iskry poleciały, ale to niestety tylko zwykłe, niemagiczne iskry.",
      "Twoje synchroniczne ruchy wyglądały tak, jakbyś prowadził chór Aniołów. Niestety, Anioły nie przyszły.",
    ],
    [
      "Mamrotałeś coś, co brzmiało jak zaklęcie, ale w rzeczywistości użyty ciąg słów można było przetłumaczyć jako przepis na całkiem dobrą zupę pomidorową.",
      "Pomysł z mamrotaniem słów zagranicznych był świetny! Tylko niestety magia totalnie Cię nie zrozumiała.",
    ],
    [
      "Twój taniec przypominał walkę z niewidzialnym wrogiem. Niestety, wróg wygrał.",
      "Energii w Twoim tańcu było mnóstwo! Do tego stopnia, że po prostu padłeś wyczerpany na podłogę.",
    ],
  ],
  4: [
    [
      "Twoje ruchy były tak opanowane, że mogłyby uchodzić za prawdziwą magię. Niestety pozory w tym przypadku były mylące..",
      "Twoje ruchy sprawiały wrażenie, jakbyś uczył się tego od lat. Niestety, najwyraźniej nie nauczyłeś się jeszcze, jak poza efektem wizualnym, wywołać też efekt magiczny.",
    ],
    [
      "Piękne rymy układałeś, poetycko wręcz zabrzmiałeś, lecz mimo pięknego brzmienia, czułeś, że nic się nie zmienia.",
      "Wniosek jest jasny: magia nie lubi białych rymów.",
    ],
    [
      "Rytuał wyglądał imponująco, ale magia najwyraźniej patrzyła w innym kierunku. Może następnym razem.",
      "Wszystko było jak należy, ale czegoś zabrakło - może wiary?",
    ],
  ],
  5: [
    [
      "Jako perfekcyjny mag, zostałeś perfekcyjnie zignorowany przez równie perfekcyjną moc.",
      "Precyzja godna zegarmistrza! Niestety, magia najwyraźniej nie przepada za zegarami.",
    ],
    [
      "Starożytne formuły brzmiały potężnie, ale okazały się tylko starą piosenką ludową. Wiedziałeś, że nie da to już żadnego efektu, ale i tak nuciłeś sobie ją dalej - przynajmniej ładnie brzmiała.",
      "Recytowałeś z taką powagą, że sam uwierzyłeś, że to działa. Magia nie uwierzyła.",
    ],
    [
      "Ceremonia była wzniosła - świece, kadzidło, poważna mina, medytacja.. Jedyny efekt - zasnąłeś z nudów.",
      "Odprawiłeś starodawny rytuał, ale księga była napisana w niezrozumiałym dla Ciebie języku. Magia najwyraźniej też nie rozumiała, bo nic się nie wydarzyło.",
    ],
  ],
};

// ── WIADOMOŚCI O SUKCESIE (gdy odkryto czar) ──
export const STUDY_SUCCESS_MESSAGES: Record<number, [string, string, string]> = {
  1: [
    "Machałeś bardzo energicznie! Magia zaczęła się kumulować wokół, aż w końcu, dzięki Twojej skoncentrowanej aktywności, udało Ci się osiągnąć coś sensownego! Szybko notujesz swoje ruchy, żeby wiedzieć na przyszłość, jak powtórzyć ten efekt.",
    "Twoje bełkotanie nagle nabrało sensu – słowa ułożyły się w magiczną formułę! Czujesz, że otworzyłeś drzwi do nowej wiedzy.",
    "Po serii szalonych piruetów poczułeś, że energia przepływa przez Ciebie. Udało się! Zapisujesz wszystkie kroki, by nie zapomnieć tego cudu.",
  ],
  2: [
    "Twoje gesty nabrały znaczenia – to nie był przypadek! Odkryłeś sposób na kontrolowanie sił, które dotąd były dla Ciebie nieuchwytne.",
    "Mamrocząc, trafiłeś na właściwą sekwencję dźwięków – magia odpowiedziała! To początek czegoś wielkiego.",
    "Twój szalony taniec okazał się kluczem do harmonii z energią – udało Ci się osiągnąć efekt, którego nikt wcześniej nie widział.",
  ],
  3: [
    "Gwałtowne ruchy dłoni, synchronizacja, oddech – wszystko zagrało idealnie. To był czysty akt stworzenia!",
    "Mamrocząc, poczułeś, że słowa zaczynają żyć własnym życiem – magia odpowiedziała na Twoje wezwanie.",
    "Taniec, który wydawał się chaotyczny, okazał się perfekcyjnym wzorem. Odkryłeś nową ścieżkę!",
  ],
  4: [
    "Opanowanie i konsekwencja – Twoje ruchy były tak precyzyjne, że magia musiała uznać Twoją władzę.",
    "Rymowane słowa, pełne mocy, wreszcie dotarły do sedna – magia jest teraz Twoim sojusznikiem.",
    "Rytuał, który przygotowywałeś tak starannie, w końcu zadziałał. To nie był przypadek – to efekt Twojej pracy.",
  ],
  5: [
    "Twoje gesty były tak doskonałe, że magia ukłoniła się przed Tobą. Jesteś mistrzem!",
    "Starożytne formuły, które recytowałeś, ożyły – magia płynie w Twoich żyłach.",
    "Ceremonia, która miała być jedynie symulacją, przerodziła się w prawdziwe wydarzenie. Twoja wiedza sięga teraz wyżyn.",
  ],
};

// -------- EKSPLORACJA -----------//

// Indeksy: [poziom][podkategoria-1] — flavor gdy NIE znaleziono przedmiotu
export const EXPLORATION_FAIL_MESSAGES: Record<number, [string[], string[], string[]]> = {
  1: [
    ["Przeszukałeś krzaki przy wieży centymetr po centymetrze. Znalazłeś tylko kilka much i stare gniazdo os."],
    ["Zapuściłeś się w nudny las w poszukiwaniu skrytek. Las okazał się równie nudny co jego nazwa sugeruje."],
    ["Obszedłeś staw dookoła, zaglądając pod każdy kamień. Jedyne co znalazłeś to żaba, która patrzyła na Ciebie z wyrzutem."],
  ],
  2: [
    ["Splądrowałeś opuszczoną chatkę od piwnicy po strych. Nic poza kurzem i pajęczynami."],
    ["Zajrzałeś pod most — tylko błoto i ślady po czyimś biwaku."],
    ["Przeszukałeś brzegi rzeczki. Znalazłeś ładny kamyk, ale to chyba się nie liczy."],
  ],
  3: [
    ["Zbadałeś starą jaskinię centymetr po centymetrze. Echo Twoich kroków to jedyne, co tam znalazłeś."],
    ["Wspiąłeś się na wzgórze, licząc na widok czegoś ciekawego. Zobaczyłeś tylko więcej wzgórz."],
    ["Poszukałeś skrzyni za wodospadem. Zmokłeś, a skrzyni nie było."],
  ],
  4: [
    ["Przetrząsnąłeś zapomniane ruiny. Zapomniane słusznie — nic tam nie ma."],
    ["Zanurkowałeś w głębokim jeziorze. Zimno, ciemno i pusto."],
    ["Przeszukałeś przeklęty las w poszukiwaniu skrytek. Las pozostał przeklęty, ale bez łupów."],
  ],
  5: [
    ["Ograbiłeś legendarną kryptę. Legenda najwyraźniej mówiła o czymś innym niż skarby."],
    ["Wszedłeś do lochu z napisem 'NIE WCHODZIĆ'. Napis miał rację — nic tam nie było, poza dobrą radą."],
    ["Poszukałeś sekretnego przejścia, którego 'na pewno tu nie ma'. Miało rację — na pewno go tam nie było."],
  ],
};

// Indeksy: [poziom][podkategoria-1] — flavor gdy znaleziono przedmiot
export const EXPLORATION_SUCCESS_MESSAGES: Record<number, [string[], string[], string[]]> = {
  1: [
    ["Przeszukując krzaki przy wieży, natrafiłeś na coś błyszczącego!"],
    ["Wśród korzeni nudnego lasu odkryłeś ukrytą skrytkę!"],
    ["Na dnie stawu, między kamieniami, coś zwróciło Twoją uwagę!"],
  ],
  2: [
    ["W opuszczonej chatce, pod deską w podłodze, znalazłeś coś interesującego!"],
    ["Pod mostem, w szczelinie muru, natrafiłeś na ukryty skarb!"],
    ["Na brzegu rzeczki, na wpół zakopane w piasku, leżało coś wartościowego!"],
  ],
  3: [
    ["W głębi jaskini, oświetlone słabym promieniem światła, dostrzegłeś coś cennego!"],
    ["Na szczycie wzgórza, w szczelinie skalnej, znalazłeś coś, czego się nie spodziewałeś!"],
    ["Za kurtyną wodospadu odnalazłeś ukrytą skrzynię!"],
  ],
  4: [
    ["Wśród gruzów zapomnianych ruin odkopałeś coś, co przetrwało próbę czasu!"],
    ["Na dnie głębokiego jeziora, w starej skrzyni, znalazłeś coś wartościowego!"],
    ["W sercu przeklętego lasu natrafiłeś na skrytkę, której magia nie zdołała ukryć przed Tobą!"],
  ],
  5: [
    ["W legendarnej krypcie, dokładnie tam gdzie mówiła legenda, znalazłeś prawdziwy skarb!"],
    ["Wbrew ostrzeżeniu na drzwiach, w lochu znalazłeś coś, co było warte ryzyka!"],
    ["Sekretne przejście, którego 'na pewno tu nie ma', prowadziło prosto do ukrytego skarbca!"],
  ],
};

// Wstęp do walki w eksploracji — {entity} zastępowane nazwą przeciwnika
export const EXPLORATION_ENCOUNTER_INTRO_MESSAGES: string[] = [
  "Nagle z zarośli wyskakuje {entity} i zagradza Ci drogę!",
  "Coś porusza się w cieniu... to {entity}, gotowy do ataku!",
  "Zza rogu wyłania się {entity} — czas na walkę!",
  "Twoją eksplorację przerywa {entity}, najwyraźniej niezadowolony z Twojej obecności.",
];

export function buildExplorationEncounterIntro(entityName: string): string {
  const template = EXPLORATION_ENCOUNTER_INTRO_MESSAGES[
    Math.floor(Math.random() * EXPLORATION_ENCOUNTER_INTRO_MESSAGES.length)
  ]!;
  return template.replace("{entity}", entityName);
}
