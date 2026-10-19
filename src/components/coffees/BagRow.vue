<script setup lang="ts">
import { computed } from 'vue'
import { Snowflake } from 'lucide-vue-next'
import { formatGrams } from '@/modules/coffees/options'
import { formatShortDate } from '@/modules/coffees/format'
import type { BagView } from '@/modules/coffees/balance'

const props = defineProps<{ view: BagView }>()

const status = computed(() => {
    const labels = { sealed: 'Sealed', open: 'Open', finished: 'Finished' }

    return labels[props.view.bag.status]
})
</script>

<template>
    <button
        type="button"
        class="pressable flex w-full items-center gap-4 rounded-card border border-border/60 bg-surface p-4 text-left"
        :class="view.bag.status === 'finished' ? 'opacity-60' : ''"
    >
        <div class="relative size-12 shrink-0">
            <svg viewBox="0 0 36 36" class="size-full -rotate-90">
                <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    class="stroke-surface-muted"
                    stroke-width="4"
                />
                <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    class="stroke-accent"
                    stroke-width="4"
                    stroke-linecap="round"
                    :stroke-dasharray="`${view.fraction * 97.4} 97.4`"
                />
            </svg>
            <Snowflake
                v-if="view.bag.is_frozen"
                class="absolute inset-0 m-auto size-4 text-accent"
            />
        </div>

        <div class="min-w-0 flex-1">
            <p class="font-semibold">
                Roasted {{ formatShortDate(view.bag.roast_date) }}
                <span class="tabular font-normal text-text-muted"
                    >· Day {{ view.daysSinceRoast }}</span
                >
            </p>
            <p class="mt-0.5 flex items-center gap-2 text-sm text-text-muted">
                <span
                    class="rounded-full px-2 py-0.5 text-xs font-semibold"
                    :class="
                        view.bag.status === 'open' ? 'bg-accent/15 text-accent' : 'bg-surface-muted'
                    "
                >
                    {{ status }}
                </span>
                <span v-if="view.bag.price !== null" class="tabular"
                    >{{ view.bag.price.toFixed(2) }} €</span
                >
            </p>
        </div>

        <p class="tabular text-right">
            <span class="block font-semibold">{{ formatGrams(view.remaining) }}</span>
            <span class="text-xs text-text-muted">of {{ formatGrams(view.bag.weight_g) }}</span>
        </p>
    </button>
</template>
