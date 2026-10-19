<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Snowflake } from 'lucide-vue-next'
import CoffeeArt from './CoffeeArt.vue'
import StarRating from '@/components/ui/StarRating.vue'
import { countryFlag, formatGrams } from '@/modules/coffees/options'
import type { CoffeeView } from '@/modules/coffees/balance'

const props = defineProps<{ view: CoffeeView }>()

const coffee = computed(() => props.view.coffee)
const fraction = computed(() =>
    props.view.totalWeight > 0 ? props.view.remaining / props.view.totalWeight : 0,
)
const current = computed(() => props.view.currentBag)
const frozen = computed(() => props.view.activeBags.some((b) => b.bag.is_frozen))
const flag = computed(() => countryFlag(coffee.value.country))
const low = computed(() => props.view.isActive && fraction.value < 0.15)
</script>

<template>
    <RouterLink
        :to="`/coffees/${coffee.id}`"
        class="pressable flex gap-4 rounded-card border border-border/60 bg-surface p-3 shadow-[0_8px_20px_-16px_rgb(43_29_20/0.5)]"
    >
        <CoffeeArt
            :photo-path="coffee.photo_path"
            :roast-level="coffee.roast_level"
            class="size-24 shrink-0 rounded-[14px]"
        />

        <div class="flex min-w-0 flex-1 flex-col py-0.5">
            <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                    <p
                        class="truncate text-xs font-semibold tracking-wide text-text-muted uppercase"
                    >
                        <span v-if="flag" class="mr-1 normal-case">{{ flag }}</span
                        >{{ coffee.roaster }}
                    </p>
                    <p class="font-display font-soft truncate text-lg leading-snug font-semibold">
                        {{ coffee.name }}
                    </p>
                </div>
                <StarRating
                    v-if="coffee.rating"
                    :model-value="coffee.rating"
                    size="sm"
                    readonly
                    class="mt-1 shrink-0"
                />
            </div>

            <div class="mt-auto">
                <div class="mb-1.5 flex items-baseline justify-between text-sm">
                    <span class="tabular">
                        <strong class="text-base font-semibold" :class="low ? 'text-warning' : ''">
                            {{ formatGrams(view.remaining) }}
                        </strong>
                        <span v-if="view.isActive" class="text-text-muted">
                            / {{ formatGrams(view.totalWeight) }}</span
                        >
                    </span>
                    <span class="flex items-center gap-1.5 text-xs text-text-muted">
                        <Snowflake v-if="frozen" class="size-3.5 text-accent" />
                        <span
                            v-if="view.activeBags.length > 1"
                            class="rounded-full bg-surface-muted px-1.5 py-0.5"
                        >
                            {{ view.activeBags.length }} bags
                        </span>
                        <span v-if="current" class="tabular">Day {{ current.daysSinceRoast }}</span>
                        <span v-else>Finished</span>
                    </span>
                </div>
                <div class="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                    <div
                        class="h-full rounded-full transition-[width] duration-500"
                        :class="low ? 'bg-warning' : 'bg-accent-gradient'"
                        :style="{ width: `${Math.round(fraction * 100)}%` }"
                    />
                </div>
            </div>
        </div>
    </RouterLink>
</template>
