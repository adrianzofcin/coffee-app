import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { db } from '@/lib/db'
import { insertRecord, updateRecord } from '@/lib/data/repository'
import { setCurrentUserId } from '@/lib/data/session'
import { SyncEngine, type SyncState } from '@/lib/sync/engine'
import type { Coffee } from '@/types/models'

type Row = Record<string, unknown> & { id: string; updated_at: string }

interface FakeError {
    message: string
    code?: string
}

/** Minimal in-memory stand-in for the parts of supabase-js the engine uses. */
function createFakeServer() {
    const tables: Record<string, Map<string, Row>> = {}
    let clock = Date.parse('2026-01-01T00:00:00Z')
    const failures: { table: string; status: number; error: FakeError; times: number }[] = []
    const rejectIds = new Set<string>()
    const uploads: string[] = []
    let beforeUpsert: (() => Promise<void>) | null = null

    const table = (name: string) => (tables[name] ??= new Map())
    const tick = () => new Date((clock += 1000)).toISOString()

    const client = {
        from(name: string) {
            return {
                async upsert(rows: Row[]) {
                    await beforeUpsert?.()
                    const failure = failures.find((f) => f.table === name && f.times > 0)
                    if (failure) {
                        failure.times--
                        return { error: failure.error, status: failure.status }
                    }
                    if (rows.some((row) => rejectIds.has(row.id))) {
                        return { error: { message: 'violates check', code: '23514' }, status: 400 }
                    }
                    for (const row of rows) table(name).set(row.id, { ...row, updated_at: tick() })
                    return { error: null, status: 201 }
                },
                select() {
                    let since = ''
                    let max = Infinity
                    const builder = {
                        gt(_column: string, value: string) {
                            since = value
                            return builder
                        },
                        order() {
                            return builder
                        },
                        limit(value: number) {
                            max = value
                            return builder
                        },
                        then(resolve: (value: unknown) => void) {
                            const data = [...table(name).values()]
                                .filter((row) => row.updated_at > since)
                                .sort((a, b) => a.updated_at.localeCompare(b.updated_at))
                                .slice(0, max)
                            resolve({ data, error: null, status: 200 })
                        },
                    }
                    return builder
                },
            }
        },
        storage: {
            from() {
                return {
                    async upload(path: string) {
                        uploads.push(path)
                        return { error: null }
                    },
                }
            },
        },
    }

    return {
        client: client as unknown as SupabaseClient,
        table,
        tick,
        uploads,
        failNext(name: string, status: number, error: FakeError, times = 1) {
            failures.push({ table: name, status, error, times })
        },
        reject(id: string) {
            rejectIds.add(id)
        },
        onUpsert(hook: () => Promise<void>) {
            beforeUpsert = hook
        },
    }
}

const USER = '00000000-0000-0000-0000-00000000000a'

function coffeeDraft(name = 'Ethiopia Guji') {
    return {
        name,
        roaster: 'Doubleshot',
        country: null,
        region: null,
        producer: null,
        variety: null,
        altitude: null,
        process: null,
        roast_level: null,
        intended_for: null,
        is_decaf: false,
        tasting_notes: [],
        rating: null,
        notes: null,
        photo_path: null,
    } satisfies Omit<Coffee, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>
}

describe('SyncEngine', () => {
    let server: ReturnType<typeof createFakeServer>
    let online: boolean
    let states: SyncState[]
    let engine: SyncEngine

    beforeEach(async () => {
        await db.clearAll()
        setCurrentUserId(USER)
        server = createFakeServer()
        online = true
        states = []
        engine = new SyncEngine({
            db,
            client: server.client,
            isOnline: () => online,
            onState: (state) => states.push(state),
        })
    })

    afterEach(() => setCurrentUserId(null))

    it('pushes queued records and empties the outbox', async () => {
        const coffee = await insertRecord('coffees', coffeeDraft())

        await engine.sync()

        expect(server.table('coffees').get(coffee.id)?.name).toBe('Ethiopia Guji')
        expect(await db.outbox.count()).toBe(0)
        expect(states.at(-1)?.status).toBe('idle')
        expect(states.at(-1)?.lastSyncedAt).not.toBeNull()
    })

    it('queues one entry per record even after several edits', async () => {
        const coffee = await insertRecord('coffees', coffeeDraft())
        await updateRecord('coffees', coffee.id, { rating: 4 })
        await updateRecord('coffees', coffee.id, { rating: 5 })

        expect(await db.outbox.count()).toBe(1)

        await engine.sync()
        expect(server.table('coffees').get(coffee.id)?.rating).toBe(5)
    })

    it('pulls remote changes into the local database', async () => {
        server.table('coffees').set('remote-1', {
            id: 'remote-1',
            user_id: USER,
            ...coffeeDraft('From another phone'),
            created_at: server.tick(),
            updated_at: server.tick(),
            deleted_at: null,
        })

        await engine.sync()

        expect((await db.coffees.get('remote-1'))?.name).toBe('From another phone')
    })

    it('keeps a local change that was made while the upload was in flight', async () => {
        const coffee = await insertRecord('coffees', coffeeDraft())
        server.onUpsert(async () => {
            server.onUpsert(async () => {})
            await updateRecord('coffees', coffee.id, { notes: 'edited mid-sync' })
        })

        await engine.sync()

        // The first upload carried the old version; the edit is pushed again in the same run.
        expect((await db.coffees.get(coffee.id))?.notes).toBe('edited mid-sync')
        expect(server.table('coffees').get(coffee.id)?.notes).toBe('edited mid-sync')
        expect(await db.outbox.count()).toBe(0)
    })

    it('does not let a pull overwrite a change that is still queued', async () => {
        const coffee = await insertRecord('coffees', coffeeDraft())
        await engine.sync()

        server.table('coffees').set(coffee.id, {
            ...server.table('coffees').get(coffee.id)!,
            name: 'Server name',
            updated_at: server.tick(),
        })
        await updateRecord('coffees', coffee.id, { name: 'Local name' })
        server.failNext('coffees', 503, { message: 'Service unavailable' })

        await expect(engine.sync()).rejects.toThrow()
        expect((await db.coffees.get(coffee.id))?.name).toBe('Local name')
        expect(await db.outbox.count()).toBe(1)
    })

    it('marks a rejected record as failed without blocking the others', async () => {
        const bad = await insertRecord('coffees', coffeeDraft('Bad'))
        const good = await insertRecord('coffees', coffeeDraft('Good'))
        server.reject(bad.id)

        await engine.sync()

        expect(server.table('coffees').has(good.id)).toBe(true)
        const failed = await db.outbox.toArray()
        expect(failed).toHaveLength(1)
        expect(failed[0]).toMatchObject({ key: bad.id, failed: true, error: 'violates check' })
    })

    it('keeps the queue on a network error and reports the problem', async () => {
        await insertRecord('coffees', coffeeDraft())
        server.failNext('coffees', 0, { message: 'Failed to fetch' })

        await expect(engine.sync()).rejects.toThrow('Failed to fetch')

        expect(await db.outbox.count()).toBe(1)
        expect(states.at(-1)).toMatchObject({ status: 'error', error: 'Failed to fetch' })
    })

    it('stays idle while offline', async () => {
        await insertRecord('coffees', coffeeDraft())
        online = false

        await engine.sync()

        expect(server.table('coffees').size).toBe(0)
        expect(states.at(-1)?.status).toBe('offline')
    })

    it('uploads queued photos', async () => {
        await db.transaction('rw', db.photos, db.outbox, async () => {
            await db.photos.put({
                path: `${USER}/coffees/a.webp`,
                blob: new Blob(['x']),
                uploaded: false,
            })
            await db.outbox.add({
                kind: 'photo',
                table: 'photos',
                key: `${USER}/coffees/a.webp`,
                queued_at: Date.now(),
                attempts: 0,
                failed: false,
                error: null,
            })
        })

        await engine.sync()

        expect(server.uploads).toEqual([`${USER}/coffees/a.webp`])
        expect((await db.photos.get(`${USER}/coffees/a.webp`))?.uploaded).toBe(true)
    })
})
