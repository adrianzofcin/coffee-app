<script setup lang="ts">
import { ref, watch } from 'vue'
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
const props = defineProps<{ step: RecipeStep | null; suggestedStart: number | null }>()
const emit = defineEmits<{ save: [step: RecipeStep]; remove: [] }>()

const type = ref<StepType | null>('pour')
const timed = ref(true)
const at = ref('')
const water = ref('')
const text = ref('')
const errors = ref<{ at?: string; water?: string }>({})

watch(open, (value) => {
    if (!value) return

    const step = props.step
    type.value = step?.type ?? 'pour'
    timed.value = step ? step.at_s !== null : props.suggestedStart !== null
    at.value = formatSeconds(step?.at_s ?? props.suggestedStart ?? 0)
    water.value =
        step?.target_water_g === null || step?.target_water_g === undefined
            ? ''
            : String(step.target_water_g)
    text.value = step?.text ?? ''
    errors.value = {}
})

function save(): void {
    const seconds = timed.value ? parseSeconds(at.value) : null
    const grams = parseNumber(water.value)
    errors.value = {}

    if (timed.value && (seconds === null || Number.isNaN(seconds)))
        errors.value.at = 'Use m:ss, e.g. 0:45.'
    if (Number.isNaN(grams) || (grams !== null && grams <= 0)) errors.value.water = 'Enter grams.'
    if (Object.keys(errors.value).length > 0) return

    emit('save', {
        id: props.step?.id ?? crypto.randomUUID(),
        type: type.value ?? 'custom',
        at_s: seconds,
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
