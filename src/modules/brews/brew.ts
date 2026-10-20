import type { BagView, CoffeeView } from '@/modules/coffees/balance'
import { methodLabel } from '@/modules/recipes/options'
import { scaleRecipe } from '@/modules/recipes/recipe'
import type {
    Bag,
    Brew,
    BrewMethod,
    Coffee,
    Recipe,
    RecipeSnapshot,
    RecipeStep,
} from '@/types/models'
import { RATE_WINDOW_MS } from './options'

/** The recipe as brewed this time: scaled to the dose, without list-only step keys. */
export function snapshotFromRecipe(recipe: Recipe, dose: number): RecipeSnapshot {
    const snapshot: RecipeSnapshot = {
        name: recipe.name,
        method: recipe.method,
        dose_g: Number(recipe.dose_g),
        water_g: recipe.water_g === null ? null : Number(recipe.water_g),
        yield_g: recipe.yield_g === null ? null : Number(recipe.yield_g),
        temperature_c: recipe.temperature_c,
        grind_setting: recipe.grind_setting,
        target_time_s: recipe.target_time_s,
        target_time_max_s: recipe.target_time_max_s,
        preinfusion_s: recipe.preinfusion_s,
        steep_time_min: recipe.steep_time_min,
        steep_place: recipe.steep_place,
        dilution: recipe.dilution === null ? null : Number(recipe.dilution),
        steps: recipe.steps.map(({ type, at_s, target_water_g, text }) => ({
            type,
            at_s,
            target_water_g,
            text,
        })),
    }

    return dose === snapshot.dose_g ? snapshot : scaleRecipe(snapshot, dose)
}

export interface BagOption {
    view: BagView
    coffeeId: string
    coffeeName: string
    roaster: string
}

/** Bags that can be brewed from, grouped by coffee order of the shelf. */
export function bagOptions(views: CoffeeView[]): BagOption[] {
    return views.flatMap((view) =>
        view.activeBags.map((bag) => ({
            view: bag,
            coffeeId: view.coffee.id,
            coffeeName: view.coffee.name,
            roaster: view.coffee.roaster,
        })),
    )
}

/** Open bag first, then the oldest roast. */
function preferred(options: BagOption[]): BagOption | null {
    return (
        [...options].sort((a, b) => {
            const open = Number(b.view.bag.status === 'open') - Number(a.view.bag.status === 'open')

            return open || a.view.bag.roast_date.localeCompare(b.view.bag.roast_date)
        })[0] ?? null
    )
}

/**
 * Pre-selected bag in Brew setup: the coffee assigned to the recipe,
 * else the bag used last time, else the oldest open bag.
 */
export function defaultBagId(
    options: BagOption[],
    recipeCoffeeId: string | null,
    brews: Brew[],
): string | null {
    if (recipeCoffeeId) {
        const match = preferred(options.filter((option) => option.coffeeId === recipeCoffeeId))
        if (match) return match.view.bag.id
    }

    const lastBagId = latestFirst(brews).find((brew) => brew.bag_id)?.bag_id
    if (lastBagId && options.some((option) => option.view.bag.id === lastBagId)) return lastBagId

    return preferred(options)?.view.bag.id ?? null
}

/** Non-deleted brews, newest first. */
export function latestFirst(brews: Brew[]): Brew[] {
    return brews
        .filter((brew) => !brew.deleted_at)
        .sort((a, b) => b.started_at.localeCompare(a.started_at))
}

export function historyBrews(brews: Brew[], method: BrewMethod | null): Brew[] {
    return latestFirst(brews).filter((brew) => !method || brew.method === method)
}

export function steepingBrews(brews: Brew[]): Brew[] {
    return latestFirst(brews)
        .filter((brew) => brew.status === 'steeping')
        .reverse()
}

/** Newest completed brew of the last 24 h that still waits for a rating. */
export function latestUnrated(brews: Brew[], now = Date.now()): Brew | null {
    return (
        latestFirst(brews).find(
            (brew) =>
                brew.status === 'completed' &&
                brew.rating === null &&
                now - Date.parse(brew.finished_at ?? brew.started_at) < RATE_WINDOW_MS,
        ) ?? null
    )
}

/** Favourites, then the three most recently brewed others. */
export function quickStartRecipes(recipes: Recipe[]): Recipe[] {
    const favorites = recipes.filter((recipe) => recipe.is_favorite)
    const recent = recipes
        .filter((recipe) => !recipe.is_favorite && recipe.last_brewed_at)
        .sort((a, b) => b.last_brewed_at!.localeCompare(a.last_brewed_at!))
        .slice(0, 3)

    return [...favorites, ...recent]
}

export function brewTitle(brew: Pick<Brew, 'recipe_snapshot' | 'source' | 'method'>): string {
    if (brew.recipe_snapshot) return brew.recipe_snapshot.name

    return brew.source === 'quick_log' ? 'Quick log' : methodLabel(brew.method)
}

/**
 * Cold brew: steps before the "wait" step are done at once, the rest after steeping.
 * Without a wait step, filtering is what comes after.
 */
export function coldBrewPhases(steps: RecipeStep[]): { before: RecipeStep[]; after: RecipeStep[] } {
    const wait = steps.findIndex((step) => step.type === 'wait')

    if (wait >= 0) return { before: steps.slice(0, wait), after: steps.slice(wait + 1) }

    return {
        before: steps.filter((step) => step.type !== 'filter'),
        after: steps.filter((step) => step.type === 'filter'),
    }
}

export function steepRemainingMs(brew: Pick<Brew, 'steep_ends_at'>, now = Date.now()): number {
    return brew.steep_ends_at ? Math.max(0, Date.parse(brew.steep_ends_at) - now) : 0
}

/** Coffee of each bag, deleted ones included, so old brews keep their coffee name. */
export function coffeeByBag(bags: Bag[], coffees: Coffee[]): Map<string, Coffee> {
    const byId = new Map(coffees.map((coffee) => [coffee.id, coffee]))
    const result = new Map<string, Coffee>()

    for (const bag of bags) {
        const coffee = byId.get(bag.coffee_id)
        if (coffee) result.set(bag.id, coffee)
    }

    return result
}
