# Modul 1: Coffees

- **Stav:** implementované (F2), čaká na test na mobile
- **Posledná úprava:** 2026-10-19

## Účel

Prehľad, akú kávu mám doma a koľko gramov z nej ostáva. Pri každej káve sa zbiera hodnotenie, poznámky a história nákupov.

## Pojmy

| Pojem | Význam |
|---|---|
| **Coffee** | Konkrétna káva (pražiareň + názov): pôvod, spracovanie, chuť, moje hodnotenie |
| **Bag** | Konkrétny kúpený balíček kávy: dátum praženia, hmotnosť, cena, stav |
| **Adjustment** | Ručná korekcia zostatku balíčka (odváženie, rozsypanie, darovanie) |

Opakovaný nákup tej istej kávy = nový **Bag** pod existujúcou **Coffee**.

## Dátový model

Všetky tabuľky majú spoločné stĺpce podľa [04-offline-sync.md](../04-offline-sync.md): `id`, `user_id`, `created_at`, `updated_at`, `deleted_at`.

### `coffees`

| Stĺpec | Typ | Povinné | Popis |
|---|---|---|---|
| `name` | `text` | áno | Názov kávy |
| `roaster` | `text` | áno | Pražiareň (voľný text, našepkávanie z predchádzajúcich) |
| `country` | `text` | | Krajina pôvodu: výber z predvoleného zoznamu pestovateľských krajín s vlajkou alebo voľný text. Vlastné hodnoty sa ďalej ponúkajú v našepkávaní |
| `region` | `text` | | Región |
| `producer` | `text` | | Farma / producent |
| `variety` | `text` | | Odroda (napr. *Bourbon, Gesha*) |
| `altitude` | `text` | | Nadmorská výška, voľný text (napr. *1800–2000 m*) |
| `process` | `text` | | *Washed, Natural, Honey, Anaerobic…* + vlastná hodnota |
| `roast_level` | `text` enum | | `light`, `medium`, `dark` |
| `intended_for` | `text` enum | | `espresso`, `filter`, `omni` |
| `is_decaf` | `boolean` | áno (default `false`) | |
| `tasting_notes` | `text[]` | | Tagy od pražiarne (napr. *chocolate, cherry*) |
| `rating` | `smallint` | | 1–5 |
| `notes` | `text` | | Moje poznámky |
| `photo_path` | `text` | | Cesta v Storage: `{user_id}/coffees/{id}.webp` |

### `bags`

| Stĺpec | Typ | Povinné | Popis |
|---|---|---|---|
| `coffee_id` | `uuid` FK → `coffees` | áno | |
| `roast_date` | `date` | áno | Dátum praženia |
| `weight_g` | `integer` | áno | Počiatočná hmotnosť (1–5000) |
| `price` | `numeric(8,2)` | | Cena v EUR |
| `purchase_date` | `date` | | Dátum kúpy |
| `status` | `text` enum | áno (default `sealed`) | `sealed`, `open`, `finished` |
| `opened_at` | `timestamptz` | | Kedy bol otvorený |
| `finished_at` | `timestamptz` | | Kedy bol dopitý |
| `is_frozen` | `boolean` | áno (default `false`) | |

### `bag_adjustments`

| Stĺpec | Typ | Povinné | Popis |
|---|---|---|---|
| `bag_id` | `uuid` FK → `bags` | áno | |
| `type` | `text` enum | áno | `set_weight` (odvážené), `remove` (rozsypané, darované…) |
| `delta_g` | `numeric(7,1)` | áno | Zmena zostatku (záporná = ubudlo) |
| `measured_g` | `numeric(7,1)` | | Pri `set_weight`: odvážená hodnota (informatívne) |
| `note` | `text` | | Dôvod |

### Výpočet zostatku

```
remaining_g = bags.weight_g
            − Σ brews.dose_g        (príprava z daného balíčka, modul Brew)
            + Σ bag_adjustments.delta_g
```

- Pri **Set actual weight** sa uloží `delta_g = measured_g − aktuálny zostatok` (v čase zápisu). Zostatok sa tak počíta len sčítaním udalostí a nedochádza ku konfliktom pri offline synchronizácii.
- Zostatok sa počíta lokálne (Dexie). Na serveri bude pre štatistiky pohľad `bag_balances`.
- Zostatok sa zobrazuje zaokrúhlený na celé gramy a nikdy nie menší ako 0.

## Obrazovky

### 1. Coffees list (`/coffees`)

- Záložky **Active** / **Archive**.
  - *Active* = kávy, ktoré majú aspoň jeden balíček v stave `sealed` alebo `open`.
  - *Archive* = kávy, ktoré majú všetky balíčky `finished`.
- Hľadanie podľa názvu a pražiarne.
- Triedenie: **Roast date** (default, najnovšie hore), **Remaining**, **Rating**.
- Karta kávy:
  - fotka (alebo placeholder s iniciálami),
  - názov, pražiareň,
  - zostatok v g (súčet aktívnych balíčkov) + progress bar,
  - `Day N` od praženia (otvorený balíček, inak najstarší aktívny),
  - odznaky: `2 bags`, `Frozen`, `Decaf`, `Sealed`.
- Tlačidlo **+** → Add coffee.
- Prázdny stav: „No coffee yet. Add your first bag.“

### 2. Coffee detail (`/coffees/:id`)

- Fotka, názov, pražiareň, hodnotenie (ťuknutím na hviezdičky sa dá zmeniť priamo tu).
- Info: pôvod, spracovanie, roast level, intended for, tasting notes (tagy), moje poznámky.
- Sekcia **Bags**: aktívne hore, dopité zbalené pod „Finished bags (N)“.
  - Riadok balíčka: dátum praženia + `Day N`, zostatok / hmotnosť, stav, cena.
  - Ťuknutie → akcie balíčka (bottom sheet).
- Sekcia **Brews**: počet príprav so všetkými balíčkami kávy a posledných 5 (*Show all* zobrazí všetky).
- Akcie: **Add bag**, **Edit**, **Delete** (v menu).

### 3. Add coffee (`/coffees/new`)

Rýchly formulár, povinné je len minimum:

| Pole | Poznámka |
|---|---|
| Name | |
| Roaster | Našepkávanie z predchádzajúcich pražiarní |
| Roast date | Date picker, default dnes |
| Weight | Rýchla voľba `200 g` / `250 g` / `500 g` / `1 kg` + vlastná hodnota |
| **More details** (zbalené) | Fotka, pôvod, spracovanie, roast level, intended for, decaf, tasting notes, cena, dátum kúpy, frozen, poznámky |

- Ak kombinácia *Name + Roaster* už existuje, appka ponúkne: „You already have this coffee. Add as a new bag?“ → vytvorí sa len nový balíček.
- Po uložení → Coffee detail.

### 4. Edit coffee (`/coffees/:id/edit`)

Všetky polia `coffees` vrátane fotky (odfotiť / vybrať z galérie / odstrániť).

### 5. Add / Edit bag (bottom sheet)

Roast date, weight, price, purchase date, frozen.

### 6. Akcie balíčka (bottom sheet)

| Akcia | Správanie |
|---|---|
| Set actual weight | Zadám odvážené gramy → vznikne `adjustment` typu `set_weight` |
| Remove grams | Zadám gramy + voliteľný dôvod → `adjustment` typu `remove` |
| Mark as open | `sealed → open`, nastaví `opened_at` |
| Mark as finished | `→ finished`, nastaví `finished_at` |
| Reopen | `finished → open` (omylom dopitý) |
| Freeze / Unfreeze | Prepne `is_frozen` |
| Edit | Add / Edit bag sheet |
| Delete | S potvrdením (soft delete) |

## Automatické správanie

- **Prvá príprava** z balíčka v stave `sealed` ho automaticky prepne na `open`. To isté platí pre *Remove grams* a pre *Set actual weight*, ak zostatok klesne.
- Keď zostatok po príprave alebo korekcii klesne **pod 5 g**, appka sa opýta: „Only X g left. Mark bag as finished?“
- Zmazanie kávy zmaže (soft delete) aj jej balíčky. Prípravy ostávajú v histórii a štatistikách s označením „Deleted coffee“.

## Validácie

- `name`, `roaster`: 1–100 znakov.
- `weight_g`: celé číslo 1–5000.
- `roast_date`: nesmie byť v budúcnosti.
- `rating`: 1–5 alebo prázdne.
- `price`: ≥ 0.
- Korekcia: gramy > 0. Pri `remove` sa zostatok nedostane pod 0 (hodnota sa zastropuje).

## Akceptačné kritériá

- [ ] Kávu pridám zadaním len názvu, pražiarne, dátumu praženia a hmotnosti.
- [ ] Pri zadaní existujúcej kombinácie názvu a pražiarne appka ponúkne pridanie nového balíčka k existujúcej káve.
- [ ] Pražiareň sa našepkáva z predchádzajúcich zadaní.
- [ ] Zoznam zobrazuje aktívne kávy so zostatkom, progress barom a počtom dní od praženia.
- [ ] Dopité kávy sú v záložke Archive.
- [ ] Zoznam sa dá prehľadávať a triediť podľa dátumu praženia, zostatku a hodnotenia.
- [ ] Ku káve viem pridať ďalší balíček a vidím všetky jej balíčky vrátane dopitých.
- [ ] Zostatok sa znižuje automaticky prípravou (po implementácii modulu Brew).
- [ ] „Set actual weight“ nastaví zostatok na odváženú hodnotu.
- [ ] „Remove grams“ zníži zostatok, nikdy nie pod 0.
- [ ] Pri zostatku pod 5 g appka ponúkne označenie balíčka ako dopitého.
- [ ] Fotka sa pred uložením zmenší a skomprimuje a zobrazí sa aj offline.
- [ ] Všetky akcie fungujú offline a po pripojení sa zosynchronizujú.
- [ ] Zmazanie kávy vyžaduje potvrdenie.

## Hodnotenie

Ručné hodnotenie 1–5 ★ pri káve (moje celkové hodnotenie). Po implementácii modulu Brew sa v štatistikách zobrazí aj priemer hodnotení príprav. Obe hodnoty sa dopĺňajú.

## Závislosti

- **Brew:** tabuľka `brews` (`bag_id`, `dose_g`) je zdroj spotreby pre výpočet zostatku.
- **Stats:** spotreba, útrata (`price`), hodnotenia.
