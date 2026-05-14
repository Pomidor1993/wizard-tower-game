# ✦ Wizard Tower Game

Browser MMO – buduj wieżę, ucz się czarów, rywalizuj z innymi magami.

## Struktura projektu

```
wizard-tower-game/
├── backend/          ← Serwer Node.js + Express + TypeScript
│   ├── src/
│   │   └── index.ts  ← Punkt startowy backendu
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/         ← (do zaimplementowania – React)
├── database/         ← Migracje i schematy bazy danych
├── docs/             ← Dokumentacja, GDD
└── package.json      ← Root workspace
```

## Pierwsze uruchomienie

```bash
# 1. Wejdź do folderu backend
cd backend

# 2. Zainstaluj zależności
npm install

# 3. Skopiuj plik zmiennych środowiskowych
cp .env.example .env

# 4. Uruchom serwer deweloperski
npm run dev
```

Serwer powinien być dostępny pod: http://localhost:3001

## Skrypty

| Komenda | Opis |
|---------|------|
| `npm run dev` | Uruchom z auto-restartem (tryb deweloperski) |
| `npm run build` | Skompiluj TypeScript do JavaScript |
| `npm start` | Uruchom skompilowaną wersję produkcyjną |
