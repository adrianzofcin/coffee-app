<script setup lang="ts">
import { useId } from 'vue'

const model = defineModel<string>({ default: '' })

withDefaults(
    defineProps<{
        label: string
        type?: string
        inputmode?: 'text' | 'decimal' | 'numeric' | 'search'
        placeholder?: string
        suffix?: string
        error?: string | null
        hint?: string | null
        multiline?: boolean
        autocapitalize?: string
    }>(),
    { type: 'text', inputmode: 'text', autocapitalize: 'sentences' },
)

const id = useId()
</script>

<template>
    <div>
        <label :for="id" class="mb-1.5 block text-sm font-medium text-text-muted">{{
            label
        }}</label>
        <div class="relative">
            <textarea
                v-if="multiline"
                :id="id"
                v-model="model"
                rows="3"
                :placeholder="placeholder"
                class="block w-full resize-none rounded-control border border-transparent bg-surface-muted px-4 py-3 outline-none placeholder:text-text-muted/70 focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/15"
            />
            <input
                v-else
                :id="id"
                v-model="model"
                :type="type"
                :inputmode="inputmode"
                :placeholder="placeholder"
                :autocapitalize="autocapitalize"
                class="h-13 w-full rounded-control border border-transparent bg-surface-muted px-4 outline-none placeholder:text-text-muted/70 focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/15"
                :class="[suffix ? 'pr-12' : '', error ? 'border-danger' : '']"
            />
            <span
                v-if="suffix"
                class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-text-muted"
            >
                {{ suffix }}
            </span>
        </div>
        <p v-if="error" class="mt-1.5 text-sm text-danger">{{ error }}</p>
        <p v-else-if="hint" class="tabular mt-1.5 text-sm text-text-muted">{{ hint }}</p>
    </div>
</template>
