<script setup lang="ts">
import { computed, ref } from 'vue'
import TextField from './TextField.vue'

const model = defineModel<string>({ default: '' })

const props = withDefaults(
    defineProps<{
        label: string
        suggestions: { value: string; prefix?: string }[]
        placeholder?: string
        error?: string | null
        limit?: number
    }>(),
    { limit: 8 },
)

const focused = ref(false)

const visible = computed(() => {
    const needle = model.value.trim().toLowerCase()

    return props.suggestions
        .filter((item) => item.value.toLowerCase() !== needle)
        .filter((item) => !needle || item.value.toLowerCase().includes(needle))
        .slice(0, props.limit)
})

function pick(value: string): void {
    model.value = value
}
</script>

<template>
    <div @focusin="focused = true" @focusout="focused = false">
        <TextField
            v-model="model"
            :label="label"
            :placeholder="placeholder"
            :error="error"
            autocapitalize="words"
        />
        <div
            v-if="visible.length > 0 && (focused || !model)"
            class="-mx-1 mt-2 flex flex-wrap gap-1.5 px-1"
        >
            <!-- mousedown keeps the input focused, so the chips do not vanish before the tap lands -->
            <button
                v-for="item in visible"
                :key="item.value"
                type="button"
                class="pressable rounded-full border border-border bg-surface px-3 py-1.5 text-sm"
                @mousedown.prevent
                @click="pick(item.value)"
            >
                <span v-if="item.prefix" class="mr-1">{{ item.prefix }}</span
                >{{ item.value }}
            </button>
        </div>
    </div>
</template>
