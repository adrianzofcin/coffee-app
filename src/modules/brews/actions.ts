import { db, type ActiveRun } from '@/lib/db'
import { batchWrite, insertRecord, softDelete, updateRecord } from '@/lib/data/repository'
import { setBagStatus } from '@/modules/coffees/actions'
import { bagRemaining, brewDosesByBag, LOW_REMAINING_G } from '@/modules/coffees/balance'
import type { Bag, Brew, Recipe } from '@/types/models'
import { snapshotFromRecipe } from './brew'
import type { BrewFields } from './form'

const RUN_ID = 'current'

/** Result fields entered after brewing (Brew finish). */
export type BrewResult = Omit<BrewFields, 'bag_id' | 'method'>

const iso = (ms: number) => new Date(ms).toISOString()

export async function startRun(recipe: Recipe, bagId: string | null, dose: number): Promise<void> {
    await db.active_run.put({
        id: RUN_ID,
        recipe_id: recipe.id,
        bag_id: bagId,
        snapshot: snapshotFromRecipe(recipe, dose),
        started_at: null,
        paused_at: null,
        paused_total_ms: 0,
        step_index: 0,
        stopped_at: null,
    })
}

export async function patchRun(changes: Partial<Omit<ActiveRun, 'id'>>): Promise<void> {
    await db.active_run.update(RUN_ID, changes)
}

export async function discardRun(): Promise<void> {
    await db.active_run.delete(RUN_ID)
}

/** Every brew opens a sealed bag and marks its recipe as just brewed. */
async function afterBrew(bagId: string | null, recipeId: string | null): Promise<void> {
    if (bagId) {
        const bag = await db.bags.get(bagId)
        if (bag?.status === 'sealed') await setBagStatus(bag, 'open')
    }

    if (recipeId && (await db.recipes.get(recipeId))) {
        await updateRecord('recipes', recipeId, { last_brewed_at: new Date().toISOString() })
    }
}

/** Saves a timed run (V60, espresso) and ends it. */
export async function logRun(
    run: ActiveRun,
    result: BrewResult,
    now = Date.now(),
): Promise<string> {
    let id = ''

    await batchWrite(async () => {
        const brew = await insertRecord('brews', {
            recipe_id: run.recipe_id,
            bag_id: run.bag_id,
            method: run.snapshot.method,
            source: 'recipe',
            status: 'completed',
            started_at: iso(run.started_at ?? now),
            finished_at: iso(run.stopped_at ?? now),
            steep_ends_at: null,
            recipe_snapshot: run.snapshot,
            ...result,
        })
        id = brew.id
        await afterBrew(run.bag_id, run.recipe_id)
    })
    await discardRun()

    return id
}

/** Cold brew: the brew exists (and uses the coffee) from the moment steeping starts. */
export async function startSteeping(run: ActiveRun, now = Date.now()): Promise<string> {
    const minutes = run.snapshot.steep_time_min ?? 0
    let id = ''

    await batchWrite(async () => {
        const brew = await insertRecord('brews', {
            recipe_id: run.recipe_id,
            bag_id: run.bag_id,
            method: run.snapshot.method,
            source: 'recipe',
            status: 'steeping',
            started_at: iso(now),
            finished_at: null,
            steep_ends_at: iso(now + minutes * 60_000),
            dose_g: run.snapshot.dose_g,
            water_g: run.snapshot.water_g,
            yield_g: null,
            brew_time_s: null,
            rating: null,
            taste_tags: [],
            notes: null,
            recipe_snapshot: run.snapshot,
        })
        id = brew.id
        await afterBrew(run.bag_id, run.recipe_id)
    })
    await discardRun()

    return id
}

export function finishSteeping(id: string, result: BrewResult): Promise<void> {
    return updateRecord('brews', id, {
        ...result,
        status: 'completed',
        finished_at: new Date().toISOString(),
    })
}

export async function logQuick(fields: BrewFields, startedAt: string): Promise<string> {
    let id = ''

    await batchWrite(async () => {
        const brew = await insertRecord('brews', {
            ...fields,
            recipe_id: null,
            source: 'quick_log',
            status: 'completed',
            started_at: startedAt,
            finished_at: startedAt,
            steep_ends_at: null,
            recipe_snapshot: null,
        })
        id = brew.id
        await afterBrew(fields.bag_id, null)
    })

    return id
}

export async function updateBrew(
    brew: Brew,
    changes: Partial<BrewFields> & { started_at?: string },
): Promise<void> {
    await batchWrite(async () => {
        await updateRecord('brews', brew.id, changes)
        if (changes.bag_id && changes.bag_id !== brew.bag_id) await afterBrew(changes.bag_id, null)
    })
}

export function rateBrew(id: string, rating: number | null): Promise<void> {
    return updateRecord('brews', id, { rating })
}

/** Soft delete gives the grams back to the bag. */
export function deleteBrew(id: string): Promise<void> {
    return softDelete('brews', id)
}

export interface LowBag {
    bag: Bag
    remaining: number
}

/** After a brew: the bag is nearly empty and could be marked as finished. */
export async function findLowBag(bagId: string | null): Promise<LowBag | null> {
    if (!bagId) return null

    const bag = await db.bags.get(bagId)
    if (!bag || bag.deleted_at || bag.status === 'finished') return null

    const [adjustments, brews] = await Promise.all([
        db.bag_adjustments.where({ bag_id: bagId }).toArray(),
        db.brews.where({ bag_id: bagId }).toArray(),
    ])
    const remaining = bagRemaining(bag, adjustments, brewDosesByBag(brews).get(bagId) ?? 0)

    return remaining < LOW_REMAINING_G ? { bag, remaining } : null
}
