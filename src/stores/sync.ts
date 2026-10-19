import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { liveQuery } from 'dexie'
import { db } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import { onLocalWrite } from '@/lib/data/repository'
import { SyncEngine, type SyncState } from '@/lib/sync/engine'

const WRITE_DEBOUNCE_MS = 2_000
const INTERVAL_MS = 5 * 60_000
const MAX_BACKOFF_MS = 5 * 60_000
const OWNER_KEY = 'owner'

export const useSyncStore = defineStore('sync', () => {
    const state = ref<SyncState>({ status: 'idle', lastSyncedAt: null, error: null })
    const pendingCount = ref(0)
    const failedCount = ref(0)

    const engine = supabase
        ? new SyncEngine({ db, client: supabase, onState: (next) => (state.value = { ...next }) })
        : null

    let timer: ReturnType<typeof setTimeout> | undefined
    let interval: ReturnType<typeof setInterval> | undefined
    let failures = 0
    const cleanups: (() => void)[] = []

    liveQuery(() => db.outbox.toArray()).subscribe((entries) => {
        pendingCount.value = entries.filter((entry) => !entry.failed).length
        failedCount.value = entries.filter((entry) => entry.failed).length
    })

    const isSyncing = computed(() => state.value.status === 'syncing')

    async function syncNow(): Promise<void> {
        if (!engine) return
        clearTimeout(timer)

        try {
            await engine.sync()
            failures = 0
        } catch {
            // Back off on repeated failures: 5 s, 10 s, 20 s … up to 5 min.
            failures++
            schedule(Math.min(5_000 * 2 ** (failures - 1), MAX_BACKOFF_MS))
        }
    }

    function schedule(delay: number): void {
        clearTimeout(timer)
        timer = setTimeout(() => void syncNow(), delay)
    }

    function onVisible(): void {
        if (document.visibilityState === 'visible') void syncNow()
    }

    function onOnline(): void {
        failures = 0
        void syncNow()
    }

    /** Starts background sync for the signed-in user. */
    async function start(userId: string): Promise<void> {
        stop()

        // Never mix data of two accounts on one device.
        const owner = await db.meta.get(OWNER_KEY)
        if (owner && owner.value !== userId) await db.clearAll()
        await db.meta.put({ key: OWNER_KEY, value: userId })

        await engine?.loadState()

        window.addEventListener('online', onOnline)
        document.addEventListener('visibilitychange', onVisible)
        cleanups.push(
            () => window.removeEventListener('online', onOnline),
            () => document.removeEventListener('visibilitychange', onVisible),
            onLocalWrite(() => schedule(WRITE_DEBOUNCE_MS)),
        )
        interval = setInterval(() => void syncNow(), INTERVAL_MS)

        void syncNow()
    }

    function stop(): void {
        clearTimeout(timer)
        clearInterval(interval)
        cleanups.splice(0).forEach((cleanup) => cleanup())
    }

    async function retryFailed(): Promise<void> {
        await engine?.retryFailed()
        await syncNow()
    }

    async function clearLocalData(): Promise<void> {
        stop()
        await db.clearAll()
        state.value = { status: 'idle', lastSyncedAt: null, error: null }
    }

    return {
        state,
        pendingCount,
        failedCount,
        isSyncing,
        start,
        stop,
        syncNow,
        retryFailed,
        clearLocalData,
    }
})
