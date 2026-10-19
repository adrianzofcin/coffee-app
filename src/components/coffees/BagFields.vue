<script setup lang="ts">
import { computed, ref } from 'vue'
import TextField from '@/components/ui/TextField.vue'
import ToggleRow from '@/components/ui/ToggleRow.vue'
import { WEIGHT_PRESETS, formatGrams } from '@/modules/coffees/options'
import type { BagFormState, FormErrors } from '@/modules/coffees/form'

const form = defineModel<BagFormState>({ required: true })

withDefaults(
    defineProps<{
        errors?: FormErrors<BagFormState>
        /** main = roast date + weight, extras = price, purchase date, frozen */
        part?: 'all' | 'main' | 'extras'
    }>(),
    { errors: () => ({}), part: 'all' },
)

const isPreset = computed(() => WEIGHT_PRESETS.map(String).includes(form.value.weight))
const customWeight = ref(!isPreset.value)

function pickWeight(grams: number): void {
    customWeight.value = false
    form.value.weight = String(grams)
}

function pickCustom(): void {
    customWeight.value = true
    form.value.weight = ''
}
</script>

<template>
    <div class="space-y-5">
        <template v-if="part !== 'extras'">
            <TextField
                v-model="form.roast_date"
                label="Roast date"
                type="date"
                :error="errors.roast_date"
            />

            <div>
                <p class="mb-1.5 text-sm font-medium text-text-muted">Weight</p>
                <div class="grid grid-cols-5 gap-2">
                    <button
                        v-for="grams in WEIGHT_PRESETS"
                        :key="grams"
                        type="button"
                        class="pressable tabular h-11 rounded-control border text-sm font-semibold"
                        :class="
                            !customWeight && form.weight === String(grams)
                                ? 'border-transparent bg-accent text-accent-contrast'
                                : 'border-border bg-surface'
                        "
                        @click="pickWeight(grams)"
                    >
                        {{ formatGrams(grams) }}
                    </button>
                    <button
                        type="button"
                        class="pressable h-11 rounded-control border text-sm font-semibold"
                        :class="
                            customWeight
                                ? 'border-transparent bg-accent text-accent-contrast'
                                : 'border-border bg-surface'
                        "
                        @click="pickCustom"
                    >
                        Other
                    </button>
                </div>
                <TextField
                    v-if="customWeight"
                    v-model="form.weight"
                    class="mt-2"
                    label="Weight in grams"
                    inputmode="numeric"
                    suffix="g"
                    placeholder="e.g. 340"
                />
                <p v-if="errors.weight" class="mt-1.5 text-sm text-danger">{{ errors.weight }}</p>
            </div>
        </template>

        <template v-if="part !== 'main'">
            <div class="grid grid-cols-2 gap-3">
                <TextField
                    v-model="form.price"
                    label="Price"
                    inputmode="decimal"
                    suffix="€"
                    placeholder="0.00"
                    :error="errors.price"
                />
                <TextField v-model="form.purchase_date" label="Bought on" type="date" />
            </div>
            <ToggleRow v-model="form.is_frozen" label="Frozen" hint="Stored in the freezer" />
        </template>
    </div>
</template>
