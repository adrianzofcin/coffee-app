<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ChevronLeft } from 'lucide-vue-next'

const props = defineProps<{ title?: string; back?: string; transparent?: boolean }>()
const router = useRouter()

function goBack(): void {
    // Opened directly (e.g. after a reload): there is no history to return to.
    if (window.history.state?.back) router.back()
    else void router.replace(props.back ?? '/')
}
</script>

<template>
    <header
        class="sticky top-0 z-20 pt-safe"
        :class="transparent ? '' : 'border-b border-border/50 bg-bg/85 backdrop-blur-xl'"
    >
        <div class="flex h-14 items-center gap-2 px-3">
            <button
                type="button"
                class="pressable flex size-10 items-center justify-center rounded-full"
                :class="transparent ? 'bg-black/30 text-white backdrop-blur' : 'text-text'"
                aria-label="Back"
                @click="goBack"
            >
                <ChevronLeft class="size-6" />
            </button>
            <h1 v-if="title" class="font-display font-soft flex-1 truncate text-lg font-semibold">
                {{ title }}
            </h1>
            <div v-else class="flex-1" />
            <slot name="actions" />
        </div>
    </header>
</template>
