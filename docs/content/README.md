# Obsah aplikácie

- **Stav:** rozpracované, špecifikuje sa po moduloch
- **Posledná úprava:** 2026-10-20

## Cieľ

Osobná kávová appka, ktorá pokryje všetko, čo vlastník potrebuje, bez paywallu a bez kompromisov existujúcich aplikácií.

## Moduly

Každý modul má vlastný súbor v tomto adresári s popisom obrazoviek, dátového modelu a akceptačných kritérií.

| # | Modul | Popis | Súbor | Stav |
|---|---|---|---|---|
| 1 | Coffees | Evidencia balíčkov kávy, prehľad čo mám a koľko gramov ostáva | [coffees.md](coffees.md) | implementované |
| 2 | Recipes | Pridanie a úprava receptov podľa metódy (Espresso, Hario V60, Cold Brew) | [recipes.md](recipes.md) | implementované |
| 3 | Brew | Spustenie receptu, prechádzanie inštrukciami krok po kroku | [brew.md](brew.md) | implementované |
| 4 | Stats | Základné štatistiky | [stats.md](stats.md) | plán, nízka priorita |

**Mimo rozsahu (zatiaľ):** vybavenie (mlynčeky, kávovary), kaviarne, zdieľanie medzi používateľmi.

## Vzťahy medzi modulmi (predbežne)

```
Coffee (balíček) ──< Brew (príprava) >── Recipe
                         │
                         └──> Stats
```

Príprava (Brew) spája recept a konkrétny balíček kávy. Jej dávka odpočíta gramy z balíčka a je hlavným zdrojom dát pre štatistiky.

## Navigácia (návrh, upraví sa podľa modulov)

```
[ Coffees ] [ Recipes ] [ ▶ Brew ] [ Stats ] [ Settings ]
```

## Settings (vždy prítomné)

- Profile (display name)
- Theme: light / dark / system
- Sync status, Sync now
- App version, check for update
- Log out
