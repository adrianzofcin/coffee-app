import type { ActiveRun } from '@/lib/db'
import type { RecipeStep } from '@/types/models'

type RunTiming = Pick<ActiveRun, 'started_at' | 'paused_at' | 'paused_total_ms' | 'stopped_at'>
type TimingChange = Partial<RunTiming & Pick<ActiveRun, 'step_index'>>

/**
 * Elapsed time is derived from the start time, not counted tick by tick,
 * so closing the app or locking the phone never breaks the stopwatch.
 */
export function elapsedMs(run: RunTiming, now: number): number {
    if (run.started_at === null) return 0

    const end = run.stopped_at ?? run.paused_at ?? now

    return Math.max(0, end - run.started_at - run.paused_total_ms)
}

export function isRunning(run: RunTiming): boolean {
    return run.started_at !== null && run.paused_at === null && run.stopped_at === null
}

export function startTimer(now: number): TimingChange {
    return { started_at: now, paused_at: null, paused_total_ms: 0, stopped_at: null, step_index: 0 }
}

export function pauseTimer(run: RunTiming, now: number): TimingChange {
    return isRunning(run) ? { paused_at: now } : {}
}

export function resumeTimer(run: RunTiming, now: number): TimingChange {
    if (run.paused_at === null) return {}

    return { paused_at: null, paused_total_ms: run.paused_total_ms + (now - run.paused_at) }
}

/** Freezes the time; a pause in progress ends where it began. */
export function stopTimer(run: RunTiming, now: number): TimingChange {
    if (run.started_at === null || run.stopped_at !== null) return {}

    return { stopped_at: run.paused_at ?? now, paused_at: null }
}

export function resetTimer(): TimingChange {
    return {
        started_at: null,
        paused_at: null,
        paused_total_ms: 0,
        stopped_at: null,
        step_index: 0,
    }
}

/**
 * The step on screen: where the user moved with Next / Skip, then every
 * following timed step whose time has come.
 */
export function currentStepIndex(steps: RecipeStep[], stepIndex: number, elapsedS: number): number {
    if (steps.length === 0) return -1

    let index = Math.min(Math.max(stepIndex, 0), steps.length - 1)

    for (;;) {
        const next = steps[index + 1]
        if (!next || next.at_s === null || elapsedS < next.at_s) return index
        index++
    }
}

export interface StepState {
    index: number
    step: RecipeStep | null
    next: RecipeStep | null
    /** Seconds until a timed next step starts, null when it waits for Next. */
    secondsToNext: number | null
    isLast: boolean
}

export function stepState(steps: RecipeStep[], stepIndex: number, elapsedS: number): StepState {
    const index = currentStepIndex(steps, stepIndex, elapsedS)
    const step = steps[index] ?? null
    const next = steps[index + 1] ?? null

    return {
        index,
        step,
        next,
        secondsToNext: next?.at_s != null ? Math.max(0, next.at_s - elapsedS) : null,
        isLast: index === steps.length - 1,
    }
}

/** Length of the whole brew for the progress bar: target time or the last timed step. */
export function totalSeconds(steps: RecipeStep[], targetTimeS: number | null): number | null {
    const lastTimed = Math.max(0, ...steps.map((step) => step.at_s ?? 0))
    const total = Math.max(targetTimeS ?? 0, lastTimed)

    return total > 0 ? total : null
}

export type ShotZone = 'preinfusion' | 'under' | 'in' | 'over'

/** Espresso: where the shot time sits against the target band. */
export function shotZone(
    elapsedS: number,
    min: number | null,
    max: number | null,
    preinfusionS: number | null,
): ShotZone {
    if (preinfusionS && elapsedS < preinfusionS) return 'preinfusion'
    if (min === null) return 'under'
    if (elapsedS < min) return 'under'

    return elapsedS <= (max ?? min) ? 'in' : 'over'
}

/** "1:05", "12:30"; the stopwatch shows whole seconds. */
export function formatTimer(ms: number): string {
    const total = Math.floor(ms / 1000)
    const minutes = Math.floor(total / 60)

    return `${minutes}:${String(total % 60).padStart(2, '0')}`
}
