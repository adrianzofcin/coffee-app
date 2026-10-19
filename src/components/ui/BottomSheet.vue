<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })

defineProps<{ title?: string }>()
</script>

<template>
    <Teleport to="body">
        <Transition
            enter-from-class="opacity-0"
            leave-to-class="opacity-0"
            enter-active-class="transition-opacity duration-200"
            leave-active-class="transition-opacity duration-200"
        >
            <div v-if="open" class="fixed inset-0 z-40 bg-black/40" @click="open = false" />
        </Transition>
        <Transition
            enter-from-class="translate-y-full"
            leave-to-class="translate-y-full"
            enter-active-class="transition-transform duration-250 ease-out"
            leave-active-class="transition-transform duration-200 ease-in"
        >
            <div
                v-if="open"
                class="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-card bg-surface px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl"
                role="dialog"
                aria-modal="true"
                :aria-label="title"
            >
                <div class="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />
                <h2 v-if="title" class="mb-3 text-lg font-semibold">{{ title }}</h2>
                <slot />
            </div>
        </Transition>
    </Teleport>
</template>
