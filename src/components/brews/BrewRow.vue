<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Hourglass } from 'lucide-vue-next'
import MethodArt from '@/components/recipes/MethodArt.vue'
import StarRating from '@/components/ui/StarRating.vue'
import { brewTitle } from '@/modules/brews/brew'
import { formatBrewDate } from '@/modules/brews/format'
import { tasteLabel } from '@/modules/brews/options'
import type { Brew } from '@/types/models'

const props = defineProps<{ brew: Brew; coffeeName?: string | null }>()

const details = computed(() =>
    [props.coffeeName, `${Number(props.brew.dose_g)} g`].filter(Boolean).join(' · '),
)
</script>

<template>
    <RouterLink
        :to="`/brews/${brew.id}`"
        class="pressable flex items-center gap-3.5 rounded-card border border-border/60 bg-surface p-3 pr-4"
    >
        <div
            class="relative flex size-14 shrink-0 items-center justify-center rounded-[14px] bg-surface-muted text-text"
        >
            <MethodArt :method="brew.method" class="size-11" />
        </div>

        <div class="min-w-0 flex-1">
            <p class="truncate font-semibold">{{ brewTitle(brew) }}</p>
            <p class="truncate text-sm text-text-muted">{{ details }}</p>
            <p class="tabular mt-0.5 text-xs text-text-muted">
                {{ formatBrewDate(brew.started_at) }}
            </p>
        </div>

        <div class="flex shrink-0 flex-col items-end gap-1">
            <span
                v-if="brew.status === 'steeping'"
                class="flex items-center gap-1 rounded-full bg-accent/12 px-2.5 py-1 text-xs font-semibold text-accent"
            >
                <Hourglass class="size-3.5" /> Steeping
            </span>
            <StarRating v-else-if="brew.rating" :model-value="brew.rating" size="sm" readonly />
            <span
                v-else
                class="rounded-full bg-accent/12 px-2.5 py-1 text-xs font-semibold text-accent"
            >
                Rate it
            </span>
            <span v-if="brew.taste_tags.length" class="max-w-28 truncate text-xs text-text-muted">
                {{ brew.taste_tags.map(tasteLabel).join(', ') }}
            </span>
        </div>
    </RouterLink>
</template>
