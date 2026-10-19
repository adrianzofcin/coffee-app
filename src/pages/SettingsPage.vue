<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronRight, LogOut, Monitor, Moon, RefreshCw, Sparkles, Sun } from 'lucide-vue-next'
import PageHeader from '@/components/layout/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import InstallHint from '@/components/InstallHint.vue'
import { useAuthStore } from '@/stores/auth'
import { usePwaStore } from '@/stores/pwa'
import { useThemeStore, type ThemeMode } from '@/stores/theme'

const auth = useAuthStore()
const pwa = usePwaStore()
const theme = useThemeStore()
const router = useRouter()

const version = `${__APP_VERSION__} · ${__APP_BUILD__}`
const initial = computed(() => auth.username.charAt(0).toUpperCase() || '☕')
const themeOptions: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'Auto', icon: Monitor },
]
const themeIndex = computed(() => themeOptions.findIndex((o) => o.value === theme.mode))

const confirmLogout = ref(false)
const loggingOut = ref(false)
const updateStatus = ref<string | null>(null)

async function checkForUpdate(): Promise<void> {
    updateStatus.value = null
    const available = await pwa.checkForUpdate()
    updateStatus.value = available ? null : navigator.onLine ? 'Up to date' : 'Offline'
}

async function logout(): Promise<void> {
    loggingOut.value = true
    await auth.signOut()
    loggingOut.value = false
    confirmLogout.value = false
    await router.replace({ name: 'login' })
}
</script>

<template>
    <div>
        <PageHeader title="Settings" eyebrow="Make it yours" />

        <div class="space-y-7 px-5">
            <section
                class="bg-espresso-panel animate-rise relative flex items-center gap-4 overflow-hidden rounded-card p-5"
            >
                <div
                    class="absolute -right-10 -bottom-16 size-44 rounded-full border-[18px] border-cream/5"
                />
                <div
                    class="bg-accent-gradient font-display flex size-14 shrink-0 items-center justify-center rounded-full text-2xl font-semibold text-white ring-4 ring-cream/10"
                >
                    {{ initial }}
                </div>
                <div class="min-w-0">
                    <p class="font-display font-soft truncate text-xl font-semibold">
                        {{ auth.username }}
                    </p>
                    <p class="text-sm text-cream/60">Signed in on this device</p>
                </div>
            </section>

            <section class="animate-rise [animation-delay:60ms]">
                <h2
                    class="mb-2.5 px-1 text-xs font-semibold tracking-[0.14em] text-text-muted uppercase"
                >
                    Appearance
                </h2>
                <div
                    class="relative grid grid-cols-3 rounded-full bg-surface-muted p-1"
                    role="radiogroup"
                    aria-label="Theme"
                >
                    <div
                        class="bg-accent-gradient absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full shadow-md transition-transform duration-300 ease-out"
                        :style="{ transform: `translateX(${themeIndex * 100}%)` }"
                    />
                    <button
                        v-for="option in themeOptions"
                        :key="option.value"
                        role="radio"
                        :aria-checked="theme.mode === option.value"
                        class="relative flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors"
                        :class="theme.mode === option.value ? 'text-white' : 'text-text-muted'"
                        @click="theme.mode = option.value"
                    >
                        <component :is="option.icon" class="size-4" />
                        {{ option.label }}
                    </button>
                </div>
            </section>

            <section class="animate-rise [animation-delay:120ms]">
                <h2
                    class="mb-2.5 px-1 text-xs font-semibold tracking-[0.14em] text-text-muted uppercase"
                >
                    App
                </h2>
                <div class="space-y-3">
                    <InstallHint v-if="!pwa.isStandalone" />
                    <div
                        class="divide-y divide-border/70 overflow-hidden rounded-card border border-border/60 bg-surface"
                    >
                        <div class="flex items-center gap-3 p-4">
                            <span
                                class="flex size-9 items-center justify-center rounded-xl bg-accent/12"
                            >
                                <Sparkles class="size-[18px] text-accent" />
                            </span>
                            <span class="flex-1 font-medium">Version</span>
                            <span class="tabular text-sm text-text-muted">{{ version }}</span>
                        </div>
                        <button
                            class="flex w-full items-center gap-3 p-4 text-left active:bg-surface-muted"
                            :disabled="pwa.checking"
                            @click="checkForUpdate"
                        >
                            <span
                                class="flex size-9 items-center justify-center rounded-xl bg-accent/12"
                            >
                                <RefreshCw
                                    class="size-[18px] text-accent"
                                    :class="{ 'animate-spin': pwa.checking }"
                                />
                            </span>
                            <span class="flex-1 font-medium">Check for updates</span>
                            <span v-if="updateStatus" class="text-sm text-success">{{
                                updateStatus
                            }}</span>
                            <ChevronRight v-else class="size-5 text-text-muted" />
                        </button>
                    </div>
                </div>
            </section>

            <button
                class="animate-rise pressable flex w-full items-center justify-center gap-2 rounded-card border border-danger/25 py-4 font-semibold text-danger [animation-delay:180ms]"
                @click="confirmLogout = true"
            >
                <LogOut class="size-5" />
                Log out
            </button>
        </div>

        <BottomSheet v-model:open="confirmLogout" title="Log out?">
            <p class="mb-5 text-text-muted">
                You'll need your username and password to sign in again.
            </p>
            <div class="space-y-2">
                <AppButton variant="danger" block :loading="loggingOut" @click="logout"
                    >Log out</AppButton
                >
                <AppButton variant="ghost" block @click="confirmLogout = false">Cancel</AppButton>
            </div>
        </BottomSheet>
    </div>
</template>
