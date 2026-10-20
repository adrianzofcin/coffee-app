import type { BrewMethod, RecipeStep, StepType } from '@/types/models'

/** Methods brewed by pouring water over a bed of coffee, step after step. */
export function isPourOver(method: BrewMethod): boolean {
    return method === 'v60'
}

const POURING: StepType[] = ['bloom', 'pour']

/** A step during which water goes on the scale. */
export function isPouring(step: RecipeStep): boolean {
    return POURING.includes(step.type) && step.target_water_g !== null
}

/** Default pour length when old recipes are converted. */
const LEGACY_POUR_S: Partial<Record<StepType, number>> = { bloom: 10, pour: 15 }
const LEGACY_SHORT_S = 5

/**
 * Recipes from before step durations only had start times. Each pour gets a
 * default length and the rest of the gap becomes a wait, so the timing stays.
 */
export function withDurations(steps: RecipeStep[]): RecipeStep[] {
    if (steps.some((step) => step.duration_s !== undefined)) return steps

    return steps.flatMap((step, index) => {
        const next = steps[index + 1]
        const gap = step.at_s !== null && next?.at_s != null ? next.at_s - step.at_s : null

        if (step.at_s === null) return [{ ...step, duration_s: null }]

        const pour = LEGACY_POUR_S[step.type]
        if (pour === undefined) return [{ ...step, duration_s: gap ?? LEGACY_SHORT_S }]

        const duration = gap === null ? pour : Math.min(pour, gap)
        const converted: RecipeStep[] = [{ ...step, duration_s: duration }]

        if (gap !== null && gap > duration) {
            converted.push({
                type: 'wait',
                at_s: null,
                duration_s: gap - duration,
                target_water_g: null,
                text: step.type === 'bloom' ? 'Let it bloom' : null,
            })
        }

        return converted
    })
}

/** Steps follow one another: each starts when the previous ends, after a manual step on Next. */
export function withStartTimes(steps: RecipeStep[]): RecipeStep[] {
    let clock: number | null = 0

    return steps.map((step) => {
        const at_s = clock
        clock = clock !== null && step.duration_s != null ? clock + step.duration_s : null

        return { ...step, at_s }
    })
}

/** Any recipe's steps in the pour-over shape: with durations and derived start times. */
export function pourOverSteps(steps: RecipeStep[]): RecipeStep[] {
    return withStartTimes(withDurations(steps))
}

/** Water on the scale before a step starts: the highest target so far. */
export function waterBefore(steps: RecipeStep[], index: number): number {
    return Math.max(0, ...steps.slice(0, index).map((step) => step.target_water_g ?? 0))
}

/** Grams per second a pour needs, null for anything that is not a timed pour. */
export function pourRate(steps: RecipeStep[], index: number): number | null {
    const step = steps[index]
    if (!step || !isPouring(step) || !step.duration_s) return null

    return Math.max(0, step.target_water_g! - waterBefore(steps, index)) / step.duration_s
}

/** End of the last step, when every step has a duration. */
export function stepsEndS(steps: RecipeStep[]): number | null {
    if (steps.length === 0 || steps.some((step) => step.duration_s == null)) return null

    return steps.reduce((sum, step) => sum + step.duration_s!, 0)
}
