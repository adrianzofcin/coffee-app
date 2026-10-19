import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
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

    async function signOut(): Promise<void> {
        // Local scope clears this device even when offline.
        await supabase?.auth.signOut({ scope: 'local' })
        session.value = null
    }

    return { session, ready, isAuthenticated, username, init, signIn, signOut }
})
