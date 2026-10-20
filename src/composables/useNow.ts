import { onScopeDispose, ref } from 'vue'

/** Current time in ms, refreshed every `intervalMs`, and right away when the app returns. */
export function useNow(intervalMs = 1000) {
    const now = ref(Date.now())
    const tick = () => (now.value = Date.now())
    const timer = setInterval(tick, intervalMs)

    document.addEventListener('visibilitychange', tick)
    onScopeDispose(() => {
        clearInterval(timer)
        document.removeEventListener('visibilitychange', tick)
    })

    return now
}
