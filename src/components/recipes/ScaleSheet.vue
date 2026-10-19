<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import TextField from '@/components/ui/TextField.vue'
import { parseNumber } from '@/modules/coffees/form'
import { scaleRecipe, type ScalableRecipe } from '@/modules/recipes/recipe'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
    recipe: ScalableRecipe
    /** Labels of the actions; a single action hides the second button. */
    primary: string
    secondary?: string
}>()
const emit = defineEmits<{
    primary: [scaled: ScalableRecipe]
    secondary: [scaled: ScalableRecipe]
}>()

const dose = ref('')

watch(open, (value) => {
    if (value) dose.value = String(props.recipe.dose_g)
})

const newDose = computed(() => parseNumber(dose.value))
const valid = computed(
    () =>
        newDose.value !== null &&
        !Number.isNaN(newDose.value) &&
        newDose.value > 0 &&
        newDose.value <= 500,
)
const scaled = computed(() => (valid.value ? scaleRecipe(props.recipe, newDose.value!) : null))

const output = computed(() => {
    const s = scaled.value
    if (!s) return null

    return s.method === 'espresso' ? `${s.yield_g} g yield` : `${s.water_g} g water`
})
</script>

<template>
    <BottomSheet v-model:open="open" title="Scale recipe">
        <div class="space-y-5">
            <TextField
                v-model="dose"
                label="New dose"
                inputmode="decimal"
                suffix="g"
                :error="dose && !valid ? 'Enter 0.1–500 g.' : null"
            />

            <div v-if="scaled" class="rounded-control bg-surface-muted p-4">
                <p class="tabular font-display text-2xl font-semibold">{{ output }}</p>
                <p
                    v-if="scaled.steps.some((s) => s.target_water_g !== null)"
                    class="tabular mt-1 text-sm text-text-muted"
                >
                    Pours:
                    {{
                        scaled.steps
                            .filter((s) => s.target_water_g !== null)
                            .map((s) => `${s.target_water_g} g`)
                            .join(' → ')
                    }}
                </p>
                <p class="mt-1 text-xs text-text-muted">Times stay the same.</p>
            </div>

            <div class="space-y-2">
                <AppButton
                    block
                    :disabled="!scaled"
                    @click="scaled && (emit('primary', scaled), (open = false))"
                >
                    {{ primary }}
                </AppButton>
                <AppButton
                    v-if="secondary"
                    variant="secondary"
                    block
                    :disabled="!scaled"
                    @click="scaled && (emit('secondary', scaled), (open = false))"
                >
                    {{ secondary }}
                </AppButton>
            </div>
        </div>
    </BottomSheet>
</template>
