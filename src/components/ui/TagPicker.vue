<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus, X } from 'lucide-vue-next'

const model = defineModel<string[]>({ default: () => [] })

const props = defineProps<{ label: string; suggestions: string[] }>()

const custom = ref('')

const options = computed(() => {
    const selected = new Set(model.value.map((tag) => tag.toLowerCase()))

    return props.suggestions.filter((tag) => !selected.has(tag.toLowerCase()))
})

function add(tag: string): void {
    const value = tag.trim()
    if (!value || model.value.some((t) => t.toLowerCase() === value.toLowerCase())) return

    model.value = [...model.value, value]
}

function remove(tag: string): void {
    model.value = model.value.filter((t) => t !== tag)
}

function addCustom(): void {
    add(custom.value)
    custom.value = ''
}
</script>

<template>
    <div>
        <p class="mb-1.5 text-sm font-medium text-text-muted">{{ label }}</p>
        <div v-if="model.length" class="mb-2 flex flex-wrap gap-1.5">
            <button
                v-for="tag in model"
                :key="tag"
                type="button"
                class="pressable flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-contrast"
                @click="remove(tag)"
            >
                {{ tag }}
                <X class="size-3.5" />
            </button>
        </div>
        <div class="flex flex-wrap gap-1.5">
            <button
                v-for="tag in options"
                :key="tag"
                type="button"
                class="pressable rounded-full border border-border bg-surface px-3 py-1.5 text-sm"
                @click="add(tag)"
            >
                {{ tag }}
            </button>
        </div>
        <form class="mt-2 flex gap-2" @submit.prevent="addCustom">
            <input
                v-model="custom"
                placeholder="Add your own…"
                class="h-11 min-w-0 flex-1 rounded-full border border-transparent bg-surface-muted px-4 outline-none focus:border-accent"
            />
            <button
                type="submit"
                class="pressable flex size-11 items-center justify-center rounded-full bg-surface-muted text-accent disabled:opacity-40"
                :disabled="!custom.trim()"
                aria-label="Add tag"
            >
                <Plus class="size-5" />
            </button>
        </form>
    </div>
</template>
