import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'coffee-app-theme'
const THEME_COLORS = { light: '#FAF6F1', dark: '#17110D' } as const

function readStoredMode(): ThemeMode {
    try {
        const value = localStorage.getItem(STORAGE_KEY)

        return value === 'light' || value === 'dark' ? value : 'system'
    } catch {
        return 'system'
    }
}

export const useThemeStore = defineStore('theme', () => {
    const mode = ref<ThemeMode>(readStoredMode())
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    function apply(): void {
        const dark = mode.value === 'dark' || (mode.value === 'system' && media.matches)

        document.documentElement.classList.toggle('dark', dark)
        document
            .querySelector('meta[name="theme-color"]')
            ?.setAttribute('content', dark ? THEME_COLORS.dark : THEME_COLORS.light)
    }

    watch(mode, (value) => {
        try {
            localStorage.setItem(STORAGE_KEY, value)
        } catch {
            // Storage unavailable (private mode), the choice lasts for this session only.
        }

        apply()
    })

    media.addEventListener('change', apply)
    apply()

    return { mode }
})
