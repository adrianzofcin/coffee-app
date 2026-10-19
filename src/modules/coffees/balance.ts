import type { Bag, BagAdjustment, Coffee } from '@/types/models'

/** Below this many grams the app offers to mark a bag as finished. */
export const LOW_REMAINING_G = 5

export interface BagView {
    bag: Bag
    remaining: number
    /** 0–1 */
    fraction: number
    daysSinceRoast: number
}

export interface CoffeeView {
    coffee: Coffee
    bags: BagView[]
    activeBags: BagView[]
    finishedBags: BagView[]
    isActive: boolean
    remaining: number
    totalWeight: number
    /** Bag the freshness label refers to: the open one, else the oldest active one. */
    currentBag: BagView | null
}

/** YYYY-MM-DD in the device's time zone. */
export function localDate(date = new Date()): string {
    const offset = date.getTimezoneOffset() * 60_000

    return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export function daysBetween(fromDate: string, toDate: string): number {
    return Math.round((Date.parse(toDate) - Date.parse(fromDate)) / 86_400_000)
}

/**
 * Remaining grams are derived from events, never stored: initial weight
 * minus brew doses plus manual adjustments (docs/04-offline-sync.md).
 */
export function bagRemaining(bag: Bag, adjustments: BagAdjustment[], brewDoses = 0): number {
    const delta = adjustments
        .filter((adjustment) => adjustment.bag_id === bag.id && !adjustment.deleted_at)
        .reduce((sum, adjustment) => sum + Number(adjustment.delta_g), 0)

    return Math.max(0, bag.weight_g - brewDoses + delta)
}

export function isActiveBag(bag: Bag): boolean {
    return bag.status !== 'finished'
}

export function buildCoffeeViews(
    coffees: Coffee[],
    bags: Bag[],
    adjustments: BagAdjustment[],
    today = localDate(),
): CoffeeView[] {
    const bagsByCoffee = new Map<string, BagView[]>()

    for (const bag of bags) {
        if (bag.deleted_at) continue

        const remaining = bagRemaining(bag, adjustments)
        const view: BagView = {
            bag,
            remaining,
            fraction: bag.weight_g > 0 ? Math.min(1, remaining / bag.weight_g) : 0,
            daysSinceRoast: daysBetween(bag.roast_date, today),
        }
        bagsByCoffee.set(bag.coffee_id, [...(bagsByCoffee.get(bag.coffee_id) ?? []), view])
    }

    return coffees
        .filter((coffee) => !coffee.deleted_at)
        .map((coffee) => {
            const all = (bagsByCoffee.get(coffee.id) ?? []).sort((a, b) =>
                b.bag.roast_date.localeCompare(a.bag.roast_date),
            )
            const activeBags = all.filter((view) => isActiveBag(view.bag))
            const open = activeBags.find((view) => view.bag.status === 'open')

            return {
                coffee,
                bags: all,
                activeBags,
                finishedBags: all.filter((view) => !isActiveBag(view.bag)),
                isActive: activeBags.length > 0,
                remaining: activeBags.reduce((sum, view) => sum + view.remaining, 0),
                totalWeight: activeBags.reduce((sum, view) => sum + view.bag.weight_g, 0),
                currentBag: open ?? activeBags.at(-1) ?? null,
            }
        })
}

export type CoffeeSort = 'roast_date' | 'remaining' | 'rating'

export function sortCoffeeViews(views: CoffeeView[], sort: CoffeeSort): CoffeeView[] {
    const latestRoast = (view: CoffeeView) => view.bags[0]?.bag.roast_date ?? ''

    return [...views].sort((a, b) => {
        if (sort === 'remaining') return b.remaining - a.remaining
        if (sort === 'rating') return (b.coffee.rating ?? 0) - (a.coffee.rating ?? 0)

        return latestRoast(b).localeCompare(latestRoast(a))
    })
}

export function matchesSearch(view: CoffeeView, query: string): boolean {
    const needle = query.trim().toLowerCase()
    if (!needle) return true

    return [view.coffee.name, view.coffee.roaster, view.coffee.country ?? '']
        .join(' ')
        .toLowerCase()
        .includes(needle)
}

export function findSameCoffee(coffees: Coffee[], name: string, roaster: string): Coffee | null {
    const normalize = (value: string) => value.trim().toLowerCase()

    return (
        coffees.find(
            (coffee) =>
                !coffee.deleted_at &&
                normalize(coffee.name) === normalize(name) &&
                normalize(coffee.roaster) === normalize(roaster),
        ) ?? null
    )
}

/** Distinct non-empty values, most recently used first. */
export function usedValues(coffees: Coffee[], pick: (coffee: Coffee) => string | null): string[] {
    const seen = new Map<string, string>()

    for (const coffee of [...coffees].sort((a, b) => b.updated_at.localeCompare(a.updated_at))) {
        const value = pick(coffee)?.trim()
        if (value && !seen.has(value.toLowerCase())) seen.set(value.toLowerCase(), value)
    }

    return [...seen.values()]
}
