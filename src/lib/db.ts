import Dexie, { type Table } from 'dexie'
import type {
    Bag,
    BagAdjustment,
    Brew,
    Coffee,
    Recipe,
    RecipeSnapshot,
    SyncTable,
} from '@/types/models'

export interface OutboxEntry {
    seq?: number
    kind: 'record' | 'photo'
    /** Table name for records, `photos` for uploads. */
    table: SyncTable | 'photos'
    /** Record id, or the storage path of a photo. */
    key: string
    /** Bumped when the same item changes again while queued. */
    queued_at: number
    attempts: number
    failed: boolean
    error: string | null
}

export interface LocalPhoto {
    path: string
    blob: Blob
    uploaded: boolean
}

export interface MetaEntry {
    key: string
    value: string
}

/**
 * The brew being made right now (V60 / espresso / cold brew before steeping).
 * Local only, never synced; times are epoch milliseconds.
 */
export interface ActiveRun {
    /** Always `current`: there is at most one run. */
    id: 'current'
    recipe_id: string | null
    bag_id: string | null
    snapshot: RecipeSnapshot
    /** Timer start, null until the user taps Start. */
    started_at: number | null
    /** null = running */
    paused_at: number | null
    paused_total_ms: number
    /** Step the user moved to with Next / Skip; timed steps advance on their own from here. */
    step_index: number
    /** Timer stopped (Finish / Stop), waiting for the result to be logged. */
    stopped_at: number | null
}

export class AppDatabase extends Dexie {
    coffees!: Table<Coffee, string>
    bags!: Table<Bag, string>
    bag_adjustments!: Table<BagAdjustment, string>
    recipes!: Table<Recipe, string>
    brews!: Table<Brew, string>
    active_run!: Table<ActiveRun, string>
    outbox!: Table<OutboxEntry, number>
    photos!: Table<LocalPhoto, string>
    meta!: Table<MetaEntry, string>

    constructor(name = 'coffee-app') {
        super(name)

        this.version(1).stores({
            coffees: 'id, updated_at',
            bags: 'id, coffee_id, updated_at',
            bag_adjustments: 'id, bag_id, updated_at',
            outbox: '++seq, [table+key]',
            photos: 'path',
            meta: 'key',
        })

        // Module Recipes. New tables only, existing data stays untouched.
        this.version(2).stores({
            recipes: 'id, updated_at',
        })

        // Module Brew.
        this.version(3).stores({
            brews: 'id, bag_id, started_at, updated_at',
            active_run: 'id',
        })
    }

    async clearAll(): Promise<void> {
        await this.transaction('rw', this.tables, () =>
            Promise.all(this.tables.map((table) => table.clear())),
        )
    }
}

export const db = new AppDatabase()
