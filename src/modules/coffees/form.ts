import type { Bag, Coffee, IntendedFor, RoastLevel } from '@/types/models'
import type { BagInput, CoffeeInput } from './actions'
import { localDate } from './balance'

export interface CoffeeFormState {
    name: string
    roaster: string
    country: string
    region: string
    producer: string
    variety: string
    altitude: string
    process: string | null
    roast_level: RoastLevel | null
    intended_for: IntendedFor | null
    is_decaf: boolean
    tasting_notes: string[]
    rating: number | null
    notes: string
}

export interface BagFormState {
    roast_date: string
    weight: string
    price: string
    purchase_date: string
    is_frozen: boolean
}

export type FormErrors<T> = Partial<Record<keyof T, string>>

export function emptyCoffeeForm(): CoffeeFormState {
    return {
        name: '',
        roaster: '',
        country: '',
        region: '',
        producer: '',
        variety: '',
        altitude: '',
        process: null,
        roast_level: null,
        intended_for: null,
        is_decaf: false,
        tasting_notes: [],
        rating: null,
        notes: '',
    }
}

export function emptyBagForm(): BagFormState {
    return {
        roast_date: localDate(),
        weight: '250',
        price: '',
        purchase_date: '',
        is_frozen: false,
    }
}

export function coffeeToForm(coffee: Coffee): CoffeeFormState {
    return {
        name: coffee.name,
        roaster: coffee.roaster,
        country: coffee.country ?? '',
        region: coffee.region ?? '',
        producer: coffee.producer ?? '',
        variety: coffee.variety ?? '',
        altitude: coffee.altitude ?? '',
        process: coffee.process,
        roast_level: coffee.roast_level,
        intended_for: coffee.intended_for,
        is_decaf: coffee.is_decaf,
        tasting_notes: [...coffee.tasting_notes],
        rating: coffee.rating,
        notes: coffee.notes ?? '',
    }
}

export function bagToForm(bag: Bag): BagFormState {
    return {
        roast_date: bag.roast_date,
        weight: String(bag.weight_g),
        price: bag.price === null ? '' : String(bag.price),
        purchase_date: bag.purchase_date ?? '',
        is_frozen: bag.is_frozen,
    }
}

const blank = (value: string): string | null => value.trim() || null

/** Accepts both "12,50" and "12.50" (Slovak keyboards type a comma). */
export function parseNumber(value: string): number | null {
    const normalized = value.trim().replace(',', '.')
    if (normalized === '') return null

    const number = Number(normalized)

    return Number.isFinite(number) ? number : Number.NaN
}

export function validateCoffee(form: CoffeeFormState): FormErrors<CoffeeFormState> {
    const errors: FormErrors<CoffeeFormState> = {}

    if (!form.name.trim()) errors.name = 'Name is required.'
    else if (form.name.trim().length > 100) errors.name = 'Keep it under 100 characters.'

    if (!form.roaster.trim()) errors.roaster = 'Roaster is required.'
    else if (form.roaster.trim().length > 100) errors.roaster = 'Keep it under 100 characters.'

    return errors
}

export function validateBag(form: BagFormState, today = localDate()): FormErrors<BagFormState> {
    const errors: FormErrors<BagFormState> = {}
    const weight = parseNumber(form.weight)
    const price = parseNumber(form.price)

    if (!form.roast_date) errors.roast_date = 'Roast date is required.'
    else if (form.roast_date > today) errors.roast_date = 'Roast date cannot be in the future.'

    if (weight === null || !Number.isInteger(weight) || weight < 1 || weight > 5000) {
        errors.weight = 'Enter whole grams between 1 and 5000.'
    }

    if (Number.isNaN(price) || (price !== null && price < 0)) errors.price = 'Enter a valid price.'

    return errors
}

export function formToCoffee(form: CoffeeFormState): Omit<CoffeeInput, 'photo_path'> {
    return {
        name: form.name.trim(),
        roaster: form.roaster.trim(),
        country: blank(form.country),
        region: blank(form.region),
        producer: blank(form.producer),
        variety: blank(form.variety),
        altitude: blank(form.altitude),
        process: form.process,
        roast_level: form.roast_level,
        intended_for: form.intended_for,
        is_decaf: form.is_decaf,
        tasting_notes: form.tasting_notes,
        rating: form.rating,
        notes: blank(form.notes),
    }
}

export function formToBag(form: BagFormState): BagInput {
    return {
        roast_date: form.roast_date,
        weight_g: parseNumber(form.weight)!,
        price: parseNumber(form.price),
        purchase_date: form.purchase_date || null,
        is_frozen: form.is_frozen,
    }
}
