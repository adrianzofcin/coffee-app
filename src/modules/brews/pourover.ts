import type { RecipeSnapshot, RecipeStep } from '@/types/models'
import {
    isPourOver,
    isPouring,
    pourOverSteps,
    stepsEndS,
    waterBefore,
} from '@/modules/recipes/steps'

export type PourPhase = 'step' | 'drawdown'

export interface PourState {
    phase: PourPhase
    /** Step on screen; in the drawdown the last step. */
    index: number
    step: RecipeStep | null
    next: RecipeStep | null
    startS: number
    /** null = lasts until Next */
    endS: number | null
    secondsLeft: number | null
    isLast: boolean
    /** Set while pouring: from → to grams at rate g/s. */
    pour: { fromG: number; toG: number; rate: number } | null
    /** What the scale should show right now. */
    expectedG: number
}

/**
 * Where the brew is: steps run one after another from the step the user last
 * moved to (anchor) and the moment they did. Skipping a wait therefore moves
 * every later step earlier instead of squeezing the next pour.
 */
export function pourState(
    steps: RecipeStep[],
    anchorIndex: number,
    anchorS: number,
    elapsedS: number,
): PourState {
    let index = Math.min(Math.max(anchorIndex, 0), Math.max(steps.length - 1, 0))
    let startS = anchorS

    for (;;) {
        const duration = steps[index]?.duration_s
        if (duration == null || elapsedS < startS + duration || index >= steps.length - 1) break
        startS += duration
        index++
    }

    const step = steps[index] ?? null
    const endS = step?.duration_s != null ? startS + step.duration_s : null
    const phase: PourPhase = endS !== null && elapsedS >= endS ? 'drawdown' : 'step'

    let pour: PourState['pour'] = null
    let expectedG = waterBefore(steps, index)

    if (step && isPouring(step)) {
        const toG = Math.max(step.target_water_g!, expectedG)
        const fromG = expectedG

        if (step.duration_s) {
            const share = Math.min(1, Math.max(0, (elapsedS - startS) / step.duration_s))
            pour = { fromG, toG, rate: (toG - fromG) / step.duration_s }
            expectedG = fromG + (toG - fromG) * share
        } else {
            expectedG = toG
        }

        if (phase === 'drawdown') pour = null
    }

    return {
        phase,
        index,
        step,
        next: steps[index + 1] ?? null,
        startS,
        endS,
        secondsLeft: endS === null ? null : Math.max(0, endS - elapsedS),
        isLast: index === steps.length - 1,
        pour,
        expectedG,
    }
}

/** When the brew should be done: the recipe's total time, else the end of the steps. */
export function targetEndS(steps: RecipeStep[], targetTimeS: number | null): number | null {
    return targetTimeS ?? stepsEndS(steps)
}

const clock = (seconds: number) => {
    const abs = Math.round(Math.abs(seconds))

    return `${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`
}

/** 18 → "+0:18", -20 → "−0:20" */
export function formatDelta(seconds: number): string {
    return `${seconds < 0 ? '−' : '+'}${clock(seconds)}`
}

/** Brew time against the recipe; small differences count as on time. */
export function timeVerdict(
    brewTimeS: number | null,
    targetS: number | null,
): { delta: number; label: string; tone: 'on' | 'slow' | 'fast' } | null {
    if (brewTimeS === null || !targetS) return null

    const delta = brewTimeS - targetS
    if (Math.abs(delta) <= 5) return { delta, label: 'On recipe time', tone: 'on' }

    return delta > 0
        ? { delta, label: `${clock(delta)} slower than the recipe`, tone: 'slow' }
        : { delta, label: `${clock(delta)} faster than the recipe`, tone: 'fast' }
}

export interface Drain {
    /** Water standing in the dripper, g. */
    inDripperG: number
    /** Coffee that has dripped into the server, g. */
    servedG: number
}

/** Drip speed for the picture: all water through by about the target time. */
export function drainRate(totalWaterG: number, targetS: number | null): number {
    return totalWaterG / Math.max(45, (targetS ?? 180) * 0.85)
}

/**
 * One tick of the dripper picture: new water comes in, some drips through.
 * Only drives the animation, the numbers on screen come from the recipe.
 */
export function drainTick(drain: Drain, addedG: number, dtS: number, rate: number): Drain {
    const inDripper = drain.inDripperG + Math.max(0, addedG)
    const dripped = Math.min(inDripper, rate * Math.max(0, dtS))

    return { inDripperG: inDripper - dripped, servedG: drain.servedG + dripped }
}

/** Rough state after a jump (reload, app in the background): no history to replay. */
export function estimateDrain(pouredG: number, elapsedS: number, rate: number): Drain {
    const servedG = Math.min(pouredG, rate * elapsedS * 0.9)

    return { inDripperG: pouredG - servedG, servedG }
}

/** Total time a pour-over brew aims for; null for other methods. */
export function brewTargetS(
    snapshot: Pick<RecipeSnapshot, 'method' | 'steps' | 'target_time_s'> | null,
): number | null {
    if (!snapshot || !isPourOver(snapshot.method)) return null

    return targetEndS(pourOverSteps(snapshot.steps), snapshot.target_time_s)
}
