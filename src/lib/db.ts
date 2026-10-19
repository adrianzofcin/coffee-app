import Dexie, { type Table } from 'dexie'
import type { Bag, BagAdjustment, Coffee, Recipe, SyncTable } from '@/types/models'

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

export class AppDatabase extends Dexie {
    coffees!: Table<Coffee, string>
    bags!: Table<Bag, string>
    bag_adjustments!: Table<BagAdjustment, string>
    recipes!: Table<Recipe, string>
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
    }

    async clearAll(): Promise<void> {
        await this.transaction('rw', this.tables, () =>
            Promise.all(this.tables.map((table) => table.clear())),
        )
    }
}

export const db = new AppDatabase()
