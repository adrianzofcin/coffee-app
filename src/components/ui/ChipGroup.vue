<script setup lang="ts" generic="T extends string | number">
const model = defineModel<T | null>({ default: null })

withDefaults(
    defineProps<{
        label?: string
        options: { value: T; label: string }[]
        deselectable?: boolean
    }>(),
    { deselectable: true },
)

function toggle(value: T, deselectable: boolean): void {
    model.value = model.value === value && deselectable ? null : value
}
</script>

<template>
    <div>
        <p v-if="label" class="mb-1.5 text-sm font-medium text-text-muted">{{ label }}</p>
        <div class="flex flex-wrap gap-2" role="radiogroup" :aria-label="label">
            <button
                v-for="option in options"
                :key="option.value"
                type="button"
                role="radio"
                :aria-checked="model === option.value"
                class="pressable h-10 rounded-full border px-4 text-sm font-semibold transition-colors"
                :class="
                    model === option.value
                        ? 'border-transparent bg-accent text-accent-contrast'
                        : 'border-border bg-surface text-text'
                "
                @click="toggle(option.value, deselectable)"
            >
                {{ option.label }}
            </button>
            <slot />
        </div>
    </div>
</template>
