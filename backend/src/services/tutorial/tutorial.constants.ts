export const TUTORIAL_STEPS = {
  INTRO:             "INTRO",             // postać, zniszczony dom, eksploracja
  EXPLORATION_DONE:  "EXPLORATION_DONE",  // + studia
  STUDY_DONE:        "STUDY_DONE",        // + księga magii
  SPELL_EQUIPPED:    "SPELL_EQUIPPED",    // + trening, zniszczony dom -> lista zadań
  TOWER_READY:       "TOWER_READY",       // wszystkie zadania zrobione, czeka na klik
  COMPLETED:         "COMPLETED",         // pełne menu, zniszczony dom na zawsze schowany
} as const;

export type TutorialStep = typeof TUTORIAL_STEPS[keyof typeof TUTORIAL_STEPS];

// Przykładowe przeciwniki i przedmioty — dopasuj nazwy do tego, co masz w tabeli Item
export const TUTORIAL_ENEMIES = ["Agresywny Wilk", "Dziki Odyniec", "Pijany Złodziej"];
export const TUTORIAL_ITEM_POOL = ["Rdzawy Miecz", "Skórzana Czapka", "Stary Amulet", "Pęknięty Pierścień"];
export type HomeRepairTaskCode = typeof HOME_REPAIR_TASKS[number]["code"];

export const TUTORIAL_MESSAGES = {
  STUDY_UNLOCKED:
    "Nie miałeś nawet czasu się przestraszyć, gdy w odruchu desperacji zacząłeś chaotycznie machać rękoma, mamrocząc pierwsze zaklęcie, jakie przyszło Ci do głowy... i zadziałało! Nawet zwykłe, chaotyczne machanie rękoma może czasem przywołać magię. W Twoim menu odblokowały się Studia Magiczne — czas to przetrenować!",

  SPELL_GRANTED:
    "Twoje pierwsze Studia Magiczne przyniosły owoce! Poznałeś czar \"Podstawowe Przywołanie\". Otwórz swoją Księgę Magii, aby wyekwipować go jako aktywny — to z niej będziesz zarządzać poznanymi czarami: założyć je do walki, ściągnąć, oraz sprawdzić, ile czarów już znasz, a ile jeszcze możesz poznać.",

  WIZARD_REALIZATION:
    "Łaa! Jesteś prawdziwym czarodziejem! Nagle naprawianie Twojej zniszczonej chatki wydaje się być bezsensowne — przecież jesteś czarodziejem. Czemu by nie stworzyć sobie czarodziejskiej wieży? W zakładce \"Zniszczony Dom\" pojawiły się pierwsze kroki ku temu. Odwiedź zakładkę Trening, by sprawdzić, jak wytrenować swoje statystyki i spełnić wymagania budowy.",

  TOWER_READY:
    "Wszystkie prace przygotowawcze zakończone! Twoja wieża jest gotowa, by ją podziwiać.",

  DUEL_UNLOCKED:
    "Wpadłeś na genialny pomysł... a co, jeśli inni czarodzieje też budują swoje wieże gdzieś w okolicy? Może czas się z nimi zmierzyć? Odblokowano Pojedynki!",

  SCHOOL_UNLOCKED:
    "A gdyby tak... nie tylko Ty mogłeś się uczyć magii? Odblokowano Szkołę Magii!",
} as const;

export const HOME_REPAIR_TASKS = [
  {
    code: "FOUNDATIONS",
    name: "Fundamenty pod wieżę",
    durationSeconds: 60,
    reqKnowledge: 1,
    reqIntelligence: 0,
  },
  {
    code: "WALLS",
    name: "Ściany",
    durationSeconds: 120,
    reqKnowledge: 1,
    reqIntelligence: 1,
  },
  {
    code: "FURNITURE",
    name: "Podstawowe umeblowanie",
    durationSeconds: 180,
    reqKnowledge: 2,
    reqIntelligence: 1,
  },
] as const;