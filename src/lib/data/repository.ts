import { db } from '@/lib/db'
import { enqueue } from '@/lib/sync/outbox'
import { requireUserId } from '@/lib/data/session'
import type { Draft, SyncedRecord, SyncTable, SyncTables } from '@/types/models'

type Listener = () => void

const writeListeners = new Set<Listener>()

/** The sync engine listens here to push shortly after local changes. */
export function onLocalWrite(listener: Listener): () => void {
    writeListeners.add(listener)

    return () => writeListeners.delete(listener)
}

function notifyWrite(): void {
    writeListeners.forEach((listener) => listener())
}

function nowIso(): string {
    return new Date().toISOString()
}

export function newId(): string {
    return crypto.randomUUID()
}

/** Copy of a record without its system fields, ready to be inserted as a new one. */
export function withoutSystemFields<T extends SyncedRecord>(record: T): Draft<T> {
    const copy: Partial<T> = { ...record }
    for (const field of ['id', 'user_id', 'created_at', 'updated_at', 'deleted_at'] as const) {
        delete copy[field]
    }

    return copy as Draft<T>
}

/**
 * IndexedDB cannot store Vue reactive proxies (e.g. an array straight from a form),
 * records are plain JSON, so a JSON round-trip strips them.
 */
function plain<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T
}

/**
 * Local writes always go to the table and the outbox in one transaction,
 * so nothing written offline can be lost or uploaded half-way.
 */
export async function insertRecord<T extends SyncTable>(
    table: T,
    draft: Draft<SyncTables[T]> & { id?: string },
): Promise<SyncTables[T]> {
    const timestamp = nowIso()
    const record = {
        ...plain(draft),
        id: draft.id ?? newId(),
        user_id: requireUserId(),
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
    } as SyncTables[T]

    await db.transaction('rw', db.table(table), db.outbox, async () => {
        await db.table(table).put(record)
        await enqueue(db, { kind: 'record', table, key: record.id })
    })
    notifyWrite()

    return record
}

export async function updateRecord<T extends SyncTable>(
    table: T,
    id: string,
    changes: Partial<Draft<SyncTables[T]>> & { deleted_at?: string | null },
): Promise<void> {
    await db.transaction('rw', db.table(table), db.outbox, async () => {
        const updated = await db
            .table(table)
            .update(id, { ...plain(changes), updated_at: nowIso() })

        if (updated) {
            await enqueue(db, { kind: 'record', table, key: id })
        }
    })
    notifyWrite()
}

export function softDelete(table: SyncTable, id: string): Promise<void> {
    return updateRecord(table, id, { deleted_at: nowIso() })
}

/** Runs several writes atomically (e.g. a coffee with its first bag). */
export async function batchWrite(work: () => Promise<void>): Promise<void> {
    await db.transaction(
        'rw',
        [db.coffees, db.bags, db.bag_adjustments, db.recipes, db.outbox, db.photos],
        work,
    )
}

export async function storePhoto(path: string, blob: Blob): Promise<void> {
    await db.transaction('rw', db.photos, db.outbox, async () => {
        await db.photos.put({ path, blob, uploaded: false })
        await enqueue(db, { kind: 'photo', table: 'photos', key: path })
    })
    notifyWrite()
}
