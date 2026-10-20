<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { BookOpen, Coffee, Ellipsis, Pencil, Play, Trash2 } from 'lucide-vue-next'
import SubPageHeader from '@/components/layout/SubPageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import StarRating from '@/components/ui/StarRating.vue'
import SteepingPanel from '@/components/brews/SteepingPanel.vue'
import MethodArt from '@/components/recipes/MethodArt.vue'
import StepTimeline from '@/components/recipes/StepTimeline.vue'
import { deleteBrew, rateBrew } from '@/modules/brews/actions'
import { brewTitle } from '@/modules/brews/brew'
import { formatBrewDate } from '@/modules/brews/format'
import { tasteLabel } from '@/modules/brews/options'
import { useBrews, useShelf } from '@/modules/brews/useBrews'
import { methodLabel } from '@/modules/recipes/options'
import { formatMinutes, formatRatio, formatSeconds, ratio } from '@/modules/recipes/recipe'
import { useRecipes } from '@/modules/recipes/useRecipes'

const route = useRoute()
const router = useRouter()
const { brews, loaded } = useBrews()
const { coffeeOf } = useShelf()
const { recipes } = useRecipes()

const brew = computed(() => brews.value.find((b) => b.id === route.params.id) ?? null)
const coffee = computed(() => (brew.value?.bag_id ? coffeeOf.value.get(brew.value.bag_id) : null))
const recipe = computed(() => recipes.value.find((r) => r.id === brew.value?.recipe_id) ?? null)

watch([loaded, brew], ([isLoaded, current]) => {
    if (isLoaded && !current) void router.replace('/brew')
})

const rating = computed({
    get: () => brew.value?.rating ?? null,
    set: (value) => brew.value && void rateBrew(brew.value.id, value),
})

const params = computed(() => {
    const b = brew.value
    if (!b) return []

    const s = b.recipe_snapshot
    const espresso = b.method === 'espresso'
    const amounts = { method: b.method, dose_g: b.dose_g, water_g: b.water_g, yield_g: b.yield_g }
    const steep =
        b.method === 'cold_brew' && b.finished_at
            ? formatMinutes(
                  Math.round((Date.parse(b.finished_at) - Date.parse(b.started_at)) / 60_000),
              )
            : null

    return [
        { label: 'Dose', value: `${Number(b.dose_g)} g` },
        espresso
            ? { label: 'Yield', value: b.yield_g ? `${Number(b.yield_g)} g` : null }
            : { label: 'Water', value: b.water_g ? `${Number(b.water_g)} g` : null },
        { label: 'Ratio', value: formatRatio(ratio(amounts)) },
        b.method === 'cold_brew'
            ? { label: 'Steeped', value: steep }
            : {
                  label: 'Time',
                  value: b.brew_time_s !== null ? formatSeconds(b.brew_time_s) : null,
              },
        { label: 'Water temp', value: s?.temperature_c != null ? `${s.temperature_c} °C` : null },
        { label: 'Grind', value: s?.grind_setting ?? null, wide: true },
    ].filter((p) => p.value)
})

const brewAgain = computed(() => {
    const b = brew.value
    if (!b || !recipe.value) return null

    const query = new URLSearchParams({ recipe: recipe.value.id, dose: String(Number(b.dose_g)) })
    if (b.bag_id) query.set('bag', b.bag_id)

    return `/brew/new?${query}`
})

const menuOpen = ref(false)
const confirmDelete = ref(false)
const busy = ref(false)

async function remove(): Promise<void> {
    busy.value = true
    await deleteBrew(brew.value!.id)
    await router.replace('/brew')
}
</script>

<template>
    <SteepingPanel
        v-if="brew?.status === 'steeping'"
        :brew="brew"
        :coffee-name="coffee?.name ?? null"
    />

    <div v-else-if="brew" class="pb-32">
        <section class="bg-espresso-panel relative overflow-hidden rounded-b-[32px] pb-8">
            <SubPageHeader transparent back="/brew">
                <template #actions>
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
                        {{ methodLabel(brew.method) }} · {{ formatBrewDate(brew.started_at) }}
                    </p>
                    <h1 class="font-display font-soft mt-1 text-[32px] leading-tight font-semibold">
                        {{ brewTitle(brew) }}
                    </h1>
                    <component
                        :is="coffee.deleted_at ? 'span' : RouterLink"
                        v-if="coffee"
                        :to="coffee.deleted_at ? undefined : `/coffees/${coffee.id}`"
                        class="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full bg-cream/10 px-3 py-1.5 text-sm"
                    >
                        <Coffee class="size-4 shrink-0 text-accent" />
                        <span class="truncate">{{ coffee.name }}</span>
                    </component>
                </div>
                <MethodArt :method="brew.method" class="size-28 shrink-0 text-cream/90" />
            </div>
        </section>

        <div class="space-y-7 px-5 pt-6">
            <section class="animate-rise">
                <StarRating v-model="rating" class="-ml-0.5" />
                <p v-if="!brew.rating" class="mt-1 text-sm text-text-muted">
                    Tap a star to rate this brew.
                </p>
                <div v-if="brew.taste_tags.length" class="mt-3 flex flex-wrap gap-1.5">
                    <span
                        v-for="tag in brew.taste_tags"
                        :key="tag"
                        class="rounded-full bg-accent/12 px-3 py-1.5 text-sm font-semibold text-accent"
                    >
                        {{ tasteLabel(tag) }}
                    </span>
                </div>
            </section>

            <dl class="animate-rise grid grid-cols-3 gap-2 [animation-delay:40ms]">
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

            <section v-if="brew.notes" class="animate-rise [animation-delay:60ms]">
                <h2
                    class="mb-2.5 text-xs font-semibold tracking-[0.14em] text-text-muted uppercase"
                >
                    Notes
                </h2>
                <p class="font-display text-lg leading-relaxed whitespace-pre-line italic">
                    “{{ brew.notes }}”
                </p>
            </section>

            <section
                v-if="brew.recipe_snapshot?.steps.length"
                class="animate-rise [animation-delay:90ms]"
            >
                <div class="mb-3 flex items-center justify-between">
                    <h2 class="font-display font-soft text-xl font-semibold">Steps</h2>
                    <RouterLink
                        v-if="recipe"
                        :to="`/recipes/${recipe.id}`"
                        class="flex items-center gap-1 text-sm font-semibold text-accent"
                    >
                        <BookOpen class="size-4" /> Recipe
                    </RouterLink>
                </div>
                <StepTimeline :steps="brew.recipe_snapshot.steps" />
            </section>
        </div>

        <Teleport v-if="brewAgain" to="body">
            <div
                class="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg border-t border-border/50 bg-bg/90 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl"
            >
                <AppButton block @click="router.push(brewAgain)">
                    <Play class="size-5 fill-current" /> Brew again
                </AppButton>
            </div>
        </Teleport>

        <BottomSheet v-model:open="menuOpen">
            <div class="space-y-1">
                <RouterLink
                    :to="`/brews/${brew.id}/edit`"
                    class="pressable flex h-13 w-full items-center gap-3 rounded-control px-3 font-medium active:bg-surface-muted"
                >
                    <Pencil class="size-5" /> Edit brew
                </RouterLink>
                <button
                    type="button"
                    class="pressable flex h-13 w-full items-center gap-3 rounded-control px-3 font-medium text-danger active:bg-surface-muted"
                    @click="((menuOpen = false), (confirmDelete = true))"
                >
                    <Trash2 class="size-5" /> Delete brew
                </button>
            </div>
        </BottomSheet>

        <BottomSheet v-model:open="confirmDelete" title="Delete this brew?">
            <p class="mb-5 text-text-muted">
                {{
                    brew.bag_id
                        ? 'Its coffee grams go back to the bag.'
                        : 'It will be removed from your history.'
                }}
            </p>
            <div class="space-y-2">
                <AppButton variant="danger" block :loading="busy" @click="remove"
                    >Delete brew</AppButton
                >
                <AppButton variant="ghost" block @click="confirmDelete = false">Cancel</AppButton>
            </div>
        </BottomSheet>
    </div>
</template>
