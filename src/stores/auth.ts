import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { setCurrentUserId } from '@/lib/data/session'
import { useSyncStore } from '@/stores/sync'
import {
    classifySignInError,
    emailToUsername,
    signInErrorMessages,
    usernameToEmail,
} from '@/lib/auth'

// CI passes an empty string when the repository variable is not set.
const emailDomain = import.meta.env.VITE_AUTH_EMAIL_DOMAIN || 'coffee.local'

export const useAuthStore = defineStore('auth', () => {
    const session = ref<Session | null>(null)
    const ready = ref(false)
    let initPromise: Promise<void> | null = null

    const isAuthenticated = computed(() => session.value !== null)
    const username = computed(() => emailToUsername(session.value?.user.email))
    const userId = computed(() => session.value?.user.id ?? null)

    // Token refreshes keep the same user id, so sync only restarts on a real account change.
    watch(userId, (id, previous) => {
        setCurrentUserId(id)
        if (id && id !== previous) void useSyncStore().start(id)
    })

    function init(): Promise<void> {
        initPromise ??= (async () => {
            if (supabase) {
                // Reads the persisted session from storage, works offline.
                const { data } = await supabase.auth.getSession()
                session.value = data.session

                supabase.auth.onAuthStateChange((_event, newSession) => {
                    session.value = newSession
                })
            }

            ready.value = true
        })()

        return initPromise
    }

    async function signIn(name: string, password: string): Promise<string | null> {
        if (!supabase || !isSupabaseConfigured) {
            return signInErrorMessages.not_configured
        }

        if (!navigator.onLine) {
            return signInErrorMessages.offline
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: usernameToEmail(name, emailDomain),
            password,
        })

        if (error) {
            return signInErrorMessages[classifySignInError(error)]
        }

        session.value = data.session

        return null
    }

    /** Signs out on this device and wipes its local copy of the data. */
    async function signOut(): Promise<void> {
        await useSyncStore().clearLocalData()
        // Local scope works offline too.
        await supabase?.auth.signOut({ scope: 'local' })
        session.value = null
    }

    return { session, ready, isAuthenticated, username, userId, init, signIn, signOut }
})
