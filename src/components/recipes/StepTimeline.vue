<script setup lang="ts">
import { ArrowDown, ArrowUp, Hand, Pencil } from 'lucide-vue-next'
import { stepTitle } from '@/modules/recipes/options'
import { formatSeconds } from '@/modules/recipes/recipe'
import { pourRate } from '@/modules/recipes/steps'
import type { RecipeStep } from '@/types/models'

const props = withDefaults(
    defineProps<{ steps: RecipeStep[]; editable?: boolean; errors?: Record<number, string> }>(),
    { editable: false, errors: () => ({}) },
)

/** Pour-over: "15 s · 6.7 g/s" */
function timing(index: number): string | null {
    const duration = props.steps[index]?.duration_s
    if (duration == null) return null
    const rate = pourRate(props.steps, index)

    return rate === null ? `${duration} s` : `${duration} s · ${Math.round(rate * 10) / 10} g/s`
}

defineEmits<{ edit: [index: number]; move: [index: number, direction: -1 | 1] }>()
</script>

<template>
    <ol class="relative">
        <li
            v-for="(step, index) in steps"
            :key="step.id ?? index"
            class="relative flex gap-4 pb-4 last:pb-0"
        >
            <!-- Vertical line between the dots -->
            <span
                v-if="index < steps.length - 1"
                class="absolute top-10 bottom-0 left-[1.375rem] w-0.5 bg-border"
                aria-hidden="true"
            />

            <span
                class="tabular relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                :class="
                    step.at_s === null
                        ? 'bg-surface-muted text-text-muted'
                        : 'bg-accent text-accent-contrast'
                "
            >
                <Hand v-if="step.at_s === null" class="size-4" />
                <template v-else>{{ formatSeconds(step.at_s) }}</template>
            </span>

            <div
                class="min-w-0 flex-1 rounded-control bg-surface px-4 py-2.5"
                :class="errors[index] ? 'ring-2 ring-danger/60' : 'border border-border/60'"
            >
                <!-- A custom step without water reads best with its own text as the title. -->
                <template
                    v-if="step.type === 'custom' && step.text && step.target_water_g === null"
                >
                    <p class="font-semibold">{{ step.text }}</p>
                </template>
                <template v-else>
                    <p class="flex items-baseline justify-between gap-2">
                        <span class="font-semibold">{{ stepTitle(step) }}</span>
                        <span
                            v-if="timing(index)"
                            class="tabular shrink-0 text-xs font-semibold text-text-muted"
                            >{{ timing(index) }}</span
                        >
                    </p>
                    <p v-if="step.text" class="text-sm text-text-muted">{{ step.text }}</p>
                </template>
                <p v-if="errors[index]" class="mt-1 text-sm text-danger">{{ errors[index] }}</p>
            </div>

            <div v-if="editable" class="flex shrink-0 flex-col justify-center gap-0.5">
                <button
                    type="button"
                    class="pressable flex size-8 items-center justify-center rounded-full text-text-muted disabled:opacity-25"
                    :disabled="index === 0"
                    aria-label="Move up"
                    @click="$emit('move', index, -1)"
                >
                    <ArrowUp class="size-4" />
                </button>
                <button
                    type="button"
                    class="pressable flex size-8 items-center justify-center rounded-full text-accent"
                    aria-label="Edit step"
                    @click="$emit('edit', index)"
                >
                    <Pencil class="size-4" />
                </button>
                <button
                    type="button"
                    class="pressable flex size-8 items-center justify-center rounded-full text-text-muted disabled:opacity-25"
                    :disabled="index === steps.length - 1"
                    aria-label="Move down"
                    @click="$emit('move', index, 1)"
                >
                    <ArrowDown class="size-4" />
                </button>
            </div>
        </li>
    </ol>
</template>
