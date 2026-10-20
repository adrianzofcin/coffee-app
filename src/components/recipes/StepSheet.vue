<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import ChipGroup from '@/components/ui/ChipGroup.vue'
import TextField from '@/components/ui/TextField.vue'
import ToggleRow from '@/components/ui/ToggleRow.vue'
import { parseNumber } from '@/modules/coffees/form'
import { STEP_TYPES } from '@/modules/recipes/options'
import { formatSeconds, parseSeconds } from '@/modules/recipes/recipe'
import type { RecipeStep, StepType } from '@/types/models'

const open = defineModel<boolean>('open', { required: true })

/** Without a step the sheet creates a new one. */
const props = withDefaults(
    defineProps<{
        step: RecipeStep | null
        suggestedStart: number | null
        /** Steps have a duration instead of a start time. */
        pourOver?: boolean
        /** Water on the scale before this step, for the pour speed. */
        previousWater?: number
    }>(),
    { pourOver: false, previousWater: 0 },
)
const emit = defineEmits<{ save: [step: RecipeStep]; remove: [] }>()

const type = ref<StepType | null>('pour')
const timed = ref(true)
const at = ref('')
const duration = ref('')
const water = ref('')
const text = ref('')
const errors = ref<{ at?: string; duration?: string; water?: string }>({})

const pouring = computed(() => type.value === 'bloom' || type.value === 'pour')

/** "100 g in 20 s · 5 g/s" while editing a timed pour. */
const speed = computed(() => {
    const seconds = parseSeconds(duration.value)
    const grams = parseNumber(water.value)
    if (!props.pourOver || !pouring.value || !timed.value || !seconds || !grams) return null
    const poured = grams - props.previousWater
    if (Number.isNaN(seconds) || Number.isNaN(grams) || poured <= 0) return null

    return `${Math.round(poured)} g in ${seconds} s · ${Math.round((poured / seconds) * 10) / 10} g/s`
})

watch(open, (value) => {
    if (!value) return

    const step = props.step
    type.value = step?.type ?? 'pour'
    timed.value = props.pourOver
        ? step?.duration_s !== null
        : step
          ? step.at_s !== null
          : props.suggestedStart !== null
    at.value = formatSeconds(step?.at_s ?? props.suggestedStart ?? 0)
    duration.value = step?.duration_s != null ? String(step.duration_s) : ''
    water.value =
        step?.target_water_g === null || step?.target_water_g === undefined
            ? ''
            : String(step.target_water_g)
    text.value = step?.text ?? ''
    errors.value = {}
})

function save(): void {
    const seconds = timed.value && !props.pourOver ? parseSeconds(at.value) : null
    const length = timed.value && props.pourOver ? parseSeconds(duration.value) : null
    const grams = parseNumber(water.value)
    errors.value = {}

    if (timed.value && !props.pourOver && (seconds === null || Number.isNaN(seconds)))
        errors.value.at = 'Use m:ss, e.g. 0:45.'
    if (timed.value && props.pourOver && (!length || Number.isNaN(length)))
        errors.value.duration = 'Enter seconds, e.g. 15.'
    if (Number.isNaN(grams) || (grams !== null && grams <= 0)) errors.value.water = 'Enter grams.'
    if (Object.keys(errors.value).length > 0) return

    emit('save', {
        id: props.step?.id ?? crypto.randomUUID(),
        type: type.value ?? 'custom',
        // Pour-over start times are derived from the durations by the recipe form.
        at_s: props.pourOver ? (props.step?.at_s ?? null) : seconds,
        ...(props.pourOver && { duration_s: length }),
        target_water_g: grams === null ? null : Math.round(grams),
        text: text.value.trim() || null,
    })
    open.value = false
}
</script>

<template>
    <BottomSheet v-model:open="open" :title="step ? 'Edit step' : 'New step'">
        <form
            class="max-h-[72dvh] space-y-5 overflow-y-auto pb-1"
            novalidate
            @submit.prevent="save"
        >
            <ChipGroup v-model="type" label="Type" :options="STEP_TYPES" :deselectable="false" />

            <template v-if="pourOver">
                <ToggleRow
                    v-model="timed"
                    label="Fixed duration"
                    hint="Off = lasts until you tap Next."
                />
                <TextField
                    v-if="timed"
                    v-model="duration"
                    label="Duration"
                    inputmode="numeric"
                    suffix="s"
                    placeholder="15"
                    :hint="speed"
                    :error="errors.duration"
                />
            </template>
            <template v-else>
                <ToggleRow
                    v-model="timed"
                    label="Timed"
                    hint="Starts automatically at a set time. Off = tap Next."
                />
                <TextField
                    v-if="timed"
                    v-model="at"
                    label="Starts at"
                    inputmode="text"
                    placeholder="0:45"
                    :error="errors.at"
                />
            </template>

            <TextField
                v-model="water"
                label="Water on the scale (total)"
                inputmode="decimal"
                suffix="g"
                placeholder="e.g. 150"
                :error="errors.water"
            />
            <TextField
                v-model="text"
                label="Instruction (optional)"
                placeholder="e.g. Pour in slow circles"
            />

            <div class="space-y-2">
                <AppButton type="submit" block>{{ step ? 'Save step' : 'Add step' }}</AppButton>
                <AppButton
                    v-if="step"
                    variant="ghost"
                    block
                    class="!text-danger"
                    @click="(emit('remove'), (open = false))"
                >
                    <Trash2 class="size-5" /> Remove step
                </AppButton>
            </div>
        </form>
    </BottomSheet>
</template>
