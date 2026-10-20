<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronRight } from 'lucide-vue-next'
import MethodArt from '@/components/recipes/MethodArt.vue'
import { useNow } from '@/composables/useNow'
import type { ActiveRun } from '@/lib/db'
import { brewTitle, steepRemainingMs } from '@/modules/brews/brew'
import { formatClock, formatCountdown } from '@/modules/brews/format'
import { elapsedMs, formatTimer } from '@/modules/brews/timer'
import type { Brew, Coffee } from '@/types/models'

const props = defineProps<{
    run: ActiveRun | null
    steeping: Brew[]
    coffeeOf: Map<string, Coffee>
}>()

const now = useNow(1000)

const runStatus = computed(() => {
    const run = props.run
    if (!run) return ''
    if (run.snapshot.method === 'cold_brew') return 'Preparing'
    if (run.stopped_at !== null) return 'Ready to log'
    if (run.started_at === null) return 'Not started'

    const time = formatTimer(elapsedMs(run, now.value))

    return run.paused_at !== null ? `Paused · ${time}` : time
})

const runLink = computed(() => (props.run?.stopped_at != null ? '/brew/finish' : '/brew/run'))

function steepStatus(brew: Brew): string {
    const left = steepRemainingMs(brew, now.value)
    const at = formatClock(brew.steep_ends_at ?? brew.started_at)

    return left > 0 ? `Ready at ${at} · ${formatCountdown(left)} left` : 'Ready to filter'
}
</script>

<template>
    <div v-if="run || steeping.length" class="space-y-2">
        <RouterLink
            v-if="run"
            :to="runLink"
            class="bg-espresso-panel pressable flex items-center gap-4 rounded-card p-4"
        >
            <MethodArt :method="run.snapshot.method" class="size-14 shrink-0 text-cream/90" />
            <div class="min-w-0 flex-1">
                <p class="text-xs font-semibold tracking-[0.14em] text-accent uppercase">
                    In progress
                </p>
                <p class="truncate font-semibold">{{ run.snapshot.name }}</p>
                <p class="tabular text-sm text-cream/70">{{ runStatus }}</p>
            </div>
            <span
                class="bg-accent-gradient flex items-center gap-1 rounded-full py-2 pr-3 pl-4 text-sm font-semibold text-white"
            >
                Resume <ChevronRight class="size-4" />
            </span>
        </RouterLink>

        <RouterLink
            v-for="brew in steeping"
            :key="brew.id"
            :to="`/brews/${brew.id}`"
            class="bg-espresso-panel pressable flex items-center gap-4 rounded-card p-4"
        >
            <MethodArt method="cold_brew" class="size-14 shrink-0 text-cream/90" />
            <div class="min-w-0 flex-1">
                <p class="text-xs font-semibold tracking-[0.14em] text-accent uppercase">
                    {{ steepRemainingMs(brew, now) > 0 ? 'Steeping' : 'Cold brew ready' }}
                </p>
                <p class="truncate font-semibold">
                    {{
                        brew.bag_id
                            ? (coffeeOf.get(brew.bag_id)?.name ?? brewTitle(brew))
                            : brewTitle(brew)
                    }}
                </p>
                <p class="tabular text-sm text-cream/70">{{ steepStatus(brew) }}</p>
            </div>
            <ChevronRight class="size-5 shrink-0 text-cream/60" />
        </RouterLink>
    </div>
</template>
