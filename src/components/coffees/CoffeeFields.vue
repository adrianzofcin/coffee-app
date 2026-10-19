<script setup lang="ts">
import { computed } from 'vue'
import ChipGroup from '@/components/ui/ChipGroup.vue'
import StarRating from '@/components/ui/StarRating.vue'
import SuggestField from '@/components/ui/SuggestField.vue'
import TagPicker from '@/components/ui/TagPicker.vue'
import TextField from '@/components/ui/TextField.vue'
import ToggleRow from '@/components/ui/ToggleRow.vue'
import {
    COUNTRIES,
    INTENDED_FOR,
    PROCESSES,
    ROAST_LEVELS,
    TASTING_NOTES,
} from '@/modules/coffees/options'
import type { CoffeeFormState, FormErrors } from '@/modules/coffees/form'

const form = defineModel<CoffeeFormState>({ required: true })

const props = withDefaults(
    defineProps<{
        section: 'basics' | 'details'
        errors?: FormErrors<CoffeeFormState>
        usedRoasters?: string[]
        usedCountries?: string[]
        usedProcesses?: string[]
        usedNotes?: string[]
    }>(),
    {
        errors: () => ({}),
        usedRoasters: () => [],
        usedCountries: () => [],
        usedProcesses: () => [],
        usedNotes: () => [],
    },
)

const roasterSuggestions = computed(() => props.usedRoasters.map((value) => ({ value })))

/** Seed list plus anything typed before, so custom countries come back as options. */
const countrySuggestions = computed(() => {
    const seeded = COUNTRIES.map((c) => ({ value: c.name, prefix: c.flag }))
    const known = new Set(seeded.map((c) => c.value.toLowerCase()))
    const custom = props.usedCountries
        .filter((c) => !known.has(c.toLowerCase()))
        .map((value) => ({ value }))

    return [...custom, ...seeded]
})

const processOptions = computed(() => {
    const values = [...PROCESSES]
    for (const used of props.usedProcesses) {
        if (!values.some((v) => v.toLowerCase() === used.toLowerCase())) values.push(used)
    }

    return values.map((value) => ({ value, label: value }))
})

const noteSuggestions = computed(() => {
    const values = [...TASTING_NOTES]
    for (const used of props.usedNotes) {
        if (!values.some((v) => v.toLowerCase() === used.toLowerCase())) values.push(used)
    }

    return values
})

function setCustomProcess(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim()
    if (value) form.value.process = value
}
</script>

<template>
    <div v-if="section === 'basics'" class="space-y-5">
        <TextField
            v-model="form.name"
            label="Name"
            placeholder="e.g. Ethiopia Guji"
            autocapitalize="words"
            :error="errors.name"
        />
        <SuggestField
            v-model="form.roaster"
            label="Roaster"
            placeholder="e.g. Doubleshot"
            :suggestions="roasterSuggestions"
            :limit="6"
            :error="errors.roaster"
        />
    </div>

    <div v-else class="space-y-5">
        <SuggestField
            v-model="form.country"
            label="Country"
            placeholder="Pick or type"
            :suggestions="countrySuggestions"
            :limit="10"
        />
        <div class="grid grid-cols-2 gap-3">
            <TextField v-model="form.region" label="Region" autocapitalize="words" />
            <TextField v-model="form.producer" label="Farm / producer" autocapitalize="words" />
            <TextField v-model="form.variety" label="Variety" autocapitalize="words" />
            <TextField v-model="form.altitude" label="Altitude" placeholder="1800–2000 m" />
        </div>

        <ChipGroup v-model="form.process" label="Process" :options="processOptions">
            <input
                placeholder="Other…"
                class="h-10 w-28 rounded-full border border-dashed border-border bg-transparent px-4 text-sm outline-none focus:border-accent"
                @change="setCustomProcess"
            />
        </ChipGroup>

        <ChipGroup v-model="form.roast_level" label="Roast level" :options="ROAST_LEVELS" />
        <ChipGroup v-model="form.intended_for" label="Best for" :options="INTENDED_FOR" />
        <ToggleRow v-model="form.is_decaf" label="Decaf" />

        <TagPicker
            v-model="form.tasting_notes"
            label="Tasting notes"
            :suggestions="noteSuggestions"
        />

        <div>
            <p class="mb-1.5 text-sm font-medium text-text-muted">My rating</p>
            <StarRating v-model="form.rating" />
        </div>

        <TextField
            v-model="form.notes"
            label="Notes"
            multiline
            placeholder="Anything worth remembering"
        />
    </div>
</template>
