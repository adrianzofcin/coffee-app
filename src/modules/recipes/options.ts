import type { BrewMethod, RecipeStep, SteepPlace, StepType } from '@/types/models'

export const METHODS: { value: BrewMethod; label: string; note: string }[] = [
    { value: 'espresso', label: 'Espresso', note: 'Bold & syrupy' },
    { value: 'v60', label: 'V60', note: 'Clean & bright' },
    { value: 'cold_brew', label: 'Cold Brew', note: 'Smooth & slow' },
]

export function methodLabel(method: BrewMethod): string {
    return METHODS.find((m) => m.value === method)?.label ?? method
}

export const STEP_TYPES: { value: StepType; label: string }[] = [
    { value: 'bloom', label: 'Bloom' },
    { value: 'pour', label: 'Pour' },
    { value: 'wait', label: 'Wait' },
    { value: 'stir', label: 'Stir' },
    { value: 'swirl', label: 'Swirl' },
    { value: 'filter', label: 'Filter' },
    { value: 'custom', label: 'Custom' },
]

export const STEEP_PLACES: { value: SteepPlace; label: string }[] = [
    { value: 'fridge', label: 'Fridge' },
    { value: 'room', label: 'Room temp' },
]

/** Fallback instruction when a step has no text of its own. */
export function stepTitle(step: Pick<RecipeStep, 'type' | 'target_water_g'>): string {
    const water = step.target_water_g

    switch (step.type) {
        case 'bloom':
            return water ? `Bloom with ${water} g` : 'Bloom'
        case 'pour':
            return water ? `Pour to ${water} g` : 'Pour'
        case 'wait':
            return 'Wait'
        case 'stir':
            return 'Stir'
        case 'swirl':
            return 'Swirl'
        case 'filter':
            return 'Filter'
        default:
            return water ? `Water to ${water} g` : 'Step'
    }
}

interface Template {
    dose: number
    water: number | null
    yield: number | null
    temperature: number | null
    targetTime: number | null
    targetTimeMax: number | null
    steepMinutes: number | null
    steepPlace: SteepPlace | null
    dilution: number | null
    steps: RecipeStep[]
}

/** A new recipe starts from a sensible template for its method. */
export const TEMPLATES: Record<BrewMethod, Template> = {
    espresso: {
        dose: 18,
        water: null,
        yield: 36,
        temperature: 93,
        targetTime: 25,
        targetTimeMax: 30,
        steepMinutes: null,
        steepPlace: null,
        dilution: null,
        steps: [],
    },
    v60: {
        dose: 15,
        water: 250,
        yield: null,
        temperature: 93,
        targetTime: 180,
        targetTimeMax: null,
        steepMinutes: null,
        steepPlace: null,
        dilution: null,
        steps: [
            {
                type: 'bloom',
                at_s: 0,
                duration_s: 10,
                target_water_g: 50,
                text: 'Pour gently and wet all the grounds',
            },
            { type: 'wait', at_s: 10, duration_s: 30, target_water_g: null, text: 'Let it bloom' },
            { type: 'pour', at_s: 40, duration_s: 15, target_water_g: 150, text: null },
            { type: 'wait', at_s: 55, duration_s: 15, target_water_g: null, text: null },
            { type: 'pour', at_s: 70, duration_s: 15, target_water_g: 250, text: null },
            {
                type: 'swirl',
                at_s: 85,
                duration_s: 5,
                target_water_g: null,
                text: 'Swirl gently and let it drain',
            },
        ],
    },
    cold_brew: {
        dose: 100,
        water: 800,
        yield: null,
        temperature: null,
        targetTime: null,
        targetTimeMax: null,
        steepMinutes: 960,
        steepPlace: 'fridge',
        dilution: 1,
        steps: [
            {
                type: 'custom',
                at_s: null,
                target_water_g: null,
                text: 'Add the coarsely ground coffee to the jar',
            },
            { type: 'pour', at_s: null, target_water_g: 800, text: 'Add cold water' },
            {
                type: 'stir',
                at_s: null,
                target_water_g: null,
                text: 'Stir until all grounds are wet',
            },
            { type: 'wait', at_s: null, target_water_g: null, text: 'Steep' },
            {
                type: 'filter',
                at_s: null,
                target_water_g: null,
                text: 'Filter through a paper filter',
            },
        ],
    },
}
