<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Plus } from 'lucide-vue-next'
import PageHeader from '@/components/layout/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import RecipeCardArt from '@/components/illustrations/RecipeCard.vue'
import RecipeCard from '@/components/recipes/RecipeCard.vue'
import SyncIndicator from '@/components/SyncIndicator.vue'
import { useCoffees } from '@/modules/coffees/useCoffees'
import { METHODS } from '@/modules/recipes/options'
import { useRecipes } from '@/modules/recipes/useRecipes'
import type { BrewMethod } from '@/types/models'

const route = useRoute()
const router = useRouter()
const { recipes, loaded } = useRecipes()
const { coffees } = useCoffees()

const filters: { value: BrewMethod | null; label: string }[] = [
    { value: null, label: 'All' },
    ...METHODS.map((m) => ({ value: m.value, label: m.label })),
]

// The filter lives in the URL, so the Brew home tiles can link straight to a method.
const method = computed<BrewMethod | null>({
    get: () => {
        const value = route.query.method
        return METHODS.some((m) => m.value === value) ? (value as BrewMethod) : null
    },
    set: (value) => void router.replace({ query: value ? { method: value } : {} }),
})

const visible = computed(() =>
    method.value ? recipes.value.filter((r) => r.method === method.value) : recipes.value,
)

const coffeeNames = computed(
    () => new Map(coffees.value.filter((c) => !c.deleted_at).map((c) => [c.id, c.name])),
)

const newRecipeLink = computed(() =>
    method.value ? `/recipes/new?method=${method.value}` : '/recipes/new',
)
</script>

<template>
    <div>
        <PageHeader title="Recipes" eyebrow="Your playbook">
            <template #actions>
                <SyncIndicator />
                <RouterLink
                    :to="newRecipeLink"
                    class="pressable bg-accent-gradient flex size-11 items-center justify-center rounded-full text-white shadow-[0_8px_18px_-8px_var(--accent)]"
                    aria-label="New recipe"
                >
                    <Plus class="size-6" />
                </RouterLink>
            </template>
        </PageHeader>

        <EmptyState
            v-if="loaded && recipes.length === 0"
            title="No recipes yet"
            text="Write down how you like your espresso, V60 or cold brew."
        >
            <template #art><RecipeCardArt class="relative size-full" /></template>
            <RouterLink
                to="/recipes/new"
                class="pressable bg-accent-gradient inline-flex items-center gap-2 rounded-full px-5 py-3 font-semibold text-white"
            >
                <Plus class="size-5" /> New recipe
            </RouterLink>
        </EmptyState>

        <div v-else-if="loaded" class="space-y-4 px-5">
            <div
                class="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]"
                role="radiogroup"
                aria-label="Method"
            >
                <button
                    v-for="filter in filters"
                    :key="filter.label"
                    type="button"
                    role="radio"
                    :aria-checked="method === filter.value"
                    class="pressable h-10 shrink-0 rounded-full border px-4 text-sm font-semibold"
                    :class="
                        method === filter.value
                            ? 'border-transparent bg-accent text-accent-contrast'
                            : 'border-border text-text-muted'
                    "
                    @click="method = filter.value"
                >
                    {{ filter.label }}
                </button>
            </div>

            <TransitionGroup
                tag="div"
                class="space-y-3"
                move-class="transition-transform duration-300"
            >
                <RecipeCard
                    v-for="recipe in visible"
                    :key="recipe.id"
                    :recipe="recipe"
                    :coffee-name="recipe.coffee_id ? coffeeNames.get(recipe.coffee_id) : null"
                />
            </TransitionGroup>

            <p v-if="visible.length === 0" class="py-10 text-center text-sm text-text-muted">
                No {{ filters.find((f) => f.value === method)?.label }} recipes yet.
                <RouterLink :to="newRecipeLink" class="font-semibold text-accent"
                    >Create one</RouterLink
                >
            </p>
        </div>
    </div>
</template>
