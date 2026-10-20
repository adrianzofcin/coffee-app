<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Coffee, Copy, Ellipsis, Pencil, Play, Scale, Star, Trash2 } from 'lucide-vue-next'
import SubPageHeader from '@/components/layout/SubPageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import MethodArt from '@/components/recipes/MethodArt.vue'
import ScaleSheet from '@/components/recipes/ScaleSheet.vue'
import StepTimeline from '@/components/recipes/StepTimeline.vue'
import { withoutSystemFields } from '@/lib/data/repository'
import { useCoffees } from '@/modules/coffees/useCoffees'
import {
    createRecipe,
    deleteRecipe,
    duplicateRecipe,
    setFavorite,
    updateRecipe,
} from '@/modules/recipes/actions'
import { methodLabel, STEEP_PLACES } from '@/modules/recipes/options'
import {
    formatMinutes,
    formatRatio,
    formatSeconds,
    ratio,
    type ScalableRecipe,
} from '@/modules/recipes/recipe'
import { isPourOver, pourOverSteps } from '@/modules/recipes/steps'
import { useRecipes } from '@/modules/recipes/useRecipes'

const route = useRoute()
const router = useRouter()
const { recipes, loaded } = useRecipes()
const { coffees } = useCoffees()

const recipe = computed(() => recipes.value.find((r) => r.id === route.params.id) ?? null)
/** Older pour-over recipes are shown with durations, as the editor will save them. */
const steps = computed(() => {
    const r = recipe.value
    if (!r) return []

    return isPourOver(r.method) ? pourOverSteps(r.steps) : r.steps
})
const coffee = computed(() =>
    recipe.value?.coffee_id
        ? (coffees.value.find((c) => c.id === recipe.value!.coffee_id && !c.deleted_at) ?? null)
        : null,
)

watch([loaded, recipe], ([isLoaded, current]) => {
    if (isLoaded && !current) void router.replace('/recipes')
})

const params = computed(() => {
    const r = recipe.value
    if (!r) return []

    const espresso = r.method === 'espresso'
    const time = (() => {
        if (r.method === 'cold_brew')
            return r.steep_time_min ? formatMinutes(r.steep_time_min) : null
        if (espresso && r.target_time_s) {
            return r.target_time_max_s && r.target_time_max_s !== r.target_time_s
                ? `${r.target_time_s}–${r.target_time_max_s} s`
                : `${r.target_time_s} s`
        }
        return r.target_time_s ? formatSeconds(r.target_time_s) : null
    })()

    return [
        { label: 'Dose', value: `${Number(r.dose_g)} g` },
        espresso
            ? { label: 'Yield', value: r.yield_g ? `${Number(r.yield_g)} g` : null }
            : { label: 'Water', value: r.water_g ? `${Number(r.water_g)} g` : null },
        { label: 'Ratio', value: formatRatio(ratio(r)) },
        { label: r.method === 'cold_brew' ? 'Steep' : 'Time', value: time },
        { label: 'Water temp', value: r.temperature_c !== null ? `${r.temperature_c} °C` : null },
        {
            label: 'Pre-infusion',
            value: espresso && r.preinfusion_s ? `${r.preinfusion_s} s` : null,
        },
        {
            label: 'Steep in',
            value: STEEP_PLACES.find((p) => p.value === r.steep_place)?.label ?? null,
        },
        { label: 'Dilute', value: r.dilution ? `1:${Number(r.dilution)}` : null },
        { label: 'Grind', value: r.grind_setting, wide: true },
    ].filter((p) => p.value)
})

const menuOpen = ref(false)
const scaleOpen = ref(false)
const confirmDelete = ref(false)
const busy = ref(false)

async function duplicate(): Promise<void> {
    menuOpen.value = false
    const id = await duplicateRecipe(recipe.value!.id)
    await router.push(`/recipes/${id}/edit`)
}

async function saveScaledCopy(scaled: ScalableRecipe): Promise<void> {
    const id = await createRecipe({
        ...withoutSystemFields(recipe.value!),
        ...scaled,
        name: `${recipe.value!.name} (${scaled.dose_g} g)`.slice(0, 100),
        is_favorite: false,
        last_brewed_at: null,
    })
    await router.replace(`/recipes/${id}`)
}

async function updateScaled(scaled: ScalableRecipe): Promise<void> {
    await updateRecipe(recipe.value!.id, {
        dose_g: scaled.dose_g,
        water_g: scaled.water_g,
        yield_g: scaled.yield_g,
        steps: scaled.steps,
    })
}

async function remove(): Promise<void> {
    busy.value = true
    await deleteRecipe(recipe.value!.id)
    await router.replace('/recipes')
}
</script>

<template>
    <div v-if="recipe" class="pb-32">
        <section class="bg-espresso-panel relative overflow-hidden rounded-b-[32px] pb-8">
            <SubPageHeader transparent back="/recipes">
                <template #actions>
                    <button
                        type="button"
                        class="pressable flex size-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur"
                        :aria-label="
                            recipe.is_favorite ? 'Remove from favourites' : 'Add to favourites'
                        "
                        :aria-pressed="recipe.is_favorite"
                        @click="setFavorite(recipe, !recipe.is_favorite)"
                    >
                        <Star
                            class="size-5"
                            :class="recipe.is_favorite ? 'fill-accent text-accent' : ''"
                        />
                    </button>
                    <button
                        type="button"
                        class="pressable flex size-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur"
                        aria-label="More"
                        @click="menuOpen = true"
                    >
                        <Ellipsis class="size-5" />
                    </button>
                </template>
            </SubPageHeader>

            <div class="animate-rise flex items-end gap-4 px-5 pt-2">
                <div class="min-w-0 flex-1">
                    <p class="text-xs font-semibold tracking-[0.14em] text-accent uppercase">
                        {{ methodLabel(recipe.method) }}
                    </p>
                    <h1 class="font-display font-soft mt-1 text-[32px] leading-tight font-semibold">
                        {{ recipe.name }}
                    </h1>
                    <RouterLink
                        v-if="coffee"
                        :to="`/coffees/${coffee.id}`"
                        class="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full bg-cream/10 px-3 py-1.5 text-sm"
                    >
                        <Coffee class="size-4 shrink-0 text-accent" />
                        <span class="truncate">{{ coffee.name }}</span>
                    </RouterLink>
                </div>
                <MethodArt :method="recipe.method" class="size-28 shrink-0 text-cream/90" />
            </div>
        </section>

        <div class="space-y-7 px-5 pt-6">
            <dl class="animate-rise grid grid-cols-3 gap-2">
                <div
                    v-for="param in params"
                    :key="param.label"
                    class="rounded-control bg-surface-muted px-3 py-2.5"
                    :class="param.wide ? 'col-span-3' : ''"
                >
                    <dt class="text-xs text-text-muted">{{ param.label }}</dt>
                    <dd class="tabular truncate font-semibold">{{ param.value }}</dd>
                </div>
            </dl>

            <section v-if="recipe.steps.length" class="animate-rise [animation-delay:60ms]">
                <h2 class="font-display font-soft mb-3 text-xl font-semibold">Steps</h2>
                <StepTimeline :steps="steps" />
            </section>

            <section v-if="recipe.notes" class="animate-rise [animation-delay:90ms]">
                <h2
                    class="mb-2.5 text-xs font-semibold tracking-[0.14em] text-text-muted uppercase"
                >
                    Notes
                </h2>
                <p class="font-display text-lg leading-relaxed whitespace-pre-line italic">
                    “{{ recipe.notes }}”
                </p>
            </section>
        </div>

        <Teleport to="body">
            <div
                class="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg border-t border-border/50 bg-bg/90 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl"
            >
                <AppButton block @click="router.push(`/brew/new?recipe=${recipe.id}`)">
                    <Play class="size-5 fill-current" /> Brew
                </AppButton>
            </div>
        </Teleport>

        <BottomSheet v-model:open="menuOpen">
            <div class="space-y-1">
                <RouterLink :to="`/recipes/${recipe.id}/edit`" class="sheet-row"
                    ><Pencil /> Edit recipe</RouterLink
                >
                <button type="button" class="sheet-row" @click="duplicate">
                    <Copy /> Duplicate
                </button>
                <button
                    type="button"
                    class="sheet-row"
                    @click="((menuOpen = false), (scaleOpen = true))"
                >
                    <Scale /> Scale to another dose
                </button>
                <button
                    type="button"
                    class="sheet-row text-danger"
                    @click="((menuOpen = false), (confirmDelete = true))"
                >
                    <Trash2 /> Delete recipe
                </button>
            </div>
        </BottomSheet>

        <ScaleSheet
            v-model:open="scaleOpen"
            :recipe="recipe"
            primary="Save as new recipe"
            secondary="Update this recipe"
            @primary="saveScaledCopy"
            @secondary="updateScaled"
        />

        <BottomSheet v-model:open="confirmDelete" title="Delete this recipe?">
            <p class="mb-5 text-text-muted">Brews you logged with it stay in your history.</p>
            <div class="space-y-2">
                <AppButton variant="danger" block :loading="busy" @click="remove"
                    >Delete recipe</AppButton
                >
                <AppButton variant="ghost" block @click="confirmDelete = false">Cancel</AppButton>
            </div>
        </BottomSheet>
    </div>
</template>

<style scoped>
@reference '@/assets/main.css';

.sheet-row {
    @apply pressable flex h-13 w-full items-center gap-3 rounded-control px-3 text-left font-medium active:bg-surface-muted;
}

.sheet-row :deep(svg) {
    @apply size-5 shrink-0;
}
</style>
