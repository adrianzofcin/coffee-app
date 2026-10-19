<script setup lang="ts">
defineProps<{ title: string; eyebrow?: string }>()
</script>

<template>
    <header class="px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-4">
        <div class="flex items-end justify-between gap-3">
            <div class="min-w-0">
                <p
                    v-if="eyebrow"
                    class="mb-1 text-xs font-semibold tracking-[0.14em] text-accent uppercase"
                >
                    {{ eyebrow }}
                </p>
                <h1
                    class="font-display font-soft text-[34px] leading-[1.05] font-semibold tracking-tight"
                >
                    <slot name="title">{{ title }}</slot>
                </h1>
            </div>
            <div class="flex shrink-0 items-center gap-2">
                <slot name="actions" />
            </div>
        </div>
    </header>
</template>
