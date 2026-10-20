import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

const SOUNDS_KEY = 'coffee-app-sounds'

function readSounds(): boolean {
    try {
        return localStorage.getItem(SOUNDS_KEY) !== 'off'
    } catch {
        return true
    }
}

/** Per-device preferences, kept in the browser (not synced). */
export const usePreferencesStore = defineStore('preferences', () => {
    const sounds = ref(readSounds())

    watch(sounds, (value) => {
        try {
            localStorage.setItem(SOUNDS_KEY, value ? 'on' : 'off')
        } catch {
            // Storage unavailable (private mode), the choice lasts for this session only.
        }
    })

    return { sounds }
})
