# Autorizácia

- **Stav:** schválené
- **Posledná úprava:** 2026-10-19

## Požiadavky

1. Prihlásenie **menom a heslom**.
2. Registrácia v aplikácii **neexistuje** – používateľov zakladá vlastník ručne v Supabase.
3. Session **bez limitu** – raz sa prihlásiť a ďalej to neriešiť.
4. Žiadne obnovenie hesla e-mailom – heslo sa mení v Supabase dashboarde.

## Riešenie: meno → technický e-mail

Supabase Auth natívne nepozná prihlásenie menom, pozná e-mail + heslo. Preto aplikácia meno prevedie na technický e-mail:

```
meno "jano"  →  jano@<VITE_AUTH_EMAIL_DOMAIN>  →  supabase.auth.signInWithPassword()
```

- Meno sa normalizuje: `trim()` + `toLowerCase()`. Povolené znaky: `a–z`, `0–9`, `.`, `_`, `-`.
- Používateľ vidí len pole **Meno**, e-mail je čisto interný detail.
- Na technický e-mail nikdy nechodí pošta (potvrdenia sú vypnuté, reset hesla sa nepoužíva).
- Doména je konfigurovateľná; pri zakladaní prvého používateľa sa overí, že ju Supabase akceptuje (návrh: vlastná doména vlastníka, napr. `users.<moja-domena>.sk`, alebo `coffee.local`, ak ju validácia pustí).

> Alternatíva bez mapovania: prihlasovať sa priamo e-mailom. Mapovanie je zvolené kvôli požiadavke „meno + heslo“ a pohodliu na mobile.

## Nastavenie Supabase (Authentication → Settings)

| Nastavenie | Hodnota | Dôvod |
|---|---|---|
| Allow new users to sign up | **vypnuté** | Registráciu robí len vlastník |
| Email provider | zapnutý | Prihlásenie heslom ide cez e-mail provider |
| Confirm email | vypnuté | Technické e-maily neexistujú |
| Ostatní provideri (Google, magic link…) | vypnutí | Netreba |
| Time-box user sessions | **0 (nikdy)** | Session bez limitu |
| Inactivity timeout | **0 (nikdy)** | Session bez limitu |
| JWT expiry | ponechať default (3600 s) | Access token sa obnovuje automaticky, viď nižšie |

## Ako funguje „nekonečná“ session

- Supabase vydá **access token** (JWT, krátka platnosť) a **refresh token** (bez expirácie, kým ho nikto nezneplatní).
- Klient má `persistSession: true` a `autoRefreshToken: true` → session sa uloží do `localStorage` a access token sa obnovuje automaticky na pozadí, aj po týždňoch nepoužívania.
- Používateľ sa odhlási len ak:
  - klikne na **Odhlásiť** v nastaveniach,
  - vlastník zmení heslo / zmaže používateľa / zneplatní sessions v dashboarde,
  - sa vymažú dáta aplikácie v telefóne (alebo sa PWA odinštaluje).

Konfigurácia klienta:

```ts
// src/lib/supabase.ts
export const supabase = createClient<Database>(url, anonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'coffee-app-auth',
    },
})
```

## Zakladanie používateľa (manuálne)

1. Supabase dashboard → **Authentication → Users → Add user → Create new user**.
2. E-mail: `<meno>@<VITE_AUTH_EMAIL_DOMAIN>`, heslo podľa výberu.
3. Zaškrtnúť **Auto Confirm User**.
4. (Voliteľne) zobrazované meno sa nastaví v profile – viď tabuľka `profiles` nižšie.

## Používateľský profil

Tabuľka `public.profiles` (1:1 s `auth.users`), vytvorená migráciou:

| Stĺpec | Typ | Popis |
|---|---|---|
| `id` | `uuid` PK, FK → `auth.users.id` | ID používateľa |
| `username` | `text` unique | Meno na prihlásenie (bez domény) |
| `display_name` | `text` null | Zobrazované meno |
| `recipes_seeded_at` | `timestamptz` null | Kedy boli vytvorené vzorové recepty, viď [content/recipes.md](content/recipes.md) |
| `created_at` | `timestamptz` | |

- Riadok sa vytvorí automaticky triggerom pri vzniku používateľa (`username` = časť e-mailu pred `@`).
- RLS: používateľ číta a upravuje len svoj profil.

## Autorizácia dát (RLS)

- Každá obsahová tabuľka má stĺpec `user_id uuid not null default auth.uid()`.
- Základná politika pre všetky tabuľky: `select / insert / update / delete` povolené len ak `user_id = auth.uid()`.
- Anon (neprihlásený) prístup k dátam: **žiadny**.
- Ak neskôr vznikne zdieľanie medzi používateľmi (napr. spoločné zrná v domácnosti), rieši sa rozšírením politík – zapíše sa do [decisions.md](decisions.md).

## Správanie v aplikácii

| Situácia | Správanie |
|---|---|
| Neprihlásený otvorí ľubovoľnú stránku | Presmerovanie na `/login`, po prihlásení späť na pôvodnú stránku |
| Prihlásený otvorí `/login` | Presmerovanie na úvod |
| Zlé meno / heslo | Jedna všeobecná hláška „Nesprávne meno alebo heslo“ (neprezrádza, či meno existuje) |
| Bez internetu pri prihlásení | Hláška „Ste offline“, formulár ostane vyplnený |
| Refresh token zneplatnený | Pri ďalšom volaní sa session zruší a zobrazí sa `/login` |
| Odhlásenie | Tlačidlo v Nastaveniach, s potvrdením. Vymaže lokálne dáta, pri neodoslaných zmenách najprv upozorní |
| Offline so session | Appka sa otvorí normálne, token sa obnoví po návrate spojenia |

### Obrazovka prihlásenia

- Logo / názov aplikácie
- Pole **Meno** (`autocomplete="username"`, `autocapitalize="none"`)
- Pole **Heslo** (`autocomplete="current-password"`, prepínač zobrazenia)
- Tlačidlo **Prihlásiť**
- Žiadne „Registrovať“ ani „Zabudnuté heslo“

Atribúty `autocomplete` umožnia uloženie hesla do správcu hesiel v telefóne (iCloud Keychain / Google).
