// ═══════════════════════════════════════════════════════════════════
// LOSOWE KOMUNIKATY KLIMATYCZNE
// src/data/random-messages.ts
//
// Pula ~50 jednorazowych, klimatycznych wiadomości. Każda ma unikalny
// `key` używany do zapisu w SeenRandomMessage — gracz nigdy nie dostanie
// tej samej dwa razy. Treści nie mają żadnego wpływu mechanicznego.
// ═══════════════════════════════════════════════════════════════════

export interface RandomMessageDef {
  key: string;
  title?: string;
  content: string;
}

export const RANDOM_MESSAGES: RandomMessageDef[] = [
  { key: "dream_001", title: "Sen", content: "Śniło ci się, że rozmawiasz z własnym cieniem. Nie pamiętasz, kto z was zadawał pytania." },
  { key: "dream_002", title: "Sen", content: "We śnie latałeś nad miastem zbudowanym z ksiąg. Któraś ze stron wyrwała się i poleciała za tobą." },
  { key: "dream_003", title: "Sen", content: "Śniłeś o drzwiach, które otwierały się tylko wtedy, gdy o nie nie patrzono." },
  { key: "dream_004", title: "Sen", content: "We śnie ktoś szeptał twoje imię od tyłu. Zabrzmiało jak zaklęcie, którego jeszcze nie znasz." },
  { key: "dream_005", title: "Sen", content: "Śniło ci się morze z atramentu. Każda fala zostawiała na brzegu jedno nieczytelne słowo." },
  { key: "omen_001", title: "Przeczucie", content: "Przez chwilę miałeś pewność, że ktoś obserwuje cię zza odbicia w szybie. Gdy się odwróciłeś, nikogo nie było." },
  { key: "omen_002", title: "Przeczucie", content: "Twoja różdżka — a właściwie cokolwiek nią jest — zadrżała bez powodu. Może to nic. Może nie." },
  { key: "omen_003", title: "Przeczucie", content: "Od rana czujesz lekki zapach spalonego cynamonu, choć w pobliżu nie ma żadnego ognia." },
  { key: "omen_004", title: "Przeczucie", content: "Świece w twoim pokoju paliły się dziś nieco zbyt równo, jakby ktoś pilnował, by żadna nie zgasła pierwsza." },
  { key: "omen_005", title: "Przeczucie", content: "Masz wrażenie, że licznik dni w kalendarzu cofnął się o jeden, a potem wrócił, zanim zdążyłeś to sprawdzić." },
  { key: "world_001", title: "Plotka", content: "W gospodzie mówią, że ostatni Wielki Mag zniknął nie dlatego, że umarł, tylko dlatego, że przestał być potrzebny fabule." },
  { key: "world_002", title: "Plotka", content: "Krążą słuchy, że Komnata Nieładu raz w roku sama się porządkuje. Nikt jeszcze tego nie widział na własne oczy." },
  { key: "world_003", title: "Plotka", content: "Podobno najstarsza wieża w okolicy nie ma piwnicy — bo piwnica ma wieżę." },
  { key: "world_004", title: "Plotka", content: "Miejscowy zielarz twierdzi, że jego najlepsze składniki rosną wyłącznie tam, gdzie nikt o nie nie pyta." },
  { key: "world_005", title: "Plotka", content: "Pewien czeladnik przysięga, że widział czar, który zapomniał, do czego służy, i teraz tylko grzecznie się przedstawia." },
  { key: "world_006", title: "Plotka", content: "Mówi się, że w bibliotece magii astralnej jedna z półek zawsze jest o jedną książkę dłuższa, niż powinna." },
  { key: "humor_001", title: "Migawka", content: "Twój kot — gdybyś go miał — prawdopodobnie i tak by cię oceniał. Na szczęście go nie masz." },
  { key: "humor_002", title: "Migawka", content: "Spróbowałeś dziś wypowiedzieć zaklęcie do kawy, żeby się szybciej zaparzyła. Kawa zignorowała cię z pełnym szacunkiem." },
  { key: "humor_003", title: "Migawka", content: "Ktoś w okolicy oficjalnie zgłosił skargę na pogodę. Pogoda nie odpowiedziała, co uznano za przyznanie się do winy." },
  { key: "humor_004", title: "Migawka", content: "Twoja różdżka — metaforycznie rzecz biorąc — przewróciła dziś oczami, kiedy spróbowałeś czegoś zbyt ambitnego przed śniadaniem." },
  { key: "humor_005", title: "Migawka", content: "Lokalny sklep z artefaktami wprowadził nową zasadę: 'Nie testujemy klątw na personelu. Ponownie.'" },
  { key: "humor_006", title: "Migawka", content: "Ktoś przybił do drzwi karteczkę: 'Tu mieszka mag. Pukać tylko w sprawach niemagicznych.'" },
  { key: "humor_007", title: "Migawka", content: "Dziś rano twój cień wstał wyraźnie wcześniej niż ty. Nie skomentował tego, ale dało się to wyczuć." },
  { key: "flavor_001", title: "Chwila spokoju", content: "Powietrze nad wieżą pachnie dziś deszczem, którego jeszcze nie było i może wcale nie będzie." },
  { key: "flavor_002", title: "Chwila spokoju", content: "Na chwilę zatrzymałeś się i pomyślałeś, że magia czasem jest po prostu ciszą między dwoma zaklęciami." },
  { key: "flavor_003", title: "Chwila spokoju", content: "Światło wpadające przez okno układa się dziś w kształt, który prawie coś znaczy." },
  { key: "flavor_004", title: "Chwila spokoju", content: "Słyszysz w oddali dźwięk, który mógłby być muzyką, dzwonkiem albo niczym konkretnym." },
  { key: "flavor_005", title: "Chwila spokoju", content: "Na chwilę magia świata wydaje się płynąć wolniej, jakby i ona potrzebowała oddechu." },
  { key: "flavor_006", title: "Chwila spokoju", content: "Kurz unoszący się w promieniu słońca przez moment układa się w coś, co przypomina runę. Potem już nie." },
  { key: "warning_001", title: "Niepokój", content: "Coś w okolicy Komnaty Nieładu zachowuje się dziś inaczej niż zwykle. Może to nic. Prawdopodobnie nic." },
  { key: "warning_002", title: "Niepokój", content: "Twoje księgi na półce ułożyły się dziś w innej kolejności, niż je zostawiłeś." },
  { key: "warning_003", title: "Niepokój", content: "Przez chwilę miałeś wrażenie, że ktoś po drugiej stronie ściany powtarza twoje słowa z opóźnieniem." },
  { key: "warning_004", title: "Niepokój", content: "Zapach inkantacji unosi się dziś tam, gdzie nikt nie rzucał żadnego zaklęcia." },
  { key: "lore_001", title: "Wspomnienie", content: "Przypomniałeś sobie nagle imię, którego nigdy nie poznałeś. Brzmiało znajomo, jak echo czegoś sprzed lat." },
  { key: "lore_002", title: "Wspomnienie", content: "Stara legenda mówi, że pierwsza wieża nie miała wejścia — bo nikt jeszcze nie wiedział, jak z niej wyjść." },
  { key: "lore_003", title: "Wspomnienie", content: "Mówi się, że Magia Krwi nie wybiera maga. To mag w końcu przestaje udawać, że nie wybrał jej pierwszy." },
  { key: "lore_004", title: "Wspomnienie", content: "Najstarsi mieszkańcy twierdzą, że granice między żywiołami kiedyś w ogóle nie istniały. Ktoś musiał je narysować — i nie zawsze prosto." },
  { key: "lore_005", title: "Wspomnienie", content: "Krąży opowieść o magu, który nauczył się czaru tak dobrze, że czar nauczył się jego." },
  { key: "lore_006", title: "Wspomnienie", content: "Ponoć Magia Astralna nie patrzy w gwiazdy. To gwiazdy, czasem, patrzą z powrotem." },
  { key: "mundane_001", title: "Drobiazg", content: "Twoje buty dziś skrzypią w rytmie, którego nie pamiętasz, żeby kiedykolwiek ćwiczyłeś." },
  { key: "mundane_002", title: "Drobiazg", content: "Zauważyłeś, że licznik dni od ostatniego nieudanego eksperymentu znów wynosi zero." },
  { key: "mundane_003", title: "Drobiazg", content: "Sąsiad zza ściany znów eksperymentuje z czymś głośnym. Prawdopodobnie znowu z poziomu 'co najgorszego może się stać'." },
  { key: "mundane_004", title: "Drobiazg", content: "Dziś rano zapomniałeś, gdzie odłożyłeś swój ulubiony składnik. Znalazł się tam, gdzie najmniej się tego spodziewałeś — w kieszeni." },
  { key: "mundane_005", title: "Drobiazg", content: "Ktoś zostawił pod twoimi drzwiami nieoznaczoną fiolkę. Albo prezent, albo bardzo zły żart." },
  { key: "mundane_006", title: "Drobiazg", content: "Lokalna gazeta ogłosiła konkurs na 'Najmniej katastrofalne zaklęcie miesiąca'. Nikt jeszcze się nie zgłosił." },
  { key: "cosmic_001", title: "Coś większego", content: "Na chwilę masz wrażenie, że świat wstrzymał oddech. Potem wszystko wraca do normy, jakby nic się nie stało." },
  { key: "cosmic_002", title: "Coś większego", content: "Gdzieś bardzo daleko coś się właśnie zmieniło. Nie wiesz co. Może nigdy się nie dowiesz." },
  { key: "cosmic_003", title: "Coś większego", content: "Przez ułamek sekundy niebo miało kolor, którego nie ma w żadnym znanym ci spektrum." },
  { key: "cosmic_004", title: "Coś większego", content: "Czujesz, że gdzieś w świecie ktoś właśnie wypowiedział twoje imię. Nie wiesz, w jakiej sprawie." },
  { key: "cosmic_005", title: "Coś większego", content: "Na moment zapomniałeś, którą ręką trzymasz różdżkę. Świat poczekał, aż sobie przypomnisz." },
];

export function getRandomMessageByKey(key: string): RandomMessageDef | undefined {
  return RANDOM_MESSAGES.find(m => m.key === key);
}