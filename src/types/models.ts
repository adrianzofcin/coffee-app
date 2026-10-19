/** Columns shared by every synced table (docs/04-offline-sync.md). */
export interface SyncedRecord {
    id: string
    user_id: string
    created_at: string
    updated_at: string
    deleted_at: string | null
}

export type RoastLevel = 'light' | 'medium' | 'dark'
export type IntendedFor = 'espresso' | 'filter' | 'omni'
export type BagStatus = 'sealed' | 'open' | 'finished'
export type AdjustmentType = 'set_weight' | 'remove'

export interface Coffee extends SyncedRecord {
    name: string
    roaster: string
    country: string | null
    region: string | null
    producer: string | null
    variety: string | null
    altitude: string | null
    process: string | null
    roast_level: RoastLevel | null
    intended_for: IntendedFor | null
    is_decaf: boolean
    tasting_notes: string[]
    rating: number | null
    notes: string | null
    photo_path: string | null
}

export interface Bag extends SyncedRecord {
    coffee_id: string
    /** YYYY-MM-DD */
    roast_date: string
    weight_g: number
    price: number | null
    /** YYYY-MM-DD */
    purchase_date: string | null
    status: BagStatus
    opened_at: string | null
    finished_at: string | null
    is_frozen: boolean
}

export interface BagAdjustment extends SyncedRecord {
    bag_id: string
    type: AdjustmentType
    delta_g: number
    measured_g: number | null
    note: string | null
}

export type BrewMethod = 'espresso' | 'v60' | 'cold_brew'
export type StepType = 'bloom' | 'pour' | 'wait' | 'stir' | 'swirl' | 'filter' | 'custom'
export type SteepPlace = 'fridge' | 'room'

export interface RecipeStep {
    /** Client-side key for lists; starter recipes from the server come without one. */
    id?: string
    type: StepType
    /** Seconds from the start of the timer; null = manual step (tap "Next"). */
    at_s: number | null
    /** Cumulative water on the scale, e.g. "pour to 150 g". */
    target_water_g: number | null
    text: string | null
}

export interface Recipe extends SyncedRecord {
    name: string
    method: BrewMethod
    dose_g: number
    water_g: number | null
    yield_g: number | null
    temperature_c: number | null
    grind_setting: string | null
    target_time_s: number | null
    target_time_max_s: number | null
    preinfusion_s: number | null
    steep_time_min: number | null
    steep_place: SteepPlace | null
    /** Parts of water per part of concentrate when serving (1 = 1:1). */
    dilution: number | null
    steps: RecipeStep[]
    coffee_id: string | null
    is_favorite: boolean
    notes: string | null
    last_brewed_at: string | null
}

export interface SyncTables {
    coffees: Coffee
    bags: Bag
    bag_adjustments: BagAdjustment
    recipes: Recipe
}

export type SyncTable = keyof SyncTables

/** Push order matters: parents before children (foreign keys). */
export const SYNC_TABLES: SyncTable[] = ['coffees', 'bags', 'bag_adjustments', 'recipes']

/** Fields the app sets itself on every write. */
export type SystemField = keyof SyncedRecord
export type Draft<T extends SyncedRecord> = Omit<T, SystemField>
