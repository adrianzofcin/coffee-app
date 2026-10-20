import type { Brew, BrewMethod } from '@/types/models'
import { parseNumber, type FormErrors } from '@/modules/coffees/form'
import { formatSeconds, parseSeconds } from '@/modules/recipes/recipe'

/** Shared by Brew finish, Quick log and editing a brew. */
export interface BrewFormState {
    bag_id: string | null
    method: BrewMethod
    dose: string
    water: string
    yield: string
    /** "2:45" */
    time: string
    /** datetime-local value: "2026-10-20T08:15" */
    started_at: string
    rating: number | null
    taste_tags: string[]
    notes: string
}

export type BrewFields = Pick<
    Brew,
    | 'bag_id'
    | 'method'
    | 'dose_g'
    | 'water_g'
    | 'yield_g'
    | 'brew_time_s'
    | 'rating'
    | 'taste_tags'
    | 'notes'
>

const pad = (value: number) => String(value).padStart(2, '0')

/** ISO → value of a datetime-local input in the device's time zone. */
export function toLocalInput(iso: string): string {
    const date = new Date(iso)

    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
        `T${pad(date.getHours())}:${pad(date.getMinutes())}`
    )
}

export function fromLocalInput(value: string): string {
    return new Date(value).toISOString()
}

const text = (value: number | null) => (value === null ? '' : String(Number(value)))

export function emptyBrewForm(method: BrewMethod = 'v60', now = new Date()): BrewFormState {
    return {
        bag_id: null,
        method,
        dose: '',
        water: '',
        yield: '',
        time: '',
        started_at: toLocalInput(now.toISOString()),
        rating: null,
        taste_tags: [],
        notes: '',
    }
}

export function brewToForm(brew: Brew): BrewFormState {
    return {
        bag_id: brew.bag_id,
        method: brew.method,
        dose: text(brew.dose_g),
        water: text(brew.water_g),
        yield: text(brew.yield_g),
        time: brew.brew_time_s === null ? '' : formatSeconds(brew.brew_time_s),
        started_at: toLocalInput(brew.started_at),
        rating: brew.rating,
        taste_tags: [...brew.taste_tags],
        notes: brew.notes ?? '',
    }
}

function checkRange(value: string, min: number, max: number, required: boolean): string | null {
    const number = parseNumber(value)

    if (number === null) return required ? 'Required.' : null
    if (Number.isNaN(number) || number < min || number > max) return `Enter ${min}–${max} g.`

    return null
}

export function validateBrewForm(
    form: BrewFormState,
    options: { checkDate?: boolean; now?: Date } = {},
): FormErrors<BrewFormState> {
    const errors: FormErrors<BrewFormState> = {}
    const espresso = form.method === 'espresso'

    const dose = checkRange(form.dose, 1, 500, true)
    if (dose) errors.dose = dose

    const water = espresso ? null : checkRange(form.water, 1, 5000, false)
    if (water) errors.water = water

    const shot = espresso ? checkRange(form.yield, 1, 500, false) : null
    if (shot) errors.yield = shot

    if (Number.isNaN(parseSeconds(form.time))) errors.time = 'Use minutes:seconds, e.g. 2:45.'

    if (options.checkDate) {
        const started = Date.parse(form.started_at)
        if (!form.started_at || Number.isNaN(started)) errors.started_at = 'Pick a date and time.'
        else if (started > (options.now ?? new Date()).getTime()) {
            errors.started_at = 'Cannot be in the future.'
        }
    }

    return errors
}

export function formToBrew(form: BrewFormState): BrewFields {
    const espresso = form.method === 'espresso'

    return {
        bag_id: form.bag_id,
        method: form.method,
        dose_g: parseNumber(form.dose)!,
        water_g: espresso ? null : parseNumber(form.water),
        yield_g: espresso ? parseNumber(form.yield) : null,
        brew_time_s: form.method === 'cold_brew' ? null : parseSeconds(form.time),
        rating: form.rating,
        taste_tags: form.taste_tags,
        notes: form.notes.trim() || null,
    }
}

/** Brew finish: the result only, coffee and method come from the run. */
export function formToResult(form: BrewFormState): Omit<BrewFields, 'bag_id' | 'method'> {
    const { dose_g, water_g, yield_g, brew_time_s, rating, taste_tags, notes } = formToBrew(form)

    return { dose_g, water_g, yield_g, brew_time_s, rating, taste_tags, notes }
}
