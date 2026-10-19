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

## Otvorené otázky

| # | Otázka | Ovplyvňuje |
|---|---|---|
| Q3 | Doména pre technické e-maily (`VITE_AUTH_EMAIL_DOMAIN`) | Auth, rieši sa pri zakladaní Supabase |
| Q7 | Názov GitHub účtu a repozitára (určuje finálnu URL) | Deploy, `base` vo Vite |
| T1 | Test: appka beží ďalej po unpublish (Android + iOS), viď [03-third-party.md](03-third-party.md) | Overiť hneď po scaffolde |
| T2 | Test: pripomienka `.ics` z nainštalovanej PWA (Android + iOS), viď [content/brew.md](content/brew.md) | Po implementácii Brew |
| T3 | Test: zvuk pri stíšenom zvonení a Wake Lock v nainštalovanej PWA | Po implementácii Brew |
