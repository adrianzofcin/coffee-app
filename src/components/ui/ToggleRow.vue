<script setup lang="ts">
const model = defineModel<boolean>({ default: false })

defineProps<{ label: string; hint?: string }>()
</script>

<template>
    <button
        type="button"
        role="switch"
        :aria-checked="model"
        class="flex w-full items-center gap-3 py-2 text-left"
        @click="model = !model"
    >
        <span class="flex-1">
            <span class="block font-medium">{{ label }}</span>
            <span v-if="hint" class="block text-sm text-text-muted">{{ hint }}</span>
        </span>
        <span
            class="relative h-7 w-12 shrink-0 rounded-full transition-colors"
            :class="model ? 'bg-accent' : 'bg-border'"
        >
            <span
                class="absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform"
                :class="model ? 'translate-x-5' : ''"
            />
        </span>
    </button>
</template>
