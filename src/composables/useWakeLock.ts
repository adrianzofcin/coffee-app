import { onScopeDispose, ref, watch, type Ref } from 'vue'

/** Keeps the screen on while `active` is true (Screen Wake Lock API). */
export function useWakeLock(active: Ref<boolean>) {
    const supported = 'wakeLock' in navigator
    const locked = ref(false)
    let sentinel: WakeLockSentinel | null = null

    async function acquire(): Promise<void> {
        if (!supported || sentinel || document.visibilityState !== 'visible') return

        try {
            sentinel = await navigator.wakeLock.request('screen')
            locked.value = true
            sentinel.addEventListener('release', () => {
                sentinel = null
                locked.value = false
            })
        } catch {
            locked.value = false
        }
    }

    async function release(): Promise<void> {
        const current = sentinel
        sentinel = null
        locked.value = false
        await current?.release().catch(() => {})
    }

    // The system drops the lock when the app goes to the background.
    function onVisibility(): void {
        if (active.value && document.visibilityState === 'visible') void acquire()
    }

    document.addEventListener('visibilitychange', onVisibility)
    watch(active, (value) => void (value ? acquire() : release()), { immediate: true })

    onScopeDispose(() => {
        document.removeEventListener('visibilitychange', onVisibility)
        void release()
    })

    return { supported, locked }
}
