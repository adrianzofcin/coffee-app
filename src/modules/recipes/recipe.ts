import type { Recipe, RecipeStep } from '@/types/models'

type RecipeAmounts = Pick<Recipe, 'method' | 'dose_g' | 'water_g' | 'yield_g'>

/** Output per gram of coffee: water for filter and cold brew, yield for espresso. */
export function ratio(recipe: RecipeAmounts): number | null {
    const output = recipe.method === 'espresso' ? recipe.yield_g : recipe.water_g
    if (!output || !recipe.dose_g) return null

    return Number(output) / Number(recipe.dose_g)
}

/** 16.666 → "1:16.7", 2 → "1:2" */
export function formatRatio(value: number | null): string {
    if (value === null || !Number.isFinite(value)) return '–'

    return `1:${Math.round(value * 10) / 10}`
}

/** 105 → "1:45" */
export function formatSeconds(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const rest = Math.round(seconds % 60)

    return `${minutes}:${String(rest).padStart(2, '0')}`
}

/** "1:45" → 105, "45" → 45, "" → null, garbage → NaN */
export function parseSeconds(value: string): number | null {
    const trimmed = value.trim()
    if (trimmed === '') return null

    const match = /^(\d{1,3})(?::([0-5]?\d))?$/.exec(trimmed)
    if (!match) return Number.NaN

    return match[2] === undefined ? Number(match[1]) : Number(match[1]) * 60 + Number(match[2])
}

/** 960 → "16 h", 90 → "1 h 30 min", 45 → "45 min" */
export function formatMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60

    if (hours === 0) return `${rest} min`

    return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

/** Short summary for cards: "15 g · 1:16.7 · 3:00" */
export function recipeSummary(recipe: Recipe): string {
    const parts = [`${Number(recipe.dose_g)} g`, formatRatio(ratio(recipe))]

    if (recipe.method === 'cold_brew' && recipe.steep_time_min) {
        parts.push(formatMinutes(recipe.steep_time_min))
    } else if (recipe.method === 'espresso' && recipe.target_time_s) {
        const max = recipe.target_time_max_s
        parts.push(
            max && max !== recipe.target_time_s
                ? `${recipe.target_time_s}–${max} s`
                : `${recipe.target_time_s} s`,
        )
    } else if (recipe.target_time_s) {
        parts.push(formatSeconds(recipe.target_time_s))
    }

    return parts.join(' · ')
}

const round = (value: number, step: number) => Math.round(value / step) * step
const roundTenth = (value: number) => Math.round(value * 10) / 10

export interface ScalableRecipe extends RecipeAmounts {
    steps: RecipeStep[]
}

/**
 * Scales water, yield and step targets to a new dose; times stay the same.
 * Dose and espresso yield keep one decimal, water and step targets whole grams.
 */
export function scaleRecipe<T extends ScalableRecipe>(recipe: T, newDose: number): T {
    const factor = newDose / Number(recipe.dose_g)

    return {
        ...recipe,
        dose_g: roundTenth(newDose),
        water_g: recipe.water_g === null ? null : round(Number(recipe.water_g) * factor, 1),
        yield_g: recipe.yield_g === null ? null : roundTenth(Number(recipe.yield_g) * factor),
        steps: recipe.steps.map((step) => ({
            ...step,
            target_water_g:
                step.target_water_g === null ? null : round(step.target_water_g * factor, 1),
        })),
    }
}

/** Problems with the steps, by step index. */
export function validateSteps(
    steps: RecipeStep[],
    totalWater: number | null,
): Record<number, string> {
    const errors: Record<number, string> = {}
    let lastTime = -1
    let lastWater = 0

    steps.forEach((step, index) => {
        if (step.at_s !== null) {
            if (step.at_s < lastTime) errors[index] = 'Starts before the previous step.'
            lastTime = step.at_s
        }

        if (step.target_water_g !== null) {
            if (step.target_water_g < lastWater) errors[index] = 'Water target goes down.'
            else if (totalWater !== null && step.target_water_g > totalWater) {
                errors[index] = `More than the total ${totalWater} g of water.`
            }
            lastWater = step.target_water_g
        }
    })

    return errors
}

/** Favourites first, then most recently brewed, then by name. */
export function sortRecipes(recipes: Recipe[]): Recipe[] {
    return [...recipes].sort((a, b) => {
        if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1

        const brewed = (b.last_brewed_at ?? '').localeCompare(a.last_brewed_at ?? '')
        if (brewed !== 0) return brewed

        return a.name.localeCompare(b.name)
    })
}

/** Gives steps without a key (e.g. seeded on the server) a stable one for lists. */
export function withStepIds(steps: RecipeStep[]): RecipeStep[] {
    return steps.map((step) => ({ ...step, id: step.id ?? crypto.randomUUID() }))
}
