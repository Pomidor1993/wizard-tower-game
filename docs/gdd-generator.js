const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageNumber, PageBreak, Footer, Header
} = require('docx');
const fs = require('fs');

// Colors
const C = {
  purple: '6B3FA0',
  gold: 'C9A84C',
  darkBg: '2D1B4E',
  lightPurple: 'EDE7F6',
  lightGold: 'FFF8E7',
  gray: 'F5F5F5',
  darkText: '1A1A2E',
  border: 'B39DDB',
  red: 'C62828',
  green: '2E7D32',
  blue: '1565C0',
};

const border = { style: BorderStyle.SINGLE, size: 1, color: C.border };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, size: 36, color: C.purple, font: 'Arial' })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 160 },
    children: [new TextRun({ text, bold: true, size: 28, color: C.darkBg, font: 'Arial' })]
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, bold: true, size: 24, color: C.purple, font: 'Arial' })]
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text, size: 22, font: 'Arial', color: C.darkText, ...opts })]
  });
}

function pBold(text) {
  return p(text, { bold: true });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'bullets', level },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 22, font: 'Arial', color: C.darkText })]
  });
}

function bullet2(label, value) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { before: 40, after: 40 },
    children: [
      new TextRun({ text: label, bold: true, size: 22, font: 'Arial', color: C.darkText }),
      new TextRun({ text: value, size: 22, font: 'Arial', color: C.darkText }),
    ]
  });
}

function spacer(size = 160) {
  return new Paragraph({ spacing: { before: size, after: 0 }, children: [new TextRun('')] });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function divider() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.purple, space: 1 } },
    children: [new TextRun('')]
  });
}

function infoBox(lines, bgColor = C.lightPurple) {
  const children = lines.map(({ label, value }) =>
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({ text: label + ': ', bold: true, size: 22, font: 'Arial', color: C.darkText }),
        new TextRun({ text: value, size: 22, font: 'Arial', color: C.darkText }),
      ]
    })
  );
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({
      children: [new TableCell({
        borders,
        width: { size: 9360, type: WidthType.DXA },
        shading: { fill: bgColor, type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 200, right: 200 },
        children
      })]
    })]
  });
}

function headerRow(cells, widths, bg = C.purple) {
  return new TableRow({
    tableHeader: true,
    children: cells.map((text, i) =>
      new TableCell({
        borders,
        width: { size: widths[i], type: WidthType.DXA },
        shading: { fill: bg, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({
          children: [new TextRun({ text, bold: true, size: 20, color: 'FFFFFF', font: 'Arial' })]
        })]
      })
    )
  });
}

function dataRow(cells, widths, bg = 'FFFFFF') {
  return new TableRow({
    children: cells.map((text, i) =>
      new TableCell({
        borders,
        width: { size: widths[i], type: WidthType.DXA },
        shading: { fill: bg, type: ShadingType.CLEAR },
        margins: { top: 60, bottom: 60, left: 120, right: 120 },
        children: [new Paragraph({
          children: [new TextRun({ text: String(text), size: 20, font: 'Arial', color: C.darkText })]
        })]
      })
    )
  });
}

// === SKILL COST TABLE (30% per level) ===
function buildSkillCostTable() {
  const widths = [2000, 2500, 2500, 2360];
  const rows = [headerRow(['Poziom', 'Koszt tego poziomu', 'Suma skumulowana', 'Przyrost'], widths)];
  let cost = 1;
  let total = 0;
  for (let lvl = 1; lvl <= 20; lvl++) {
    const c = Math.round(cost);
    total += c;
    const bg = lvl % 2 === 0 ? C.gray : 'FFFFFF';
    rows.push(dataRow([
      `Poziom ${lvl}`,
      `${c} pkt`,
      `${total} pkt`,
      lvl === 1 ? '—' : '+30%'
    ], widths, bg));
    cost *= 1.3;
  }
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: widths, rows });
}

// === STUDIES TABLE ===
function buildStudiesTable() {
  const widths = [2600, 1400, 2000, 1800, 1560];
  const rows = [headerRow(['Nazwa akcji', 'Czas trwania', 'Punkty umiejętności', 'Szansa na czar', 'Odblokowanie'], widths)];
  const studies = [
    ['Chaotyczne machanie rękoma', '1 min', '1–4 pkt', '20%', 'Domyślnie'],
    ['Opanowane ruchy dłońmi', '2 min', '5–10 pkt', '30%', 'Wieża poz. 3'],
    ['Skupiona inkantacja', '3 min', '11–22 pkt', '40%', 'Wieża poz. 6'],
    ['Podstawowa inkantacja', '4 min', '23–50 pkt', '40%', 'Wieża poz. 10'],
    ['Zaawansowana inkantacja', '5 min', '51–100 pkt', '50%', 'Wieża poz. 15'],
  ];
  studies.forEach(([name, time, pts, chance, unlock], i) => {
    rows.push(dataRow([name, time, pts, chance, unlock], widths, i % 2 === 0 ? 'FFFFFF' : C.gray));
  });
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: widths, rows });
}

// === EXPLORATION TABLE ===
function buildExplorationTable() {
  const widths = [2400, 1200, 1800, 1800, 2160];
  const rows = [headerRow(['Nazwa akcji', 'Czas', 'Punkty umiej.', 'Szansa na przedmiot', 'Szansa na spotkanie'], widths)];
  const expl = [
    ['Spacerek wokół wieży', '2 min', '10–20 pkt', '10%', '5%'],
    ['Spacerek po włościach', '4 min', '20–40 pkt', '20%', '10%'],
    ['Wycieczka do magicznego miasta', '6 min', '40–60 pkt', '30%', '0%'],
    ['Wycieczka w smutne góry', '8 min', '60–80 pkt', '20%', '40%'],
    ['Magiczna podróż morska', '10 min', '70–90 pkt', '40%', '50%'],
  ];
  expl.forEach(([name, t, pts, item, meet], i) => {
    rows.push(dataRow([name, t, pts, item, meet], widths, i % 2 === 0 ? 'FFFFFF' : C.gray));
  });
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: widths, rows });
}

// === TOWER TABLE ===
function buildTowerTable() {
  const widths = [2400, 1800, 1600, 3560];
  const rows = [headerRow(['Budynek', 'Dostępny od', 'Maks. poziom', 'Funkcja'], widths)];
  const buildings = [
    ['Wieża (główna)', 'Poziom 1', 'Brak limitu', 'Odblokowuje ulepszenia i budynki'],
    ['Zbieracz mocy', 'Poziom 1', 'Brak limitu', 'Pasywna produkcja Okruchów mocy'],
    ['Sztuczne ręce', 'Poziom 2', 'Brak limitu', 'Pasywna produkcja Złota'],
    ['Graciarnia', 'Poziom 1', 'Poziom 30', 'Magazyn magicznych artefaktów'],
    ['Garderoba', 'Poziom 1', 'Poziom 30', 'Magazyn magicznych ubrań'],
    ['Biblioteka', 'Poziom 1', 'Brak limitu', 'Magazyn niestandardowych czarów'],
    ['Magiczne lustro', 'Poziom 5', 'Poziom 10', 'Odblokowuje akcję Podglądanie'],
  ];
  buildings.forEach(([name, from, max, func], i) => {
    rows.push(dataRow([name, from, max, func], widths, i % 2 === 0 ? 'FFFFFF' : C.gray));
  });
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: widths, rows });
}

// === SPELLS TABLE ===
function buildSpellsTable() {
  const widths = [2200, 2800, 1600, 2760];
  const rows = [headerRow(['Czar', 'Wymagania (pospolity)', 'Obrażenia', 'Notatka'], widths)];
  const spells = [
    ['Piorun kulisty', 'Powietrze 5, Chaos 1', '10 pkt', 'Żywioł powietrza'],
    ['Kula ognia', 'Ogień 5, Chaos 1', '10 pkt', 'Żywioł ognia'],
    ['Błoto', 'Woda 1, Ziemia 1', '2 pkt', 'Combo woda+ziemia'],
    ['Strumień wody', 'Woda 2', '2 pkt', 'Żywioł wody'],
    ['Sople lodu', 'Woda 5, Chaos 1', '10 pkt', 'Żywioł wody'],
    ['Zabójczy królik', 'Chaos 10', '25 pkt', 'Czysta magia chaosu'],
    ['Rój magicznych pszczół', 'Wszystkie żywioły 3', '15 pkt', 'Wymaga 5 żywiołów'],
    ['Podmuch', 'Powietrze 2', '2 pkt', 'Żywioł powietrza'],
    ['Tornado', 'Powietrze 10, Chaos 5', '25 pkt', 'Zaawansowany żywioł powietrza'],
  ];
  spells.forEach(([name, req, dmg, note], i) => {
    rows.push(dataRow([name, req, dmg, note], widths, i % 2 === 0 ? 'FFFFFF' : C.gray));
  });
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: widths, rows });
}

// === ITEMS TABLE ===
function buildItemsTable() {
  const widths = [2800, 2200, 4360];
  const rows = [headerRow(['Przedmiot', 'Wymagania', 'Bonus'], widths)];
  const items = [
    ['Chyba-magiczny-patyk', 'Brak', '+1 pkt Magii ziemi'],
    ['Podejrzanie wyglądający liść', 'Brak', '+2 pkt Magii ziemi'],
    ['Znoszone buty', 'Brak', '+5 Wytrzymałości'],
    ['Magiczny łańcuch', 'Wiedza 5', '+3 pkt każdego żywiołu'],
  ];
  items.forEach(([name, req, bonus], i) => {
    rows.push(dataRow([name, req, bonus], widths, i % 2 === 0 ? 'FFFFFF' : C.gray));
  });
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: widths, rows });
}

// === STATS TABLE ===
function buildStatsTable() {
  const widths = [2400, 6960];
  const rows = [headerRow(['Statystyka', 'Opis i wpływ na rozgrywkę'], widths)];
  const stats = [
    ['Wiedza', 'Wpływa na umiejętność generowania zasobów podstawowych (Okruchy mocy, Złoto)'],
    ['Inteligencja', 'Wpływa na umiejętność odkrywania nowych czarów (szansa przy studiach)'],
    ['Moc', 'Mnoży efektywność Wiedzy i Inteligencji — meta-statystyka wzmacniająca pozostałe'],
    ['Żywioł ognia', 'Bonusy do czarów z magii ognia: obrażenia, szansa trafienia krytycznego'],
    ['Żywioł ziemi', 'Bonusy do czarów z magii ziemi: obrażenia, redukcja obrażeń wejściowych'],
    ['Żywioł powietrza', 'Bonusy do czarów z magii powietrza: obrażenia, prędkość akcji'],
    ['Żywioł wody', 'Bonusy do czarów z magii wody: obrażenia, efekty oślepienia/spowalniania'],
    ['Chaos', 'Bonusy do czarów z magii chaosu: losowe efekty o podwyższonej sile'],
    ['Cast Speed', 'Prędkość rzucania czarów — przekłada się na liczbę ataków w walce'],
    ['Wytrzymałość', 'Ile magicznych obrażeń można przyjąć zanim przegra się walkę'],
  ];
  stats.forEach(([name, desc], i) => {
    rows.push(dataRow([name, desc], widths, i % 2 === 0 ? 'FFFFFF' : C.gray));
  });
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: widths, rows });
}

// === COMBAT TABLE ===
function buildCombatTable() {
  const widths = [3000, 6360];
  const rows = [headerRow(['Element', 'Szczegóły'], widths)];
  const combat = [
    ['Inicjacja', 'Gracz A wyzwania Gracza B (tylko podobny poziom prestiżu)'],
    ['Ekwipunek', 'Każdy gracz wybiera aktywny zestaw czarów i artefaktów przed walką'],
    ['Brak wyboru', 'System losowo dobiera dostępne przedmioty gracza'],
    ['Mechanika', 'Serwer oblicza walkę deterministycznie na podstawie statystyk + ekwipunku'],
    ['Zakończenie', 'Wygrywa ten, kto pierwszy przełamie Wytrzymałość przeciwnika'],
    ['Log walki', 'Obaj gracze widzą pełny zapis przebiegu walki (tura po turze)'],
    ['Limit dzienny', '5 pojedynków na dobę'],
    ['Nagroda — wygrana z słabszym', '+2 punkty prestiżu'],
    ['Nagroda — wygrana z równym', '+4 punkty prestiżu'],
    ['Nagroda — wygrana z silniejszym', '+6 punktów prestiżu'],
    ['Konsekwencja przegranej', 'Utrata części Okruchów mocy (% do ustalenia przy balansowaniu)'],
  ];
  combat.forEach(([el, detail], i) => {
    rows.push(dataRow([el, detail], widths, i % 2 === 0 ? 'FFFFFF' : C.gray));
  });
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: widths, rows });
}

// === RARITY TABLE ===
function buildRarityTable() {
  const widths = [2200, 2000, 2580, 2580];
  const rows = [headerRow(['Rzadkość', 'Kolor (UI)', 'Mnożnik siły', 'Mnożnik wymagań'], widths)];
  const rarity = [
    ['Pospolity', 'Szary', '×1.0', '×1.0'],
    ['Nietypowy', 'Zielony', '×1.5', '×1.3'],
    ['Rzadki', 'Niebieski', '×2.5', '×2.0'],
    ['Unikalny', 'Złoty', '×5.0', '×4.0'],
  ];
  rarity.forEach(([r, c, s, req], i) => {
    rows.push(dataRow([r, c, s, req], widths, i % 2 === 0 ? 'FFFFFF' : C.gray));
  });
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: widths, rows });
}

// === MVP ROADMAP TABLE ===
function buildRoadmapTable() {
  const widths = [1400, 3000, 4960];
  const rows = [headerRow(['Faza', 'Zakres', 'Cel'], widths)];
  const roadmap = [
    ['MVP', 'Wieża + Studia + Eksploracja', 'Pierwsza grywalna wersja dla testerów'],
    ['MVP+', '+ Walki PvP + Prestiż + Ranking', 'Pełna rywalizacja między graczami'],
    ['v1.0', '+ System Premium + Konta + Sezon', 'Oficjalny soft-launch przeglądarkowy'],
    ['v1.5', '+ Aplikacja mobilna (Flutter)', 'Rozszerzenie na mobile'],
    ['v2.0', '+ Gildie magów', 'Rywalizacja grupowa'],
    ['v3.0', '+ Inwencja twórcza (własne czary)', 'Pełna wizja produktu'],
  ];
  roadmap.forEach(([phase, scope, goal], i) => {
    rows.push(dataRow([phase, scope, goal], widths, i % 2 === 0 ? 'FFFFFF' : C.gray));
  });
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: widths, rows });
}

// === MAIN DOCUMENT ===
const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }, {
          level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } } }
        }]
      }
    ]
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 22, color: C.darkText } } },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Arial', color: C.purple },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 }
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: C.darkBg },
        paragraph: { spacing: { before: 300, after: 160 }, outlineLevel: 1 }
      },
      {
        id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: C.purple },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 }
      },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'GDD — Wieża Magów   |   Strona ', size: 18, color: '888888', font: 'Arial' }),
            new PageNumber(),
            new TextRun({ text: '   |   DOKUMENT ROBOCZY — WERSJA 0.1', size: 18, color: '888888', font: 'Arial' }),
          ]
        })]
      })
    },
    children: [

      // ── TITLE PAGE ──
      spacer(800),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: '✦  WIEŻA MAGÓW  ✦', bold: true, size: 56, color: C.purple, font: 'Arial' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: 'Game Design Document', size: 32, color: C.gold, font: 'Arial', italics: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 400 },
        children: [new TextRun({ text: 'Wersja 0.1  —  Dokument roboczy', size: 22, color: '888888', font: 'Arial' })]
      }),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [4680, 4680],
        rows: [
          new TableRow({ children: [
            new TableCell({
              borders, shading: { fill: C.lightPurple, type: ShadingType.CLEAR },
              width: { size: 4680, type: WidthType.DXA },
              margins: { top: 120, bottom: 120, left: 200, right: 200 },
              children: [
                new Paragraph({ children: [new TextRun({ text: 'Gatunek', bold: true, size: 22, font: 'Arial', color: C.darkText })] }),
                new Paragraph({ children: [new TextRun({ text: 'Browser MMO / Strategy RPG', size: 22, font: 'Arial', color: C.darkText })] }),
              ]
            }),
            new TableCell({
              borders, shading: { fill: C.lightGold, type: ShadingType.CLEAR },
              width: { size: 4680, type: WidthType.DXA },
              margins: { top: 120, bottom: 120, left: 200, right: 200 },
              children: [
                new Paragraph({ children: [new TextRun({ text: 'Platformy (docelowo)', bold: true, size: 22, font: 'Arial', color: C.darkText })] }),
                new Paragraph({ children: [new TextRun({ text: 'Przeglądarka, Aplikacja mobilna, Steam', size: 22, font: 'Arial', color: C.darkText })] }),
              ]
            }),
          ]}),
          new TableRow({ children: [
            new TableCell({
              borders, shading: { fill: C.lightGold, type: ShadingType.CLEAR },
              width: { size: 4680, type: WidthType.DXA },
              margins: { top: 120, bottom: 120, left: 200, right: 200 },
              children: [
                new Paragraph({ children: [new TextRun({ text: 'Model biznesowy', bold: true, size: 22, font: 'Arial', color: C.darkText })] }),
                new Paragraph({ children: [new TextRun({ text: 'Free-to-play + Subskrypcja Premium (no P2W)', size: 22, font: 'Arial', color: C.darkText })] }),
              ]
            }),
            new TableCell({
              borders, shading: { fill: C.lightPurple, type: ShadingType.CLEAR },
              width: { size: 4680, type: WidthType.DXA },
              margins: { top: 120, bottom: 120, left: 200, right: 200 },
              children: [
                new Paragraph({ children: [new TextRun({ text: 'Tryb gry', bold: true, size: 22, font: 'Arial', color: C.darkText })] }),
                new Paragraph({ children: [new TextRun({ text: '100% Online — globalny serwer, wersja podstawowa + sezon', size: 22, font: 'Arial', color: C.darkText })] }),
              ]
            }),
          ]}),
        ]
      }),
      spacer(400),

      // ── SECTION 1: STORY ──
      pageBreak(),
      h1('1. Tło fabularne i założenia narracyjne'),
      divider(),
      h2('1.1 Świat gry'),
      p('Akcja rozgrywa się w zwykłym świecie, którego poziom rozwoju odpowiada mniej więcej średniowieczu — szczytem technologii bojowej są miecze i kusze, a największe osiągnięcia cywilizacji to płodozmian i podstawowe rzemiosło.'),
      spacer(80),
      p('Pewnego dnia, bez żadnego ostrzeżenia, cały świat zostaje przesycony magią. Iskry energii widoczne są gołym okiem. Każdy gest dłonią wywołuje efekty — coś się stwarza, coś wybucha, coś znika. Dotychczasowy porządek społeczny i gospodarczy traci sens: po co pracować na roli, skoro można stworzyć jedzenie zaklęciem? Po co ciężko zarabiać, skoro można zmaterializować złoto?'),
      spacer(80),
      p('Odpowiedź jest jednak prosta — żeby to wszystko robić, trzeba wiedzieć jak. I właśnie to jest sedno gry.'),

      spacer(120),
      h2('1.2 Punkt startowy gracza'),
      p('Gracz wciela się w młodego człowieka, który właśnie odkrył w sobie zdolności magiczne. Jako przystało na ambicję młodego czarodzieja, pierwszą decyzją jest budowa własnej wieży — symbolu statusu i centrum jego rosnącej potęgi. Stamtąd rozpoczyna naukę czarów, eksplorację świata i rywalizację z innymi magami.'),

      spacer(400),

      // ── SECTION 2: CORE LOOP ──
      h1('2. Core Loop — co gracz robi każdego dnia'),
      divider(),
      p('Codzienny rytm rozgrywki opiera się na czterech filarach:'),
      spacer(80),
      bullet2('Budowanie wieży — ', 'rozbudowa i ulepszanie kolejnych kondygnacji i budynków, każde z konkretnymi bonusami do produkcji zasobów i odblokowania mechanik'),
      bullet2('Szalone studia — ', 'cykliczne akcje generujące punkty umiejętności i niestandardowe czary'),
      bullet2('Eksploracja — ', 'wyprawy w teren zdobywające punkty umiejętności, artefakty i losowe spotkania'),
      bullet2('Pojedynki PvP — ', 'rywalizacja z innymi magami o prestiż i zasoby'),
      spacer(120),
      p('Mechanika puli akcji (odnawialnej co określony czas) wymusza regularne logowanie, ale nie karze graczy którzy mają mniej czasu — po prostu zbierają pulę i wydają ją jednorazowo.'),

      spacer(400),

      // ── SECTION 3: STATS ──
      pageBreak(),
      h1('3. System statystyk postaci'),
      divider(),
      h2('3.1 Lista statystyk'),
      buildStatsTable(),

      spacer(200),
      h2('3.2 Wydawanie punktów umiejętności'),
      p('Punkty umiejętności zdobywane są poprzez Szalone studia oraz Eksplorację. Gracz ręcznie decyduje, którą statystykę rozwijać. Koszt kolejnych poziomów rośnie o 30% z każdym progiem.'),
      spacer(120),
      h3('Tabela kosztów rozwoju statystyk'),
      buildSkillCostTable(),
      spacer(120),
      infoBox([
        { label: 'Wzór', value: 'Koszt(N) = Koszt(N-1) × 1.30, gdzie Koszt(1) = 1 pkt' },
        { label: 'Przykład — Wytrzymałość do poz. 5', value: '1 + 1 + 2 + 2 + 3 = 9 pkt łącznie' },
        { label: 'Uwaga', value: 'Dokładne wartości będą balansowane w trakcie testów z testerami' },
      ]),

      spacer(400),

      // ── SECTION 4: TOWER ──
      pageBreak(),
      h1('4. Wieża Magów — system budowy'),
      divider(),
      h2('4.1 Zasady ogólne'),
      bullet('Każda budowa trwa określony czas (im wyższy poziom, tym więcej czasu)'),
      bullet('Każda budowa wymaga określonego poziomu statystyk gracza'),
      bullet('Wieża główna nie ma limitu poziomu — jej poziom odblokowuje kolejne budynki i ulepszenia'),
      bullet('Poziom prestiżu może stanowić dodatkowy wymóg do odblokowania wyższych kondygnacji wieży (do ustalenia)'),

      spacer(160),
      h2('4.2 Lista budynków'),
      buildTowerTable(),

      spacer(160),
      h2('4.3 Zasoby produkowane przez wieżę'),
      infoBox([
        { label: 'Okruchy mocy', value: 'Produkowane pasywnie przez Zbieracz mocy. Używane jako waluta do nauki czarów i ulepszania budynków.' },
        { label: 'Złoto', value: 'Produkowane pasywnie przez Sztuczne ręce. Używane w handlu między graczami i do wybranych ulepszeń.' },
        { label: 'Uwaga', value: 'Szczegółowe wskaźniki produkcji (ile na godzinę per poziom) będą ustalane podczas balansowania.' },
      ], C.lightGold),

      spacer(400),

      // ── SECTION 5: ACTIONS ──
      pageBreak(),
      h1('5. System akcji'),
      divider(),

      h2('5.1 Szalone studia'),
      infoBox([
        { label: 'Czas odnawiania', value: '30 minut / 1 akcja' },
        { label: 'Maksymalna pula', value: '30 akcji (po 900 min bez działania pula jest pełna i nie rośnie)' },
        { label: 'Odblokowanie wyższych poziomów', value: 'Zależne od aktualnego poziomu Wieży' },
      ]),
      spacer(120),
      buildStudiesTable(),
      spacer(120),
      p('Każda akcja studiów może wygenerować niestandardowy czar. Szansa zależy od poziomu akcji. Poziom (rzadkość) wygenerowanego czaru zależy od aktualnych statystyk gracza (Inteligencja, Moc, odpowiednie Żywioły).'),

      spacer(200),
      h2('5.2 Eksploracja'),
      infoBox([
        { label: 'Czas odnawiania', value: '60 minut / 1 akcja' },
        { label: 'Maksymalna pula', value: '15 akcji (po 900 min bez działania pula jest pełna i nie rośnie)' },
        { label: 'Odblokowanie wyższych poziomów', value: 'Zależne od statystyk gracza' },
      ]),
      spacer(120),
      buildExplorationTable(),

      spacer(160),
      h3('Akcje spotkania (losowe zdarzenia podczas eksploracji)'),
      bullet2('Walka z magicznym stworzonkiem — ', 'siła stworzenia zależy od poziomu eksploracji. Wygrana = dodatkowe pkt umiejętności + magiczny przedmiot. Przegrana = utrata części Okruchów mocy.'),
      bullet2('Portal — ', 'postać wchodzi do portalu; na końcu gracz otrzymuje zagadkę. Poprawna odpowiedź = runa magii. Błędna = utrata części Okruchów mocy.'),
      bullet('Inne zdarzenia — lista będzie rozszerzana w trakcie developmentu'),

      spacer(200),
      h2('5.3 Podglądanie'),
      infoBox([
        { label: 'Dostępność', value: 'Od momentu wybudowania Magicznego lustra (Wieża poz. 5)' },
        { label: 'Limit', value: '1 raz dziennie' },
        { label: 'Ryzyko', value: 'Lustro działa w obie strony — przyłapany gracz może ponieść konsekwencje' },
      ]),
      spacer(120),
      bullet2('Podglądanie graczy — ', 'możliwe tylko wobec graczy na wyższym poziomie. Pozwala nauczyć się ich niestandardowych czarów.'),
      bullet2('Podglądanie bytów nieznanych — ', 'nauka magii stosowanej przez tajemnicze stworzenia. Źródło rzadkich i unikalnych czarów.'),

      spacer(400),

      // ── SECTION 6: COMBAT ──
      pageBreak(),
      h1('6. System walk PvP'),
      divider(),
      h2('6.1 Przebieg pojedynku'),
      buildCombatTable(),

      spacer(160),
      h2('6.2 Algorytm walki (szkic techniczny)'),
      infoBox([
        { label: 'Typ', value: 'Deterministyczny — ten sam seed + te same statystyki = zawsze ten sam wynik' },
        { label: 'Dane wejściowe', value: 'Statystyki gracza A, wybrany ekwipunek A, statystyki gracza B, wybrany ekwipunek B' },
        { label: 'Przebieg', value: 'Serwer symuluje walkę turę po turze, uwzględniając Cast Speed, żywioły, przedmioty' },
        { label: 'Wynik', value: 'Zwycięstwo gdy Wytrzymałość przeciwnika = 0. Log walki dostępny dla obu graczy.' },
        { label: 'Balansowanie', value: 'Dokładne wzory (obrażenia, progi trafień krytycznych) ustalane podczas testów' },
      ]),

      spacer(400),

      // ── SECTION 7: SPELLS & ITEMS ──
      pageBreak(),
      h1('7. Niestandardowe czary i magiczne artefakty'),
      divider(),

      h2('7.1 System rzadkości'),
      buildRarityTable(),
      spacer(120),
      p('Każdy czar i artefakt istnieje w czterech wariantach rzadkości. Wyższy poziom rzadkości = proporcjonalnie większa siła, ale też wyższe wymagania statystyk. Rzadkość wpływa też na wygląd w UI (kolor ramki, efekty wizualne).'),

      spacer(200),
      h2('7.2 Lista startowa czarów (pospolite wersje)'),
      p('Lista docelowa: 400–500 czarów. Poniżej czary zaimplementowane w MVP:'),
      spacer(80),
      buildSpellsTable(),
      spacer(120),
      infoBox([
        { label: 'Skala docelowa', value: '400–500 czarów łącznie we wszystkich żywiołach' },
        { label: 'Odblokowanie', value: 'Czar musi zostać odkryty przez gracza (poprzez studia lub podglądanie) zanim będzie dostępny' },
        { label: 'Używanie', value: 'Możliwe tylko po spełnieniu wymagań statystyk dla danej rzadkości' },
      ]),

      spacer(200),
      h2('7.3 Lista startowa artefaktów (pospolite wersje)'),
      p('Lista docelowa: 400–500 artefaktów. Poniżej artefakty zaimplementowane w MVP:'),
      spacer(80),
      buildItemsTable(),

      spacer(400),

      // ── SECTION 8: PRESTIGE & RANKING ──
      pageBreak(),
      h1('8. Prestiż i ranking'),
      divider(),
      h2('8.1 Punkty prestiżu'),
      bullet('Zdobywane wyłącznie przez wygrane pojedynki PvP'),
      bullet('Nie można ich stracić przez przegraną walkę (tylko Okruchy mocy)'),
      bullet('Poziom prestiżu może odblokować wyższe kondygnacje wieży (powiązanie do ustalenia)'),
      bullet('Prestiż stanowi podstawę globalnego rankingu graczy'),

      spacer(120),
      h2('8.2 Ranking globalny'),
      bullet('Jeden globalny serwer — gracze z całego świata konkurują razem'),
      bullet('Ranking odświeżany w czasie rzeczywistym'),
      bullet('Osobny ranking dla wersji podstawowej i dla aktywnego sezonu'),
      bullet('Statystyki dostępne publicznie na profilu każdego gracza'),

      spacer(400),

      // ── SECTION 9: GAME MODES ──
      pageBreak(),
      h1('9. Tryby gry — Podstawowy i Sezonowy'),
      divider(),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2800, 3280, 3280],
        rows: [
          headerRow(['Cecha', 'Wersja podstawowa', 'Sezon'], [2800, 3280, 3280]),
          dataRow(['Dostępność', 'Zawsze aktywna', 'Ograniczony czas (np. 6 miesięcy)'], [2800, 3280, 3280], 'FFFFFF'),
          dataRow(['Reset progresu', 'Brak — postać rośnie na stałe', 'Po zakończeniu sezonu reset do zera'], [2800, 3280, 3280], C.gray),
          dataRow(['Konto gracza', 'Jedno konto, trwały progres', 'Osobny slot sezonowy'], [2800, 3280, 3280], 'FFFFFF'),
          dataRow(['Ranking', 'Ranking ogólny (all-time)', 'Ranking sezonowy (tymczasowy)'], [2800, 3280, 3280], C.gray),
          dataRow(['Nagrody za sezon', 'Nie dotyczy', 'Kosmetyki, tytuły — przenoszone na konto główne'], [2800, 3280, 3280], 'FFFFFF'),
          dataRow(['Zalecenie dla nowicjuszy', 'Dobry start o każdej porze', 'Najlepiej dołączyć na początku sezonu'], [2800, 3280, 3280], C.gray),
        ]
      }),

      spacer(400),

      // ── SECTION 10: MONETIZATION ──
      pageBreak(),
      h1('10. Model monetyzacji'),
      divider(),
      h2('10.1 Zasada nadrzędna: No Pay-to-Win'),
      infoBox([
        { label: 'Zasada', value: 'Premium nie daje żadnej przewagi w rankingu ani walce. Każdy gracz bez premium może osiągnąć identyczne statystyki bojowe.' },
        { label: 'Model', value: 'Subskrypcja odnawialna (miesięczna / kwartalna / roczna)' },
      ], C.lightGold),

      spacer(160),
      h2('10.2 Co daje Premium'),
      bullet2('Kosmetyki — ', 'skórki wieży, efekty czarów, animacje, ramy profilu'),
      bullet2('Layouty UI — ', 'alternatywne motywy wizualne interfejsu'),
      bullet2('Komfort QoL — ', 'np. podgląd statystyk z większą historią, zaawansowane filtry kolekcji'),
      bullet2('Czas akcji — ', 'możliwe minimalne skrócenie czasów budowy / akcji (max -10-15%, do weryfikacji czy nie P2W)'),
      bullet('Sezonowe ramki i tytuły ekskluzywne dla subskrybentów'),

      spacer(160),
      h2('10.3 Co NIE wchodzi do Premium'),
      bullet('Lepsze statystyki walki lub zasoby'),
      bullet('Więcej akcji dziennie niż darmowi gracze'),
      bullet('Wyłączny dostęp do czarów lub artefaktów'),
      bullet('Przyspieszenia dające realną przewagę rankingową'),

      spacer(400),

      // ── SECTION 11: ROADMAP ──
      pageBreak(),
      h1('11. Roadmapa rozwoju produktu'),
      divider(),
      buildRoadmapTable(),
      spacer(160),
      h2('11.1 Stack technologiczny (rekomendowany)'),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2200, 3400, 3760],
        rows: [
          headerRow(['Warstwa', 'Technologia', 'Uzasadnienie'], [2200, 3400, 3760]),
          dataRow(['Backend', 'Node.js + TypeScript', 'Wydajny event loop, świetny ekosystem do gier real-time'], [2200, 3400, 3760], 'FFFFFF'),
          dataRow(['Real-time', 'Socket.io', 'WebSockety — aktualizacje walk, powiadomienia, ranking live'], [2200, 3400, 3760], C.gray),
          dataRow(['Baza danych', 'PostgreSQL + Redis', 'Relacyjna dla danych gracza, Redis dla cache i sesji'], [2200, 3400, 3760], 'FFFFFF'),
          dataRow(['Frontend web', 'React + TypeScript', 'Standard rynkowy, ogromna społeczność'], [2200, 3400, 3760], C.gray),
          dataRow(['Aplikacja mobilna', 'Flutter', 'Gracz zna Fluttera — jeden kod na Android + iOS'], [2200, 3400, 3760], 'FFFFFF'),
          dataRow(['Desktop/Steam', 'Tauri / Electron', 'Opakowanie apki webowej — brak dodatkowego kodu'], [2200, 3400, 3760], C.gray),
        ]
      }),

      spacer(400),

      // ── SECTION 12: OPEN QUESTIONS ──
      pageBreak(),
      h1('12. Otwarte pytania i elementy do ustalenia'),
      divider(),
      p('Poniższe elementy są świadomie odłożone — zostaną doprecyzowane podczas balansowania i testów:'),
      spacer(120),
      h2('Do ustalenia przy balansowaniu'),
      bullet('Dokładne koszty budowy kolejnych poziomów wieży (czas + wymagania surowców)'),
      bullet('Wskaźniki produkcji Okruchów mocy i Złota per poziom budynku'),
      bullet('Precyzyjne wzory systemu walki (mnożniki obrażeń, progi trafień krytycznych)'),
      bullet('Procent Okruchów mocy traconych przy przegranej walce'),
      bullet('Balans czasu skrócenia budowy dla subskrybentów Premium (granica P2W)'),
      bullet('Szczegółowy harmonogram czasów budowy wieży (ile godzin per poziom)'),

      spacer(160),
      h2('Do zaprojektowania w kolejnej fazie'),
      bullet('Gildie magów — struktura, rywalizacja, współdzielenie czarów między członkami'),
      bullet('Inwencja twórcza — system tworzenia własnych czarów w oparciu o predefiniowane kryteria'),
      bullet('Rozbudowa budynków wieży: Świeczki, Portal, Bariera magiczna i inne'),
      bullet('Pełna lista akcji spotkań podczas eksploracji'),
      bullet('System handlu między graczami — zasady, waluta, ograniczenia anty-P2W'),
      bullet('Mechanika "przyłapania" przy akcji Podglądanie — konsekwencje dla obu stron'),
      bullet('System powiadomień i retencji (push, email, dzienny bonus za logowanie)'),
      bullet('Mechanika dołączenia do aktywnego sezonu z opóźnieniem (catch-up system)'),

      spacer(200),
      divider(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 0 },
        children: [new TextRun({ text: 'Koniec dokumentu — wersja 0.1', size: 20, italics: true, color: '888888', font: 'Arial' })]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/mnt/user-data/outputs/WiezaMagow_GDD_v0.1.docx', buffer);
  console.log('Done');
});
