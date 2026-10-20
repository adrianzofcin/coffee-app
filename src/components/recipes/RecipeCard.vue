<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Coffee, Play, Star } from 'lucide-vue-next'
import MethodArt from './MethodArt.vue'
import { setFavorite } from '@/modules/recipes/actions'
import { methodLabel } from '@/modules/recipes/options'
import { recipeSummary } from '@/modules/recipes/recipe'
import type { Recipe } from '@/types/models'

defineProps<{ recipe: Recipe; coffeeName?: string | null }>()
</script>

<template>
    <div
        class="relative flex items-center gap-4 rounded-card border border-border/60 bg-surface p-3 pr-4 shadow-[0_8px_20px_-16px_rgb(43_29_20/0.5)]"
    >
        <RouterLink
            :to="`/recipes/${recipe.id}`"
            class="absolute inset-0 rounded-card"
            :aria-label="recipe.name"
        />

        <div
            class="relative flex size-20 shrink-0 items-center justify-center rounded-[14px] bg-surface-muted text-text"
        >
            <div class="absolute inset-3 rounded-full bg-accent/12 blur-lg" />
            <MethodArt :method="recipe.method" class="relative size-16" />
        </div>

        <div class="pointer-events-none relative min-w-0 flex-1">
            <p class="text-xs font-semibold tracking-wide text-accent uppercase">
                {{ methodLabel(recipe.method) }}
            </p>
            <p class="font-display font-soft truncate text-lg leading-snug font-semibold">
                {{ recipe.name }}
            </p>
            <p class="tabular mt-0.5 text-sm text-text-muted">{{ recipeSummary(recipe) }}</p>
            <p
                v-if="coffeeName"
                class="mt-1 flex items-center gap-1 truncate text-xs text-text-muted"
            >
                <Coffee class="size-3.5 shrink-0" /> {{ coffeeName }}
            </p>
        </div>

        <div class="relative flex flex-col items-center gap-2">
            <button
                type="button"
                class="pressable flex size-9 items-center justify-center rounded-full"
                :aria-label="recipe.is_favorite ? 'Remove from favourites' : 'Add to favourites'"
                :aria-pressed="recipe.is_favorite"
                @click="setFavorite(recipe, !recipe.is_favorite)"
            >
                <Star
                    class="size-5"
                    :class="recipe.is_favorite ? 'fill-accent text-accent' : 'text-border'"
                    :stroke-width="1.75"
                />
            </button>
            <RouterLink
                :to="`/brew/new?recipe=${recipe.id}`"
                class="pressable bg-accent-gradient flex size-9 items-center justify-center rounded-full text-white shadow-[0_6px_14px_-6px_var(--accent)]"
                :aria-label="`Brew ${recipe.name}`"
            >
                <Play class="size-4 translate-x-px fill-current" />
            </RouterLink>
        </div>
    </div>
</template>
