import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppDatabase, OutboxEntry } from '@/lib/db'
import { acknowledge } from '@/lib/sync/outbox'
import { SYNC_TABLES, type SyncTable } from '@/types/models'

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error'

export interface SyncState {
    status: SyncStatus
    lastSyncedAt: string | null
    error: string | null
}

interface EngineOptions {
    db: AppDatabase
    client: SupabaseClient
    bucket?: string
    isOnline?: () => boolean
    onState?: (state: SyncState) => void
}

const PUSH_BATCH = 50
const PULL_PAGE = 500
/** Rows committed slightly after a pull would otherwise be skipped by the cursor. */
const PULL_OVERLAP_MS = 60_000
const EPOCH = '1970-01-01T00:00:00.000Z'
const LAST_SYNCED_KEY = 'last_synced_at'

interface RemoteError {
    message: string
    code?: string
    status?: number
}

/** Network trouble, expired session or server hiccup: retry later. */
class TransientError extends Error {}

function isTransient(error: RemoteError, status: number | undefined): boolean {
    const code = status ?? error.status ?? 0

    return code === 0 || code === 401 || code === 408 || code === 429 || code >= 500
}

function cursorKey(table: SyncTable): string {
    return `cursor:${table}`
}

export class SyncEngine {
    private readonly db: AppDatabase
    private readonly client: SupabaseClient
    private readonly bucket: string
    private readonly isOnline: () => boolean
    private readonly onState: (state: SyncState) => void

    private state: SyncState = { status: 'idle', lastSyncedAt: null, error: null }
    private running: Promise<void> | null = null
    private again = false

    constructor(options: EngineOptions) {
        this.db = options.db
        this.client = options.client
        this.bucket = options.bucket ?? 'photos'
        this.isOnline = options.isOnline ?? (() => navigator.onLine)
        this.onState = options.onState ?? (() => {})
    }

    async loadState(): Promise<void> {
        const last = await this.db.meta.get(LAST_SYNCED_KEY)
        this.setState({ lastSyncedAt: last?.value ?? null })
    }

    /** Runs push + pull. Concurrent calls coalesce into one follow-up run. */
    sync(): Promise<void> {
        if (this.running) {
            this.again = true
            return this.running
        }

        this.running = this.runLoop().finally(() => {
            this.running = null
        })

        return this.running
    }

    private async runLoop(): Promise<void> {
        do {
            this.again = false
            await this.runOnce()
        } while (this.again)
    }

    private async runOnce(): Promise<void> {
        if (!this.isOnline()) {
            this.setState({ status: 'offline' })
            return
        }

        this.setState({ status: 'syncing', error: null })

        try {
            await this.push()
            await this.pull()

            const now = new Date().toISOString()
            await this.db.meta.put({ key: LAST_SYNCED_KEY, value: now })
            this.setState({ status: 'idle', lastSyncedAt: now })
        } catch (error) {
            const offline = !this.isOnline()
            this.setState({
                status: offline ? 'offline' : 'error',
                error: offline ? null : (error as Error).message,
            })

            throw error
        }
    }

    private async push(): Promise<void> {
        for (;;) {
            const entries = await this.db.outbox
                .orderBy('seq')
                .filter((entry) => !entry.failed)
                .limit(PUSH_BATCH)
                .toArray()

            if (entries.length === 0) return

            const head = entries[0]!
            const group = []
            for (const entry of entries) {
                if (entry.kind !== head.kind || entry.table !== head.table) break
                group.push(entry)
            }

            if (head.kind === 'photo') {
                for (const entry of group) await this.pushPhoto(entry)
            } else {
                await this.pushRecords(head.table as SyncTable, group)
            }
        }
    }

    private async pushRecords(table: SyncTable, entries: OutboxEntry[]): Promise<void> {
        const records = await this.db.table(table).bulkGet(entries.map((entry) => entry.key))
        const rows = records.filter((record) => record !== undefined)

        if (rows.length > 0) {
            const { error, status } = await this.client
                .from(table)
                .upsert(rows, { onConflict: 'id' })

            if (error) {
                if (isTransient(error, status)) throw new TransientError(error.message)

                // Retry one by one so a single bad row does not block the others.
                if (entries.length > 1) {
                    for (const entry of entries) await this.pushRecords(table, [entry])
                    return
                }

                await this.markFailed(entries[0]!, error.message)
                return
            }
        }

        for (const entry of entries) await acknowledge(this.db, entry)
    }

    private async pushPhoto(entry: OutboxEntry): Promise<void> {
        const photo = await this.db.photos.get(entry.key)

        if (photo) {
            const { error } = await this.client.storage
                .from(this.bucket)
                .upload(entry.key, photo.blob, { upsert: true, contentType: photo.blob.type })

            if (error) {
                const status = Number((error as { statusCode?: string }).statusCode ?? 0)
                if (isTransient(error, status)) throw new TransientError(error.message)

                await this.markFailed(entry, error.message)
                return
            }

            await this.db.photos.update(entry.key, { uploaded: true })
        }

        await acknowledge(this.db, entry)
    }

    private async markFailed(entry: OutboxEntry, message: string): Promise<void> {
        await this.db.outbox.update(entry.seq!, {
            failed: true,
            attempts: entry.attempts + 1,
            error: message,
        })
    }

    private async pull(): Promise<void> {
        for (const table of SYNC_TABLES) {
            const stored = (await this.db.meta.get(cursorKey(table)))?.value
            let since = stored
                ? new Date(Date.parse(stored) - PULL_OVERLAP_MS).toISOString()
                : EPOCH
            let cursor = stored ?? EPOCH

            for (;;) {
                const { data, error, status } = await this.client
                    .from(table)
                    .select('*')
                    .gt('updated_at', since)
                    .order('updated_at', { ascending: true })
                    .limit(PULL_PAGE)

                if (error) {
                    if (isTransient(error, status)) throw new TransientError(error.message)
                    throw new Error(error.message)
                }

                const rows = (data ?? []) as { id: string; updated_at: string }[]
                await this.applyPulled(table, rows)

                const last = rows.at(-1)?.updated_at
                if (last && Date.parse(last) > Date.parse(cursor)) cursor = last

                if (rows.length < PULL_PAGE) break
                since = last!
            }

            await this.db.meta.put({ key: cursorKey(table), value: cursor })
        }
    }

    private async applyPulled(table: SyncTable, rows: { id: string }[]): Promise<void> {
        if (rows.length === 0) return

        await this.db.transaction('rw', this.db.table(table), this.db.outbox, async () => {
            const pending = new Set(
                (
                    await this.db.outbox
                        .where('[table+key]')
                        .between([table, ''], [table, '￿'])
                        .toArray()
                ).map((entry) => entry.key),
            )

            // Local changes not yet uploaded win; the server gets them on the next push.
            await this.db.table(table).bulkPut(rows.filter((row) => !pending.has(row.id)))
        })
    }

    async retryFailed(): Promise<void> {
        await this.db.outbox.filter((entry) => entry.failed).modify({ failed: false, error: null })
    }

    private setState(patch: Partial<SyncState>): void {
        this.state = { ...this.state, ...patch }
        this.onState(this.state)
    }
}

export { TransientError }
