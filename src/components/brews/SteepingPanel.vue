<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CalendarPlus, Check, Hourglass } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import SubPageHeader from '@/components/layout/SubPageHeader.vue'
import MethodArt from '@/components/recipes/MethodArt.vue'
import { useNow } from '@/composables/useNow'
import { deleteBrew } from '@/modules/brews/actions'
import { brewTitle, coldBrewPhases, steepRemainingMs } from '@/modules/brews/brew'
import { formatClock, formatCountdown } from '@/modules/brews/format'
import { googleCalendarUrl, offerCalendarEvent, type CalendarEvent } from '@/modules/brews/ics'
import { stepTitle } from '@/modules/recipes/options'
import type { Brew } from '@/types/models'

const props = defineProps<{ brew: Brew; coffeeName: string | null }>()

const router = useRouter()
const now = useNow(15_000)

const remaining = computed(() => steepRemainingMs(props.brew, now.value))
const ready = computed(() => remaining.value === 0)
const progress = computed(() => {
    const start = Date.parse(props.brew.started_at)
    const end = Date.parse(props.brew.steep_ends_at ?? props.brew.started_at)

    return end > start ? Math.min(1, (now.value - start) / (end - start)) : 1
})
const afterSteps = computed(() => coldBrewPhases(props.brew.recipe_snapshot?.steps ?? []).after)

const event = computed<CalendarEvent>(() => ({
    uid: props.brew.id,
    title: `Cold Brew ready${props.coffeeName ? `: ${props.coffeeName}` : ''}`,
    start: new Date(props.brew.steep_ends_at ?? props.brew.started_at),
}))

const confirmDiscard = ref(false)
const discarding = ref(false)

async function discard(): Promise<void> {
    discarding.value = true
    await deleteBrew(props.brew.id)
    await router.replace('/brew')
}
</script>

<template>
    <div class="pb-10">
        <section class="bg-espresso-panel relative overflow-hidden rounded-b-[32px] pb-8">
            <SubPageHeader transparent back="/brew" />
            <div class="animate-rise px-5 pt-2 text-center">
                <MethodArt method="cold_brew" class="mx-auto size-28 text-cream/90" />
                <p class="mt-4 text-xs font-semibold tracking-[0.14em] text-accent uppercase">
                    {{ ready ? 'Ready to filter' : 'Steeping' }}
                </p>
                <h1 class="font-display font-soft mt-1 text-[32px] leading-tight font-semibold">
                    {{ ready ? brewTitle(brew) : `${formatCountdown(remaining)} left` }}
                </h1>
                <p class="tabular mt-1 text-cream/70">
                    Ready at {{ formatClock(brew.steep_ends_at ?? brew.started_at) }}
                </p>
                <div class="mx-auto mt-5 h-1.5 max-w-60 overflow-hidden rounded-full bg-cream/10">
                    <div
                        class="h-full rounded-full bg-accent"
                        :style="{ width: `${progress * 100}%` }"
                    />
                </div>
                <p v-if="coffeeName" class="mt-4 text-sm text-cream/70">
                    {{ coffeeName }} · {{ Number(brew.dose_g) }} g
                </p>
            </div>
        </section>

        <div class="animate-rise space-y-5 px-5 pt-6">
            <section v-if="afterSteps.length">
                <h2 class="font-display font-soft mb-3 text-xl font-semibold">When it's ready</h2>
                <ol class="space-y-2">
                    <li
                        v-for="(step, index) in afterSteps"
                        :key="index"
                        class="rounded-control border border-border/60 bg-surface px-4 py-3"
                    >
                        <p class="font-semibold">{{ stepTitle(step) }}</p>
                        <p v-if="step.text" class="text-sm text-text-muted">{{ step.text }}</p>
                    </li>
                </ol>
            </section>

            <div class="space-y-2">
                <AppButton
                    block
                    :variant="ready ? 'primary' : 'secondary'"
                    @click="router.push(`/brew/finish?brew=${brew.id}`)"
                >
                    <Check class="size-5" /> {{ ready ? 'Filtered, finish' : 'Finish early' }}
                </AppButton>
                <template v-if="!ready">
                    <AppButton variant="secondary" block @click="offerCalendarEvent(event)">
                        <CalendarPlus class="size-5" /> Add reminder
                    </AppButton>
                    <a
                        :href="googleCalendarUrl(event)"
                        target="_blank"
                        rel="noopener"
                        class="block py-2 text-center text-sm font-semibold text-accent"
                        >or add to Google Calendar</a
                    >
                </template>
            </div>

            <button
                type="button"
                class="flex w-full items-center justify-center gap-2 py-3 text-sm font-semibold text-danger"
                @click="confirmDiscard = true"
            >
                <Hourglass class="size-4" /> Discard cold brew
            </button>
        </div>

        <BottomSheet v-model:open="confirmDiscard" title="Discard this cold brew?">
            <p class="mb-5 text-text-muted">Coffee grams will be returned.</p>
            <div class="space-y-2">
                <AppButton variant="danger" block :loading="discarding" @click="discard"
                    >Discard</AppButton
                >
                <AppButton variant="ghost" block @click="confirmDiscard = false"
                    >Keep steeping</AppButton
                >
            </div>
        </BottomSheet>
    </div>
</template>
