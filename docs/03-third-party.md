# 3rd party služby

- **Stav:** schválené
- **Posledná úprava:** 2026-10-19

## Prehľad

| Služba | Účel | Plán | Stav |
|---|---|---|---|
| Supabase | Auth, Postgres DB, Storage (fotky) | Free | čaká na založenie |
| GitHub | Verejný repozitár, GitHub Actions (build, deploy, unpublish) | Free | čaká na založenie |
| GitHub Pages | Hosting PWA na HTTPS, len na inštaláciu a aktualizácie | Free | rozhodnuté |

Ďalšie služby (napr. databáza kávových zŕn, mapy kaviarní, skenovanie čiarových kódov) sa doplnia podľa špecifikácie obsahu.

## Supabase

**Použité časti:** Auth (email/heslo), Postgres + RLS, Storage (fotky, privátny bucket, súčasť free plánu).

**Limity Free plánu (overiť pri zakladaní, menia sa):**

- DB 500 MB, Storage 1 GB, 5 GB egress / mesiac – pre osobnú appku viac než dosť.
- **Projekt sa pozastaví po 7 dňoch nečinnosti** (žiadne API volania). Pri bežnom používaní appky to nenastane; po pozastavení sa dá v dashboarde jedným klikom obnoviť, dáta ostávajú.
- Bez automatických záloh s point-in-time recovery → odporúčaný občasný export (napr. `supabase db dump`) alebo export priamo v appke (rozhodne sa v obsahu).

**Región:** EU (Frankfurt, `eu-central-1`) – najnižšia latencia zo Slovenska, dáta v EÚ.

**Čo bude treba pri založení:**

1. Vytvoriť projekt (región EU Central).
2. Nastaviť Auth podľa [02-auth.md](02-auth.md).
3. Skopírovať `Project URL` a `anon / publishable key` do `.env`.
4. Prepojiť Supabase CLI (`supabase link`) pre migrácie.

## Hosting: GitHub Pages

**Prečo je hosting potrebný:** PWA je webová appka. Telefón ju nainštaluje z verejnej **HTTPS adresy**, iOS ani Android inak inštaláciu ani service worker nepovolia. Po inštalácii sú všetky súbory uložené v telefóne a appka beží aj offline, aj keby hosting nebol dostupný. Hosting slúži len na prvú inštaláciu a na doručovanie aktualizácií. Nejde o server, ktorý treba spravovať. Sú to statické súbory na CDN, zadarmo.

**Model „publikuj len keď treba“:** appka je na webe dostupná iba počas inštalácie alebo aktualizácie, inak je stiahnutá.

- **Adresa:** `https://<github-ucet>.github.io/coffee-app/`. Je to identita appky (lokálne dáta, session, inštalácia). Pri zmene adresy sa appka preinštaluje a znova sa treba prihlásiť. Dáta ostávajú v Supabase, pred presunom treba len dokončiť synchronizáciu fronty.
- **Repozitár:** verejný (GitHub Pages na súkromnom repe vyžaduje platený plán). V kóde nie sú žiadne tajomstvá: Supabase URL a anon kľúč idú do buildu z GitHub secrets a anon kľúč je verejný z princípu, dáta chráni RLS.

### Workflowy (GitHub Actions)

| Workflow | Spúšťač | Čo robí |
|---|---|---|
| `deploy.yml` | ručne (`workflow_dispatch`) | `npm ci` → `npm run build` (env zo secrets) → nasadenie `dist/` cez `actions/deploy-pages` |
| `unpublish.yml` | ručne + automaticky každú noc (cron) | Nasadí prázdny placeholder (`index.html` bez appky, bez service workera) |

- Oba používajú bežný `GITHUB_TOKEN` (`pages: write`, `id-token: write`), netreba osobný token s admin právami.
- Nočný unpublish zaručí, že appka nezostane verejná, keď sa na stiahnutie zabudne.
- Zvážená alternatíva: úplné vypnutie Pages cez API (`DELETE /repos/{owner}/{repo}/pages`). Zamietnuté, lebo vyžaduje osobný token s právom *Administration* a deploy by musel Pages znova zapínať.

### Postup

**Prvá inštalácia:**

1. Spustiť `deploy` → otvoriť URL v mobile → nainštalovať (Android: Install app, iOS: Share → Add to Home Screen).
2. Prihlásiť sa v nainštalovanej appke.
3. Spustiť `unpublish` (alebo počkať na nočný beh).

**Aktualizácia:** spustiť `deploy`, otvoriť appku v mobile, potvrdiť banner „New version available“ a potom spustiť `unpublish`.

### Technické požiadavky na build

- Vite `base: '/coffee-app/'`, manifest `scope` a `start_url` = `/coffee-app/`.
- GitHub Pages nemá presmerovanie všetkých ciest na `index.html` → build skopíruje `index.html` aj ako `404.html` (priame otvorenie podstránky). V nainštalovanej appke navigáciu obsluhuje service worker, takže sa to netýka.

### Overiť po scaffolde (test T1)

Podľa špecifikácie service worker pri neúspešnej kontrole aktualizácie (404) ponechá uloženú verziu a appka beží ďalej. Overí sa to prakticky na Androide aj iOS:

1. Nainštalovať appku a urobiť zápis.
2. Spustiť unpublish.
3. Appku niekoľko dní používať online aj offline (zatvoriť, otvoriť, reštartovať telefón).
4. Očakávanie: appka sa otvára, dáta sa synchronizujú so Supabase.

Ak by test zlyhal, záložný plán je nechať appku publikovanú. Dáta sú aj tak chránené prihlásením a RLS.

## NPM balíčky (hlavné)

| Balíček | Licencia | Účel |
|---|---|---|
| `vue`, `vue-router`, `pinia` | MIT | Framework |
| `@supabase/supabase-js` | MIT | Supabase klient |
| `dexie` | Apache-2.0 | IndexedDB wrapper pre offline dáta |
| `vite`, `vite-plugin-pwa` | MIT | Build + PWA |
| `tailwindcss`, `@tailwindcss/vite` | MIT | Štýly |
| `vitest`, `@vue/test-utils` | MIT | Testy |
| `eslint`, `prettier` | MIT | Kvalita kódu |

Ikony: návrh `lucide-vue-next` (ISC licencia) – jednotný, ľahký set ikon.

## Bezpečnosť a súkromie

- Do frontendu ide iba **anon key**; ochranu dát zabezpečuje RLS.
- **Service role key** sa používa len lokálne v CLI, nikdy v kóde ani v hostingu.
- Žiadna analytika ani tracking tretích strán.
- Fonty sa bundlujú lokálne (žiadne volania na Google Fonts za behu → funguje offline a bez úniku IP).
