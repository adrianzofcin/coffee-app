import { describe, expect, it } from 'vitest'
import { buildCoffeeViews } from '@/modules/coffees/balance'
import type { Bag, Brew, Coffee, Recipe, RecipeStep } from '@/types/models'
import {
    bagOptions,
    brewTitle,
    coldBrewPhases,
    defaultBagId,
    historyBrews,
    latestUnrated,
    quickStartRecipes,
    snapshotFromRecipe,
    steepingBrews,
} from './brew'

const base = { user_id: 'u', created_at: '', updated_at: '', deleted_at: null }

function recipe(id: string, patch: Partial<Recipe> = {}): Recipe {
    return {
        ...base,
        id,
        name: `Recipe ${id}`,
        method: 'v60',
        dose_g: 15,
        water_g: 250,
        yield_g: null,
        temperature_c: 93,
        grind_setting: null,
        target_time_s: 180,
        target_time_max_s: null,
        preinfusion_s: null,
        steep_time_min: null,
        steep_place: null,
        dilution: null,
        steps: [{ id: 'x', type: 'pour', at_s: 0, target_water_g: 150, text: null }],
        coffee_id: null,
        is_favorite: false,
        notes: null,
        last_brewed_at: null,
        ...patch,
    }
}

function brew(id: string, startedAt: string, patch: Partial<Brew> = {}): Brew {
    return {
        ...base,
        id,
        recipe_id: null,
        bag_id: null,
        method: 'v60',
        source: 'recipe',
        status: 'completed',
        started_at: startedAt,
        finished_at: null,
        steep_ends_at: null,
        dose_g: 15,
        water_g: 250,
        yield_g: null,
        brew_time_s: null,
        rating: null,
        taste_tags: [],
        notes: null,
        recipe_snapshot: null,
        ...patch,
    }
}

function coffee(id: string): Coffee {
    return {
        ...base,
        id,
        name: id,
        roaster: 'R',
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
    }
}

function bag(id: string, coffeeId: string, patch: Partial<Bag> = {}): Bag {
    return {
        ...base,
        id,
        coffee_id: coffeeId,
        roast_date: '2026-10-01',
        weight_g: 250,
        price: null,
        purchase_date: null,
        status: 'sealed',
        opened_at: null,
        finished_at: null,
        is_frozen: false,
        ...patch,
    }
}

describe('snapshotFromRecipe', () => {
    it('copies the recipe without step keys', () => {
        const snapshot = snapshotFromRecipe(recipe('r'), 15)
        expect(snapshot.water_g).toBe(250)
        expect(snapshot.steps[0]).not.toHaveProperty('id')
        expect(snapshot).not.toHaveProperty('coffee_id')
    })

    it('scales water and steps to another dose', () => {
        const snapshot = snapshotFromRecipe(recipe('r'), 30)
        expect(snapshot.dose_g).toBe(30)
        expect(snapshot.water_g).toBe(500)
        expect(snapshot.steps[0]!.target_water_g).toBe(300)
    })
})

describe('defaultBagId', () => {
    const views = buildCoffeeViews(
        [coffee('kenya'), coffee('brazil')],
        [
            bag('k-old', 'kenya', { roast_date: '2026-09-01' }),
            bag('k-open', 'kenya', { roast_date: '2026-10-05', status: 'open' }),
            bag('b1', 'brazil', { roast_date: '2026-08-01' }),
            bag('b-done', 'brazil', { status: 'finished' }),
        ],
        [],
    )
    const options = bagOptions(views)

    it('lists only active bags', () => {
        expect(options.map((o) => o.view.bag.id).sort()).toEqual(['b1', 'k-old', 'k-open'])
    })

    it("prefers the open bag of the recipe's coffee", () => {
        expect(defaultBagId(options, 'kenya', [])).toBe('k-open')
    })

    it('falls back to the bag used last time, then the open one', () => {
        const brews = [
            brew('a', '2026-10-10T08:00:00Z', { bag_id: 'b1' }),
            brew('b', '2026-10-11T08:00:00Z', { bag_id: 'b-done' }),
            brew('c', '2026-10-12T08:00:00Z'),
        ]
        expect(defaultBagId(options, null, brews)).toBe('k-open')
        expect(defaultBagId(options, null, brews.slice(0, 1))).toBe('b1')
        expect(defaultBagId(options, null, [])).toBe('k-open')
        expect(defaultBagId([], 'kenya', [])).toBeNull()
    })
})

describe('lists', () => {
    const brews = [
        brew('old', '2026-10-01T08:00:00Z', { method: 'espresso' }),
        brew('new', '2026-10-19T08:00:00Z'),
        brew('gone', '2026-10-19T09:00:00Z', { deleted_at: 'x' }),
        brew('cold', '2026-10-18T20:00:00Z', { method: 'cold_brew', status: 'steeping' }),
    ]

    it('sorts history newest first and filters by method', () => {
        expect(historyBrews(brews, null).map((b) => b.id)).toEqual(['new', 'cold', 'old'])
        expect(historyBrews(brews, 'espresso').map((b) => b.id)).toEqual(['old'])
    })

    it('finds steeping cold brews', () => {
        expect(steepingBrews(brews).map((b) => b.id)).toEqual(['cold'])
    })

    it('offers the newest unrated brew of the last 24 h', () => {
        const now = Date.parse('2026-10-19T20:00:00Z')
        expect(latestUnrated(brews, now)?.id).toBe('new')
        expect(latestUnrated([{ ...brews[1]!, rating: 4 }], now)).toBeNull()
        expect(latestUnrated(brews, Date.parse('2026-10-21T08:00:00Z'))).toBeNull()
    })

    it('puts favourites first, then the three most recently brewed', () => {
        const recipes = [
            recipe('fav', { is_favorite: true }),
            recipe('r1', { last_brewed_at: '2026-10-01' }),
            recipe('r2', { last_brewed_at: '2026-10-04' }),
            recipe('r3', { last_brewed_at: '2026-10-03' }),
            recipe('r4', { last_brewed_at: '2026-10-02' }),
            recipe('never'),
        ]
        expect(quickStartRecipes(recipes).map((r) => r.id)).toEqual(['fav', 'r2', 'r3', 'r4'])
    })

    it('names brews by recipe or as a quick log', () => {
        expect(brewTitle({ recipe_snapshot: null, source: 'quick_log', method: 'v60' })).toBe(
            'Quick log',
        )
        expect(
            brewTitle({
                recipe_snapshot: snapshotFromRecipe(recipe('r'), 15),
                source: 'recipe',
                method: 'v60',
            }),
        ).toBe('Recipe r')
    })
})

describe('coldBrewPhases', () => {
    const s = (type: RecipeStep['type']): RecipeStep => ({
        type,
        at_s: null,
        target_water_g: null,
        text: null,
    })

    it('splits around the wait step', () => {
        const phases = coldBrewPhases([s('custom'), s('pour'), s('wait'), s('filter')])
        expect(phases.before.map((p) => p.type)).toEqual(['custom', 'pour'])
        expect(phases.after.map((p) => p.type)).toEqual(['filter'])
    })

    it('treats filtering as the after-steep part without a wait step', () => {
        const phases = coldBrewPhases([s('pour'), s('filter'), s('stir')])
        expect(phases.before.map((p) => p.type)).toEqual(['pour', 'stir'])
        expect(phases.after.map((p) => p.type)).toEqual(['filter'])
    })
})
