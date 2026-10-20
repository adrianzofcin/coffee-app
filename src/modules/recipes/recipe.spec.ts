import { describe, expect, it } from 'vitest'
import type { Recipe, RecipeStep } from '@/types/models'
import {
    formatMinutes,
    formatRatio,
    formatSeconds,
    parseSeconds,
    ratio,
    recipeSummary,
    scaleRecipe,
    sortRecipes,
    validateSteps,
} from './recipe'
import { TEMPLATES } from './options'

function recipe(patch: Partial<Recipe> = {}): Recipe {
    return {
        id: 'r',
        user_id: 'u',
        created_at: '',
        updated_at: '',
        deleted_at: null,
        name: 'V60',
        method: 'v60',
        dose_g: 15,
        water_g: 250,
        yield_g: null,
        temperature_c: 93,
        grind_setting: null,
        target_time_s: 180,
        target_time_max_s: null,
        preinfusion_s: null,
        steep_time_min: null,
        steep_place: null,
        dilution: null,
        steps: TEMPLATES.v60.steps,
        coffee_id: null,
        is_favorite: false,
        notes: null,
        last_brewed_at: null,
        ...patch,
    }
}

describe('ratio', () => {
    it('uses water for filter and yield for espresso', () => {
        expect(formatRatio(ratio(recipe()))).toBe('1:16.7')
        expect(formatRatio(ratio(recipe({ method: 'espresso', dose_g: 18, yield_g: 36 })))).toBe(
            '1:2',
        )
    })

    it('handles missing values', () => {
        expect(formatRatio(ratio(recipe({ water_g: null })))).toBe('–')
    })
})

describe('time formatting', () => {
    it('formats and parses m:ss', () => {
        expect(formatSeconds(105)).toBe('1:45')
        expect(formatSeconds(0)).toBe('0:00')
        expect(parseSeconds('1:45')).toBe(105)
        expect(parseSeconds('45')).toBe(45)
        expect(parseSeconds('')).toBeNull()
        expect(parseSeconds('1:75')).toBeNaN()
        expect(parseSeconds('abc')).toBeNaN()
    })

    it('formats steep time', () => {
        expect(formatMinutes(960)).toBe('16 h')
        expect(formatMinutes(90)).toBe('1 h 30 min')
        expect(formatMinutes(45)).toBe('45 min')
    })
})

describe('recipeSummary', () => {
    it('summarises each method', () => {
        expect(recipeSummary(recipe())).toBe('15 g · 1:16.7 · 3:00')
        expect(
            recipeSummary(
                recipe({
                    method: 'espresso',
                    dose_g: 18,
                    yield_g: 36,
                    target_time_s: 25,
                    target_time_max_s: 30,
                }),
            ),
        ).toBe('18 g · 1:2 · 25–30 s')
        expect(
            recipeSummary(
                recipe({
                    method: 'cold_brew',
                    dose_g: 100,
                    water_g: 800,
                    steep_time_min: 960,
                    target_time_s: null,
                }),
            ),
        ).toBe('100 g · 1:8 · 16 h')
    })
})

describe('scaleRecipe', () => {
    it('scales water and step targets, keeps times', () => {
        const scaled = scaleRecipe(recipe(), 20)

        expect(scaled.dose_g).toBe(20)
        expect(scaled.water_g).toBe(333)
        expect(scaled.steps.map((s) => s.target_water_g)).toEqual([67, null, 200, null, 333, null])
        expect(scaled.steps.map((s) => s.at_s)).toEqual([0, 10, 40, 55, 70, 85])
    })

    it('keeps one decimal for espresso yield', () => {
        const scaled = scaleRecipe(
            recipe({ method: 'espresso', dose_g: 18, water_g: null, yield_g: 36, steps: [] }),
            18.5,
        )

        expect(scaled.yield_g).toBe(37)
        expect(
            scaleRecipe(
                recipe({ method: 'espresso', dose_g: 18, water_g: null, yield_g: 40, steps: [] }),
                17,
            ).yield_g,
        ).toBe(37.8)
    })
})

describe('validateSteps', () => {
    const step = (at: number | null, water: number | null): RecipeStep => ({
        type: 'pour',
        at_s: at,
        target_water_g: water,
        text: null,
    })

    it('accepts increasing steps and ignores manual ones for time', () => {
        expect(validateSteps([step(0, 50), step(null, null), step(45, 150)], 250)).toEqual({})
    })

    it('flags time and water going backwards and overflows', () => {
        expect(validateSteps([step(30, 50), step(10, 100)], 250)).toHaveProperty('1')
        expect(validateSteps([step(0, 150), step(30, 100)], 250)).toHaveProperty('1')
        expect(validateSteps([step(0, 300)], 250)).toHaveProperty('0')
    })
})

describe('sortRecipes', () => {
    it('puts favourites first, then recently brewed, then by name', () => {
        const sorted = sortRecipes([
            recipe({ id: 'a', name: 'B' }),
            recipe({ id: 'b', name: 'A' }),
            recipe({ id: 'c', last_brewed_at: '2026-10-01' }),
            recipe({ id: 'd', is_favorite: true }),
        ])

        expect(sorted.map((r) => r.id)).toEqual(['d', 'c', 'b', 'a'])
    })
})
