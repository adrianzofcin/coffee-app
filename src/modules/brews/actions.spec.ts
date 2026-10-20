import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db'
import { insertRecord } from '@/lib/data/repository'
import { setCurrentUserId } from '@/lib/data/session'
import type { Recipe } from '@/types/models'
import {
    deleteBrew,
    findLowBag,
    logQuick,
    logRun,
    patchRun,
    startRun,
    startSteeping,
} from './actions'
import { pauseTimer, startTimer, stopTimer } from './timer'

const USER = '00000000-0000-0000-0000-00000000000a'

async function seed(weight = 250) {
    const coffee = await insertRecord('coffees', {
        name: 'Guji',
        roaster: 'Doubleshot',
        country: null,
        region: null,
        producer: null,
        variety: null,
        altitude: null,
        process: null,
        roast_level: null,
        intended_for: null,
        is_decaf: false,
        tasting_notes: [],
        rating: null,
        notes: null,
        photo_path: null,
    })
    const bag = await insertRecord('bags', {
        coffee_id: coffee.id,
        roast_date: '2026-10-01',
        weight_g: weight,
        price: null,
        purchase_date: null,
        status: 'sealed',
        opened_at: null,
        finished_at: null,
        is_frozen: false,
    })
    const recipe = (await insertRecord('recipes', {
        name: 'V60',
        method: 'v60',
        dose_g: 15,
        water_g: 250,
        yield_g: null,
        temperature_c: 93,
        grind_setting: null,
        target_time_s: 180,
        target_time_max_s: null,
        preinfusion_s: null,
        steep_time_min: 600,
        steep_place: null,
        dilution: null,
        steps: [],
        coffee_id: null,
        is_favorite: false,
        notes: null,
        last_brewed_at: null,
    })) as Recipe

    return { bag, recipe }
}

const result = {
    dose_g: 15,
    water_g: 250,
    yield_g: null,
    brew_time_s: 175,
    rating: null,
    taste_tags: [],
    notes: null,
}

describe('brew actions', () => {
    beforeEach(async () => {
        await db.clearAll()
        setCurrentUserId(USER)
    })

    afterEach(() => setCurrentUserId(null))

    it('logs a timed run, opens the bag and marks the recipe as brewed', async () => {
        const { bag, recipe } = await seed()
        await startRun(recipe, bag.id, 20)

        let run = (await db.active_run.get('current'))!
        expect(run.snapshot.water_g).toBe(333)

        await patchRun(startTimer(1_000))
        run = (await db.active_run.get('current'))!
        await patchRun(stopTimer(run, 181_000))
        run = (await db.active_run.get('current'))!

        const id = await logRun(run, { ...result, dose_g: 20 })
        const brew = (await db.brews.get(id))!

        expect(brew.started_at).toBe(new Date(1_000).toISOString())
        expect(brew.finished_at).toBe(new Date(181_000).toISOString())
        expect(brew.recipe_snapshot?.dose_g).toBe(20)
        expect((await db.bags.get(bag.id))!.status).toBe('open')
        expect((await db.recipes.get(recipe.id))!.last_brewed_at).not.toBeNull()
        expect(await db.active_run.count()).toBe(0)
        expect(await db.outbox.where({ table: 'brews', key: id }).count()).toBe(1)
    })

    it('starts steeping a cold brew right away', async () => {
        const { bag, recipe } = await seed()
        await startRun({ ...recipe, method: 'cold_brew' }, bag.id, 100)
        const run = (await db.active_run.get('current'))!

        const id = await startSteeping(run, Date.parse('2026-10-20T20:00:00Z'))
        const brew = (await db.brews.get(id))!

        expect(brew.status).toBe('steeping')
        expect(brew.steep_ends_at).toBe('2026-10-21T06:00:00.000Z')
        expect(brew.dose_g).toBe(100)
    })

    it('offers to finish a nearly empty bag and gives grams back on delete', async () => {
        const { bag } = await seed(20)
        const fields = { ...result, bag_id: bag.id, method: 'v60' as const, dose_g: 18 }

        const id = await logQuick(fields, new Date().toISOString())
        expect((await findLowBag(bag.id))?.remaining).toBe(2)

        await deleteBrew(id)
        expect(await findLowBag(bag.id)).toBeNull()
        expect(await findLowBag(null)).toBeNull()
    })

    it('logs a brew without a coffee', async () => {
        const id = await logQuick(
            { ...result, bag_id: null, method: 'espresso' },
            new Date().toISOString(),
        )
        expect((await db.brews.get(id))!.bag_id).toBeNull()
    })

    it('keeps a paused run paused in the database', async () => {
        const { recipe } = await seed()
        await startRun(recipe, null, 15)
        await patchRun(startTimer(0))
        const run = (await db.active_run.get('current'))!
        await patchRun(pauseTimer(run, 5_000))

        expect((await db.active_run.get('current'))!.paused_at).toBe(5_000)
    })
})
