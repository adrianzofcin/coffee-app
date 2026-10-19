import { onScopeDispose, shallowRef, watch, type ShallowRef, type WatchSource } from 'vue'
import { liveQuery, type Subscription } from 'dexie'

/** Reactive Dexie query: re-runs whenever the tables it reads change. */
export function useLiveQuery<T>(
    querier: () => T | Promise<T>,
    initial: T,
    deps?: WatchSource | WatchSource[],
): ShallowRef<T> {
    const result = shallowRef<T>(initial)
    let subscription: Subscription | undefined

    function subscribe(): void {
        subscription?.unsubscribe()
        subscription = liveQuery(querier).subscribe({
            next: (value) => (result.value = value),
            error: (error) => console.error('Live query failed', error),
        })
    }

    if (deps) {
        watch(deps, subscribe, { immediate: true })
    } else {
        subscribe()
    }

    onScopeDispose(() => subscription?.unsubscribe())

    return result
}
