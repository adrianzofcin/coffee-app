# Modul 4: Stats

- **Stav:** plán (nízka priorita, implementuje sa ako posledný modul)
- **Posledná úprava:** 2026-10-19

## Účel

Základný prehľad o príprave, spotrebe a útrate za kávu. Vlastník nechal obsah na návrh. Pred implementáciou sa plán ešte raz prejde a môže sa zúžiť.

## Princípy

- Všetko sa počíta **lokálne z Dexie**, štatistiky fungujú offline a nepotrebujú žiadne nové tabuľky.
- Grafy sú vlastné SVG komponenty (stĺpcový, čiarový, donut), bez externej knižnice.
- Zdroje dát: `brews` (prípravy), `bags` (ceny, hmotnosti), `bag_adjustments`, `coffees`, `recipes`.

## Obrazovka Stats (`/stats`)

### Obdobie

Prepínač **7 days / 30 days / Year / All time** (default 30 days).

### Súhrnné dlaždice

| Ukazovateľ | Výpočet |
|---|---|
| Brews | Počet nezmazaných príprav v období |
| Coffee used | Σ `brews.dose_g` |
| Spent | Σ `bags.price` balíčkov kúpených v období (`purchase_date`, inak `created_at`) |
| Cost per cup | Priemer `bags.price / bags.weight_g × brews.dose_g` (len prípravy z balíčkov s cenou) |
| Avg rating | Priemer `brews.rating` (len hodnotené) |

### Grafy

- **Brews over time:** stĺpce po dňoch (7 a 30 dní), po týždňoch (Year), po mesiacoch (All time).
- **By method:** donut Espresso / V60 / Cold Brew.
- **Consumption:** spotreba v gramoch v rovnakom členení ako Brews over time.

### Rebríčky (top 5)

- Najlepšie hodnotené kávy (priemer príprav, min. 2 prípravy).
- Najpoužívanejšie recepty.
- Pražiarne podľa počtu príprav.

### Zásoba

- Spolu doma: Σ zostatkov aktívnych balíčkov (g). Mrazené balíčky sa zobrazia zvlášť.
- Odhad vydržania: `zásoba / priemerná denná spotreba za posledných 30 dní`, napr. „~9 days left“. Zobrazí sa až pri min. 7 dňoch histórie.

## Štatistiky v iných moduloch

| Kde | Čo |
|---|---|
| Coffee detail | Počet príprav, priemerné hodnotenie, najlepší recept pre túto kávu |
| Recipe detail | Počet príprav, priemerné hodnotenie, najčastejšie tagy chuti |

## Tip na ladenie receptu

Keď majú posledné 3 prípravy receptu rovnaký tag chuti, na Recipe detail a v Brew finish sa zobrazí tip:

| Tag | Tip |
|---|---|
| Sour | Try a finer grind or hotter water |
| Bitter | Try a coarser grind or cooler water |
| Weak | Try a higher dose or finer grind |
| Strong | Try a lower dose or coarser grind |
| Astringent | Try a coarser grind or gentler pouring |

## Export dát (Settings)

- **Export all (JSON):** všetky tabuľky používateľa, slúži ako záloha (free Supabase nemá automatické zálohy).
- **Export brews (CSV):** prípravy s názvom kávy a receptu, napr. pre Excel.
- Generuje sa lokálne a stiahne cez systémové zdieľanie alebo stiahnutie súboru.
- Import zálohy zatiaľ nie je v rozsahu.

## Akceptačné kritériá (predbežné)

- [ ] Štatistiky sa dajú prepínať podľa obdobia a fungujú offline.
- [ ] Vidím počet príprav, spotrebu, útratu, cenu za šálku a priemerné hodnotenie.
- [ ] Vidím grafy príprav v čase, podľa metódy a spotreby.
- [ ] Vidím rebríčky káv, receptov a pražiarní.
- [ ] Vidím aktuálnu zásobu a odhad, na koľko dní vystačí.
- [ ] Na detaile kávy a receptu vidím ich štatistiky.
- [ ] Pri opakovanom rovnakom tagu chuti vidím tip na ladenie.
- [ ] Dáta viem exportovať ako JSON a prípravy ako CSV.
