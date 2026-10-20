<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SubPageHeader from '@/components/layout/SubPageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import ChipGroup from '@/components/ui/ChipGroup.vue'
import TextField from '@/components/ui/TextField.vue'
import BagPicker from '@/components/brews/BagPicker.vue'
import BrewResultFields from '@/components/brews/BrewResultFields.vue'
import LowBagSheet from '@/components/brews/LowBagSheet.vue'
import { scrollToFirstError } from '@/composables/scrollToError'
import { db } from '@/lib/db'
import type { FormErrors } from '@/modules/coffees/form'
import { findLowBag, logQuick, updateBrew, type LowBag } from '@/modules/brews/actions'
import { defaultBagId } from '@/modules/brews/brew'
import {
    brewToForm,
    emptyBrewForm,
    formToBrew,
    fromLocalInput,
    validateBrewForm,
    type BrewFormState,
} from '@/modules/brews/form'
import { useBrews, useShelf } from '@/modules/brews/useBrews'
import { METHODS } from '@/modules/recipes/options'
import type { Brew, BrewMethod } from '@/types/models'

const route = useRoute()
const router = useRouter()
const { options, coffeeOf, loaded: shelfLoaded } = useShelf()
const { brews, loaded: brewsLoaded } = useBrews()

const editId = computed(() => (route.params.id as string | undefined) ?? null)
const editing = ref<Brew | null>(null)
const form = ref<BrewFormState>(emptyBrewForm())
const errors = ref<FormErrors<BrewFormState>>({})
const saving = ref(false)
const low = ref<LowBag | null>(null)
const ready = ref(false)

const methodOptions = METHODS.map((m) => ({ value: m.value, label: m.label }))

watch(
    [editId, shelfLoaded, brewsLoaded],
    async ([id, shelf, history]) => {
        if (ready.value) return

        if (id) {
            const brew = await db.brews.get(id)
            if (!brew || brew.deleted_at) return void router.replace('/brew')
            editing.value = brew
            form.value = brewToForm(brew)
            ready.value = true
            return
        }

        if (!shelf || !history) return
        form.value.bag_id = defaultBagId(options.value, null, brews.value)
        ready.value = true
    },
    { immediate: true },
)

const method = computed<BrewMethod | null>({
    get: () => form.value.method,
    set: (value) => value && (form.value.method = value),
})

async function save(): Promise<void> {
    if (saving.value) return
    errors.value = validateBrewForm(form.value, { checkDate: true })
    if (Object.keys(errors.value).length) return void scrollToFirstError('brew-log')

    saving.value = true
    const fields = formToBrew(form.value)
    const startedAt = fromLocalInput(form.value.started_at)

    if (editing.value) {
        await updateBrew(editing.value, { ...fields, started_at: startedAt })
        return void router.replace(`/brews/${editing.value.id}`)
    }

    await logQuick(fields, startedAt)
    low.value = await findLowBag(fields.bag_id)
    if (!low.value) await router.replace('/brew')
}

function afterLow(): void {
    low.value = null
    void router.replace('/brew')
}
</script>

<template>
    <div class="pb-28">
        <SubPageHeader
            :title="editId ? 'Edit brew' : 'Quick log'"
            :back="editId ? `/brews/${editId}` : '/brew'"
        />

        <form
            v-if="ready"
            id="brew-log"
            class="animate-rise space-y-4 px-5 pt-4"
            novalidate
            @submit.prevent="save"
        >
            <section class="space-y-5 rounded-card border border-border/60 bg-surface p-5">
                <BagPicker
                    v-model="form.bag_id"
                    :options="options"
                    :fallback-coffee="form.bag_id ? coffeeOf.get(form.bag_id) : null"
                />
                <ChipGroup
                    v-model="method"
                    label="Method"
                    :options="methodOptions"
                    :deselectable="false"
                />
                <TextField
                    v-model="form.started_at"
                    label="Date & time"
                    type="datetime-local"
                    :error="errors.started_at"
                />
            </section>

            <section class="rounded-card border border-border/60 bg-surface p-5">
                <BrewResultFields v-model="form" :errors="errors" />
            </section>
        </form>

        <Teleport to="body">
            <div
                class="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg border-t border-border/50 bg-bg/90 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl"
            >
                <AppButton type="submit" form="brew-log" block :loading="saving">
                    {{ editId ? 'Save changes' : 'Log brew' }}
                </AppButton>
            </div>
        </Teleport>

        <LowBagSheet :low="low" @done="afterLow" />
    </div>
</template>
