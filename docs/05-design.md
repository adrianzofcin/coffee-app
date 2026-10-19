# Vizuálny štýl: Warm Minimal

- **Stav:** schválené (upravuje sa počas implementácie)
- **Posledná úprava:** 2026-10-19

## Charakter

Teplý, „kávový“ štýl s osobnosťou: výrazné serifové nadpisy, vlastné ilustrácie, tmavé espresso panely s karamelovou žiarou a jemná papierová textúra. Pôsobí ako útulná kaviareň, nie ako generická utilitka. Čitateľnosť počas prípravy má vždy prednosť.

## Farby (design tokeny)

Definujú sa ako CSS premenné v `src/assets/main.css` (Tailwind v4 `@theme inline`) a prepínajú sa triedou `.dark` na `<html>`.

| Token | Light | Dark | Použitie |
|---|---|---|---|
| `bg` | `#FAF6F1` | `#17110D` | Pozadie appky |
| `surface` | `#FFFFFF` | `#231A14` | Karty, bottom sheety |
| `surface-muted` | `#F2EBE3` | `#2D221B` | Inputy, chips, sekundárne plochy |
| `border` | `#E6DCD1` | `#3A2D24` | Oddeľovače, okraje |
| `text` | `#2B1D14` | `#F3EAE1` | Hlavný text |
| `text-muted` | `#7A6656` | `#B3A193` | Popisky, sekundárny text |
| `accent` | `#C8773A` | `#D88A4C` | Hlavné akcie, aktívna položka, progress |
| `accent-deep` | `#A65F2B` | `#B8692F` | Druhý koniec gradientu akcentu |
| `accent-contrast` | `#FFFFFF` | `#17110D` | Text na akcente |
| `espresso` / `espresso-deep` | `#2B1D14` / `#17110D` | `#2D221B` / `#120D0A` | Tmavé panely (hero karty, obrazovka prípravy) v oboch režimoch |
| `cream` | `#FAF6F1` | `#FAF6F1` | Text a línie na espresso paneloch |
| `success` | `#4F8A5B` | `#6FAF7B` | Cieľové pásmo espressa, synchronizované |
| `warning` | `#C9952B` | `#E0B04A` | Málo kávy, nad cieľovým časom |
| `danger` | `#B5483B` | `#D9695B` | Mazanie, chyby |

Kontrast textu (WCAG AA) sa overí pri implementácii obsahových modulov.

## Typografia

| Použitie | Písmo |
|---|---|
| Nadpisy stránok, názvy kariet, hero texty | **Fraunces** (variable, os `SOFT` = 100, utilita `font-display font-soft`), kurzíva pre akcenty (napr. meno v pozdrave) |
| Text, popisky, formuláre, čísla | **Inter** (variable) |

- Obe písma sú bundlované lokálne (`@fontsource-variable`), takže fungujú offline.
- Čísla (gramy, čas, pomer) majú `tabular-nums` (utilita `tabular`).
- Nadpis stránky má 34 px, nad ním je „eyebrow“: malý text v akcente, veľké písmená a širšie rozostupy (napr. *YOUR SHELF*).
- Stopky a cieľová váha na obrazovke prípravy majú 64–96 px.

## Povrchy a efekty

- **Espresso panel** (`bg-espresso-panel`): tmavý gradient s karamelovou žiarou v rohu. Používa sa pre hero karty, profil a obrazovku prípravy.
- **Akcentový gradient** (`bg-accent-gradient`): karamel → tmavý karamel, používa sa pre hlavné tlačidlá a stredné tlačidlo Brew. Má farebný tieň (glow).
- **Ambientná žiara:** jemný radiálny gradient akcentu v pravom hornom rohu pozadia.
- **Papierová textúra:** šum cez celú appku (opacity 3.5 % v svetlom, 6 % v tmavom režime).
- **Zaoblenie:** karty 20 px, ovládacie prvky 14 px, chips a navigácia sú plne zaoblené.
- **Tiene:** mäkké a teplé (hnedý odtieň, nie čierna sivá).

## Ilustrácie

Vlastné SVG komponenty v `src/components/illustrations/`:

| Komponent | Kde sa používa |
|---|---|
| `EspressoCup` | Prihlásenie, hero karta Brew, metóda Espresso (para je animovaná) |
| `V60Dripper` | Metóda V60 (animovaná kvapka) |
| `ColdBrewJar` | Metóda Cold Brew |
| `CoffeeBag` | Coffees: prázdny stav |
| `RecipeCard` | Recipes: prázdny stav |
| `StatsChart` | Stats: prázdny stav |

Štýl ilustrácií:
- obrysové línie 3–3.5 px farbou textu (`currentColor`) a výplne v akcente,
- telo objektu cez utilitu `fill-ill`, ktorá sa prispôsobí režimu aj espresso panelu,
- za ilustráciou je rozmazaná karamelová žiara.

## Komponenty a vzory

- **Spodná navigácia:** plávajúca „pilulka“ s rozmazaným pozadím nad obsahom. Aktívna položka má ikonu v akcente na jemnom podklade. Stredné tlačidlo **Brew** je väčšie, s gradientom a žiarou a vystupuje nad lištu.
- **Hlavička stránky:** eyebrow + veľký serifový nadpis, nie je sticky.
- **Domovská stránka (Brew):** pozdrav podľa dennej doby s menom, hero karta, horizontálne posúvateľné karty metód, posledné prípravy.
- **Tlačidlá:** hlavné s gradientom, pri stlačení sa jemne zmenšia (utilita `pressable`).
- **Inputy:** výška 56 px, ikona vľavo, plné pozadie `surface-muted`, pri fokuse akcentový okraj a jemný prstenec.
- **Bottom sheet** pre akcie a krátke formuláre (namiesto modálnych okien).
- **Segmentový prepínač** (napr. téma) s posuvným gradientovým indikátorom.
- **Prázdne stavy:** ilustrácia so žiarou, voliteľný odznak (*Coming next*), serifový nadpis, jedna veta.

## Pohyb

- Prechod medzi stránkami: fade + posun o 8 px (180 ms).
- Obsah stránky nabieha postupne (`animate-rise` s oneskorením 60–80 ms medzi sekciami).
- Ambientné animácie ilustrácií: para nad šálkou, kvapka z V60.
- Pri `prefers-reduced-motion` sú animácie vypnuté.

## Obrazovka prípravy (Brew run)

- **Vždy espresso panel** bez ohľadu na režim: lepšia čitateľnosť z diaľky a menej oslňuje.
- Obrovské stopky a cieľová váha, minimum ďalších prvkov.
- Akcent pre progress, `success` pre cieľové pásmo espressa.

## Režimy

Light / Dark / Auto (podľa systému, default), voľba v Settings. `theme-color` v meta tagu sa prispôsobí režimu, téma sa aplikuje pred prvým vykreslením (bez bliknutia).
