<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
    Check,
    ChevronDown,
    Ellipsis,
    Hourglass,
    Pause,
    Play,
    RotateCcw,
    SkipForward,
    Square,
    SunMedium,
    X,
} from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import LowBagSheet from '@/components/brews/LowBagSheet.vue'
import ShotGauge from '@/components/brews/ShotGauge.vue'
import MethodArt from '@/components/recipes/MethodArt.vue'
import { useNow } from '@/composables/useNow'
import { useWakeLock } from '@/composables/useWakeLock'
import { playChange, playTick, unlockAudio } from '@/lib/sound'
import {
    discardRun,
    findLowBag,
    patchRun,
    startSteeping,
    type LowBag,
} from '@/modules/brews/actions'
import { coldBrewPhases } from '@/modules/brews/brew'
import {
    elapsedMs,
    formatTimer,
    isRunning,
    pauseTimer,
    resetTimer,
    resumeTimer,
    startTimer,
    stepState,
    stopTimer,
    totalSeconds,
} from '@/modules/brews/timer'
import { useActiveRun } from '@/modules/brews/useBrews'
import { STEEP_PLACES, STEP_TYPES, stepTitle } from '@/modules/recipes/options'
import { formatMinutes, formatSeconds } from '@/modules/recipes/recipe'
import { usePreferencesStore } from '@/stores/preferences'
import type { RecipeStep } from '@/types/models'

const router = useRouter()
const preferences = usePreferencesStore()
const { run, loaded } = useActiveRun()
const now = useNow(100)

/** Set while saving, so the run disappearing does not bounce to Brew home. */
let leaving = false

watch(
    [loaded, run],
    ([isLoaded, current]) => {
        if (isLoaded && !current && !leaving) void router.replace('/brew')
    },
    { immediate: true },
)

const snapshot = computed(() => run.value?.snapshot ?? null)
const method = computed(() => snapshot.value?.method ?? 'v60')
const started = computed(() => run.value?.started_at != null)
const running = computed(() => (run.value ? isRunning(run.value) : false))
const paused = computed(() => run.value?.paused_at != null)
const stopped = computed(() => run.value?.stopped_at != null)
const elapsed = computed(() => (run.value ? elapsedMs(run.value, now.value) : 0))

/** Cold brew: only the steps before steeping happen here. */
const steps = computed<RecipeStep[]>(() => {
    if (!snapshot.value) return []

    return method.value === 'cold_brew'
        ? coldBrewPhases(snapshot.value.steps).before
        : snapshot.value.steps
})

const state = computed(() =>
    stepState(steps.value, run.value?.step_index ?? 0, Math.floor(elapsed.value / 1000)),
)
const total = computed(() =>
    totalSeconds(
        steps.value,
        method.value === 'espresso' ? null : (snapshot.value?.target_time_s ?? null),
    ),
)
const progress = computed(() => (total.value ? Math.min(1, elapsed.value / 1000 / total.value) : 0))
/** Past the last step and the target time: time to finish. */
const overdue = computed(
    () => state.value.isLast && total.value !== null && elapsed.value / 1000 >= total.value,
)

const typeLabel = (step: RecipeStep) => STEP_TYPES.find((t) => t.value === step.type)?.label ?? ''
const title = (step: RecipeStep) =>
    step.type === 'custom' && step.text && step.target_water_g === null
        ? step.text
        : stepTitle(step)
const detail = (step: RecipeStep) => (title(step) === step.text ? null : step.text)

const { supported: wakeLockSupported } = useWakeLock(
    computed(() => method.value === 'cold_brew' || (started.value && !stopped.value)),
)

// Step alerts: a tick 3 s before a timed step, a chime and a flash when it starts.
const flash = ref(false)

function signalChange(): void {
    flash.value = true
    setTimeout(() => (flash.value = false), 350)
    if (preferences.sounds) playChange()
}

watch(
    () => state.value.index,
    (index, previous) => {
        const step = steps.value[index]
        if (!running.value || index <= previous || step?.at_s == null) return

        // Back from the background several steps later: jump silently.
        if (elapsed.value / 1000 - step.at_s < 1.5) signalChange()
    },
)

watch(
    () => (state.value.secondsToNext === null ? null : Math.ceil(state.value.secondsToNext)),
    (seconds, previous) => {
        if (running.value && seconds === 3 && previous === 4 && preferences.sounds) playTick()
    },
)

function start(): void {
    unlockAudio()
    void patchRun(startTimer(Date.now()))
}

function togglePause(): void {
    const current = run.value!
    void patchRun(paused.value ? resumeTimer(current, Date.now()) : pauseTimer(current, Date.now()))
}

/** Next / Skip: move past the step on screen. */
function next(): void {
    if (state.value.isLast) return void finish()
    void patchRun({ step_index: state.value.index + 1 })
}

async function finish(): Promise<void> {
    await patchRun(stopTimer(run.value!, Date.now()))
    await router.push('/brew/finish')
}

const menuOpen = ref(false)
const confirmCancel = ref(false)

async function restart(): Promise<void> {
    menuOpen.value = false
    await patchRun(resetTimer())
}

async function cancel(): Promise<void> {
    leaving = true
    await discardRun()
    await router.replace('/brew')
}

// Cold brew
const steeping = ref(false)
const low = ref<LowBag | null>(null)
let steepingId = ''

async function startSteep(): Promise<void> {
    steeping.value = true
    leaving = true
    const bagId = run.value!.bag_id
    steepingId = await startSteeping(run.value!)
    low.value = await findLowBag(bagId)
    if (!low.value) await router.replace(`/brews/${steepingId}`)
}

function afterLow(): void {
    low.value = null
    void router.replace(`/brews/${steepingId}`)
}

const steepInfo = computed(() => {
    const s = snapshot.value
    if (!s?.steep_time_min) return null
    const place = STEEP_PLACES.find((p) => p.value === s.steep_place)?.label.toLowerCase()

    return `${formatMinutes(s.steep_time_min)}${place ? ` · ${place}` : ''}`
})
</script>

<template>
    <div
        v-if="run && snapshot"
        class="bg-espresso-panel relative flex min-h-dvh flex-col overflow-hidden"
    >
        <div
            class="pointer-events-none fixed inset-0 z-40 bg-cream transition-opacity duration-300"
            :class="flash ? 'opacity-40' : 'opacity-0'"
        />

        <header class="pt-safe">
            <div class="flex h-14 items-center gap-2 px-3">
                <button
                    type="button"
                    class="pressable flex size-10 items-center justify-center rounded-full bg-black/30"
                    aria-label="Minimize"
                    @click="router.push('/brew')"
                >
                    <ChevronDown class="size-6" />
                </button>
                <div class="min-w-0 flex-1 text-center">
                    <p class="truncate text-sm font-semibold">{{ snapshot.name }}</p>
                    <p class="tabular text-xs text-cream/60">
                        {{ snapshot.dose_g }} g
                        <template v-if="snapshot.water_g">
                            · {{ snapshot.water_g }} g water</template
                        >
                        <template v-if="method === 'espresso' && snapshot.yield_g">
                            · {{ snapshot.yield_g }} g out</template
                        >
                    </p>
                </div>
                <button
                    type="button"
                    class="pressable flex size-10 items-center justify-center rounded-full bg-black/30"
                    aria-label="More"
                    @click="menuOpen = true"
                >
                    <Ellipsis class="size-5" />
                </button>
            </div>
            <div
                v-if="total && method !== 'cold_brew'"
                class="mx-5 h-1 overflow-hidden rounded-full bg-cream/10"
            >
                <div
                    class="h-full rounded-full bg-accent transition-[width] duration-200"
                    :style="{ width: `${progress * 100}%` }"
                />
            </div>
        </header>

        <!-- Cold brew: prepare, then steep -->
        <main v-if="method === 'cold_brew'" class="flex flex-1 flex-col px-5 pt-6">
            <MethodArt method="cold_brew" class="mx-auto size-28 text-cream/90" />
            <ol class="mt-6 space-y-2">
                <li
                    v-for="(step, index) in steps"
                    :key="index"
                    class="flex items-start gap-3 rounded-control px-4 py-3 transition-colors"
                    :class="
                        index === run.step_index
                            ? 'bg-cream/12'
                            : index < run.step_index
                              ? 'opacity-50'
                              : 'opacity-80'
                    "
                >
                    <span
                        class="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        :class="index < run.step_index ? 'bg-success text-white' : 'bg-cream/15'"
                    >
                        <Check v-if="index < run.step_index" class="size-4" />
                        <template v-else>{{ index + 1 }}</template>
                    </span>
                    <span>
                        <span class="block font-semibold">{{ title(step) }}</span>
                        <span v-if="detail(step)" class="block text-sm text-cream/60">{{
                            detail(step)
                        }}</span>
                    </span>
                </li>
            </ol>
            <p v-if="steepInfo" class="mt-5 flex items-center justify-center gap-2 text-cream/70">
                <Hourglass class="size-4" /> Steep {{ steepInfo }}
            </p>
            <div class="mt-auto space-y-2 pt-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
                <AppButton
                    v-if="run.step_index < steps.length"
                    block
                    @click="patchRun({ step_index: run.step_index + 1 })"
                >
                    <Check class="size-5" /> Done, next step
                </AppButton>
                <AppButton
                    block
                    :variant="run.step_index < steps.length ? 'secondary' : 'primary'"
                    :loading="steeping"
                    @click="startSteep"
                >
                    <Hourglass class="size-5" /> Start steeping
                </AppButton>
            </div>
        </main>

        <!-- Espresso: start / stop against the target band -->
        <main v-else-if="method === 'espresso'" class="flex flex-1 flex-col items-center px-5 pt-6">
            <ShotGauge
                :elapsed-ms="elapsed"
                :min="snapshot.target_time_s"
                :max="snapshot.target_time_max_s"
                :preinfusion="snapshot.preinfusion_s"
            />
            <div v-if="state.step" class="mt-4 text-center">
                <p class="text-xs font-semibold tracking-[0.14em] text-accent uppercase">
                    {{ typeLabel(state.step) }}
                </p>
                <p class="font-display font-soft text-2xl font-semibold">{{ title(state.step) }}</p>
                <p v-if="detail(state.step)" class="text-cream/70">{{ detail(state.step) }}</p>
            </div>
            <div class="mt-auto w-full pt-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
                <button
                    v-if="!started"
                    type="button"
                    class="pressable bg-accent-gradient mx-auto flex size-28 items-center justify-center rounded-full text-white shadow-[0_16px_40px_-10px_var(--accent)]"
                    aria-label="Start"
                    @click="start"
                >
                    <Play class="size-12 translate-x-1 fill-current" />
                </button>
                <button
                    v-else-if="!stopped"
                    type="button"
                    class="pressable mx-auto flex size-28 items-center justify-center rounded-full bg-cream text-espresso"
                    aria-label="Stop"
                    @click="finish"
                >
                    <Square class="size-10 fill-current" />
                </button>
                <AppButton v-else block @click="router.push('/brew/finish')"
                    >Log this shot</AppButton
                >
            </div>
        </main>

        <!-- V60 and other step-by-step recipes -->
        <main v-else class="flex flex-1 flex-col px-5 pt-8">
            <p
                class="tabular font-display text-center text-[88px] leading-none font-semibold"
                :class="paused ? 'animate-pulse text-cream/60' : ''"
            >
                {{ formatTimer(elapsed) }}
            </p>
            <p v-if="total" class="tabular mt-2 text-center text-sm text-cream/60">
                of {{ formatSeconds(total) }}
            </p>

            <section v-if="state.step" class="mt-8 rounded-card bg-cream/8 p-5">
                <p class="text-xs font-semibold tracking-[0.14em] text-accent uppercase">
                    Step {{ state.index + 1 }}/{{ steps.length }} · {{ typeLabel(state.step) }}
                </p>
                <p class="font-display font-soft mt-1 text-[34px] leading-tight font-semibold">
                    {{ title(state.step) }}
                </p>
                <p v-if="detail(state.step)" class="mt-1 text-cream/75">{{ detail(state.step) }}</p>
            </section>

            <p v-if="state.next" class="tabular mt-3 px-1 text-cream/70">
                Next: {{ title(state.next) }}
                <template v-if="state.secondsToNext !== null">
                    in
                    <strong class="text-cream">{{
                        formatSeconds(Math.ceil(state.secondsToNext))
                    }}</strong>
                </template>
                <template v-else> · tap Next</template>
            </p>
            <p v-else-if="started && state.step" class="mt-3 px-1 text-cream/70">
                {{ overdue ? 'All done. Finish when it has drained.' : 'Last step' }}
            </p>

            <p
                v-if="!wakeLockSupported"
                class="mt-4 flex items-center gap-2 px-1 text-sm text-cream/60"
            >
                <SunMedium class="size-4 shrink-0" /> Keep the screen on while brewing.
            </p>

            <div class="mt-auto pt-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
                <AppButton v-if="!started" block @click="start">
                    <Play class="size-5 fill-current" /> Start timer
                </AppButton>
                <AppButton v-else-if="stopped" block @click="router.push('/brew/finish')"
                    >Log this brew</AppButton
                >
                <div v-else class="grid grid-cols-3 gap-2">
                    <AppButton
                        variant="secondary"
                        class="!bg-cream/12 !px-2 !text-cream"
                        @click="togglePause"
                    >
                        <Play v-if="paused" class="size-5 fill-current" />
                        <Pause v-else class="size-5" />
                        {{ paused ? 'Resume' : 'Pause' }}
                    </AppButton>
                    <AppButton
                        variant="secondary"
                        class="!bg-cream/12 !px-2 !text-cream"
                        :disabled="!state.step || state.isLast"
                        @click="next"
                    >
                        <SkipForward class="size-5" />
                        {{ state.secondsToNext === null ? 'Next' : 'Skip' }}
                    </AppButton>
                    <AppButton
                        :variant="overdue ? 'primary' : 'secondary'"
                        :class="overdue ? '!px-2' : '!bg-cream/12 !px-2 !text-cream'"
                        @click="finish"
                    >
                        <Check class="size-5" /> Finish
                    </AppButton>
                </div>
            </div>
        </main>

        <BottomSheet v-model:open="menuOpen">
            <div class="space-y-1 text-text">
                <button
                    v-if="method !== 'cold_brew'"
                    type="button"
                    class="pressable flex h-13 w-full items-center gap-3 rounded-control px-3 font-medium active:bg-surface-muted"
                    @click="restart"
                >
                    <RotateCcw class="size-5" /> Restart timer
                </button>
                <button
                    type="button"
                    class="pressable flex h-13 w-full items-center gap-3 rounded-control px-3 font-medium text-danger active:bg-surface-muted"
                    @click="((menuOpen = false), (confirmCancel = true))"
                >
                    <X class="size-5" /> Cancel brew
                </button>
            </div>
        </BottomSheet>

        <BottomSheet v-model:open="confirmCancel" title="Cancel this brew?">
            <p class="mb-5 text-text-muted">Nothing will be saved.</p>
            <div class="space-y-2">
                <AppButton variant="danger" block @click="cancel">Cancel brew</AppButton>
                <AppButton variant="ghost" block @click="confirmCancel = false"
                    >Keep brewing</AppButton
                >
            </div>
        </BottomSheet>

        <LowBagSheet :low="low" @done="afterLow" />
    </div>
</template>
