<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRight, Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import InstallHint from '@/components/InstallHint.vue'
import EspressoCup from '@/components/illustrations/EspressoCup.vue'
import { isValidUsername } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const submitting = ref(false)
const error = ref<string | null>(null)

const canSubmit = computed(() => username.value.trim() !== '' && password.value !== '')

async function submit(): Promise<void> {
    if (!canSubmit.value || submitting.value) return

    if (!isValidUsername(username.value)) {
        error.value = 'Incorrect username or password.'
        return
    }

    submitting.value = true
    error.value = await auth.signIn(username.value, password.value)
    submitting.value = false

    if (!error.value) {
        const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
        await router.replace(redirect.startsWith('/') ? redirect : '/')
    }
}
</script>

<template>
    <div class="mx-auto flex min-h-dvh max-w-lg flex-col">
        <section
            class="bg-espresso-panel relative flex min-h-[46dvh] flex-col items-center justify-end overflow-hidden rounded-b-[36px] px-6 pt-[calc(2rem+env(safe-area-inset-top))] pb-16 text-center"
        >
            <div class="absolute -top-24 -left-20 size-64 rounded-full bg-accent/20 blur-3xl" />
            <EspressoCup class="animate-rise relative size-44 text-cream" />
            <h1
                class="font-display font-soft animate-rise mt-2 text-5xl font-semibold tracking-tight [animation-delay:80ms]"
            >
                Coffee<span class="text-accent">.</span>
            </h1>
            <p class="animate-rise mt-2 text-cream/70 italic [animation-delay:140ms] font-display">
                Brew it your way.
            </p>
        </section>

        <div
            class="relative z-10 -mt-10 flex flex-1 flex-col px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        >
            <form
                class="animate-rise space-y-4 rounded-card border border-border/60 bg-surface p-5 shadow-[0_24px_48px_-24px_rgb(43_29_20/0.45)] [animation-delay:200ms]"
                novalidate
                @submit.prevent="submit"
            >
                <div>
                    <h2 class="font-display font-soft text-2xl font-semibold">Welcome back</h2>
                    <p class="text-sm text-text-muted">Sign in once, stay signed in.</p>
                </div>

                <label class="relative block">
                    <span class="sr-only">Username</span>
                    <UserRound
                        class="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-text-muted"
                    />
                    <input
                        v-model="username"
                        type="text"
                        name="username"
                        placeholder="Username"
                        autocomplete="username"
                        autocapitalize="none"
                        autocorrect="off"
                        spellcheck="false"
                        class="h-14 w-full rounded-control border border-transparent bg-surface-muted pr-4 pl-12 outline-none placeholder:text-text-muted/80 focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/15"
                    />
                </label>

                <label class="relative block">
                    <span class="sr-only">Password</span>
                    <LockKeyhole
                        class="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-text-muted"
                    />
                    <input
                        v-model="password"
                        :type="showPassword ? 'text' : 'password'"
                        name="password"
                        placeholder="Password"
                        autocomplete="current-password"
                        class="h-14 w-full rounded-control border border-transparent bg-surface-muted pr-12 pl-12 outline-none placeholder:text-text-muted/80 focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/15"
                    />
                    <button
                        type="button"
                        class="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-text-muted"
                        :aria-label="showPassword ? 'Hide password' : 'Show password'"
                        @click="showPassword = !showPassword"
                    >
                        <EyeOff v-if="showPassword" class="size-5" />
                        <Eye v-else class="size-5" />
                    </button>
                </label>

                <p v-if="error" class="text-sm font-medium text-danger" role="alert">{{ error }}</p>
                <p v-else-if="!isSupabaseConfigured" class="text-sm text-warning">
                    Supabase is not configured. Fill in <code>.env</code> to sign in.
                </p>

                <AppButton type="submit" block :loading="submitting" :disabled="!canSubmit">
                    Sign in
                    <ArrowRight v-if="!submitting" class="size-5" />
                </AppButton>
            </form>

            <div class="mt-auto pt-6">
                <InstallHint />
            </div>
        </div>
    </div>
</template>
