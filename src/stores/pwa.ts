import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useRegisterSW } from 'virtual:pwa-register/vue'

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type UpdateCheckResult = 'available' | 'up-to-date' | 'offline' | 'unavailable'

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

function detectIos(): boolean {
    const ua = navigator.userAgent

    return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
}

function detectStandalone(): boolean {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true
    )
}

export const usePwaStore = defineStore('pwa', () => {
    let registration: ServiceWorkerRegistration | undefined

    const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
        immediate: true,
        onRegisteredSW(_url, reg) {
            registration = reg
            if (!reg) return

            setInterval(() => void checkForUpdate(), UPDATE_CHECK_INTERVAL_MS)
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') void checkForUpdate()
            })
        },
    })

    const isIos = detectIos()
    const isStandalone = ref(detectStandalone())
    const installEvent = ref<BeforeInstallPromptEvent | null>(null)
    const checking = ref(false)

    const canPromptInstall = computed(() => installEvent.value !== null)
    const showIosInstallHint = computed(() => isIos && !isStandalone.value)

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault()
        installEvent.value = event as BeforeInstallPromptEvent
    })

    window.addEventListener('appinstalled', () => {
        installEvent.value = null
        isStandalone.value = true
    })

    async function promptInstall(): Promise<void> {
        if (!installEvent.value) return

        await installEvent.value.prompt()
        await installEvent.value.userChoice
        installEvent.value = null
    }

    async function checkForUpdate(): Promise<UpdateCheckResult> {
        if (needRefresh.value) return 'available'
        if (!navigator.onLine) return 'offline'
        if (!registration) return 'unavailable'

        checking.value = true
        try {
            await registration.update()
        } catch {
            // sw.js is not served (site unpublished) or the network failed;
            // the cached version keeps running either way.
            return navigator.onLine ? 'unavailable' : 'offline'
        } finally {
            checking.value = false
        }

        return needRefresh.value ? 'available' : 'up-to-date'
    }

    function applyUpdate(): Promise<void> {
        return updateServiceWorker(true)
    }

    function dismissUpdate(): void {
        needRefresh.value = false
    }

    return {
        needRefresh,
        offlineReady,
        isIos,
        isStandalone,
        canPromptInstall,
        showIosInstallHint,
        checking,
        promptInstall,
        checkForUpdate,
        applyUpdate,
        dismissUpdate,
    }
})
