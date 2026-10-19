<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { BarChart3, BookOpen, Coffee, Play, Settings } from 'lucide-vue-next'

const items = [
    { to: '/coffees', label: 'Coffees', icon: Coffee },
    { to: '/recipes', label: 'Recipes', icon: BookOpen },
    { to: '/brew', label: 'Brew', icon: Play, primary: true },
    { to: '/stats', label: 'Stats', icon: BarChart3 },
    { to: '/settings', label: 'Settings', icon: Settings },
]
</script>

<template>
    <nav
        class="fixed inset-x-0 bottom-0 z-30 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
        aria-label="Main"
    >
        <ul
            class="mx-auto grid h-16 max-w-md grid-cols-5 rounded-full border border-border/70 bg-surface/80 px-1 shadow-[0_12px_32px_-12px_rgb(43_29_20/0.35)] backdrop-blur-xl"
        >
            <li v-for="item in items" :key="item.to" class="flex">
                <RouterLink v-slot="{ href, navigate, isActive }" :to="item.to" custom>
                    <a
                        :href="href"
                        class="pressable flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold tracking-wide"
                        :class="isActive ? 'text-accent' : 'text-text-muted'"
                        :aria-current="isActive ? 'page' : undefined"
                        :aria-label="item.label"
                        @click="navigate"
                    >
                        <template v-if="item.primary">
                            <span
                                class="bg-accent-gradient -mt-8 flex size-14 items-center justify-center rounded-full text-white shadow-[0_10px_24px_-6px_var(--accent)] ring-[5px] ring-bg transition"
                                :class="isActive ? 'scale-105' : ''"
                            >
                                <Play
                                    class="size-6 translate-x-0.5 fill-current"
                                    :stroke-width="2"
                                />
                            </span>
                            <span class="mt-0.5">{{ item.label }}</span>
                        </template>
                        <template v-else>
                            <span
                                class="flex h-8 w-12 items-center justify-center rounded-full transition-colors"
                                :class="isActive ? 'bg-accent/12' : ''"
                            >
                                <component
                                    :is="item.icon"
                                    class="size-[22px]"
                                    :stroke-width="isActive ? 2.25 : 1.75"
                                />
                            </span>
                            <span>{{ item.label }}</span>
                        </template>
                    </a>
                </RouterLink>
            </li>
        </ul>
    </nav>
</template>
