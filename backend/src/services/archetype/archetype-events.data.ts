export const ARCHETYPE_EVENTS = {

  // ==================================================
  // CHAPTER 1
  // ==================================================

  chapter1: {

    // EVENT 1
    // ----------------------------------------------

    ARRIVAL_OF_SETTLERS: {

      title: "Przybysze pod Wieżą",

      description:
        "Minęło kilka dni od magicznego wybuchu, który siejąc zniszczenie, na zawsze odmienił losy świata. Twoja moc pozwoliła Ci na zbudowanie wieży — obecnie jedynego nie zniszczonego budynku w okolicy. Pewnego ranka zgromadziła się pod nią spora grupa ludzi, którzy szukają nowego miejsca na dom. Wyglądają na przestraszonych, głodnych i nieufnych. Co zrobisz?",

      options: [

        {
          code: "A",

          title:
            "Ogłoś się władcą tych ziem",

          effect:
            "“Możecie tu osiąść!” - wołasz do nich z balkonu swojej wieży. “Ale pamiętajcie, że tą krainą władam ja, więc zostając tu, jesteście mi winni posłuszeństwo!” Większość przybyszów patrzy na Ciebie z trwogą, jednak jeden z nich najwyraźniej uważa, że żartujesz i zaczyna się śmiać. Nie lubisz, jak się z Ciebie śmieją.. - Wykonujesz serię ruchów rękoma, tą samą, której nauczyłeś się zaledwie kilka dni temu - nad głową śmieszka materializuje się całkiem spora cegła. Śmiech urywa się w jednej chwili, zastąpiony odgłosem głuchego uderzenia, a następnie opadającego na ziemię ogłuszonego ciała.  - “Możecie tu osiąść!” - powtarzasz po chwili z podniesionym głosem. “Lecz nie zapomniajcie, kto Wam na to pozwolił.”. Wieczorem przez okno wieży widzisz spore ognisko, które oświetla prowizoryczne szałasy wzniesione naprędce przez przybyszy...",

          deltas: {
            ruler: 3,
            guardian: 1,
            prophet: 1
          },

          nextEvent: "A1_SETTLERS_OBEDIENCE"
        },

        {
          code: "B",

          title:
            "Przyjmij ich jako sąsiadów",

          effect:
            "“Witajcie w tej pięknej dolinie!” - okrzykiem witasz przybyszy, wychodząc naprzeciw nim z wieży. “Wyglądacie na przemęczonych podróżą, śmiało, odsapnijcie trochę”. Prostym ruchem dłoni tworzysz strumień wody, który wypełnia puste wiadra przewieszone z boku wozu podróżnych. Ludzie, z początku przerażeni Twoją mocą, starają się trzymać dystans, jednak po chwili pragnienie wygrywa z uprzedzeniami - musieli od dawna cierpieć na brak wody. Wieczorem, opodal Twojej wieży, wokół ogniska, ucztując radośnie, zebrało się kilkunastu podróżnych. Za ogniskiem widniały kontury całkiem solidnych drewnianych schronień - stworzonych głównie dzięki Twojej mocy.",

          deltas: {
            guardian: 3,
            prophet: 1
          },

          nextEvent: "A1_SETTLERS_GROWS"
        },

        {
          code: "C",

          title:
            "Przepędź ich",

          effect:
            "“Precz!” - mówisz w kierunku ludzi, którzy patrzą ze strachem na Twoją wieżę. “Panie, poratuj, trochę wody..” - “Precz!” - krzyczysz, ale tym razem  wykonujesz gwałtowne gesty, w wyniku których w powietrzu tuż obok głowy proszącego człowieka materializuje się i spada na ziemię całkiem spory kamień. Ludzie cofają się w strachu. “Nie ma tu dla Was niczego! To moje ziemie - wynocha!” - Początkowo podróżni sprawiają wrażenie, jakby się jeszcze wahali, ale kolejny zmaterializowany głaz, który upada tuż obok jednego z nich, szybko rozwiewa wszelkie ich wątpliwości - zaczynają uciekać w popłochu.. Wieczorem, kiedy przechadzasz się wokół wieży, zauważasz na ziemi leżący mały, drewniany medalion - jedyne, co pozostało po porannych gościach. “I tak za dużo..” - mówisz do siebie, po czym za pomocą magii niszczysz znalezisko.",

          deltas: {
            reaper: 3,
          },

          nextEvent: "C1_ABANDONED_MEDALLION"
        }
      ]
    },

    // ----------------------------------------------
    // ROZGAŁĘZIENIA OPCJI A
    // ----------------------------------------------

    A1_SETTLERS_OBEDIENCE: {
      title: "Złodzieje zasobów",
      description: "Przechodząc w pobliżu zaimprowizowanych szałasów zauważasz, że przy jednym z nich znajdują się eleganckie dzbanki, które jeszcze wczoraj umieściłeś w piwnicy swojej wieży. Jak zareagujesz?",
      options: [ {
          code: "A",

          title:
            "Nieważne kto to zrobił - ukarz ich wszystkich",

          effect:
            "Zwołujesz wszystkich przybyszów pod wieżę. „Ktoś z was mnie okradł!” - mówisz. „Nie wiem, kto to zrobił, ale wszyscy będziecie za to odpowiedzialni!” - Za pomocą magii przyzywasz grad małych kamieni, które w krótką chwilę zmieniają zbudowane wcześniej szałasy w gruzowisko. Niech to będzie dla Was ostatnie ostrzeżenie!” - dodajesz. Żyjecie tu tylko dlatego, że Wam na to pozwoliłem, radzę o tym nie zapominać!” - Następnego dnia słyszysz, że jeden z przybyszów został wygnany z grupy - uznano go za winnego kradzieży. To dobrze - oznacza, że pozostali tylko posłuszni.",

          deltas: {
            ruler: 1,
            reaper: 4,
          },

          nextEvent: "A2_SETTLER_THIEF"
        },

        {
          code: "B",

          title:
            "Niech przybysze sami ustalą i ukarzą winnego.",

          effect:
            "Za pomocą telekinezy, podnosisz jeden z dzbanków i powoli, teatralnym ruchem, umieszczasz go na środku pustej przestrzeni pomiędzy szałasami. „Pozwoliłem Wam tu osiąść, a ktoś z Was postanowił mnie okraść.” - mówisz, upewniając się przy tym, że wszyscy słuchają i powoli unosisz dzbanek coraz wyżej. „Oczywiście, że wiem, kto to zrobił - i Wy wszyscy zapewne też wiecie. Wygnacie go i przyniesiecie pozostałe dzbanki z powrotem do wieży. Albo ja wygnam Was. Macie czas do wieczora.” - odwracasz się i odchodzisz. Po chwili za plecami słyszysz trzask rozbitego dzbanka, któremu towarzyszą zduszone okrzyki ludzi. Nieco później, patrząc przez okna swojej wieży widzisz, jak jeden z przybyszów zostaje wygnany.",

          deltas: {
            guardian: 1,
            ruler: 1,
            researcher: 2
          },

          nextEvent: "A2_SETTLER_THIEF"
        },

        {
          code: "C",

          title:
            "Dojdź do tego, kto to zrobił i ukarz go osobiście",

          effect:
            "Wracasz do wieży, udając, że nic nie zauważyłeś. Wiesz doskonale, że masz w piwnicy więcej rzeczy, które na pewno też zainteresowały złodzieja. Wchodzisz do środka i po chwili zastanowienia, przywołujesz w środku pełzacza, po czym szybko zamykasz drzwi. W środku nocy budzi Cię glośny krzyk - schodzisz w pośpiechu i widzisz, że przy drzwiach piwnicy leży ciężko ranny człowiek - ten sam, który kilka dni wcześniej śmiał się z Ciebie. Pomóc mu, czy nie? - Bijesz się z myślami. Po krótkiej chwili okazuje się, że Twój dylemat rozwiązał się sam - złodziej zmarł.",

          deltas: {
            researcher: 3,
          },

          nextEvent: "A3_SETTLER_DEATH"
        }]
    },

    A1_SETTLERS_GROWS: {
      title: "Złodzieje zasobów",
      description: "Przechodząc w pobliżu wzniesionych schronień zauważasz, że przy jednym z nich znajdują się eleganckie dzbanki, które jeszcze wczoraj umieściłeś w piwnicy swojej wieży. Jak zareagujesz?",
      options: [ {
          code: "A",

          title:
            "Nieważne kto to zrobił - ukarz ich wszystkich",

          effect:
            "Zwołujesz wszystkich przybyszów pod wieżę. „Ktoś z was mnie okradł!” - mówisz. „Nie wiem, kto to zrobił, ale wszyscy będziecie za to odpowiedzialni!” - Za pomocą magii przyzywasz grad małych kamieni, które w krótką chwilę zmieniają zbudowane wcześniej schrony w gruzowisko. Niech to będzie dla Was ostatnie ostrzeżenie!” - dodajesz. Żyjecie tu tylko dlatego, że Wam na to pozwoliłem, radzę o tym nie zapominać!” - Następnego dnia słyszysz, że jeden z przybyszów został wygnany z grupy - uznano go za winnego kradzieży. To dobrze - oznacza, że pozostali tylko posłuszni.",

          deltas: {
            ruler: 1,
            reaper: 4,
          },

          nextEvent: "A2_SETTLER_THIEF"
        },

        {
          code: "B",

          title:
            "Niech przybysze sami ustalą i ukarzą winnego.",

          effect:
            "Za pomocą telekinezy, podnosisz jeden z dzbanków i powoli, teatralnym ruchem, umieszczasz go na środku pustej przestrzeni pomiędzy schronieniami. „Pozwoliłem Wam tu osiąść, pomogłem Wam, a ktoś z Was postanowił mnie okraść.” - mówisz, upewniając się przy tym, że wszyscy słuchają i powoli unosisz dzbanek coraz wyżej. „Oczywiście, że wiem, kto to zrobił - i Wy wszyscy zapewne też wiecie. Wygnacie go i przyniesiecie pozostałe dzbanki z powrotem do wieży. Albo ja wygnam Was. Macie czas do wieczora.” - odwracasz się i odchodzisz. Po chwili za plecami słyszysz trzask rozbitego dzbanka, któremu towarzyszą zduszone okrzyki ludzi. Nieco później, patrząc przez okna swojej wieży widzisz, jak jeden z przybyszów zostaje wygnany.",

          deltas: {
            guardian: 1,
            ruler: 1,
            researcher: 2
          },

          nextEvent: "A2_SETTLER_THIEF"
        },

        {
          code: "C",

          title:
            "Dojdź do tego, kto to zrobił i ukarz go osobiście",

          effect:
            "Wracasz do wieży, udając, że nic nie zauważyłeś. Wiesz doskonale, że masz w piwnicy więcej rzeczy, które na pewno też zainteresowały złodzieja. Wchodzisz do środka i po chwili zastanowienia, przywołujesz w środku pełzacza, po czym szybko zamykasz drzwi. W środku nocy budzi Cię glośny krzyk - schodzisz w pośpiechu i widzisz, jak z Twojej wieży wybiega w popłochu ranny człowiek - ten sam, który kilka dni wcześniej śmiał się z Ciebie. Decydujesz się nie gonić go - widać po śladach krwi, że raczej zbyt daleko nie ucieknie..",

          deltas: {
            researcher: 3,
          },

          nextEvent: "A2_SETTLER_THIEF"
        }]
    },

    A2_SETTLER_THIEF: {
      title: "Złodziej wraca z kolegami",
      description: "Twoje nocne studia przerywa krzyk dochodzący z zewnątrz. Przez okno wieży widzisz, że jeden z domów z pobliskiej osady stoi w płomieniach.",
      options: [ {
          code: "A",

          title:
            "Pomóż jak najszybciej w gaszeniu pożaru.",

          effect:
            "XXXXXX",

          deltas: {
            ruler: 2,
            guardian: 4,
          },

          nextEvent: "A3_FIRE"
        },

        {
          code: "B",

          title:
            "Poradzą sobie - kontynuuj swoje badania.",

          effect:
            "XXXXXX",

          deltas: {
            researcher: 4,
            reaper: 2,
          },

          nextEvent: "A4_FIRE_IGNORED"
        },
      ]    
    },

    A3_FIRE: {
      title: "Placeholder",
      description: "Magiczne bestie nękają mieszkańców",
      options: [ {
          code: "A",

          title:
            "Zorganizuj obławę i wytępcie bestie.",

          effect:
            "",

          deltas: {
            guardian: 4,
            ruler: 2,
          },

          nextEvent: "A5_BEAST_HUNTED"
        },

        {
          code: "B",

          title:
            "To dobra okazja do badań - spróbuj złapać jedną z bestii w celach naukowych.",

          effect:
            "",

          deltas: {
            researcher: 4,
          },

          nextEvent: "A5_BEAST_CAPTURED"
        },

        {
          code: "C",

          title:
            "Bestie są magiczne, a magii nie wolno tępić!",

          effect:
            "",

          deltas: {
            prophet: 4,
          },

          nextEvent: "A5_BEAST_PRAISED"
        }]
    },

    A4_FIRE_IGNORED: {
      title: "Magiczne bestie w zgliszczach osady",
      description: "TODO",
      options: [ {
          code: "A",

          title:
            "Wytęp bestie.",

          effect:
            "",

          deltas: {
            ruler: 4,
          },

          nextEvent: "A5_BEAST_HUNTED"
        },

        {
          code: "B",

          title:
            "To dobra okazja do badań - spróbuj złapać jedną z bestii w celach naukowych.",

          effect:
            "",

          deltas: {
            researcher: 4,
          },

          nextEvent: "A5_BEAST_CAPTURED"
        },

        {
          code: "C",

          title:
            "Bestie są magiczne, a magii nie wolno tępić!",

          effect:
            "",

          deltas: {
            prophet: 4,
          },

          nextEvent: "A5_BEAST_PRAISED"
        }]    },

    // ----------------------------------------------
    // ROZGAŁĘZIENIA OPCJI B
    // ----------------------------------------------

    B1_COMMUNITY_GROWS: {
      title: "Placeholder",
      description: "TODO",
      options: []
    },

    B2_PLACEHOLDER: {
      title: "Placeholder",
      description: "TODO",
      options: []
    },

    B3_PLACEHOLDER: {
      title: "Placeholder",
      description: "TODO",
      options: []
    },

    B4_PLACEHOLDER: {
      title: "Placeholder",
      description: "TODO",
      options: []
    },

    // ----------------------------------------------
    // ROZGAŁĘZIENIA OPCJI C
    // ----------------------------------------------

    C1_ABANDONED_MEDALLION: {
      title: "Placeholder",
      description: "TODO",
      options: []
    },

    C2_PLACEHOLDER: {
      title: "Placeholder",
      description: "TODO",
      options: []
    },

    C3_PLACEHOLDER: {
      title: "Placeholder",
      description: "TODO",
      options: []
    },

    C4_PLACEHOLDER: {
      title: "Placeholder",
      description: "TODO",
      options: []
    }
  },

  // ==================================================
  // CHAPTER 2
  // ==================================================
  // NIEZALEŻNY OD CHAPTER 1
  // ==================================================

  chapter2: {

    START: {

      title: "Początek Rozdziału 2",

      description:
        "TODO",

      options: []
    }
  },

  // ==================================================
  // CHAPTER 3
  // ==================================================
  // NIEZALEŻNY OD CHAPTER 1 i CHAPTER 2
  // ==================================================

  chapter3: {

    START: {

      title: "Początek Rozdziału 3",

      description:
        "TODO",

      options: []
    }
  }
};