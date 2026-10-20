import { describe, expect, it } from 'vitest'
import type { RecipeStep } from '@/types/models'
import {
    pourOverSteps,
    pourRate,
    stepsEndS,
    waterBefore,
    withDurations,
    withStartTimes,
} from './steps'

const step = (overrides: Partial<RecipeStep>): RecipeStep => ({
    type: 'pour',
    at_s: null,
    target_water_g: null,
    text: null,
    ...overrides,
})

const legacy: RecipeStep[] = [
    step({ type: 'bloom', at_s: 0, target_water_g: 50 }),
    step({ type: 'pour', at_s: 45, target_water_g: 150 }),
    step({ type: 'pour', at_s: 75, target_water_g: 250 }),
    step({ type: 'swirl', at_s: 105 }),
]

describe('withDurations', () => {
    it('splits old pours into a pour and a wait that keep the timing', () => {
        const steps = withDurations(legacy)

        expect(steps.map((s) => [s.type, s.duration_s])).toEqual([
            ['bloom', 10],
            ['wait', 35],
            ['pour', 15],
            ['wait', 15],
            ['pour', 15],
            ['wait', 15],
            ['swirl', 5],
        ])
        expect(steps[1]!.text).toBe('Let it bloom')
        expect(stepsEndS(steps)).toBe(110)
    })

    it('keeps short gaps as the pour itself', () => {
        const steps = withDurations([
            step({ type: 'pour', at_s: 0, target_water_g: 100 }),
            step({ type: 'pour', at_s: 8, target_water_g: 200 }),
        ])

        expect(steps.map((s) => s.duration_s)).toEqual([8, 15])
    })

    it('leaves manual steps manual and new recipes untouched', () => {
        expect(withDurations([step({ at_s: null })])[0]!.duration_s).toBeNull()

        const modern = [step({ at_s: 0, duration_s: 20 })]
        expect(withDurations(modern)).toBe(modern)
    })
})

describe('withStartTimes', () => {
    it('starts each step when the previous one ends, manual steps break the chain', () => {
        const steps = withStartTimes([
            step({ duration_s: 10 }),
            step({ duration_s: 30 }),
            step({ duration_s: null }),
            step({ duration_s: 15 }),
        ])

        expect(steps.map((s) => s.at_s)).toEqual([0, 10, 40, null])
    })
})

describe('pour speed', () => {
    const steps = pourOverSteps(legacy)

    it('counts from the water already on the scale', () => {
        expect(waterBefore(steps, 0)).toBe(0)
        expect(waterBefore(steps, 2)).toBe(50)
        expect(pourRate(steps, 0)).toBe(5)
        expect(pourRate(steps, 2)).toBeCloseTo(6.67, 1)
    })

    it('has no speed for waits', () => {
        expect(pourRate(steps, 1)).toBeNull()
    })
})
