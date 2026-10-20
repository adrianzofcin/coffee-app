<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Ban, Check, ChevronDown, Plus, TriangleAlert } from 'lucide-vue-next'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { formatShortDate } from '@/modules/coffees/format'
import { formatGrams } from '@/modules/coffees/options'
import type { BagOption } from '@/modules/brews/brew'
import type { Coffee } from '@/types/models'

const model = defineModel<string | null>({ required: true })

const props = defineProps<{
    options: BagOption[]
    /** Warns when the selected bag holds less than this. */
    dose?: number | null
    /** Coffee of a bag that is no longer active (editing an old brew). */
    fallbackCoffee?: Coffee | null
}>()

const open = ref(false)

const selected = computed(() => props.options.find((o) => o.view.bag.id === model.value) ?? null)
const short = computed(() => {
    const bag = selected.value?.view
    if (!bag || !props.dose || bag.remaining >= props.dose) return null

    return bag.remaining
})

function pick(id: string | null): void {
    model.value = id
    open.value = false
}
</script>

<template>
    <div>
        <p class="mb-1.5 text-sm font-medium text-text-muted">Coffee</p>
        <button
            type="button"
            class="pressable flex min-h-13 w-full items-center gap-3 rounded-control bg-surface-muted px-4 py-2.5 text-left"
            @click="open = true"
        >
            <span class="min-w-0 flex-1">
                <template v-if="selected">
                    <span class="block truncate font-semibold">{{ selected.coffeeName }}</span>
                    <span class="tabular block text-sm text-text-muted">
                        Roasted {{ formatShortDate(selected.view.bag.roast_date) }} ·
                        {{ formatGrams(selected.view.remaining) }} left
                    </span>
                </template>
                <template v-else-if="model && fallbackCoffee">
                    <span class="block truncate font-semibold">{{ fallbackCoffee.name }}</span>
                    <span class="block text-sm text-text-muted">Finished bag</span>
                </template>
                <span v-else class="block text-text-muted">No coffee selected</span>
            </span>
            <ChevronDown class="size-5 shrink-0 text-text-muted" />
        </button>
        <p v-if="short !== null" class="mt-1.5 flex items-center gap-1.5 text-sm text-warning">
            <TriangleAlert class="size-4 shrink-0" />
            Only {{ formatGrams(short) }} left in this bag.
        </p>

        <BottomSheet v-model:open="open" title="Choose coffee">
            <div class="-mx-1 max-h-[60dvh] space-y-1 overflow-y-auto px-1">
                <button
                    v-for="option in options"
                    :key="option.view.bag.id"
                    type="button"
                    class="pressable flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left active:bg-surface-muted"
                    :class="option.view.bag.id === model ? 'bg-accent/10' : ''"
                    @click="pick(option.view.bag.id)"
                >
                    <span class="min-w-0 flex-1">
                        <span class="block truncate font-semibold">{{ option.coffeeName }}</span>
                        <span class="block truncate text-sm text-text-muted">
                            {{ option.roaster }} · Roasted
                            {{ formatShortDate(option.view.bag.roast_date) }}
                        </span>
                    </span>
                    <span class="tabular shrink-0 text-sm font-semibold">{{
                        formatGrams(option.view.remaining)
                    }}</span>
                    <Check
                        class="size-5 shrink-0 text-accent"
                        :class="option.view.bag.id === model ? '' : 'invisible'"
                    />
                </button>

                <div
                    v-if="options.length === 0"
                    class="rounded-card border border-dashed border-border p-4 text-sm text-text-muted"
                >
                    No coffee on the shelf.
                    <RouterLink
                        to="/coffees/new"
                        class="mt-2 flex items-center gap-1 font-semibold text-accent"
                    >
                        <Plus class="size-4" /> Add coffee
                    </RouterLink>
                </div>

                <button
                    type="button"
                    class="pressable flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left active:bg-surface-muted"
                    :class="model === null ? 'bg-accent/10' : ''"
                    @click="pick(null)"
                >
                    <Ban class="size-5 shrink-0 text-text-muted" />
                    <span class="flex-1">
                        <span class="block font-semibold">No coffee</span>
                        <span class="block text-sm text-text-muted">Nothing is deducted</span>
                    </span>
                    <Check
                        class="size-5 shrink-0 text-accent"
                        :class="model === null ? '' : 'invisible'"
                    />
                </button>
            </div>
        </BottomSheet>
    </div>
</template>
