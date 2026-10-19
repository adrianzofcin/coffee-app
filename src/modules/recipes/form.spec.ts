import { describe, expect, it } from 'vitest'
import { emptyRecipeForm, formToRecipe, hasErrors, switchMethod, validateRecipe } from './form'

describe('recipe form', () => {
    it('starts from the method template', () => {
        const form = emptyRecipeForm('v60')

        expect(form).toMatchObject({ dose: '15', water: '250', target_time: '3:00' })
        expect(form.steps).toHaveLength(4)
        expect(form.steps.every((step) => step.id)).toBe(true)
    })

    it('keeps name and notes when switching method', () => {
        const form = { ...emptyRecipeForm('v60'), name: 'Mine', notes: 'Note' }
        const switched = switchMethod(form, 'espresso')

        expect(switched).toMatchObject({
            name: 'Mine',
            notes: 'Note',
            method: 'espresso',
            yield: '36',
        })
        expect(switched.steps).toEqual([])
    })

    it('requires a name and the output of the method', () => {
        const espresso = { ...emptyRecipeForm('espresso'), yield: '' }

        expect(validateRecipe(espresso)).toMatchObject({
            name: 'Name is required.',
            yield: expect.any(String),
        })
        expect(validateRecipe({ ...emptyRecipeForm('v60'), name: 'x', water: '' })).toHaveProperty(
            'water',
        )
    })

    it('validates times and cold brew steep time', () => {
        const v60 = { ...emptyRecipeForm('v60'), name: 'x', target_time: '3:99' }
        expect(validateRecipe(v60)).toHaveProperty('target_time')

        const espresso = {
            ...emptyRecipeForm('espresso'),
            name: 'x',
            target_time: '30',
            target_time_max: '25',
        }
        expect(validateRecipe(espresso)).toHaveProperty('target_time_max')

        const cold = { ...emptyRecipeForm('cold_brew'), name: 'x', steep_hours: '' }
        expect(validateRecipe(cold)).toHaveProperty('steep_hours')
    })

    it('reports step problems against the total water', () => {
        const form = { ...emptyRecipeForm('v60'), name: 'x', water: '200' }

        expect(validateRecipe(form).stepErrors).toHaveProperty('2')
    })

    it('accepts every template once named', () => {
        for (const method of ['espresso', 'v60', 'cold_brew'] as const) {
            expect(hasErrors(validateRecipe({ ...emptyRecipeForm(method), name: 'x' }))).toBe(false)
        }
    })

    it('stores only the fields of the method', () => {
        const espresso = formToRecipe({
            ...emptyRecipeForm('espresso'),
            name: ' Shot ',
            preinfusion: '5',
        })
        expect(espresso).toMatchObject({
            name: 'Shot',
            water_g: null,
            yield_g: 36,
            target_time_s: 25,
            preinfusion_s: 5,
        })

        const cold = formToRecipe({
            ...emptyRecipeForm('cold_brew'),
            name: 'Cold',
            steep_hours: '16,5',
        })
        expect(cold).toMatchObject({
            steep_time_min: 990,
            target_time_s: null,
            yield_g: null,
            dilution: 1,
        })
    })
})
