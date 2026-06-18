export type LocationLetter = "A" | "B" | "C";

export interface ExplorationLocation {
  level: number;
  letter: LocationLetter;
  name: string;
  tierRange: [number, number]; // min tier, max tier
}

export const EXPLORATION_LOCATIONS: ExplorationLocation[] = [
  // Poziom 1
  { level: 1, letter: "A", name: "Przeszukaj krzaki przy wieży",              tierRange: [1, 3] },
  { level: 1, letter: "B", name: "Poszukaj skrytek w zwykłym, nudnym lesie",  tierRange: [1, 3] },
  { level: 1, letter: "C", name: "Poszukaj czegoś nad stawem",                tierRange: [1, 3] },
  // Poziom 2
  { level: 2, letter: "A", name: "Splądruj opuszczoną chatkę",                tierRange: [2, 5] },
  { level: 2, letter: "B", name: "Zajrzyj pod pobliski most",                 tierRange: [2, 5] },
  { level: 2, letter: "C", name: "Przeszukaj brzegi rzeczki",                 tierRange: [2, 5] },
  // Poziom 3
  { level: 3, letter: "A", name: "Zbadaj starą jaskinię",                     tierRange: [3, 6] },
  { level: 3, letter: "B", name: "Wejdź na pobliskie wzgórze",                tierRange: [3, 6] },
  { level: 3, letter: "C", name: "Poszukaj skrzyni ukrytej za wodospadem",    tierRange: [3, 6] },
  // Poziom 4
  { level: 4, letter: "A", name: "Przeszukaj zapomniane ruiny",               tierRange: [4, 8] },
  { level: 4, letter: "B", name: "Nurkuj w głębokim jeziorze",                tierRange: [4, 8] },
  { level: 4, letter: "C", name: "Poszukaj skrytek w magicznym, przeklętym lesie", tierRange: [4, 8] },
  // Poziom 5
  { level: 5, letter: "A", name: "Ograb legendarną kryptę",                   tierRange: [5, 10] },
  { level: 5, letter: "B", name: 'Wejdź do lochu z napisem "NIE WCHODZIĆ"',  tierRange: [5, 10] },
  { level: 5, letter: "C", name: 'Poszukaj sekretnego przejścia, którego "na pewno tu nie ma"', tierRange: [5, 10] },
];

export function getLocation(level: number, letter: LocationLetter): ExplorationLocation | undefined {
  return EXPLORATION_LOCATIONS.find(l => l.level === level && l.letter === letter);
}