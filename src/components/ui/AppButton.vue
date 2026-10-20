<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next'

withDefaults(
    defineProps<{
        variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
        type?: 'button' | 'submit'
        block?: boolean
        loading?: boolean
        disabled?: boolean
    }>(),
    { variant: 'primary', type: 'button' },
)

const variants = {
    primary: 'bg-accent-gradient text-white shadow-[0_10px_24px_-10px_var(--accent)]',
    secondary: 'bg-surface-muted text-text',
    danger: 'bg-danger text-white',
    ghost: 'text-accent',
}
</script>

<template>
    <button
        :type="type"
        :disabled="disabled || loading"
        class="pressable inline-flex min-h-13 items-center justify-center gap-2 rounded-control px-5 text-base font-semibold disabled:opacity-45 disabled:shadow-none [&>svg]:shrink-0"
        :class="[variants[variant], { 'w-full': block }]"
    >
        <LoaderCircle v-if="loading" class="size-5 animate-spin" />
        <slot />
    </button>
</template>
