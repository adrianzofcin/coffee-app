# Offline a synchronizácia

- **Stav:** schválené
- **Posledná úprava:** 2026-10-19

## Požiadavka

Appka sa má na mobile správať ako „reálna appka“. Musí sa otvoriť a fungovať aj bez signálu a všetky zmeny sa majú zaradiť do fronty a zapísať do Supabase, keď bude spojenie.

## Princíp: offline-first

```
UI (Vue)
  │ číta / zapisuje
  ▼
Lokálna DB (IndexedDB cez Dexie)  ── zdroj pravdy pre UI
  │                    ▲
  │ outbox (fronta)    │ pull zmien
  ▼                    │
Sync engine ──HTTPS──> Supabase (Postgres + Storage)
```

- **UI nikdy nečaká na sieť.** Všetko číta z lokálnej DB (reaktívne cez `liveQuery`), takže appka je okamžitá aj offline.
- **Každý zápis** (create / update / delete) sa v jednej transakcii zapíše do lokálnej tabuľky a zároveň pridá do tabuľky `outbox`.
- **Sync engine** odošle outbox na server v poradí vzniku a potom stiahne zmeny zo servera.

## Dátové pravidlá (platia pre každú synchronizovanú tabuľku)

| Stĺpec | Popis |
|---|---|
| `id uuid` | Generuje **klient** (`crypto.randomUUID()`), aby záznam mohol vzniknúť offline |
| `user_id uuid` | Vlastník, `default auth.uid()`, kontroluje RLS |
| `created_at timestamptz` | Čas vzniku (klient) |
| `updated_at timestamptz` | Nastavuje **server triggerom** pri každom zápise, slúži ako kurzor pre pull |
| `deleted_at timestamptz null` | **Soft delete.** Mazanie je len označenie, aby sa o ňom dozvedeli aj ostatné zariadenia |

Fyzické mazanie starých soft-deleted záznamov môže robiť neskôr plánovaná úloha, ale nie je nutné.

## Množstvá ako udalosti, nie ako číslo

Zostatok kávy (gramy) sa **neukladá ako jedno prepisované číslo**. Počíta sa z udalostí:

```
zostatok = počiatočná hmotnosť balíčka − Σ spotreba (dávky z príprav) ± Σ manuálne korekcie
```

Dve offline zariadenia tak nikdy neprepíšu zostatok jedno druhému. Udalosti sa len pridávajú a výsledok je vždy správny.

## Sync engine

**Spúšťače synchronizácie:**

- štart appky,
- udalosť `online` (návrat signálu),
- návrat do appky (`visibilitychange` → visible),
- po lokálnom zápise (s oneskorením ~2 s, aby sa zápisy zoskupili),
- periodicky každých 5 min, kým je appka otvorená,
- ručne ťahom nadol (pull-to-refresh) v zoznamoch.

> iOS nepodporuje Background Sync API. Synchronizácia teda prebieha len keď je appka otvorená. Pri bežnom používaní to stačí, fronta počká.

**Push (outbox → server):**

1. Zoberie najstaršie položky z outboxu (dávky).
2. `upsert` podľa `id` (create aj update sú idempotentné, opakované odoslanie nič nepokazí).
3. Úspech → položku z outboxu zmaže. Chyba siete → skúsi neskôr s exponenciálnym čakaním. Chyba validácie / RLS → položka sa označí ako chybná a zobrazí sa v UI.

**Pull (server → lokálne):**

1. Pre každú tabuľku si pamätá kurzor `last_pulled_at`.
2. Stiahne záznamy s `updated_at > last_pulled_at` (vrátane soft-deleted).
3. Zapíše ich do lokálnej DB, okrem záznamov, ktoré majú v outboxe ešte neodoslanú zmenu (lokálna zmena má prednosť, server ju dostane pri ďalšom pushi).

**Konflikty:** *last write wins* na úrovni záznamu. Appku používa jeden človek, najviac na pár zariadeniach, takže reálny konflikt je zriedkavý. Kritické hodnoty (zostatky) sú chránené modelom udalostí.

## Fotky (Supabase Storage)

- Pred uložením sa fotka v prehliadači zmenší a skomprimuje (max. 1600 px, WebP, ~150–300 kB).
- Offline sa uloží ako `Blob` do IndexedDB a upload sa zaradí do outboxu.
- Cesta v Storage: `{user_id}/{entity}/{id}.webp`, bucket je **privátny** a RLS politika povoľuje prístup len k vlastnému priečinku.
- Zobrazenie cez lokálnu kópiu, ak existuje, inak cez signed URL (a následne sa uloží do cache).

## Stav synchronizácie v UI

- Nenápadný indikátor v hlavičke: ✓ synchronizované / ↻ prebieha / počet čakajúcich zmien / ⚠ chyba.
- V Nastaveniach: čas poslednej synchronizácie, počet položiek vo fronte, tlačidlo **Sync now**.

## Úložisko v telefóne

- Pri prvom spustení appka požiada o trvalé úložisko (`navigator.storage.persist()`), aby prehliadač lokálne dáta pri nedostatku miesta nezmazal.
- Nainštalovaná PWA na iOS nepodlieha 7-dňovému mazaniu dát.

## Odhlásenie

- Pri odhlásení sa lokálna DB vymaže (dáta ostávajú na serveri).
- Ak sú vo fronte neodoslané zmeny, appka na to upozorní a ponúkne najprv synchronizáciu.

## Auth offline

- Session je uložená lokálne, takže appka pustí používateľa dnu aj offline, aj keď access token medzičasom vypršal.
- Token sa obnoví pri prvom spojení, až potom beží push.

## Zvážené alternatívy

| Možnosť | Prečo nie (zatiaľ) |
|---|---|
| PowerSync / ElectricSQL | Ďalšia služba a závislosť, na takto malý dátový model zbytočne silné |
| RxDB so Supabase replikáciou | Plnohodnotné, ale ťažšie a pre pokročilé funkcie platené |
| Len online + cache čítania | Nespĺňa požiadavku zapisovať offline |

Vlastný jednoduchý sync nad Dexie je malý (rádovo stovky riadkov), plne pod kontrolou a bez ďalších služieb.
