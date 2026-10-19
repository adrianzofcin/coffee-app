# Framework a stack

- **Stav:** schválené
- **Posledná úprava:** 2026-10-19

## Prehľad

Aplikácia je čisté **SPA** (single-page application) bez vlastného backendu. Všetky dáta a prihlásenie zabezpečuje Supabase, frontend je statický a hostuje sa na CDN. Appka je **offline-first**: UI pracuje s lokálnou DB v telefóne a zmeny sa synchronizujú na pozadí.

```
Mobil (PWA, standalone)
  └─ Vue 3 SPA (statické súbory z CDN, cache v service workeri)
       ├─ Dexie / IndexedDB (lokálne dáta + outbox)
       └─ sync engine + supabase-js ──HTTPS──> Supabase (Auth + Postgres + Storage)
```

**Jazyk UI:** angličtina (texty priamo v komponentoch, bez i18n knižnice). Dokumentácia ostáva po slovensky.

## Technológie

| Vrstva | Technológia | Účel |
|---|---|---|
| Jazyk | TypeScript | Typová bezpečnosť, typy generované zo Supabase schémy |
| Build | Vite | Dev server, produkčný build do `dist/` |
| UI framework | Vue 3 (`<script setup>`, Composition API) | Komponenty a reaktivita |
| Routing | vue-router 4 | Stránky, auth guard |
| Stav | Pinia | Session, zdieľaný stav medzi stránkami |
| Štýly | Tailwind CSS v4 | Mobile-first utility triedy, design tokeny |
| PWA | vite-plugin-pwa (Workbox) | Manifest, service worker, offline shell, aktualizácie |
| Backend klient | @supabase/supabase-js v2 | Auth, dotazy do DB, Storage |
| Lokálna DB | Dexie (IndexedDB) | Offline dáta a fronta zmien, viď [04-offline-sync.md](04-offline-sync.md) |
| Testy | Vitest (+ Vue Test Utils) | Unit testy logiky a komponentov |
| Kvalita kódu | ESLint + Prettier | Lint a formátovanie |

Presné verzie sa zafixujú pri scaffolde (aktuálne stabilné), následne cez `package-lock.json`.

## Štruktúra projektu (plán)

```
coffee-app/
├─ .github/workflows/        # deploy.yml, unpublish.yml
├─ docs/                     # trvalá dokumentácia (commituje sa)
├─ public/
│  └─ icons/                 # PWA ikony (192, 512, maskable, apple-touch)
├─ src/
│  ├─ assets/
│  ├─ components/
│  │  ├─ ui/                 # základné prvky (Button, Input, Card, Sheet…)
│  │  └─ layout/             # AppShell, TopBar, BottomNav
│  ├─ composables/           # znovupoužiteľná logika (useXxx)
│  ├─ lib/
│  │  ├─ supabase.ts         # jediná inštancia Supabase klienta
│  │  ├─ db.ts               # Dexie schéma lokálnej DB
│  │  └─ sync/               # sync engine (outbox push, pull)
│  ├─ modules/               # obsahové moduly (podľa docs/content/)
│  ├─ pages/                 # stránky naviazané na routy
│  ├─ router/
│  ├─ stores/                # Pinia stores (auth, …)
│  ├─ types/
│  │  └─ database.ts         # typy generované zo Supabase
│  ├─ App.vue
│  └─ main.ts
├─ supabase/
│  └─ migrations/            # SQL migrácie schémy (verzionované v gite)
├─ .env.example
├─ index.html
└─ vite.config.ts
```

## Mobile-first a PWA

### Layout

- Návrh primárne pre šírku 360–430 px, desktop je len „bonus“ (obsah centrovaný, max. šírka).
- Výška cez `100dvh` (správne správanie pri skrývaní lišty prehliadača).
- `env(safe-area-inset-*)` pre notch / Dynamic Island a home indicator.
- Spodná navigácia (tab bar) – hlavné sekcie dosiahnuteľné palcom.
- Dotykové plochy min. 44 × 44 px, formulárové inputy min. `16px` font (iOS inak zoomuje).
- Podpora svetlého aj tmavého režimu podľa systému (`prefers-color-scheme`).

### Manifest

- `display: standalone`, `orientation: portrait`
- `start_url: /`, `scope: /`
- `theme_color` / `background_color` podľa farieb aplikácie
- Ikony 192 a 512 px + maskable variant, `apple-touch-icon` 180 px pre iOS

### Service worker

- Režim aktualizácie `prompt` – pri novej verzii sa zobrazí banner „Nová verzia, obnoviť“, nič sa nemení potichu uprostred práce.
- **Precache** app shellu (HTML, JS, CSS, ikony, fonty) → appka sa otvorí aj bez signálu.
- Volania na Supabase sa **necachujú** service workerom (`NetworkOnly`). Offline dáta rieši aplikácia cez lokálnu DB a sync engine, viď [04-offline-sync.md](04-offline-sync.md).

### Špecifiká iOS

- iOS nepodporuje automatickú výzvu na inštaláciu; inštalácia: Safari → Zdieľať → **Pridať na plochu**. Appka zobrazí krátky návod, ak beží v Safari mimo PWA.
- Nainštalovaná PWA má na iOS **oddelené úložisko** od Safari → po inštalácii sa treba prihlásiť ešte raz priamo v appke.
- Inštalovaná PWA nepodlieha 7-dňovému mazaniu úložiska (ITP), takže session vydrží.

## Prostredia a konfigurácia

Konfigurácia cez Vite env premenné (prefix `VITE_` = verejné, idú do bundlu):

| Premenná | Popis |
|---|---|
| `VITE_SUPABASE_URL` | URL Supabase projektu |
| `VITE_SUPABASE_ANON_KEY` | Verejný anon (publishable) kľúč – bezpečnosť zabezpečuje RLS, nie utajenie kľúča |
| `VITE_AUTH_EMAIL_DOMAIN` | Doména pre mapovanie mena na e-mail (viď [02-auth.md](02-auth.md)) |

- `.env` sa necommituje, `.env.example` áno.
- **Service role key sa nikdy nedáva do frontendu.**

## Databázové zmeny

- Schéma sa mení výhradne cez SQL migrácie v `supabase/migrations/` (Supabase CLI), nie ručným klikaním v dashboarde.
- Každá tabuľka má zapnuté **RLS** (Row Level Security); politiky sú súčasťou migrácie.
- TypeScript typy sa generujú zo schémy (`supabase gen types typescript`) do `src/types/database.ts`.

## Príkazy (po scaffolde)

| Príkaz | Popis |
|---|---|
| `npm run dev` | Dev server (prístup z mobilu v LAN cez `--host`) |
| `npm run build` | Produkčný build do `dist/` |
| `npm run preview` | Lokálny náhľad buildu vrátane service workera |
| `npm run test` | Vitest |
| `npm run lint` | ESLint |

## Deploy

GitHub Pages, publikované len na inštaláciu a aktualizácie. Workflowy `deploy` a `unpublish` sa spúšťajú ručne, unpublish aj automaticky každú noc. Detaily sú v [03-third-party.md](03-third-party.md#hosting-github-pages).
