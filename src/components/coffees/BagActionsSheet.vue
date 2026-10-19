<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
    ArchiveRestore,
    CircleCheck,
    Minus,
    Package,
    PackageOpen,
    Pencil,
    Scale,
    Snowflake,
    Trash2,
} from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import TextField from '@/components/ui/TextField.vue'
import {
    deleteBag,
    removeGrams,
    setActualWeight,
    setBagStatus,
    setFrozen,
} from '@/modules/coffees/actions'
import { LOW_REMAINING_G, type BagView } from '@/modules/coffees/balance'
import { parseNumber } from '@/modules/coffees/form'
import { formatShortDate } from '@/modules/coffees/format'
import { formatGrams } from '@/modules/coffees/options'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{ view: BagView | null }>()
const emit = defineEmits<{ edit: [] }>()

type Mode = 'menu' | 'set' | 'remove' | 'delete' | 'finish'

const mode = ref<Mode>('menu')
const grams = ref('')
const note = ref('')
const error = ref<string | null>(null)
const busy = ref(false)
/** What is left right after an adjustment (the live view catches up a moment later). */
const leftAfter = ref(0)

watch(open, (value) => {
    if (value) reset('menu')
})

const bag = computed(() => props.view?.bag ?? null)
const title = computed(() => {
    if (!bag.value) return ''
    const titles: Record<Mode, string> = {
        menu: `Bag · roasted ${formatShortDate(bag.value.roast_date)}`,
        set: 'Set actual weight',
        remove: 'Remove grams',
        delete: 'Delete this bag?',
        finish: 'Almost empty',
    }

    return titles[mode.value]
})

function reset(next: Mode): void {
    mode.value = next
    grams.value = ''
    note.value = ''
    error.value = null
}

async function run(action: () => Promise<void>): Promise<void> {
    busy.value = true
    try {
        await action()
    } finally {
        busy.value = false
    }
}

function close(): void {
    open.value = false
}

async function submitGrams(): Promise<void> {
    const view = props.view!
    const value = parseNumber(grams.value)

    if (
        value === null ||
        Number.isNaN(value) ||
        value < 0 ||
        (mode.value === 'remove' && value === 0)
    ) {
        error.value = 'Enter a number of grams.'
        return
    }

    await run(async () => {
        if (mode.value === 'set') {
            await setActualWeight(view, value)
            leftAfter.value = value
        } else {
            await removeGrams(view, value, note.value.trim() || null)
            leftAfter.value = Math.max(0, view.remaining - value)
        }
    })

    if (leftAfter.value < LOW_REMAINING_G && view.bag.status !== 'finished') reset('finish')
    else close()
}

async function changeStatus(status: 'open' | 'finished'): Promise<void> {
    await run(() => setBagStatus(bag.value!, status))
    close()
}
</script>

<template>
    <BottomSheet v-model:open="open" :title="title">
        <template v-if="view && bag">
            <div v-if="mode === 'menu'" class="space-y-1">
                <p class="tabular mb-4 text-text-muted">
                    <strong class="font-display text-3xl font-semibold text-text">{{
                        formatGrams(view.remaining)
                    }}</strong>
                    left of {{ formatGrams(bag.weight_g) }}
                </p>

                <button v-if="bag.status !== 'finished'" class="sheet-row" @click="reset('set')">
                    <Scale /> Set actual weight
                </button>
                <button v-if="bag.status !== 'finished'" class="sheet-row" @click="reset('remove')">
                    <Minus /> Remove grams
                </button>
                <button
                    v-if="bag.status === 'sealed'"
                    class="sheet-row"
                    @click="changeStatus('open')"
                >
                    <PackageOpen /> Mark as open
                </button>
                <button
                    v-if="bag.status !== 'finished'"
                    class="sheet-row"
                    @click="changeStatus('finished')"
                >
                    <CircleCheck /> Mark as finished
                </button>
                <button v-else class="sheet-row" @click="changeStatus('open')">
                    <ArchiveRestore /> Reopen
                </button>
                <button
                    class="sheet-row"
                    @click="run(() => setFrozen(bag!, !bag!.is_frozen)).then(close)"
                >
                    <Snowflake /> {{ bag.is_frozen ? 'Take out of freezer' : 'Mark as frozen' }}
                </button>
                <button class="sheet-row" @click="emit('edit')"><Pencil /> Edit bag</button>
                <button class="sheet-row text-danger" @click="reset('delete')">
                    <Trash2 /> Delete bag
                </button>
            </div>

            <form
                v-else-if="mode === 'set' || mode === 'remove'"
                class="space-y-4"
                novalidate
                @submit.prevent="submitGrams"
            >
                <p class="text-sm text-text-muted">
                    <template v-if="mode === 'set'">
                        Weigh what is left in the bag. Right now the app expects
                        <strong class="tabular text-text">{{ formatGrams(view.remaining) }}</strong
                        >.
                    </template>
                    <template v-else>Spilled, gifted, used elsewhere?</template>
                </p>
                <TextField
                    v-model="grams"
                    :label="mode === 'set' ? 'Grams left' : 'Grams removed'"
                    inputmode="decimal"
                    suffix="g"
                    :error="error"
                />
                <TextField
                    v-if="mode === 'remove'"
                    v-model="note"
                    label="Reason (optional)"
                    placeholder="e.g. gave to a friend"
                />
                <AppButton type="submit" block :loading="busy">Save</AppButton>
            </form>

            <div v-else-if="mode === 'finish'" class="space-y-4">
                <p class="text-text-muted">
                    Only
                    <strong class="tabular text-text">{{ formatGrams(leftAfter) }}</strong> left.
                    Mark this bag as finished?
                </p>
                <AppButton block :loading="busy" @click="changeStatus('finished')">
                    <Package class="size-5" /> Mark as finished
                </AppButton>
                <AppButton variant="ghost" block @click="close">Not yet</AppButton>
            </div>

            <div v-else-if="mode === 'delete'" class="space-y-4">
                <p class="text-text-muted">The bag and its weight corrections will be removed.</p>
                <AppButton
                    variant="danger"
                    block
                    :loading="busy"
                    @click="run(() => deleteBag(bag!.id)).then(close)"
                >
                    Delete bag
                </AppButton>
                <AppButton variant="ghost" block @click="reset('menu')">Cancel</AppButton>
            </div>
        </template>
    </BottomSheet>
</template>

<style scoped>
@reference '@/assets/main.css';

.sheet-row {
    @apply pressable flex h-13 w-full items-center gap-3 rounded-control px-3 text-left font-medium active:bg-surface-muted;
}

.sheet-row :deep(svg) {
    @apply size-5 shrink-0;
}
</style>
