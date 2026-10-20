# Rozhodnutia a otvorené otázky

## Rozhodnutia

| # | Dátum | Rozhodnutie | Dôvod |
|---|---|---|---|
| D1 | 2026-10-19 | Stack: Vite + Vue 3 + TypeScript + Pinia + Tailwind v4 + vite-plugin-pwa | Známy stack, čisté SPA je pre PWA najjednoduchšie |
| D2 | 2026-10-19 | Backend: Supabase (bez vlastného servera) | Auth + DB bez prevádzky servera |
| D3 | 2026-10-19 | Prihlásenie menom a heslom cez mapovanie na technický e-mail | Supabase nepozná login menom |
| D4 | 2026-10-19 | Žiadna registrácia, používateľov zakladá vlastník v Supabase | Osobná appka |
| D5 | 2026-10-19 | Session bez časového limitu (refresh token bez expirácie) | Raz sa prihlásiť a dosť |
| D6 | 2026-10-19 | Najprv kompletná dokumentácia, potom implementácia | Požiadavka vlastníka |
| D7 | 2026-10-19 | Offline-first: lokálna DB (Dexie) + outbox + vlastný sync engine | Zápis bez signálu, appka sa má správať ako natívna |
| D8 | 2026-10-19 | Zostatky (gramy) sa počítajú z udalostí, neukladajú sa ako prepisované číslo | Bezkonfliktná synchronizácia |
| D9 | 2026-10-19 | Hosting: GitHub Pages, verejný repozitár na osobnom účte | PWA vyžaduje HTTPS URL, zadarmo, vlastník má skúsenosť |
| D9a | 2026-10-19 | Appka je publikovaná len počas inštalácie a aktualizácie. Unpublish = nasadenie prázdneho placeholdera (ručne + každú noc) | Nemá byť stále verejne dostupná, stačí `GITHUB_TOKEN` |
| D9b | 2026-10-19 | Adresa `<ucet>.github.io/coffee-app/` sa nemení. Pri presune hostingu sa appka preinštaluje | Dáta sú v Supabase, preinštalovanie nevadí |
| D10 | 2026-10-19 | Používatelia sú izolovaní, nič sa nezdieľa | Prípadní ďalší používatelia majú vlastné dáta |
| D11 | 2026-10-19 | UI v angličtine, bez i18n | Vlastník má mobil v angličtine, termíny ovláda v EN |
| D12 | 2026-10-19 | Fotky v Supabase Storage (free 1 GB), komprimované na klientovi | Je súčasťou free plánu |
| D13 | 2026-10-19 | Coffee (káva) a Bag (balíček) sú dve úrovne | Opakovaný nákup zbiera hodnotenie a históriu pri jednej káve |
| D14 | 2026-10-19 | Kroky receptu sa ukladajú ako `jsonb` v recepte, nie v samostatnej tabuľke | Atomická synchronizácia, jednoduchá kópia do histórie |
| D15 | 2026-10-19 | Príprava ukladá kópiu parametrov receptu, recepty nemajú verzie | Úprava receptu nemení históriu ani štatistiky |
| D16 | 2026-10-19 | Pripomienka Cold Brew cez udalosť v kalendári (`.ics`), nie push notifikácia | PWA bez push servera nevie naplánovať notifikáciu |
| D17 | 2026-10-19 | Vizuálny štýl „Warm Minimal“ (krémová / espresso, karamelový akcent, Inter), viď [05-design.md](05-design.md) | Výber vlastníka, upravuje sa priebežne |
| D18 | 2026-10-19 | TypeScript zafixovaný na 5.9 | typescript-eslint zatiaľ nepodporuje TypeScript 7 |
| D19 | 2026-10-19 | Krajina pôvodu: predvolený zoznam s vlajkami + voľný text, vlastné hodnoty sa ponúkajú z existujúcich káv | Rýchly výber bez obmedzenia, bez ďalšej tabuľky |
| D20 | 2026-10-19 | Hodnotenie kávy: ručné ★ pri káve + neskôr priemer príprav v štatistikách | Výber vlastníka |
| D21 | 2026-10-19 | Odobratie gramov alebo zníženie váhy zapečateného balíčka ho prepne na `open` | Odobratie kávy znamená, že je otvorený |
| D22 | 2026-10-19 | Fotka dostane pri každej zmene nový názov súboru, staré súbory sa zatiaľ nemažú | Žiadna zastaraná cache. Upratovanie Storage sa rieši, ak to bude treba |
| D23 | 2026-10-19 | Doména technických e-mailov `coffee.local`, repozitár `adrianzofcin/coffee-app` (URL `adrianzofcin.github.io/coffee-app/`) | Uzatvára Q3 a Q7 |
| D24 | 2026-10-19 | Vzorové recepty vytvára databáza (`seed_recipes` pri novom používateľovi), nie appka | Žiadne duplikáty pri viacerých zariadeniach, menej logiky v klientovi |
| D25 | 2026-10-19 | Poradie krokov receptu sa mení šípkami ↑ ↓, nie ťahaním | Drag & drop na mobile koliduje so scrollovaním |
| D26 | 2026-10-19 | Nový recept začína šablónou krokov podľa metódy | Rýchlejšie vytvorenie, netreba začínať od nuly |
| D27 | 2026-10-20 | Prípravu možno spustiť aj zapísať bez výberu kávy (`brews.bag_id` je voliteľné), nič sa neodpočíta | Požiadavka vlastníka |
| D28 | 2026-10-20 | Brew home zobrazuje všetky prebiehajúce prípravy: rozbehnutú prípravu na zariadení aj každé lúhujúce Cold Brew | Požiadavka vlastníka |
| D29 | 2026-10-20 | Stopky sa spúšťajú až na obrazovke prípravy (Start timer), nie v Brew setup | Čas na prípravu pred nalievaním, ťuknutie odomkne zvuk na iOS |
| D30 | 2026-10-20 | Zvuky krokov sú generované tóny (Web Audio) s prepínačom v Settings, uloženým len na zariadení | Bez zvukových súborov, nastavenie sa týka konkrétneho telefónu |
| D31 | 2026-10-20 | Kroky V60 majú dĺžku (`duration_s`), začiatky sa z nej dopočítajú. Bloom = naliatie + samostatný krok Wait | Z dĺžky vychádza rýchlosť liatia v g/s, úprava jedného kroku posunie ostatné. Požiadavka vlastníka |
| D32 | 2026-10-20 | Staršie V60 recepty sa prevádzajú v appke pri zobrazení, nie migráciou dát | Kroky sú `jsonb`, prevod je jednoduchší a otestovaný v TypeScripte. Migrácia mení len vzorový recept pre nových používateľov |
| D33 | 2026-10-20 | Čas prípravy sa porovnáva s celkovým časom receptu, bez odporúčaní (mletie, teplota) | Používateľ sám vidí, či voda pretiekla príliš rýchlo alebo pomaly. Odporúčania možno neskôr |

## Otvorené otázky a testy

| # | Otázka | Ovplyvňuje |
|---|---|---|
| T1 | Test: appka beží ďalej po unpublish (Android + iOS), viď [03-third-party.md](03-third-party.md) | 2026-10-19: po unpublish sa nainštalovaná appka otvára z cache. Ostáva overiť po niekoľkých dňoch a reštarte telefónu |
| T2 | Test: pripomienka `.ics` z nainštalovanej PWA (Android + iOS), viď [content/brew.md](content/brew.md) | Po implementácii Brew |
| T3 | Test: zvuk pri stíšenom zvonení a Wake Lock v nainštalovanej PWA | Po implementácii Brew |
