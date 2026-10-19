<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus, Scale } from 'lucide-vue-next'
import SubPageHeader from '@/components/layout/SubPageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import ChipGroup from '@/components/ui/ChipGroup.vue'
import TextField from '@/components/ui/TextField.vue'
import ToggleRow from '@/components/ui/ToggleRow.vue'
import MethodArt from '@/components/recipes/MethodArt.vue'
import ScaleSheet from '@/components/recipes/ScaleSheet.vue'
import StepSheet from '@/components/recipes/StepSheet.vue'
import StepTimeline from '@/components/recipes/StepTimeline.vue'
import { db } from '@/lib/db'
import { scrollToFirstError } from '@/composables/scrollToError'
import { parseNumber } from '@/modules/coffees/form'
import { useCoffees } from '@/modules/coffees/useCoffees'
import { createRecipe, updateRecipe } from '@/modules/recipes/actions'
import {
    emptyRecipeForm,
    formToRecipe,
    hasErrors,
    recipeToForm,
    switchMethod,
    validateRecipe,
    type RecipeFormErrors,
    type RecipeFormState,
} from '@/modules/recipes/form'
import { METHODS, STEEP_PLACES } from '@/modules/recipes/options'
import { formatRatio, ratio, type ScalableRecipe } from '@/modules/recipes/recipe'
import type { BrewMethod, RecipeStep } from '@/types/models'

const route = useRoute()
const router = useRouter()
const { views } = useCoffees()

const editId = computed(() => (route.params.id as string | undefined) ?? null)
const isEdit = computed(() => editId.value !== null)

function initialMethod(): BrewMethod {
    const value = route.query.method
    return METHODS.some((m) => m.value === value) ? (value as BrewMethod) : 'v60'
}

const form = ref<RecipeFormState>(emptyRecipeForm(initialMethod()))
const errors = ref<RecipeFormErrors>({})
const saving = ref(false)

if (typeof route.query.coffee === 'string') form.value.coffee_id = route.query.coffee

watch(
    editId,
    async (id) => {
        if (!id) return
        const recipe = await db.recipes.get(id)
        if (!recipe || recipe.deleted_at) return void router.replace('/recipes')

        form.value = recipeToForm(recipe)
    },
    { immediate: true },
)

const espresso = computed(() => form.value.method === 'espresso')
const coldBrew = computed(() => form.value.method === 'cold_brew')

function pickMethod(method: BrewMethod): void {
    if (method !== form.value.method) form.value = switchMethod(form.value, method)
}

const liveRatio = computed(() =>
    formatRatio(
        ratio({
            method: form.value.method,
            dose_g: parseNumber(form.value.dose) ?? 0,
            water_g: parseNumber(form.value.water),
            yield_g: parseNumber(form.value.yield),
        }),
    ),
)

/** Active coffees, plus the linked one even if it is finished. */
const coffeeOptions = computed(() =>
    views.value
        .filter((v) => v.isActive || v.coffee.id === form.value.coffee_id)
        .map((v) => ({ id: v.coffee.id, label: `${v.coffee.name} · ${v.coffee.roaster}` })),
)

// Steps
const stepSheetOpen = ref(false)
const editingIndex = ref<number | null>(null)
const editingStep = computed(() =>
    editingIndex.value === null ? null : form.value.steps[editingIndex.value]!,
)
const suggestedStart = computed(() => {
    if (coldBrew.value) return null
    const last = [...form.value.steps].reverse().find((s) => s.at_s !== null)
    return last ? last.at_s! + 30 : 0
})

function addStep(): void {
    editingIndex.value = null
    stepSheetOpen.value = true
}

function editStep(index: number): void {
    editingIndex.value = index
    stepSheetOpen.value = true
}

function saveStep(step: RecipeStep): void {
    const steps = [...form.value.steps]
    if (editingIndex.value === null) steps.push(step)
    else steps[editingIndex.value] = step
    form.value.steps = steps
}

function removeStep(): void {
    form.value.steps = form.value.steps.filter((_, i) => i !== editingIndex.value)
}

function moveStep(index: number, direction: -1 | 1): void {
    const steps = [...form.value.steps]
    const [step] = steps.splice(index, 1)
    steps.splice(index + direction, 0, step!)
    form.value.steps = steps
}

// Scale
const scaleOpen = ref(false)
const scalable = computed<ScalableRecipe>(() => ({
    method: form.value.method,
    dose_g: parseNumber(form.value.dose) || 1,
    water_g: parseNumber(form.value.water),
    yield_g: parseNumber(form.value.yield),
    steps: form.value.steps,
}))

function applyScale(scaled: ScalableRecipe): void {
    form.value.dose = String(scaled.dose_g)
    form.value.water = scaled.water_g === null ? form.value.water : String(scaled.water_g)
    form.value.yield = scaled.yield_g === null ? form.value.yield : String(scaled.yield_g)
    form.value.steps = scaled.steps
}

async function save(): Promise<void> {
    errors.value = validateRecipe(form.value)
    if (saving.value) return
    if (hasErrors(errors.value)) return void scrollToFirstError('recipe-form')

    saving.value = true
    const data = formToRecipe(form.value)

    if (isEdit.value) {
        // last_brewed_at belongs to brewing, not to the editor.
        const changes: Partial<typeof data> = { ...data }
        delete changes.last_brewed_at
        await updateRecipe(editId.value!, changes)
        await router.replace(`/recipes/${editId.value}`)
    } else {
        const id = await createRecipe(data)
        await router.replace(`/recipes/${id}`)
    }
}
</script>

<template>
    <div class="pb-28">
        <SubPageHeader
            :title="isEdit ? 'Edit recipe' : 'New recipe'"
            :back="isEdit ? `/recipes/${editId}` : '/recipes'"
        />

        <form
            id="recipe-form"
            class="animate-rise space-y-4 px-5 pt-4"
            novalidate
            @submit.prevent="save"
        >
            <div class="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Method">
                <button
                    v-for="m in METHODS"
                    :key="m.value"
                    type="button"
                    role="radio"
                    :aria-checked="form.method === m.value"
                    class="pressable flex flex-col items-center rounded-card border-2 px-2 pt-2 pb-3 text-text transition-colors"
                    :class="
                        form.method === m.value
                            ? 'border-accent bg-accent/10'
                            : 'border-border/60 bg-surface'
                    "
                    @click="pickMethod(m.value)"
                >
                    <MethodArt :method="m.value" class="size-16" />
                    <span class="mt-1 text-sm font-semibold">{{ m.label }}</span>
                </button>
            </div>

            <section class="space-y-5 rounded-card border border-border/60 bg-surface p-5">
                <TextField
                    v-model="form.name"
                    label="Name"
                    placeholder="e.g. Morning V60"
                    autocapitalize="words"
                    :error="errors.name"
                />

                <div class="grid grid-cols-[1fr_1fr_auto] items-start gap-3">
                    <TextField
                        v-model="form.dose"
                        label="Coffee"
                        inputmode="decimal"
                        suffix="g"
                        :error="errors.dose"
                    />
                    <TextField
                        v-if="espresso"
                        v-model="form.yield"
                        label="Yield"
                        inputmode="decimal"
                        suffix="g"
                        :error="errors.yield"
                    />
                    <TextField
                        v-else
                        v-model="form.water"
                        label="Water"
                        inputmode="decimal"
                        suffix="g"
                        :error="errors.water"
                    />
                    <div class="pt-7 text-center">
                        <p class="tabular font-display text-lg font-semibold text-accent">
                            {{ liveRatio }}
                        </p>
                        <p class="text-[11px] text-text-muted">ratio</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <TextField
                        v-if="!coldBrew"
                        v-model="form.temperature"
                        label="Water temp"
                        inputmode="numeric"
                        suffix="°C"
                        :error="errors.temperature"
                    />
                    <TextField
                        v-model="form.grind_setting"
                        label="Grind"
                        placeholder="e.g. 22 clicks"
                        :class="coldBrew ? 'col-span-2' : ''"
                    />
                </div>
            </section>

            <section class="space-y-5 rounded-card border border-border/60 bg-surface p-5">
                <template v-if="espresso">
                    <div class="grid grid-cols-2 gap-3">
                        <TextField
                            v-model="form.target_time"
                            label="Shot time from"
                            inputmode="numeric"
                            suffix="s"
                            :error="errors.target_time"
                        />
                        <TextField
                            v-model="form.target_time_max"
                            label="to"
                            inputmode="numeric"
                            suffix="s"
                            :error="errors.target_time_max"
                        />
                    </div>
                    <TextField
                        v-model="form.preinfusion"
                        label="Pre-infusion (optional)"
                        inputmode="numeric"
                        suffix="s"
                    />
                </template>

                <TextField
                    v-else-if="!coldBrew"
                    v-model="form.target_time"
                    label="Total brew time"
                    placeholder="3:00"
                    :error="errors.target_time"
                />

                <template v-else>
                    <TextField
                        v-model="form.steep_hours"
                        label="Steep time"
                        inputmode="decimal"
                        suffix="h"
                        :error="errors.steep_hours"
                    />
                    <ChipGroup
                        v-model="form.steep_place"
                        label="Steep in"
                        :options="STEEP_PLACES"
                    />
                    <TextField
                        v-model="form.dilution"
                        label="Dilute when serving (water per part of concentrate)"
                        inputmode="decimal"
                        placeholder="1 = 1:1"
                    />
                </template>
            </section>

            <section class="rounded-card border border-border/60 bg-surface p-5">
                <div class="mb-4 flex items-center justify-between">
                    <h2 class="font-display font-soft text-xl font-semibold">Steps</h2>
                    <button
                        v-if="form.steps.length || !espresso"
                        type="button"
                        class="flex items-center gap-1 text-sm font-semibold text-text-muted"
                        @click="scaleOpen = true"
                    >
                        <Scale class="size-4" /> Scale
                    </button>
                </div>
                <StepTimeline
                    v-if="form.steps.length"
                    :steps="form.steps"
                    :errors="errors.stepErrors"
                    editable
                    @edit="editStep"
                    @move="moveStep"
                />
                <p v-else class="text-sm text-text-muted">
                    {{
                        espresso
                            ? 'Espresso usually needs no steps, just the timer.'
                            : 'No steps yet.'
                    }}
                </p>
                <button
                    type="button"
                    class="pressable mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-control border-2 border-dashed border-border font-semibold text-accent"
                    @click="addStep"
                >
                    <Plus class="size-5" /> Add step
                </button>
            </section>

            <section class="space-y-4 rounded-card border border-border/60 bg-surface p-5">
                <div>
                    <label
                        for="recipe-coffee"
                        class="mb-1.5 block text-sm font-medium text-text-muted"
                        >For coffee</label
                    >
                    <select
                        id="recipe-coffee"
                        v-model="form.coffee_id"
                        class="h-13 w-full rounded-control border border-transparent bg-surface-muted px-4 outline-none focus:border-accent"
                    >
                        <option :value="null">Any coffee</option>
                        <option v-for="option in coffeeOptions" :key="option.id" :value="option.id">
                            {{ option.label }}
                        </option>
                    </select>
                </div>
                <ToggleRow
                    v-model="form.is_favorite"
                    label="Favourite"
                    hint="Shown at the top of the list"
                />
                <TextField
                    v-model="form.notes"
                    label="Notes"
                    multiline
                    placeholder="What makes this recipe work"
                />
            </section>
        </form>

        <Teleport to="body">
            <div
                class="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg border-t border-border/50 bg-bg/90 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl"
            >
                <AppButton type="submit" form="recipe-form" block :loading="saving">
                    {{ isEdit ? 'Save changes' : 'Save recipe' }}
                </AppButton>
            </div>
        </Teleport>

        <StepSheet
            v-model:open="stepSheetOpen"
            :step="editingStep"
            :suggested-start="suggestedStart"
            @save="saveStep"
            @remove="removeStep"
        />
        <ScaleSheet
            v-model:open="scaleOpen"
            :recipe="scalable"
            primary="Apply"
            @primary="applyScale"
        />
    </div>
</template>
