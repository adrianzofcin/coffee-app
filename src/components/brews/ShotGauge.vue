<script setup lang="ts">
import { computed } from 'vue'
import { shotZone } from '@/modules/brews/timer'

const props = defineProps<{
    elapsedMs: number
    min: number | null
    max: number | null
    preinfusion: number | null
}>()

const CIRCUMFERENCE = 2 * Math.PI * 45

const seconds = computed(() => props.elapsedMs / 1000)
/** The dial runs a bit past the band, so "over" is still visible. */
const scale = computed(() => Math.max((props.max ?? props.min ?? 30) + 15, 40))
const zone = computed(() => shotZone(seconds.value, props.min, props.max, props.preinfusion))

const arc = (from: number, to: number) => {
    const start = Math.min(from / scale.value, 1)
    const length = Math.max(Math.min(to / scale.value, 1) - start, 0)

    return {
        'stroke-dasharray': `${length * CIRCUMFERENCE} ${CIRCUMFERENCE}`,
        'stroke-dashoffset': `${-start * CIRCUMFERENCE}`,
    }
}

const tone = computed(
    () =>
        ({
            preinfusion: 'text-cream/50',
            under: 'text-cream',
            in: 'text-success',
            over: 'text-warning',
        })[zone.value],
)

const label = computed(
    () =>
        ({
            preinfusion: 'Pre-infusion',
            under: props.min ? `Target ${props.min}–${props.max ?? props.min} s` : 'Shot',
            in: 'In the zone',
            over: 'Over target',
        })[zone.value],
)
</script>

<template>
    <div class="relative aspect-square w-full max-w-72">
        <svg viewBox="0 0 100 100" class="size-full -rotate-90">
            <circle cx="50" cy="50" r="45" fill="none" class="stroke-cream/10" stroke-width="6" />
            <circle
                v-if="min"
                cx="50"
                cy="50"
                r="45"
                fill="none"
                class="stroke-success/35"
                stroke-width="6"
                v-bind="arc(min, max ?? min + 1)"
            />
            <circle
                v-if="preinfusion"
                cx="50"
                cy="50"
                r="45"
                fill="none"
                class="stroke-cream/25"
                stroke-width="6"
                v-bind="arc(0, preinfusion)"
            />
            <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                stroke-width="6"
                stroke-linecap="round"
                :class="tone"
                class="transition-[stroke-dasharray] duration-100"
                v-bind="arc(0, seconds)"
            />
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
            <p class="tabular font-display text-6xl font-semibold" :class="tone">
                {{ seconds.toFixed(1) }}
            </p>
            <p class="mt-1 text-sm font-semibold tracking-wide text-cream/70 uppercase">
                {{ label }}
            </p>
        </div>
    </div>
</template>
