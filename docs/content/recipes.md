# Modul 2: Recipes

- **Stav:** implementované (F3), čaká na test na mobile
- **Posledná úprava:** 2026-10-19

## Účel

Vlastné recepty pre jednotlivé metódy prípravy: pridávanie, úprava, duplikovanie a spúšťanie (spustenie popisuje modul [Brew](brew.md)). Podporované metódy sú **Espresso**, **Hario V60** a **Cold Brew**. Ďalšie sa dajú pridať neskôr bez zmeny dátového modelu.

## Dátový model

Spoločné stĺpce podľa [04-offline-sync.md](../04-offline-sync.md): `id`, `user_id`, `created_at`, `updated_at`, `deleted_at`.

### `recipes`

| Stĺpec | Typ | Povinné | Metóda | Popis |
|---|---|---|---|---|
| `name` | `text` | áno | všetky | |
| `method` | `text` enum | áno | všetky | `espresso`, `v60`, `cold_brew` |
| `dose_g` | `numeric(5,1)` | áno | všetky | Dávka kávy |
| `water_g` | `numeric(6,1)` | áno pre V60, Cold Brew | V60, Cold Brew | Celkové množstvo vody |
| `yield_g` | `numeric(5,1)` | áno pre Espresso | Espresso | Výťažok v šálke |
| `temperature_c` | `smallint` | | všetky | Teplota vody |
| `grind_setting` | `text` | | všetky | Voľný text, napr. *Comandante 22 clicks* |
| `target_time_s` | `integer` | | Espresso, V60 | Cieľový čas (espresso: spodná hranica) |
| `target_time_max_s` | `integer` | | Espresso | Horná hranica rozsahu (napr. 25–30 s) |
| `preinfusion_s` | `integer` | | Espresso | |
| `steep_time_min` | `integer` | áno pre Cold Brew | Cold Brew | Doba lúhovania v minútach |
| `steep_place` | `text` enum | | Cold Brew | `fridge`, `room` |
| `dilution` | `numeric(3,1)` | | Cold Brew | Riedenie pri servírovaní: diely vody na 1 diel koncentrátu (`1.0` = 1:1) |
| `steps` | `jsonb` | áno (default `[]`) | všetky | Kroky receptu, viď nižšie |
| `coffee_id` | `uuid` FK → `coffees` | | všetky | Voliteľné priradenie ku konkrétnej káve |
| `is_favorite` | `boolean` | áno (default `false`) | všetky | |
| `notes` | `text` | | všetky | |
| `last_brewed_at` | `timestamptz` | | všetky | Pre triedenie „naposledy použité“ |

**Pomer** sa neukladá, dopočítava sa: `water_g / dose_g` (V60, Cold Brew), resp. `yield_g / dose_g` (Espresso). Zobrazuje sa ako `1:16.7`.

### Kroky (`steps` jsonb)

Kroky sú uložené priamo v recepte ako pole. Vždy sa upravujú spolu s receptom, takže synchronizácia je atomická (jeden záznam) a kópia do histórie prípravy je jednoduchá.

```json
[
    { "type": "bloom", "at_s": 0,   "target_water_g": 50,  "text": "Pour gently, wet all grounds" },
    { "type": "pour",  "at_s": 45,  "target_water_g": 150, "text": null },
    { "type": "pour",  "at_s": 75,  "target_water_g": 250, "text": null },
    { "type": "swirl", "at_s": 105, "target_water_g": null, "text": "Swirl and let it drain" }
]
```

| Pole | Popis |
|---|---|
| `type` | `bloom`, `pour`, `wait`, `stir`, `swirl`, `filter`, `custom` |
| `at_s` | Kedy krok začína (sekundy od štartu stopiek). `null` = **manuálny krok**, pokračuje sa ťuknutím na *Next* (napr. kroky Cold Brew) |
| `target_water_g` | **Kumulatívna** cieľová váha vody na váhe (napr. „pour to 150 g“), `null` ak sa nelieva |
| `text` | Voliteľná inštrukcia. Bez nej sa zobrazí predvolený text podľa typu (napr. *Pour to 150 g*) |

Poradie krokov je dané poradím v poli. Trvanie kroku = `at_s` nasledujúceho kroku − `at_s` aktuálneho. Posledný časovaný krok trvá do `target_time_s`.

## Prepočet dávky (scaling)

- Koeficient = `nová dávka / pôvodná dávka`.
- Prepočíta sa `water_g`, `yield_g` a `target_water_g` všetkých krokov. Časy sa nemenia.
- Zaokrúhlenie: dávka a espresso yield na 0.1 g, voda a cieľové váhy krokov na celé gramy.
- Dostupné v editore (tlačidlo **Scale**), na detaile receptu (*Save as new recipe* / *Update this recipe*) a pri spustení receptu (len pre danú prípravu, recept sa nemení).

## Predpripravené recepty

Vzorové recepty vytvára **databáza**, nie appka: funkcia `seed_recipes` sa spustí pri vzniku nového používateľa (a raz pre existujúcich v migrácii) a nastaví `profiles.recipes_seeded_at`. Dve zariadenia tak nikdy nevytvoria duplikáty a zmazané vzorové recepty sa už znova nevytvoria. Funkcia nie je volateľná cez API.

| Recept | Parametre | Kroky |
|---|---|---|
| **Classic Espresso** | 18 g → 36 g (1:2), 25–30 s, 93 °C | žiadne |
| **V60 Everyday** | 15 g / 250 g (1:16.7), 93 °C, total 3:00 | 0:00 Bloom to 50 g → 0:45 Pour to 150 g → 1:15 Pour to 250 g → 1:45 Swirl and drawdown |
| **Cold Brew Concentrate** | 100 g / 800 g (1:8), 16 h fridge, dilution 1:1, coarse | Add coffee → Add water → Stir → Steep → Filter (všetky manuálne) |

## Obrazovky

### 1. Recipes list (`/recipes`)

- Filtrovanie podľa metódy (chips): **All / Espresso / V60 / Cold Brew**.
- Poradie: obľúbené ★ hore, potom podľa `last_brewed_at` (naposledy použité), potom podľa názvu.
- Karta receptu: názov, ikona metódy, `15 g · 1:16.7 · 3:00`, ★, priradená káva (ak je), tlačidlo **▶ Brew**.
- Tlačidlo **+** → New recipe.
- Prázdny stav: „No recipes yet.“ + tlačidlo New recipe.

### 2. Recipe detail (`/recipes/:id`)

- Hlavička: názov, metóda, ★.
- Parametre: dávka, voda alebo yield, pomer, teplota, mletie, čas (pri Cold Brew lúhovanie, miesto, riedenie).
- Zoznam krokov s časom a cieľovou váhou (napr. `0:45 · Pour to 150 g`).
- Priradená káva (odkaz na Coffee detail), poznámky.
- Akcie: **▶ Brew** (hlavné tlačidlo), **Edit**, **Duplicate**, **Scale**, **Delete** (v menu).

### 3. Recipe editor (`/recipes/new`, `/recipes/:id/edit`)

1. **Method**: výber metódy (pri novom recepte prvý krok, určuje zobrazené polia).
2. **Basics**: Name, Dose, Water / Yield (pomer sa zobrazuje živo), Temperature, Grind setting.
3. **Method specific**: polia podľa tabuľky vyššie.
4. **Steps** (V60 a Cold Brew, pri Espresse voliteľné):
   - pridanie kroku (výber typu), úprava v bottom sheete (čas `m:ss`, cieľová váha, text),
   - presúvanie šípkami ↑ ↓ (spoľahlivejšie ako ťahanie na mobile), mazanie,
   - prepínač **Timed / Manual** pre krok.
5. **More**: priradená káva, Favorite, Notes.

- Tlačidlo **Scale** v sekcii krokov otvorí prepočet (rovnaký bottom sheet ako na detaile) a výsledok prenesie do formulára.
- Nový recept začína šablónou podľa metódy (V60: Bloom → Pour → Pour → Swirl, Cold Brew: manuálne kroky, Espresso bez krokov). Zmena metódy šablónu vymení, názov, mletie, kávu a poznámky ponechá.
- Pri neúspešnom uložení sa obrazovka posunie k prvej chybe.
- Pri odchode s neuloženými zmenami appka zobrazí potvrdenie.

### 4. Scale (bottom sheet)

Zadám novú dávku, appka zobrazí prepočítané hodnoty. Voľby: **Save as new recipe** alebo **Update this recipe**.

## Správanie

- **Duplicate** vytvorí kópiu s názvom `<name> (copy)` a otvorí editor.
- **Úprava receptu** nemení históriu: každá príprava si ukladá kópiu parametrov a krokov (viď [brew.md](brew.md)).
- **Zmazanie** receptu (soft delete) vyžaduje potvrdenie. Prípravy ostávajú v histórii.
- Zmazanie priradenej kávy zruší priradenie (recept ostáva).
- Pri receptoch priradených ku káve sa recept zobrazí aj na Coffee detail.

## Validácie

- `name`: 1–100 znakov.
- `dose_g`: 1–500, `water_g`: 1–5000, `yield_g`: 1–500.
- `temperature_c`: 0–100.
- `target_time_max_s` ≥ `target_time_s`.
- `steep_time_min`: 1–4320 (max. 72 h).
- Kroky: `at_s` neklesá smerom dole v poradí krokov (manuálne kroky sa preskakujú). `target_water_g` neklesá a nesmie prekročiť `water_g`.

## Akceptačné kritériá

- [ ] Vytvorím recept pre Espresso, V60 aj Cold Brew a formulár zobrazí len polia relevantné pre zvolenú metódu.
- [ ] Pomer sa zobrazuje a prepočítava živo pri zmene dávky alebo vody.
- [ ] K receptu pridám, upravím, presuniem a zmažem kroky s časom a cieľovou váhou.
- [ ] Krok môže byť časovaný alebo manuálny.
- [ ] Pri zmene dávky so zapnutým „Scale recipe“ sa prepočíta voda aj cieľové váhy krokov.
- [ ] Recept viem duplikovať a označiť ako obľúbený.
- [ ] Zoznam sa dá filtrovať podľa metódy, obľúbené sú hore.
- [ ] Recept spustím priamo zo zoznamu tlačidlom ▶ Brew.
- [ ] Pri prvom prihlásení sa vytvoria tri vzorové recepty. Po ich zmazaní sa znova nevytvoria.
- [ ] Úprava alebo zmazanie receptu nezmení údaje v minulých prípravách.
- [ ] Recept viem priradiť ku káve a zobrazí sa pri nej.
- [ ] Všetko funguje offline a po pripojení sa zosynchronizuje.

## Závislosti

- **Coffees:** voliteľné `coffee_id`.
- **Brew:** spúšťa recept, ukladá kópiu parametrov, aktualizuje `last_brewed_at`.
- **Auth:** stĺpec `profiles.recipes_seeded_at` (doplniť do [02-auth.md](../02-auth.md)).
