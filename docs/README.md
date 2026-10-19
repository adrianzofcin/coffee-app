# Coffee App – dokumentácia

Osobná kávová aplikácia, optimalizovaná pre mobil a inštaláciu ako PWA. Vznikla preto, lebo existujúce appky buď nepokrývajú všetko potrebné, alebo sú za paywallom.

## Stav

| Časť | Súbor | Stav |
|---|---|---|
| Framework a stack | [01-stack.md](01-stack.md) | schválené |
| Autorizácia | [02-auth.md](02-auth.md) | schválené |
| 3rd party služby | [03-third-party.md](03-third-party.md) | schválené |
| Offline a synchronizácia | [04-offline-sync.md](04-offline-sync.md) | schválené |
| Vizuálny štýl | [05-design.md](05-design.md) | schválené (upravuje sa priebežne) |
| Obsah (moduly) | [content/README.md](content/README.md) | Coffees, Recipes, Brew schválené, Stats plán |
| Rozhodnutia, otvorené otázky, testy | [decisions.md](decisions.md) | priebežne |

## Plán implementácie

| Fáza | Obsah | Predpoklad |
|---|---|---|
| **F0: Základ** ✅ (lokálne hotové) | Scaffold (Vite, Vue, TS, Tailwind), Supabase klient, prihlásenie, app shell s navigáciou, PWA (manifest, service worker, update banner), Settings (logout, téma), GitHub workflowy deploy / unpublish | Vlastník založí Supabase projekt a GitHub repozitár |
| **F0.1: Test T1** | Inštalácia na mobil, unpublish, overenie behu appky | F0 nasadené |
| **F1: Dáta a sync** | Migrácie (`profiles`, spoločné stĺpce, RLS, triggery), Dexie, outbox, sync engine, indikátor synchronizácie, Storage pre fotky | F0 |
| **F2: Coffees** | [content/coffees.md](content/coffees.md) | F1 |
| **F3: Recipes** | [content/recipes.md](content/recipes.md) vrátane vzorových receptov | F1 |
| **F4: Brew** | [content/brew.md](content/brew.md), testy T2 a T3 | F2, F3 |
| **F5: Stats a export** | [content/stats.md](content/stats.md) | F4 |

Každá fáza sa nasadí a vyskúša na mobile pred začatím ďalšej.

## Konvencie dokumentácie

- Obsah dokumentácie je po slovensky, identifikátory a ukážky kódu po anglicky. UI appky je po anglicky.
- Každé rozhodnutie, ktoré mení architektúru, sa zapíše do [decisions.md](decisions.md).
- Obsah aplikácie sa delí na moduly v `docs/content/`, jeden súbor na modul.
