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
import PourOverStage from '@/components/brews/PourOverStage.vue'
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
    drainRate,
    drainTick,
    estimateDrain,
    formatDelta,
    pourState,
    targetEndS,
    type Drain,
} from '@/modules/brews/pourover'
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
import { isPourOver, pourOverSteps, stepsEndS } from '@/modules/recipes/steps'
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
const elapsedS = computed(() => elapsed.value / 1000)
const pourOver = computed(() => isPourOver(method.value))

/** Cold brew: only the steps before steeping happen here. */
const steps = computed<RecipeStep[]>(() => {
    if (!snapshot.value) return []

    if (method.value === 'cold_brew') return coldBrewPhases(snapshot.value.steps).before

    return pourOver.value ? pourOverSteps(snapshot.value.steps) : snapshot.value.steps
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

// Pour-over: steps follow one another from the step the user last moved to.
const pour = computed(() =>
    pourState(
        steps.value,
        run.value?.step_index ?? 0,
        run.value?.step_started_s ?? 0,
        elapsedS.value,
    ),
)
const target = computed(() => targetEndS(steps.value, snapshot.value?.target_time_s ?? null))
const drawdown = computed(() => started.value && pour.value.phase === 'drawdown')
/** Seconds past (positive) or before (negative) the recipe's total time. */
const overBy = computed(() => (target.value === null ? null : elapsedS.value - target.value))
const nextPour = computed(() =>
    steps.value.slice(pour.value.index + 1).find((step) => step.target_water_g !== null),
)

/** Step bar: each step as long as it lasts, the drawdown up to the target time at the end. */
const segments = computed(() => {
    const p = pour.value
    const list = steps.value.map((step, index) => {
        const length = step.duration_s ?? 10
        let fill = index < p.index ? 1 : 0
        if (index === p.index) {
            fill =
                p.phase === 'drawdown' || !started.value
                    ? Number(p.phase === 'drawdown')
                    : step.duration_s
                      ? Math.min(1, (elapsedS.value - p.startS) / step.duration_s)
                      : 0.5
        }

        return { length, fill, current: index === p.index && p.phase === 'step' }
    })
    const end = stepsEndS(steps.value)
    if (target.value !== null && end !== null && target.value > end) {
        const fill = drawdown.value
            ? Math.min(1, (elapsedS.value - (p.endS ?? 0)) / (target.value - end))
            : 0
        list.push({ length: target.value - end, fill, current: drawdown.value })
    }

    return list
})

// Dripper picture: water in the cone and coffee in the server, simulated tick by tick.
const totalWater = computed(
    () =>
        snapshot.value?.water_g ??
        Math.max(0, ...steps.value.map((step) => step.target_water_g ?? 0)),
)
const pouredG = computed(() => (started.value ? pour.value.expectedG : 0))
const drain = ref<Drain>({ inDripperG: 0, servedG: 0 })
let lastTick = { elapsedS: 0, pouredG: 0 }

watch([elapsedS, pouredG], ([seconds, poured]) => {
    const rate = drainRate(totalWater.value, target.value)
    const dt = seconds - lastTick.elapsedS

    drain.value =
        dt < 0 || dt > 3
            ? estimateDrain(poured, seconds, rate)
            : drainTick(drain.value, poured - lastTick.pouredG, dt, rate)
    lastTick = { elapsedS: seconds, pouredG: poured }
})

const stage = computed(() => {
    const p = pour.value
    const step = p.phase === 'step' && started.value ? p.step : null
    const previous = steps.value[p.index - 1]
    const capacity = Math.max(120, totalWater.value * 0.55)

    return {
        rate: running.value && p.pour ? p.pour.rate : null,
        level: drain.value.inDripperG / capacity,
        served: totalWater.value ? drain.value.servedG / (totalWater.value * 0.92) : 0,
        wet: pouredG.value > 0,
        bubbling: step?.type === 'bloom' || (step?.type === 'wait' && previous?.type === 'bloom'),
        swirling: running.value && (step?.type === 'swirl' || step?.type === 'stir'),
        dripping: drain.value.inDripperG > 0.5,
        paused: !running.value,
    }
})

const typeLabel = (step: RecipeStep) => STEP_TYPES.find((t) => t.value === step.type)?.label ?? ''
const title = (step: RecipeStep) =>
    (step.type === 'custom' || step.type === 'wait') && step.text && step.target_water_g === null
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
        if (pourOver.value || !running.value || index <= previous || step?.at_s == null) return

        // Back from the background several steps later: jump silently.
        if (elapsed.value / 1000 - step.at_s < 1.5) signalChange()
    },
)

watch(
    () => pour.value.index * 2 + Number(pour.value.phase === 'drawdown'),
    (key, previous) => {
        if (!pourOver.value || !running.value || key <= previous) return

        // Back from the background several steps later: jump silently.
        const startedS = pour.value.phase === 'drawdown' ? pour.value.endS! : pour.value.startS
        if (elapsedS.value - startedS < 1.5) signalChange()
    },
)

watch(
    () => {
        const seconds = pourOver.value
            ? pour.value.phase === 'step'
                ? pour.value.secondsLeft
                : null
            : state.value.secondsToNext
        return seconds === null ? null : Math.ceil(seconds)
    },
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
    if (pourOver.value) {
        if (pour.value.isLast) return void finish()
        return void patchRun({
            step_index: pour.value.index + 1,
            step_started_s: elapsedS.value,
        })
    }
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
                v-if="total && method === 'espresso'"
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

        <!-- V60: what to pour and how fast, over a picture of the dripper -->
        <main v-else-if="pourOver" class="flex flex-1 flex-col px-5 pt-3">
            <div class="flex items-baseline justify-between gap-3">
                <p
                    class="tabular font-display text-[34px] leading-none font-semibold"
                    :class="[
                        paused ? 'animate-pulse text-cream/60' : '',
                        drawdown && overBy !== null && overBy > 0 ? 'text-warning' : '',
                    ]"
                >
                    {{ formatTimer(elapsed) }}
                    <span v-if="target" class="text-base font-normal text-cream/50"
                        >/ {{ formatSeconds(target) }}</span
                    >
                </p>
                <p
                    v-if="pour.step"
                    class="truncate text-xs font-semibold tracking-[0.14em] text-accent uppercase"
                >
                    <template v-if="drawdown">Drawdown</template>
                    <template v-else
                        >Step {{ pour.index + 1 }}/{{ steps.length }} ·
                        {{ typeLabel(pour.step) }}</template
                    >
                </p>
            </div>

            <PourOverStage
                class="mx-auto mt-1 min-h-0 w-full max-w-[21rem] flex-1 basis-0"
                v-bind="stage"
            />

            <section class="mt-2 min-h-[8.5rem] text-center" aria-live="polite">
                <template v-if="!started">
                    <p class="font-display font-soft text-[30px] leading-tight font-semibold">
                        {{ pour.step ? title(pour.step) : 'Ready' }}
                    </p>
                    <p v-if="pour.pour" class="tabular mt-1 text-cream/70">
                        {{ Math.round(pour.pour.toG - pour.pour.fromG) }} g in
                        {{ pour.step?.duration_s }} s ·
                        <strong class="text-cream"
                            >{{ Math.round(pour.pour.rate * 10) / 10 }} g/s</strong
                        >
                    </p>
                    <p class="mt-1 text-sm text-cream/60">Start when the kettle is ready.</p>
                </template>

                <template v-else-if="drawdown">
                    <p class="font-display font-soft text-[34px] leading-tight font-semibold">
                        Let it drain
                    </p>
                    <p v-if="overBy === null" class="mt-1 text-cream/70">
                        Finish when the water is through.
                    </p>
                    <p v-else-if="overBy < 0" class="tabular mt-1 text-cream/70">
                        Should be through by {{ formatSeconds(target!) }} ·
                        <strong class="text-cream">{{ formatSeconds(Math.ceil(-overBy)) }}</strong>
                        left
                    </p>
                    <p v-else class="tabular mt-1 font-semibold text-warning">
                        {{ formatDelta(overBy) }} over the recipe
                    </p>
                </template>

                <template v-else-if="pour.pour">
                    <p class="tabular font-display text-[64px] leading-none font-semibold">
                        {{ Math.round(pour.expectedG)
                        }}<span class="text-2xl font-normal text-cream/60"> g</span>
                    </p>
                    <p class="tabular mt-2 text-cream/75">
                        <strong class="text-accent"
                            >{{ Math.round(pour.pour.rate * 10) / 10 }} g/s</strong
                        >
                        · to {{ Math.round(pour.pour.toG) }} g ·
                        {{ formatSeconds(Math.ceil(pour.secondsLeft ?? 0)) }} left
                    </p>
                    <p v-if="detail(pour.step!)" class="mt-1 text-sm text-cream/60">
                        {{ detail(pour.step!) }}
                    </p>
                </template>

                <template v-else-if="pour.step">
                    <p class="font-display font-soft text-[34px] leading-tight font-semibold">
                        {{ title(pour.step) }}
                    </p>
                    <p v-if="detail(pour.step)" class="text-sm text-cream/60">
                        {{ detail(pour.step) }}
                    </p>
                    <p v-if="pour.secondsLeft === null" class="mt-1 text-cream/70">
                        Tap Next when done
                    </p>
                    <p v-else-if="nextPour" class="tabular mt-1 text-cream/70">
                        {{ nextPour.type === 'bloom' ? 'Bloom' : 'Next pour' }} in
                        <strong class="text-cream">{{
                            formatSeconds(Math.ceil(pour.secondsLeft))
                        }}</strong>
                        → {{ nextPour.target_water_g }} g
                    </p>
                    <p v-else-if="pour.next" class="tabular mt-1 text-cream/70">
                        Next: {{ title(pour.next) }} in
                        <strong class="text-cream">{{
                            formatSeconds(Math.ceil(pour.secondsLeft))
                        }}</strong>
                    </p>
                    <p v-else class="tabular mt-1 text-cream/70">
                        Drawdown in
                        <strong class="text-cream">{{
                            formatSeconds(Math.ceil(pour.secondsLeft))
                        }}</strong>
                    </p>
                </template>
            </section>

            <div class="mt-3 flex gap-1" aria-hidden="true">
                <div
                    v-for="(segment, index) in segments"
                    :key="index"
                    class="h-1.5 overflow-hidden rounded-full bg-cream/12"
                    :class="segment.current ? 'ring-1 ring-accent/60' : ''"
                    :style="{ flex: `${segment.length} 1 0` }"
                >
                    <div
                        class="h-full rounded-full bg-accent transition-[width] duration-200"
                        :style="{ width: `${segment.fill * 100}%` }"
                    />
                </div>
            </div>

            <p
                v-if="!wakeLockSupported"
                class="mt-3 flex items-center gap-2 px-1 text-sm text-cream/60"
            >
                <SunMedium class="size-4 shrink-0" /> Keep the screen on while brewing.
            </p>

            <div class="pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
                <AppButton v-if="!started" block @click="start">
                    <Play class="size-5 fill-current" /> Start
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
                        :disabled="!pour.step || pour.isLast"
                        @click="next"
                    >
                        <SkipForward class="size-5" />
                        {{ pour.secondsLeft === null ? 'Next' : 'Skip' }}
                    </AppButton>
                    <AppButton
                        :variant="drawdown ? 'primary' : 'secondary'"
                        :class="drawdown ? '!px-2' : '!bg-cream/12 !px-2 !text-cream'"
                        @click="finish"
                    >
                        <Check class="size-5" /> {{ drawdown ? 'Done' : 'Finish' }}
                    </AppButton>
                </div>
            </div>
        </main>

        <!-- Other step-by-step recipes -->
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
