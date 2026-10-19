<script setup lang="ts">
import { Star } from 'lucide-vue-next'

const model = defineModel<number | null>({ default: null })

withDefaults(defineProps<{ size?: 'sm' | 'lg'; readonly?: boolean }>(), { size: 'lg' })

function set(value: number): void {
    // Tapping the current rating clears it.
    model.value = model.value === value ? null : value
}
</script>

<template>
    <div
        class="flex items-center"
        :class="size === 'lg' ? 'gap-1' : 'gap-0.5'"
        role="radiogroup"
        aria-label="Rating"
    >
        <component
            :is="readonly ? 'span' : 'button'"
            v-for="value in 5"
            :key="value"
            :type="readonly ? undefined : 'button'"
            :role="readonly ? undefined : 'radio'"
            :aria-checked="readonly ? undefined : model === value"
            :aria-label="`${value} star${value > 1 ? 's' : ''}`"
            :class="readonly ? '' : 'pressable p-0.5'"
            @click="!readonly && set(value)"
        >
            <Star
                :class="[
                    size === 'lg' ? 'size-7' : 'size-3.5',
                    (model ?? 0) >= value ? 'fill-accent text-accent' : 'text-border',
                ]"
                :stroke-width="1.75"
            />
        </component>
    </div>
</template>
