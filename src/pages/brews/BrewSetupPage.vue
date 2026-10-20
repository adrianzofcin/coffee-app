<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ChevronDown, Play, Plus } from 'lucide-vue-next'
import SubPageHeader from '@/components/layout/SubPageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import TextField from '@/components/ui/TextField.vue'
import BagPicker from '@/components/brews/BagPicker.vue'
import MethodArt from '@/components/recipes/MethodArt.vue'
import StepTimeline from '@/components/recipes/StepTimeline.vue'
import { parseNumber } from '@/modules/coffees/form'
import { startRun } from '@/modules/brews/actions'
import { defaultBagId, snapshotFromRecipe } from '@/modules/brews/brew'
import { useActiveRun, useBrews, useShelf } from '@/modules/brews/useBrews'
import { methodLabel, STEEP_PLACES } from '@/modules/recipes/options'
import {
    formatMinutes,
    formatRatio,
    formatSeconds,
    ratio,
    recipeSummary,
} from '@/modules/recipes/recipe'
import { useRecipes } from '@/modules/recipes/useRecipes'

const route = useRoute()
const router = useRouter()
const { recipes, loaded: recipesLoaded } = useRecipes()
const { brews, loaded: brewsLoaded } = useBrews()
const { options, loaded: shelfLoaded } = useShelf()
const { run } = useActiveRun()

const query = (key: string) => (typeof route.query[key] === 'string' ? route.query[key] : null)

const recipeId = ref<string | null>(query('recipe'))
const bagId = ref<string | null>(null)
const dose = ref('')
const pickerOpen = ref(false)
const confirmReplace = ref(false)
const starting = ref(false)
/** Once the user picks a bag, a recipe change no longer overrides it. */
let bagTouched = false
let bagInitialized = false

const recipe = computed(() => recipes.value.find((r) => r.id === recipeId.value) ?? null)

watch(
    recipesLoaded,
    (loaded) => {
        if (loaded && !recipe.value) pickerOpen.value = true
    },
    { immediate: true },
)

// Dose from "Brew again", otherwise the recipe's own dose.
watch(
    recipe,
    (current, previous) => {
        if (!current || current.id === previous?.id) return
        const again = previous === undefined || previous === null ? query('dose') : null
        dose.value = again ?? String(Number(current.dose_g))
    },
    { immediate: true },
)

watch(
    [recipe, shelfLoaded, brewsLoaded],
    ([current, shelf, history]) => {
        if (!shelf || !history || bagTouched) return

        const fromQuery = query('bag')
        if (
            !bagInitialized &&
            fromQuery &&
            options.value.some((o) => o.view.bag.id === fromQuery)
        ) {
            bagId.value = fromQuery
        } else {
            bagId.value = defaultBagId(options.value, current?.coffee_id ?? null, brews.value)
        }
        bagInitialized = true
    },
    { immediate: true },
)

function pickBag(id: string | null): void {
    bagTouched = true
    bagId.value = id
}

function pickRecipe(id: string): void {
    recipeId.value = id
    pickerOpen.value = false
    void router.replace({ query: { recipe: id } })
}

const doseValue = computed(() => parseNumber(dose.value))
const doseError = computed(() => {
    const value = doseValue.value
    if (value === null) return 'Required.'

    return Number.isNaN(value) || value < 1 || value > 500 ? 'Enter 1–500 g.' : null
})

const snapshot = computed(() =>
    recipe.value && !doseError.value ? snapshotFromRecipe(recipe.value, doseValue.value!) : null,
)

const summary = computed(() => {
    const s = snapshot.value
    if (!s) return []

    const time =
        s.method === 'cold_brew'
            ? s.steep_time_min && formatMinutes(s.steep_time_min)
            : s.method === 'espresso'
              ? s.target_time_s &&
                `${s.target_time_s}${s.target_time_max_s && s.target_time_max_s !== s.target_time_s ? `–${s.target_time_max_s}` : ''} s`
              : s.target_time_s && formatSeconds(s.target_time_s)

    return [
        s.method === 'espresso'
            ? { label: 'Yield', value: s.yield_g ? `${s.yield_g} g` : null }
            : { label: 'Water', value: s.water_g ? `${s.water_g} g` : null },
        { label: 'Ratio', value: formatRatio(ratio(s)) },
        { label: s.method === 'cold_brew' ? 'Steep' : 'Time', value: time || null },
        { label: 'Water temp', value: s.temperature_c !== null ? `${s.temperature_c} °C` : null },
        {
            label: 'Steep in',
            value: STEEP_PLACES.find((p) => p.value === s.steep_place)?.label ?? null,
        },
        { label: 'Grind', value: s.grind_setting, wide: true },
    ].filter((item) => item.value)
})

function start(): void {
    if (!snapshot.value) return
    if (run.value) confirmReplace.value = true
    else void begin()
}

async function begin(): Promise<void> {
    starting.value = true
    await startRun(recipe.value!, bagId.value, doseValue.value!)
    await router.replace('/brew/run')
}
</script>

<template>
    <div class="pb-28">
        <SubPageHeader title="New brew" back="/brew" />

        <div class="animate-rise space-y-4 px-5 pt-4">
            <button
                type="button"
                class="pressable flex w-full items-center gap-4 rounded-card border border-border/60 bg-surface p-3 pr-4 text-left"
                @click="pickerOpen = true"
            >
                <div
                    class="flex size-16 shrink-0 items-center justify-center rounded-[14px] bg-surface-muted text-text"
                >
                    <MethodArt v-if="recipe" :method="recipe.method" class="size-12" />
                </div>
                <div class="min-w-0 flex-1">
                    <template v-if="recipe">
                        <p class="text-xs font-semibold tracking-wide text-accent uppercase">
                            {{ methodLabel(recipe.method) }}
                        </p>
                        <p class="font-display font-soft truncate text-lg font-semibold">
                            {{ recipe.name }}
                        </p>
                    </template>
                    <p v-else class="font-semibold text-text-muted">Choose a recipe</p>
                </div>
                <ChevronDown class="size-5 shrink-0 text-text-muted" />
            </button>

            <section
                v-if="recipe"
                class="space-y-5 rounded-card border border-border/60 bg-surface p-5"
            >
                <BagPicker
                    :model-value="bagId"
                    :options="options"
                    :dose="doseValue"
                    @update:model-value="pickBag"
                />
                <p v-if="shelfLoaded && options.length === 0" class="-mt-2 text-sm text-text-muted">
                    No coffee on the shelf. You can still brew, nothing will be deducted.
                    <RouterLink to="/coffees/new" class="font-semibold text-accent"
                        >Add coffee</RouterLink
                    >
                </p>
                <TextField
                    v-model="dose"
                    label="Dose"
                    inputmode="decimal"
                    suffix="g"
                    :error="dose ? doseError : null"
                />
            </section>

            <dl v-if="summary.length" class="grid grid-cols-3 gap-2">
                <div
                    v-for="item in summary"
                    :key="item.label"
                    class="rounded-control bg-surface-muted px-3 py-2.5"
                    :class="item.wide ? 'col-span-3' : ''"
                >
                    <dt class="text-xs text-text-muted">{{ item.label }}</dt>
                    <dd class="tabular truncate font-semibold">{{ item.value }}</dd>
                </div>
            </dl>

            <section v-if="snapshot?.steps.length" class="pt-2">
                <h2 class="font-display font-soft mb-3 text-xl font-semibold">Steps</h2>
                <StepTimeline :steps="snapshot.steps" />
            </section>
        </div>

        <Teleport to="body">
            <div
                class="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg border-t border-border/50 bg-bg/90 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl"
            >
                <AppButton block :disabled="!snapshot" :loading="starting" @click="start">
                    <Play class="size-5 fill-current" /> Start
                </AppButton>
            </div>
        </Teleport>

        <BottomSheet v-model:open="pickerOpen" title="Choose recipe">
            <div class="-mx-1 max-h-[60dvh] space-y-1 overflow-y-auto px-1">
                <button
                    v-for="item in recipes"
                    :key="item.id"
                    type="button"
                    class="pressable flex w-full items-center gap-3 rounded-control px-2 py-2 text-left active:bg-surface-muted"
                    :class="item.id === recipeId ? 'bg-accent/10' : ''"
                    @click="pickRecipe(item.id)"
                >
                    <div
                        class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-text"
                    >
                        <MethodArt :method="item.method" class="size-9" />
                    </div>
                    <span class="min-w-0 flex-1">
                        <span class="block truncate font-semibold">{{ item.name }}</span>
                        <span class="tabular block truncate text-sm text-text-muted">
                            {{ methodLabel(item.method) }} · {{ recipeSummary(item) }}
                        </span>
                    </span>
                </button>
                <p
                    v-if="recipesLoaded && recipes.length === 0"
                    class="rounded-card border border-dashed border-border p-4 text-sm text-text-muted"
                >
                    No recipes yet.
                </p>
                <RouterLink
                    to="/recipes/new"
                    class="pressable flex h-13 items-center gap-2 px-3 font-semibold text-accent"
                >
                    <Plus class="size-5" /> New recipe
                </RouterLink>
            </div>
        </BottomSheet>

        <BottomSheet v-model:open="confirmReplace" title="Replace the brew in progress?">
            <p class="mb-5 text-text-muted">
                You have an unfinished {{ run?.snapshot.name }}. Starting a new brew discards it.
            </p>
            <div class="space-y-2">
                <AppButton block :loading="starting" @click="begin">Start new brew</AppButton>
                <AppButton variant="secondary" block @click="router.replace('/brew/run')"
                    >Resume {{ run?.snapshot.name }}</AppButton
                >
            </div>
        </BottomSheet>
    </div>
</template>
