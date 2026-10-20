<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SubPageHeader from '@/components/layout/SubPageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import BrewResultFields from '@/components/brews/BrewResultFields.vue'
import LowBagSheet from '@/components/brews/LowBagSheet.vue'
import MethodArt from '@/components/recipes/MethodArt.vue'
import { scrollToFirstError } from '@/composables/scrollToError'
import { db } from '@/lib/db'
import type { FormErrors } from '@/modules/coffees/form'
import {
    discardRun,
    finishSteeping,
    findLowBag,
    logRun,
    type LowBag,
} from '@/modules/brews/actions'
import {
    emptyBrewForm,
    formToResult,
    validateBrewForm,
    type BrewFormState,
} from '@/modules/brews/form'
import { brewTargetS, timeVerdict } from '@/modules/brews/pourover'
import { elapsedMs } from '@/modules/brews/timer'
import { formatSeconds, parseSeconds } from '@/modules/recipes/recipe'
import type { Brew } from '@/types/models'
import { useActiveRun } from '@/modules/brews/useBrews'

const route = useRoute()
const router = useRouter()
const { run, loaded } = useActiveRun()

/** Finishing a steeping cold brew instead of the timed run. */
const steepingId = computed(() => (typeof route.query.brew === 'string' ? route.query.brew : null))
const steepingBrew = ref<Brew | null>(null)

const form = ref<BrewFormState | null>(null)
const errors = ref<FormErrors<BrewFormState>>({})
const saving = ref(false)
const confirmDiscard = ref(false)
const low = ref<LowBag | null>(null)
let done = false

const text = (value: number | null) => (value === null ? '' : String(value))

watch(
    [loaded, run],
    async ([isLoaded, current]) => {
        if (form.value || done) return

        if (steepingId.value) {
            const brew = await db.brews.get(steepingId.value)
            if (!brew || brew.deleted_at || brew.status !== 'steeping') {
                return void router.replace('/brew')
            }
            steepingBrew.value = brew
            form.value = {
                ...emptyBrewForm('cold_brew'),
                bag_id: brew.bag_id,
                dose: text(Number(brew.dose_g)),
                water: text(brew.water_g === null ? null : Number(brew.water_g)),
            }
            return
        }

        if (!isLoaded) return
        if (!current) return void router.replace('/brew')

        const s = current.snapshot
        form.value = {
            ...emptyBrewForm(s.method),
            bag_id: current.bag_id,
            dose: text(s.dose_g),
            water: s.method === 'espresso' ? '' : text(s.water_g),
            time: formatSeconds(Math.round(elapsedMs(current, Date.now()) / 1000)),
        }
    },
    { immediate: true },
)

const name = computed(() => steepingBrew.value?.recipe_snapshot?.name ?? run.value?.snapshot.name)
const method = computed(() => form.value?.method ?? 'v60')

/** "0:18 slower than the recipe (3:00)" */
const timeHint = computed(() => {
    const target = brewTargetS(run.value?.snapshot ?? null)
    const time = form.value ? parseSeconds(form.value.time) : null
    const verdict = timeVerdict(time !== null && !Number.isNaN(time) ? time : null, target)

    return verdict && `${verdict.label} (${formatSeconds(target!)})`
})

async function save(): Promise<void> {
    if (!form.value || saving.value) return
    errors.value = validateBrewForm(form.value)
    if (Object.keys(errors.value).length) return void scrollToFirstError('brew-finish')

    saving.value = true
    done = true
    const result = formToResult(form.value)
    const bagId = form.value.bag_id

    if (steepingBrew.value) await finishSteeping(steepingBrew.value.id, result)
    else await logRun(run.value!, result)

    low.value = await findLowBag(bagId)
    if (!low.value) await router.replace('/brew')
}

async function discard(): Promise<void> {
    done = true
    await discardRun()
    await router.replace('/brew')
}

function afterLow(): void {
    low.value = null
    void router.replace('/brew')
}
</script>

<template>
    <div class="pb-28">
        <SubPageHeader
            title="How was it?"
            :back="steepingId ? `/brews/${steepingId}` : '/brew/run'"
        />

        <form
            v-if="form"
            id="brew-finish"
            class="animate-rise space-y-4 px-5 pt-4"
            novalidate
            @submit.prevent="save"
        >
            <div class="flex items-center gap-3 px-1">
                <MethodArt :method="method" class="size-12 shrink-0 text-text" />
                <p class="font-display font-soft min-w-0 truncate text-xl font-semibold">
                    {{ name }}
                </p>
            </div>

            <section class="rounded-card border border-border/60 bg-surface p-5">
                <BrewResultFields
                    v-model="form"
                    :errors="errors"
                    :focus-yield="method === 'espresso'"
                    :time-hint="steepingId ? null : timeHint"
                />
            </section>

            <button
                v-if="!steepingId"
                type="button"
                class="w-full py-3 text-sm font-semibold text-danger"
                @click="confirmDiscard = true"
            >
                Discard this brew
            </button>
        </form>

        <Teleport to="body">
            <div
                class="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg border-t border-border/50 bg-bg/90 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl"
            >
                <AppButton type="submit" form="brew-finish" block :loading="saving"
                    >Save brew</AppButton
                >
            </div>
        </Teleport>

        <BottomSheet v-model:open="confirmDiscard" title="Discard this brew?">
            <p class="mb-5 text-text-muted">Nothing will be saved.</p>
            <div class="space-y-2">
                <AppButton variant="danger" block @click="discard">Discard</AppButton>
                <AppButton variant="ghost" block @click="confirmDiscard = false">Keep it</AppButton>
            </div>
        </BottomSheet>

        <LowBagSheet :low="low" @done="afterLow" />
    </div>
</template>
