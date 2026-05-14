# Wieża Magów --- Game Design Document (wersja robocza)

## 1. Opis projektu

**Wieża Magów** to przeglądarkowa gra online typu browser MMO / strategy
RPG. Gracz wciela się w młodego maga, buduje własną wieżę, rozwija
umiejętności, odkrywa zaklęcia, eksploruje świat i rywalizuje z innymi
graczami.

Docelowe platformy: - Przeglądarka WWW - Aplikacja mobilna - Steam
(desktop)

Model biznesowy: - free-to-play - opcjonalna subskrypcja premium bez
pay-to-win

------------------------------------------------------------------------

## 2. Core gameplay loop

Główne aktywności gracza: - rozbudowa wieży - szalone studia (rozwój
umiejętności) - eksploracja świata - pojedynki PvP

Gra opiera się na systemie akcji odnawialnych w czasie.

------------------------------------------------------------------------

## 3. Główne systemy

### Statystyki

-   Wiedza
-   Inteligencja
-   Moc
-   Żywioły: ogień, ziemia, powietrze, woda
-   Chaos
-   Cast Speed
-   Wytrzymałość

### Budynki

-   Wieża główna
-   Zbieracz mocy
-   Sztuczne ręce
-   Graciarnia
-   Garderoba
-   Biblioteka
-   Magiczne lustro

### Zasoby

-   Okruchy mocy
-   Złoto

------------------------------------------------------------------------

## 4. System walki

PvP między graczami: - deterministyczne obliczenia po stronie serwera -
walka na podstawie statystyk, czarów i artefaktów - ranking globalny -
prestiż za zwycięstwa

------------------------------------------------------------------------

## 5. Zawartość

Planowana zawartość: - 400--500 czarów - 400--500 artefaktów - system
rzadkości: - pospolity - nietypowy - rzadki - unikalny

------------------------------------------------------------------------

## 6. Roadmap

### MVP

-   wieża
-   studia
-   eksploracja

### MVP+

-   PvP
-   ranking
-   prestiż

### Kolejne wersje

-   aplikacja mobilna
-   gildie
-   sezony
-   własne czary

------------------------------------------------------------------------

## 7. Stack technologiczny

### Backend

-   Node.js
-   TypeScript
-   Socket.io
-   PostgreSQL
-   Redis

### Frontend

-   React
-   TypeScript
-   Tailwind CSS

### Mobile

-   Flutter

### Desktop

-   Electron lub Tauri
