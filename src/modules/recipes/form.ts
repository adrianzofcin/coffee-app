import type { BrewMethod, Draft, Recipe, RecipeStep, SteepPlace } from '@/types/models'
import { parseNumber } from '@/modules/coffees/form'
import { TEMPLATES } from './options'
import { formatSeconds, parseSeconds, validateSteps, withStepIds } from './recipe'
import { isPourOver, pourOverSteps, withStartTimes } from './steps'

export interface RecipeFormState {
    name: string
    method: BrewMethod
    dose: string
    water: string
    yield: string
    temperature: string
    grind_setting: string
    target_time: string
    target_time_max: string
    preinfusion: string
    steep_hours: string
    steep_place: SteepPlace | null
    dilution: string
    steps: RecipeStep[]
    coffee_id: string | null
    is_favorite: boolean
    notes: string
}

export type RecipeFormErrors = Partial<Record<keyof RecipeFormState, string>> & {
    stepErrors?: Record<number, string>
}

const text = (value: number | null | undefined) =>
    value === null || value === undefined ? '' : String(value)
const time = (value: number | null) => (value === null ? '' : formatSeconds(value))

export function emptyRecipeForm(method: BrewMethod = 'v60'): RecipeFormState {
    const t = TEMPLATES[method]

    return {
        name: '',
        method,
        dose: text(t.dose),
        water: text(t.water),
        yield: text(t.yield),
        temperature: text(t.temperature),
        grind_setting: '',
        target_time: method === 'espresso' ? text(t.targetTime) : time(t.targetTime),
        target_time_max: text(t.targetTimeMax),
        preinfusion: '',
        steep_hours: t.steepMinutes === null ? '' : text(t.steepMinutes / 60),
        steep_place: t.steepPlace,
        dilution: text(t.dilution),
        steps: withStepIds(t.steps),
        coffee_id: null,
        is_favorite: false,
        notes: '',
    }
}

/** Switching method swaps in that method's template, keeping what is not method specific. */
export function switchMethod(form: RecipeFormState, method: BrewMethod): RecipeFormState {
    return {
        ...emptyRecipeForm(method),
        name: form.name,
        grind_setting: form.grind_setting,
        coffee_id: form.coffee_id,
        is_favorite: form.is_favorite,
        notes: form.notes,
    }
}

export function recipeToForm(recipe: Recipe): RecipeFormState {
    return {
        name: recipe.name,
        method: recipe.method,
        dose: text(recipe.dose_g),
        water: text(recipe.water_g),
        yield: text(recipe.yield_g),
        temperature: text(recipe.temperature_c),
        grind_setting: recipe.grind_setting ?? '',
        // Espresso times are short, plain seconds read better than m:ss.
        target_time:
            recipe.method === 'espresso' ? text(recipe.target_time_s) : time(recipe.target_time_s),
        target_time_max: text(recipe.target_time_max_s),
        preinfusion: text(recipe.preinfusion_s),
        steep_hours:
            recipe.steep_time_min === null
                ? ''
                : text(Math.round((recipe.steep_time_min / 60) * 100) / 100),
        steep_place: recipe.steep_place,
        dilution: text(recipe.dilution),
        steps: withStepIds(isPourOver(recipe.method) ? pourOverSteps(recipe.steps) : recipe.steps),
        coffee_id: recipe.coffee_id,
        is_favorite: recipe.is_favorite,
        notes: recipe.notes ?? '',
    }
}

function parseTargetTime(form: RecipeFormState): number | null {
    return form.method === 'espresso'
        ? parseNumber(form.target_time)
        : parseSeconds(form.target_time)
}

function inRange(value: number | null, min: number, max: number): boolean {
    return value !== null && !Number.isNaN(value) && value >= min && value <= max
}

function optionalInRange(value: number | null, min: number, max: number): boolean {
    return value === null || inRange(value, min, max)
}

export function validateRecipe(form: RecipeFormState): RecipeFormErrors {
    const errors: RecipeFormErrors = {}
    const dose = parseNumber(form.dose)
    const water = parseNumber(form.water)
    const output = parseNumber(form.yield)
    const temperature = parseNumber(form.temperature)
    const target = parseTargetTime(form)
    const targetMax = parseNumber(form.target_time_max)
    const steepHours = parseNumber(form.steep_hours)

    if (!form.name.trim()) errors.name = 'Name is required.'
    else if (form.name.trim().length > 100) errors.name = 'Keep it under 100 characters.'

    if (!inRange(dose, 0.1, 500)) errors.dose = 'Enter a dose between 0.1 and 500 g.'

    if (form.method === 'espresso') {
        if (!inRange(output, 0.1, 500)) errors.yield = 'Enter a yield between 0.1 and 500 g.'
    } else if (!inRange(water, 1, 5000)) {
        errors.water = 'Enter water between 1 and 5000 g.'
    }

    if (!optionalInRange(temperature, 0, 100)) errors.temperature = 'Enter 0–100 °C.'
    if (Number.isNaN(target) || (target !== null && target < 0)) {
        errors.target_time = form.method === 'espresso' ? 'Enter seconds.' : 'Use m:ss, e.g. 3:00.'
    }
    if (form.method === 'espresso' && !optionalInRange(targetMax, 0, 600)) {
        errors.target_time_max = 'Enter seconds.'
    } else if (targetMax !== null && target !== null && targetMax < target) {
        errors.target_time_max = 'Must not be shorter than the minimum.'
    }

    if (form.method === 'cold_brew' && !inRange(steepHours, 1 / 60, 72)) {
        errors.steep_hours = 'Enter 0–72 hours.'
    }

    const total = form.method === 'espresso' ? null : water
    const stepErrors = validateSteps(
        form.steps,
        total !== null && !Number.isNaN(total) ? total : null,
    )
    if (Object.keys(stepErrors).length > 0) errors.stepErrors = stepErrors

    return errors
}

export function hasErrors(errors: RecipeFormErrors): boolean {
    return Object.keys(errors).length > 0
}

export function formToRecipe(form: RecipeFormState): Draft<Recipe> {
    const espresso = form.method === 'espresso'
    const coldBrew = form.method === 'cold_brew'
    const steepHours = parseNumber(form.steep_hours)
    const blank = (value: string) => value.trim() || null

    return {
        name: form.name.trim(),
        method: form.method,
        dose_g: parseNumber(form.dose)!,
        water_g: espresso ? null : parseNumber(form.water),
        yield_g: espresso ? parseNumber(form.yield) : null,
        temperature_c: parseNumber(form.temperature),
        grind_setting: blank(form.grind_setting),
        target_time_s: coldBrew ? null : parseTargetTime(form),
        target_time_max_s: espresso ? parseNumber(form.target_time_max) : null,
        preinfusion_s: espresso ? parseNumber(form.preinfusion) : null,
        steep_time_min: coldBrew && steepHours !== null ? Math.round(steepHours * 60) : null,
        steep_place: coldBrew ? form.steep_place : null,
        dilution: coldBrew ? parseNumber(form.dilution) : null,
        steps: (isPourOver(form.method) ? withStartTimes(form.steps) : form.steps).map((step) => ({
            ...step,
            text: step.text?.trim() || null,
        })),
        coffee_id: form.coffee_id,
        is_favorite: form.is_favorite,
        notes: blank(form.notes),
        last_brewed_at: null,
    }
}
