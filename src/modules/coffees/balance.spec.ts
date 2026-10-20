import { describe, expect, it } from 'vitest'
import type { Bag, BagAdjustment, Brew, Coffee } from '@/types/models'
import {
    bagRemaining,
    brewDosesByBag,
    buildCoffeeViews,
    daysBetween,
    findSameCoffee,
    matchesSearch,
    sortCoffeeViews,
    usedValues,
} from './balance'

const base = { user_id: 'u', created_at: '', updated_at: '2026-01-01', deleted_at: null }

function coffee(id: string, patch: Partial<Coffee> = {}): Coffee {
    return {
        ...base,
        id,
        name: `Coffee ${id}`,
        roaster: 'Roaster',
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
        ...patch,
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
        status: 'open',
        opened_at: null,
        finished_at: null,
        is_frozen: false,
        ...patch,
    }
}

function adjustment(
    bagId: string,
    delta: number,
    patch: Partial<BagAdjustment> = {},
): BagAdjustment {
    return {
        ...base,
        id: `${bagId}-${delta}`,
        bag_id: bagId,
        type: 'remove',
        delta_g: delta,
        measured_g: null,
        note: null,
        ...patch,
    }
}

function brew(id: string, bagId: string | null, dose: number, patch: Partial<Brew> = {}): Brew {
    return {
        ...base,
        id,
        recipe_id: null,
        bag_id: bagId,
        method: 'v60',
        source: 'quick_log',
        status: 'completed',
        started_at: '2026-10-10T08:00:00Z',
        finished_at: null,
        steep_ends_at: null,
        dose_g: dose,
        water_g: null,
        yield_g: null,
        brew_time_s: null,
        rating: null,
        taste_tags: [],
        notes: null,
        recipe_snapshot: null,
        ...patch,
    }
}

describe('bagRemaining', () => {
    it('subtracts brews and applies adjustments', () => {
        const b = bag('b1', 'c1')
        expect(bagRemaining(b, [adjustment('b1', -20), adjustment('b2', -100)], 36)).toBe(194)
    })

    it('ignores deleted adjustments and never goes below zero', () => {
        const b = bag('b1', 'c1', { weight_g: 10 })
        expect(bagRemaining(b, [adjustment('b1', -50, { deleted_at: 'x' })])).toBe(10)
        expect(bagRemaining(b, [adjustment('b1', -50)])).toBe(0)
    })

    it('treats numeric strings from the API as numbers', () => {
        const b = bag('b1', 'c1')
        expect(bagRemaining(b, [adjustment('b1', '-12.5' as unknown as number)])).toBe(237.5)
    })
})

describe('buildCoffeeViews', () => {
    const views = buildCoffeeViews(
        [coffee('c1'), coffee('c2'), coffee('c3', { deleted_at: 'x' })],
        [
            bag('b1', 'c1', { roast_date: '2026-10-01', status: 'sealed' }),
            bag('b2', 'c1', { roast_date: '2026-09-20', status: 'open' }),
            bag('b3', 'c2', { status: 'finished' }),
            bag('b4', 'c1', { deleted_at: 'x' }),
        ],
        [adjustment('b2', -50)],
        [brew('w1', 'b2', 15), brew('w2', 'b2', 100, { deleted_at: 'x' }), brew('w3', null, 18)],
        '2026-10-11',
    )

    it('skips deleted coffees and bags', () => {
        expect(views.map((v) => v.coffee.id)).toEqual(['c1', 'c2'])
        expect(views[0]!.bags).toHaveLength(2)
    })

    it('sums active bags and picks the open bag for freshness', () => {
        expect(views[0]!.remaining).toBe(435)
        expect(views[0]!.currentBag?.bag.id).toBe('b2')
        expect(views[0]!.currentBag?.daysSinceRoast).toBe(21)
    })

    it('treats coffees with only finished bags as archived', () => {
        expect(views[1]!.isActive).toBe(false)
        expect(views[1]!.finishedBags).toHaveLength(1)
    })
})

describe('brewDosesByBag', () => {
    it('sums doses per bag, steeping brews included, deleted and bagless ones skipped', () => {
        const doses = brewDosesByBag([
            brew('a', 'b1', 15),
            brew('b', 'b1', '18.5' as unknown as number),
            brew('c', 'b1', 100, { status: 'steeping' }),
            brew('d', 'b1', 50, { deleted_at: 'x' }),
            brew('e', null, 20),
        ])
        expect(doses.get('b1')).toBe(133.5)
        expect(doses.size).toBe(1)
    })
})

describe('helpers', () => {
    it('counts days between dates', () => {
        expect(daysBetween('2026-10-01', '2026-10-19')).toBe(18)
    })

    it('sorts by remaining and rating', () => {
        const views = buildCoffeeViews(
            [coffee('a', { rating: 3 }), coffee('b', { rating: 5 })],
            [bag('ba', 'a', { weight_g: 500 }), bag('bb', 'b', { weight_g: 200 })],
            [],
        )
        expect(sortCoffeeViews(views, 'remaining').map((v) => v.coffee.id)).toEqual(['a', 'b'])
        expect(sortCoffeeViews(views, 'rating').map((v) => v.coffee.id)).toEqual(['b', 'a'])
    })

    it('searches name, roaster and country', () => {
        const [view] = buildCoffeeViews([coffee('a', { country: 'Kenya' })], [], [])
        expect(matchesSearch(view!, 'kenya')).toBe(true)
        expect(matchesSearch(view!, 'brazil')).toBe(false)
    })

    it('finds the same coffee ignoring case and spaces', () => {
        const list = [coffee('a', { name: 'Guji', roaster: 'Doubleshot' })]
        expect(findSameCoffee(list, ' guji ', 'DOUBLESHOT')?.id).toBe('a')
        expect(findSameCoffee(list, 'Guji', 'Other')).toBeNull()
    })

    it('lists distinct used values', () => {
        const list = [
            coffee('a', { roaster: 'Doubleshot', updated_at: '2026-01-02' }),
            coffee('b', { roaster: 'doubleshot', updated_at: '2026-01-01' }),
            coffee('c', { roaster: 'Father’s', updated_at: '2026-01-03' }),
        ]
        expect(usedValues(list, (c) => c.roaster)).toEqual(['Father’s', 'Doubleshot'])
    })
})
