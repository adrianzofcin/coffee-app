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

export interface SyncTables {
    coffees: Coffee
    bags: Bag
    bag_adjustments: BagAdjustment
}

export type SyncTable = keyof SyncTables

/** Push order matters: parents before children (foreign keys). */
export const SYNC_TABLES: SyncTable[] = ['coffees', 'bags', 'bag_adjustments']

/** Fields the app sets itself on every write. */
export type SystemField = keyof SyncedRecord
export type Draft<T extends SyncedRecord> = Omit<T, SystemField>
