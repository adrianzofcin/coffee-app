<script setup lang="ts">
import { TASTE_TAGS } from '@/modules/brews/options'

const model = defineModel<string[]>({ default: () => [] })

function toggle(value: string): void {
    model.value = model.value.includes(value)
        ? model.value.filter((tag) => tag !== value)
        : [...model.value, value]
}
</script>

<template>
    <div>
        <p class="mb-1.5 text-sm font-medium text-text-muted">Taste</p>
        <div class="flex flex-wrap gap-2">
            <button
                v-for="tag in TASTE_TAGS"
                :key="tag.value"
                type="button"
                :aria-pressed="model.includes(tag.value)"
                class="pressable h-10 rounded-full border px-4 text-sm font-semibold transition-colors"
                :class="
                    model.includes(tag.value)
                        ? 'border-transparent bg-accent text-accent-contrast'
                        : 'border-border bg-surface text-text'
                "
                @click="toggle(tag.value)"
            >
                {{ tag.label }}
            </button>
        </div>
    </div>
</template>
