import { describe, expect, it } from 'vitest'
import { TEMPLATES } from '@/modules/recipes/options'
import {
    brewTargetS,
    drainTick,
    estimateDrain,
    formatDelta,
    pourState,
    timeVerdict,
} from './pourover'

// Bloom 50 g/10 s, wait 30, pour to 150/15 s, wait 15, pour to 250/15 s, swirl 5; total 3:00.
const steps = TEMPLATES.v60.steps

describe('pourState', () => {
    it('shows the expected weight and speed while pouring', () => {
        const state = pourState(steps, 0, 0, 5)

        expect(state.step?.type).toBe('bloom')
        expect(state.pour).toEqual({ fromG: 0, toG: 50, rate: 5 })
        expect(state.expectedG).toBe(25)
        expect(state.secondsLeft).toBe(5)
    })

    it('moves on by durations and counts from the water already poured', () => {
        const state = pourState(steps, 0, 0, 47.5)

        expect(state.index).toBe(2)
        expect(state.pour?.fromG).toBe(50)
        expect(state.expectedG).toBe(100)
    })

    it('holds the weight during waits', () => {
        const state = pourState(steps, 0, 0, 20)

        expect(state.step?.type).toBe('wait')
        expect(state.pour).toBeNull()
        expect(state.expectedG).toBe(50)
        expect(state.secondsLeft).toBe(20)
    })

    it('goes to the drawdown after the last step', () => {
        const state = pourState(steps, 0, 0, 100)

        expect(state.phase).toBe('drawdown')
        expect(state.isLast).toBe(true)
        expect(state.expectedG).toBe(250)
    })

    it('shifts later steps when a wait is skipped', () => {
        // Skipped the bloom wait at 20 s: the pour starts then, not at 40 s.
        const state = pourState(steps, 2, 20, 27.5)

        expect(state.index).toBe(2)
        expect(state.startS).toBe(20)
        expect(state.expectedG).toBe(100)
    })

    it('waits on a manual step until Next', () => {
        const manual = [{ ...steps[0]! }, { ...steps[1]!, duration_s: null }, { ...steps[2]! }]
        const state = pourState(manual, 0, 0, 500)

        expect(state.index).toBe(1)
        expect(state.phase).toBe('step')
        expect(state.secondsLeft).toBeNull()
    })
})

describe('time against the recipe', () => {
    it('uses the recipe total time, else the end of the steps', () => {
        expect(brewTargetS({ method: 'v60', steps, target_time_s: 180 })).toBe(180)
        expect(brewTargetS({ method: 'v60', steps, target_time_s: null })).toBe(90)
        expect(brewTargetS({ method: 'espresso', steps: [], target_time_s: 25 })).toBeNull()
    })

    it('tells slower, faster and on time apart', () => {
        expect(timeVerdict(198, 180)).toMatchObject({ tone: 'slow', delta: 18 })
        expect(timeVerdict(160, 180)?.label).toBe('0:20 faster than the recipe')
        expect(timeVerdict(183, 180)?.tone).toBe('on')
        expect(timeVerdict(null, 180)).toBeNull()
        expect(formatDelta(18)).toBe('+0:18')
        expect(formatDelta(-80)).toBe('−1:20')
    })
})

describe('dripper picture', () => {
    it('drips what came in at the drain speed', () => {
        const drain = drainTick({ inDripperG: 0, servedG: 0 }, 10, 2, 2)

        expect(drain).toEqual({ inDripperG: 6, servedG: 4 })
        expect(drainTick(drain, 0, 10, 2)).toEqual({ inDripperG: 0, servedG: 10 })
    })

    it('estimates after a jump without serving more than was poured', () => {
        expect(estimateDrain(50, 200, 2).servedG).toBe(50)
        expect(estimateDrain(250, 50, 2)).toEqual({ inDripperG: 160, servedG: 90 })
    })
})
