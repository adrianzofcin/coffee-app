<script setup lang="ts">
import { onMounted, ref } from 'vue'
import StarRating from '@/components/ui/StarRating.vue'
import TextField from '@/components/ui/TextField.vue'
import TastePicker from './TastePicker.vue'
import type { FormErrors } from '@/modules/coffees/form'
import type { BrewFormState } from '@/modules/brews/form'

const form = defineModel<BrewFormState>({ required: true })

const props = defineProps<{ errors: FormErrors<BrewFormState>; focusYield?: boolean }>()

const yieldField = ref<HTMLElement | null>(null)

// Espresso: the yield is what the user still has to read off the scale.
onMounted(() => {
    if (props.focusYield) yieldField.value?.querySelector('input')?.focus()
})
</script>

<template>
    <div class="space-y-5">
        <div class="grid grid-cols-2 gap-3">
            <TextField
                v-model="form.dose"
                label="Dose"
                inputmode="decimal"
                suffix="g"
                :error="errors.dose"
            />
            <div v-if="form.method === 'espresso'" ref="yieldField">
                <TextField
                    v-model="form.yield"
                    label="Yield"
                    inputmode="decimal"
                    suffix="g"
                    :error="errors.yield"
                />
            </div>
            <TextField
                v-else
                v-model="form.water"
                label="Water"
                inputmode="decimal"
                suffix="g"
                :error="errors.water"
            />
            <TextField
                v-if="form.method !== 'cold_brew'"
                v-model="form.time"
                label="Time"
                inputmode="numeric"
                placeholder="m:ss"
                :error="errors.time"
            />
        </div>

        <div>
            <p class="mb-1.5 text-sm font-medium text-text-muted">Rating</p>
            <StarRating v-model="form.rating" class="-ml-0.5" />
        </div>

        <TastePicker v-model="form.taste_tags" />

        <TextField
            v-model="form.notes"
            label="Notes"
            multiline
            placeholder="Grind finer next time…"
        />
    </div>
</template>
