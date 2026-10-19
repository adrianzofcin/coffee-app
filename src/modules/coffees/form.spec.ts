import { describe, expect, it } from 'vitest'
import {
    emptyBagForm,
    emptyCoffeeForm,
    formToBag,
    formToCoffee,
    parseNumber,
    validateBag,
    validateCoffee,
} from './form'

describe('parseNumber', () => {
    it('accepts a decimal comma', () => {
        expect(parseNumber('12,50')).toBe(12.5)
    })

    it('returns null for empty and NaN for garbage', () => {
        expect(parseNumber('  ')).toBeNull()
        expect(parseNumber('abc')).toBeNaN()
    })
})

describe('validateCoffee', () => {
    it('requires name and roaster', () => {
        expect(validateCoffee(emptyCoffeeForm())).toEqual({
            name: 'Name is required.',
            roaster: 'Roaster is required.',
        })
    })

    it('passes with the minimum', () => {
        expect(
            validateCoffee({ ...emptyCoffeeForm(), name: 'Guji', roaster: 'Doubleshot' }),
        ).toEqual({})
    })
})

describe('validateBag', () => {
    const today = '2026-10-19'

    it('rejects a future roast date', () => {
        expect(
            validateBag({ ...emptyBagForm(), roast_date: '2026-10-20' }, today).roast_date,
        ).toBeDefined()
    })

    it.each(['0', '5001', '12.5', 'x', ''])('rejects weight "%s"', (weight) => {
        expect(
            validateBag({ ...emptyBagForm(), roast_date: today, weight }, today).weight,
        ).toBeDefined()
    })

    it('rejects a negative price but allows none', () => {
        const form = { ...emptyBagForm(), roast_date: today }
        expect(validateBag({ ...form, price: '-1' }, today).price).toBeDefined()
        expect(validateBag({ ...form, price: '' }, today)).toEqual({})
    })
})

describe('conversion', () => {
    it('trims text and turns empty fields into null', () => {
        const coffee = formToCoffee({
            ...emptyCoffeeForm(),
            name: ' Guji ',
            roaster: 'Doubleshot',
            region: ' ',
        })
        expect(coffee).toMatchObject({ name: 'Guji', region: null, notes: null })
    })

    it('parses bag numbers', () => {
        expect(
            formToBag({ ...emptyBagForm(), weight: '250', price: '14,90', purchase_date: '' }),
        ).toMatchObject({
            weight_g: 250,
            price: 14.9,
            purchase_date: null,
        })
    })
})
