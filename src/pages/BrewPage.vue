<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowRight, History } from 'lucide-vue-next'
import PageHeader from '@/components/layout/PageHeader.vue'
import EspressoCup from '@/components/illustrations/EspressoCup.vue'
import V60Dripper from '@/components/illustrations/V60Dripper.vue'
import ColdBrewJar from '@/components/illustrations/ColdBrewJar.vue'
import { useGreeting } from '@/composables/useGreeting'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const { greeting, today } = useGreeting()

const methods = [
    { key: 'espresso', name: 'Espresso', note: 'Bold & syrupy', ratio: '1:2', art: EspressoCup },
    { key: 'v60', name: 'V60', note: 'Clean & bright', ratio: '1:16', art: V60Dripper },
    { key: 'cold_brew', name: 'Cold Brew', note: 'Smooth & slow', ratio: '1:8', art: ColdBrewJar },
]
</script>

<template>
    <div>
        <PageHeader :title="greeting" :eyebrow="today">
            <template #title>
                {{ greeting }},<br />
                <span class="text-accent italic">{{ auth.username || 'barista' }}</span>
            </template>
        </PageHeader>

        <div class="space-y-8 px-5">
            <RouterLink
                to="/recipes"
                class="bg-espresso-panel animate-rise pressable relative block overflow-hidden rounded-card p-6 shadow-[0_20px_40px_-20px_rgb(23_17_13/0.6)]"
            >
                <EspressoCup class="absolute -right-4 -bottom-3 size-40 text-cream/90" />
                <p class="text-xs font-semibold tracking-[0.14em] text-accent uppercase">
                    Today's cup
                </p>
                <p
                    class="font-display font-soft mt-2 max-w-[11rem] text-[26px] leading-tight font-semibold"
                >
                    What are we brewing?
                </p>
                <span
                    class="bg-accent-gradient mt-6 inline-flex items-center gap-2 rounded-full py-2.5 pr-4 pl-5 text-sm font-semibold text-white"
                >
                    Choose recipe
                    <ArrowRight class="size-4" />
                </span>
            </RouterLink>

            <section class="animate-rise [animation-delay:80ms]">
                <h2 class="mb-3 flex items-baseline justify-between">
                    <span class="font-display font-soft text-xl font-semibold">Methods</span>
                    <span class="text-xs text-text-muted">swipe →</span>
                </h2>
                <div
                    class="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none]"
                >
                    <RouterLink
                        v-for="method in methods"
                        :key="method.key"
                        :to="`/recipes?method=${method.key}`"
                        class="pressable w-40 shrink-0 snap-start rounded-card border border-border/70 bg-surface p-4 shadow-[0_8px_20px_-14px_rgb(43_29_20/0.4)]"
                    >
                        <div class="relative mb-3 h-24 text-text">
                            <div
                                class="absolute inset-x-4 top-4 bottom-0 rounded-full bg-accent/10 blur-xl"
                            />
                            <component :is="method.art" class="relative mx-auto h-full" />
                        </div>
                        <p class="font-display font-soft text-lg leading-tight font-semibold">
                            {{ method.name }}
                        </p>
                        <p class="mt-0.5 flex items-center justify-between text-xs text-text-muted">
                            <span>{{ method.note }}</span>
                            <span class="tabular font-semibold text-accent">{{
                                method.ratio
                            }}</span>
                        </p>
                    </RouterLink>
                </div>
            </section>

            <section class="animate-rise [animation-delay:160ms]">
                <h2 class="font-display font-soft mb-3 text-xl font-semibold">Recent brews</h2>
                <div
                    class="flex items-center gap-4 rounded-card border border-dashed border-border p-5"
                >
                    <div
                        class="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent/12"
                    >
                        <History class="size-5 text-accent" />
                    </div>
                    <p class="text-sm leading-snug text-text-muted">
                        Your brew journal is empty. Every cup you make will land here, rated and
                        noted.
                    </p>
                </div>
            </section>
        </div>
    </div>
</template>
