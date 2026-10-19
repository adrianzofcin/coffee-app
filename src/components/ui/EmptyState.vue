<script setup lang="ts">
defineProps<{ title: string; text?: string; badge?: string }>()
</script>

<template>
    <div
        class="animate-rise mx-5 flex flex-col items-center rounded-card border border-dashed border-border px-8 py-10 text-center"
    >
        <div class="relative mb-5 size-36 text-text">
            <div class="absolute inset-4 rounded-full bg-accent/10 blur-2xl" />
            <slot name="art" />
        </div>
        <span
            v-if="badge"
            class="mb-3 rounded-full bg-accent/12 px-3 py-1 text-[11px] font-semibold tracking-wide text-accent uppercase"
        >
            {{ badge }}
        </span>
        <h2 class="font-display font-soft text-2xl font-semibold">{{ title }}</h2>
        <p v-if="text" class="mt-2 max-w-64 text-[15px] leading-relaxed text-text-muted">
            {{ text }}
        </p>
        <div v-if="$slots.default" class="mt-6">
            <slot />
        </div>
    </div>
</template>
