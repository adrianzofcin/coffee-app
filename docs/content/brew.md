# Modul 3: Brew

- **Stav:** implementované
- **Posledná úprava:** 2026-10-20

## Účel

Spustenie receptu a prechádzanie inštrukciami krok po kroku so stopkami, zápis výsledku a história príprav. Každá príprava odpočíta dávku z balíčka kávy a je zdrojom dát pre štatistiky.

## Dátový model

Spoločné stĺpce podľa [04-offline-sync.md](../04-offline-sync.md): `id`, `user_id`, `created_at`, `updated_at`, `deleted_at`.

### `brews`

| Stĺpec | Typ | Povinné | Popis |
|---|---|---|---|
| `recipe_id` | `uuid` FK → `recipes` | | `null` pri Quick log |
| `bag_id` | `uuid` FK → `bags` | | Z ktorého balíčka sa bralo (káva sa odvodí cez `bags.coffee_id`). `null` = príprava bez výberu kávy, nič sa neodpočíta (D27) |
| `method` | `text` enum | áno | `espresso`, `v60`, `cold_brew` (kópia, aby história nezávisela od receptu) |
| `source` | `text` enum | áno | `recipe`, `quick_log` |
| `status` | `text` enum | áno | `steeping` (prebiehajúce Cold Brew), `completed` |
| `started_at` | `timestamptz` | áno | Začiatok prípravy |
| `finished_at` | `timestamptz` | | Koniec prípravy |
| `steep_ends_at` | `timestamptz` | | Cold Brew: kedy končí lúhovanie |
| `dose_g` | `numeric(5,1)` | áno | Skutočná dávka, odpočítava sa z balíčka |
| `water_g` | `numeric(6,1)` | | V60, Cold Brew |
| `yield_g` | `numeric(5,1)` | | Espresso: skutočný výťažok |
| `brew_time_s` | `integer` | | Skutočný čas zo stopiek |
| `rating` | `smallint` | | 1–5, môže sa doplniť neskôr |
| `taste_tags` | `text[]` | | `sour`, `bitter`, `balanced`, `weak`, `strong`, `astringent`, `sweet` |
| `notes` | `text` | | |
| `recipe_snapshot` | `jsonb` | | Kópia receptu (parametre + kroky) po prípadnom prepočte dávky, v čase prípravy |

### Lokálny stav prebiehajúcej prípravy (nesynchronizuje sa)

Tabuľka `active_run` v Dexie (najviac jeden záznam s `id = current`). Umožňuje obnoviť prípravu po zatvorení appky. Časy sú v milisekundách:

| Pole | Popis |
|---|---|
| `recipe_id`, `bag_id` | Výber z Brew setup (`bag_id` môže byť `null`) |
| `snapshot` | Recept prepočítaný na dávku tejto prípravy |
| `started_at` | Čas štartu stopiek, `null` kým sa neťukne na Start |
| `paused_at` | Čas pozastavenia (`null` = beží) |
| `paused_total_ms` | Súčet doterajších pauz |
| `step_index` | Krok, na ktorý sa prešlo cez Next / Skip. Časované kroky od neho pokračujú podľa času |
| `stopped_at` | Stopky zastavené (Finish / Stop), čaká sa na zápis výsledku |

**Uplynulý čas** = `(stopped_at ?? paused_at ?? now) − started_at − paused_total_ms`. Stopky sa počítajú z času štartu, nie z počítadla sekúnd, takže zatvorenie appky ani uspanie telefónu ich nerozbije.

## Pravidlá

- **Odpočet gramov:** každá nezmazaná príprava (aj `steeping`) sa započíta do spotreby balíčka, viď výpočet zostatku v [coffees.md](coffees.md). Cold Brew odpočíta kávu už pri štarte lúhovania.
- **Úprava dávky** v histórii automaticky upraví zostatok. **Zmazanie** prípravy (soft delete) gramy vráti.
- Príprava bez kávy (`bag_id = null`) nič neodpočíta.
- Prvá príprava z balíčka `sealed` ho prepne na `open`.
- Po uložení (aj Quick log a štart lúhovania Cold Brew) sa skontroluje zostatok pod 5 g a appka ponúkne označenie balíčka ako dopitého (*Mark finished* / *Keep it*).
- Po uložení sa nastaví `recipes.last_brewed_at`.
- Úprava alebo zmazanie receptu nemení `recipe_snapshot` v histórii.

## Obrazovky

### 1. Brew home (`/brew`), stredné tlačidlo navigácie

1. **Prebiehajúce prípravy** (všetky naraz):
   - rozbehnutá príprava na tomto zariadení: „In progress · V60 Everyday · 1:23“ (alebo *Paused*, *Not started*, *Ready to log*) s tlačidlom **Resume**,
   - každé lúhujúce Cold Brew: odpočet „Ready at 08:15 · 6 h 20 min left“, po uplynutí „Cold brew ready“.
2. **Rate your brew**: najnovšia príprava bez hodnotenia z posledných 24 h, hviezdičky sa dajú ťuknúť priamo na karte.
3. Tlačidlá **Choose recipe** (Brew setup s výberom receptu) a **Quick log**.
4. **Quick start**: obľúbené recepty a 3 naposledy použité, ťuknutie → Brew setup. Kým nie je čo ponúknuť, zobrazia sa dlaždice metód (odkaz na recepty podľa metódy).
5. **History**: posledné prípravy po 20, ďalšie sa načítajú pri scrollovaní.
   - Riadok: dátum a čas, recept (alebo *Quick log*), káva, dávka, ★, tagy, odznak **Rate it** pri chýbajúcom hodnotení.
   - Filter podľa metódy (chips).

### 2. Brew setup (`/brew/new?recipe=:id`)

| Prvok | Správanie |
|---|---|
| Recept | Predvyplnený, dá sa zmeniť |
| Coffee / Bag | Aktívne balíčky so zostatkom a možnosť **No coffee**. Predvolený: balíček kávy priradenej k receptu, inak naposledy použitý, inak otvorený, inak najstarší. Upozornenie „Only 12 g left in this bag“, ak zostatok nestačí na dávku (príprava je aj tak povolená). Pri prázdnej poličke hint s odkazom *Add coffee*, príprava ide aj tak |
| Dose | Predvyplnená z receptu. Zmena prepočíta vodu a kroky (len pre túto prípravu) |
| Súhrn | Voda / výťažok, pomer, teplota, mletie (ako pripomienka) |
| **Start** | Uloží `active_run` a otvorí Brew run. Ak už beží iná príprava, appka sa opýta, či ju nahradiť, alebo v nej pokračovať |

### 3. Brew run: V60 a ostatné recepty s krokmi (`/brew/run`)

- Stopky sa spustia tlačidlom **Start timer** až na tejto obrazovke (zároveň odomkne zvuk na iOS).
- **Stopky** veľkým písmom.
- **Aktuálny krok:** typ + veľká cieľová váha („**Pour to 150 g**“) + text inštrukcie.
- **Ďalší krok:** náhľad s odpočtom („Next: Pour to 250 g in 0:12“).
- **Progress bar** celej prípravy (podľa `target_time_s`).
- Časované kroky sa prepínajú automaticky. 3 s pred zmenou krátky tón, pri zmene výraznejší tón a záblesk obrazovky. Na Androide aj vibrácia.
- Manuálne kroky: tlačidlo **Next**.
- Ovládanie: **Pause / Resume**, **Next / Skip**, **Finish**, v menu **Restart timer** a **Cancel brew** (s potvrdením, nič sa neuloží).
- Šípka vľavo hore appku zminimalizuje: príprava beží ďalej a vráti sa cez kartu na Brew home.
- Po poslednom kroku alebo po ťuknutí na **Finish** → Brew finish.

### 4. Brew run: Espresso

- Veľké tlačidlo **Start / Stop**.
- Kruhový ukazovateľ času s vyznačeným cieľovým pásmom (napr. 25–30 s). Čas v pásme je zelený, pod pásmom neutrálny, nad pásmom oranžový.
- Ak má recept pre-infusion, prvých N sekúnd je označených ako „Pre-infusion“.
- Kroky, ak ich recept má, sa zobrazia rovnako ako pri V60.
- Po **Stop** → Brew finish so zameraným poľom **Yield**.

### 5. Cold Brew

1. Manuálne kroky pred lúhovaním (Add coffee → Add water → Stir) cez **Done, next step**. Pred lúhovaním sú kroky pred krokom typu `wait`, po lúhovaní kroky za ním. Bez kroku `wait` sa po lúhovaní robia kroky typu `filter`.
2. **Start steeping** → vznikne `brews` záznam so `status = steeping` a `steep_ends_at = now + steep_time_min`, `active_run` sa zruší.
3. Obrazovka lúhovania (`/brews/:id`): odpočet, „Ready at 08:15“, tlačidlo **Add reminder** a **Discard** (s potvrdením „Coffee grams will be returned.“).
4. Appku možno zavrieť. Prebiehajúce Cold Brew je vidieť na Brew home, synchronizuje sa a je viditeľné aj na inom zariadení.
5. Po uplynutí: **Filter** → **Finish** → Brew finish → `status = completed`.

**Add reminder:** appka vygeneruje udalosť v kalendári (`.ics`, začiatok = `steep_ends_at`, upozornenie v čase začiatku, názov „Cold Brew ready: <coffee>“) a ponúkne ju cez systémové zdieľanie alebo stiahnutie. Ak by `.ics` na niektorej platforme nefungovalo, záloha je odkaz na pridanie udalosti do Google Calendar (test T2).

### 6. Brew finish (`/brew/finish`)

| Pole | Predvyplnené |
|---|---|
| Dose | z prípravy |
| Water / Yield | z receptu (pri Espresse prázdne, zamerané) |
| Time | zo stopiek |
| Rating | prázdne, 1–5 ★ |
| Taste | rýchle tagy: *Sour, Bitter, Balanced, Weak, Strong, Astringent, Sweet* (viac naraz) |
| Notes | prázdne |

- **Save** uloží prípravu aj bez hodnotenia (dá sa doplniť neskôr).
- Po uložení: kontrola zostatku pod 5 g a návrat na Brew home.

### 7. Quick log (`/brew/quick`)

Rýchly zápis bez stopiek: Coffee / Bag, Method, Dose, Water / Yield (voliteľné), Date & time (default teraz), Rating, Taste, Notes. Uloží sa so `source = quick_log`.

### 8. Brew detail (`/brews/:id`)

- Všetky údaje prípravy, káva (odkaz), recept (odkaz, ak ešte existuje) a kroky zo snapshotu.
- **Edit** (rovnaké polia ako Brew finish + káva a dátum), **Delete** (s potvrdením, gramy sa vrátia).
- **Brew again**: Brew setup s rovnakým receptom, kávou a dávkou.

## Technické poznámky

- **Zvuk:** Web Audio API, dá sa vypnúť v Settings → Brewing → *Sounds* (nastavenie zariadenia, nesynchronizuje sa). Audio sa odomkne ťuknutím na Start (požiadavka iOS). Na iOS sa nastaví `navigator.audioSession.type = 'playback'` (ak je dostupné), aby tóny zneli aj pri stíšenom zvonení. Záložný signál je vizuálny záblesk.
- **Vibrácie:** Vibration API, len Android (iOS ju nepodporuje).
- **Obrazovka nezhasne:** Screen Wake Lock API počas Brew run, uvoľní sa pri dokončení alebo zrušení. Ak API nie je dostupné, appka zobrazí tip „Keep the screen on“.
- **Appka na pozadí:** tóny sa neprehrajú, ale po návrate appka skočí na správny krok podľa uplynulého času.

## Validácie

- `bag_id`: voliteľné.
- `dose_g`: 1–500, `water_g`: 1–5000, `yield_g`: 1–500.
- `rating`: 1–5 alebo prázdne.
- `started_at` nesmie byť v budúcnosti (Quick log, Edit).

## Akceptačné kritériá

- [ ] Recept spustím z karty receptu, z Brew home alebo cez Choose recipe.
- [ ] V Brew setup je predvybraný vhodný balíček a pri nedostatku kávy vidím upozornenie.
- [ ] Zmena dávky pred štartom prepočíta vodu aj kroky bez zmeny receptu.
- [ ] Pri V60 vidím stopky, aktuálny krok s cieľovou váhou a odpočet do ďalšieho kroku. Časované kroky sa prepínajú samy so zvukovým signálom.
- [ ] Počas prípravy obrazovka nezhasne.
- [ ] Po zatvorení a znovuotvorení appky príprava pokračuje so správnym časom a krokom.
- [ ] Pri Espresse vidím cieľové pásmo času a po zastavení zadám výťažok.
- [ ] Cold Brew po štarte lúhovania beží na pozadí, na Brew home vidím odpočet a viem si pridať pripomienku do kalendára.
- [ ] Po dokončení zadám hodnotenie a tagy chuti, alebo ich doplním neskôr.
- [ ] Uložená príprava odpočíta dávku z balíčka. Úprava dávky alebo zmazanie prípravy zostatok upraví.
- [ ] Prípravu bez receptu zapíšem cez Quick log.
- [ ] História príprav sa dá filtrovať podľa metódy. Prípravy bez hodnotenia sú označené „Rate it“.
- [ ] Úprava receptu nezmení údaje v minulých prípravách.
- [ ] Všetko funguje offline a po pripojení sa zosynchronizuje.

## Závislosti

- **Coffees:** výber balíčka, odpočet gramov, zmena stavu balíčka.
- **Recipes:** zdroj parametrov a krokov, `last_brewed_at`.
- **Stats:** `brews` je hlavný zdroj dát.

## Testy na overenie (po implementácii)

- **T2:** pridanie pripomienky `.ics` z nainštalovanej PWA na iOS aj Androide.
- **T3:** zvuk pri stíšenom zvonení na iOS, Wake Lock v nainštalovanej PWA na iOS aj Androide.
