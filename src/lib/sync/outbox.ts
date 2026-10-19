import type { AppDatabase, OutboxEntry } from '@/lib/db'

type QueueTarget = Pick<OutboxEntry, 'kind' | 'table' | 'key'>

/**
 * Queues an item for upload. Repeated changes of the same item keep the original
 * position (parents stay ahead of children) and only bump queued_at.
 * Must run inside a transaction that includes the outbox table.
 */
export async function enqueue(db: AppDatabase, target: QueueTarget): Promise<void> {
    const existing = await db.outbox.where({ table: target.table, key: target.key }).first()
    const now = Date.now()

    if (existing?.seq !== undefined) {
        await db.outbox.update(existing.seq, {
            queued_at: Math.max(now, existing.queued_at + 1),
            failed: false,
            error: null,
        })
        return
    }

    await db.outbox.add({ ...target, queued_at: now, attempts: 0, failed: false, error: null })
}

/** Removes an entry after a successful upload, unless it changed again meanwhile. */
export async function acknowledge(db: AppDatabase, entry: OutboxEntry): Promise<void> {
    await db.transaction('rw', db.outbox, async () => {
        const current = await db.outbox.get(entry.seq!)

        if (current && current.queued_at === entry.queued_at) {
            await db.outbox.delete(entry.seq!)
        }
    })
}

export async function hasPending(db: AppDatabase, table: string, key: string): Promise<boolean> {
    return (await db.outbox.where({ table, key }).count()) > 0
}
