import { describe, expect, it } from 'vitest'
import type { RecipeStep } from '@/types/models'
import {
    currentStepIndex,
    elapsedMs,
    formatTimer,
    pauseTimer,
    resumeTimer,
    shotZone,
    startTimer,
    stepState,
    stopTimer,
    totalSeconds,
} from './timer'

const idle = { started_at: null, paused_at: null, paused_total_ms: 0, stopped_at: null }

function step(at: number | null, water: number | null = null): RecipeStep {
    return { type: at === null ? 'custom' : 'pour', at_s: at, target_water_g: water, text: null }
}

describe('stopwatch', () => {
    it('counts from the start time and survives pauses', () => {
        let run = { ...idle, ...startTimer(1_000) }
        expect(elapsedMs(run, 11_000)).toBe(10_000)

        run = { ...run, ...pauseTimer(run, 11_000) }
        expect(elapsedMs(run, 50_000)).toBe(10_000)

        run = { ...run, ...resumeTimer(run, 41_000) }
        expect(run.paused_total_ms).toBe(30_000)
        expect(elapsedMs(run, 46_000)).toBe(15_000)
    })

    it('freezes on stop, also when stopped while paused', () => {
        let run = { ...idle, ...startTimer(0) }
        run = { ...run, ...pauseTimer(run, 20_000) }
        run = { ...run, ...stopTimer(run, 90_000) }

        expect(run.paused_at).toBeNull()
        expect(elapsedMs(run, 500_000)).toBe(20_000)
    })

    it('shows zero before start', () => {
        expect(elapsedMs(idle, 99_000)).toBe(0)
    })

    it('formats whole seconds', () => {
        expect(formatTimer(65_900)).toBe('1:05')
        expect(formatTimer(0)).toBe('0:00')
    })
})

describe('steps', () => {
    const v60 = [step(0, 50), step(45, 150), step(75, 250), step(105)]

    it('advances timed steps by elapsed time', () => {
        expect(currentStepIndex(v60, 0, 0)).toBe(0)
        expect(currentStepIndex(v60, 0, 44.9)).toBe(0)
        expect(currentStepIndex(v60, 0, 45)).toBe(1)
        expect(currentStepIndex(v60, 0, 300)).toBe(3)
    })

    it('waits on manual steps until Next, then keeps following the clock', () => {
        const mixed = [step(0), step(null), step(60)]
        expect(currentStepIndex(mixed, 0, 30)).toBe(0)
        expect(currentStepIndex(mixed, 1, 30)).toBe(1)
        expect(currentStepIndex(mixed, 1, 60)).toBe(2)
    })

    it('reports the next step and the countdown to it', () => {
        const state = stepState(v60, 0, 33)
        expect(state.next?.target_water_g).toBe(150)
        expect(state.secondsToNext).toBe(12)
        expect(state.isLast).toBe(false)

        expect(stepState(v60, 0, 200).isLast).toBe(true)
        expect(stepState([step(null), step(null)], 0, 10).secondsToNext).toBeNull()
        expect(stepState([], 0, 10).step).toBeNull()
    })

    it('measures the whole brew by target time or the last step', () => {
        expect(totalSeconds(v60, 180)).toBe(180)
        expect(totalSeconds(v60, null)).toBe(105)
        expect(totalSeconds([], null)).toBeNull()
    })
})

describe('shotZone', () => {
    it('marks pre-infusion, under, in and over the target band', () => {
        expect(shotZone(3, 25, 30, 5)).toBe('preinfusion')
        expect(shotZone(20, 25, 30, 5)).toBe('under')
        expect(shotZone(27, 25, 30, null)).toBe('in')
        expect(shotZone(31, 25, 30, null)).toBe('over')
        expect(shotZone(25, 25, null, null)).toBe('in')
    })
})
