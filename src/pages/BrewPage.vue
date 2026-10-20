<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowRight, History, NotebookPen } from 'lucide-vue-next'
import PageHeader from '@/components/layout/PageHeader.vue'
import StarRating from '@/components/ui/StarRating.vue'
import EspressoCup from '@/components/illustrations/EspressoCup.vue'
import BrewRow from '@/components/brews/BrewRow.vue'
import InProgressCards from '@/components/brews/InProgressCards.vue'
import MethodArt from '@/components/recipes/MethodArt.vue'
import SyncIndicator from '@/components/SyncIndicator.vue'
import { useGreeting } from '@/composables/useGreeting'
import { rateBrew } from '@/modules/brews/actions'
import {
    brewTitle,
    historyBrews,
    latestUnrated,
    quickStartRecipes,
    steepingBrews,
} from '@/modules/brews/brew'
import { formatBrewDate } from '@/modules/brews/format'
import { HISTORY_PAGE } from '@/modules/brews/options'
import { useActiveRun, useBrews, useShelf } from '@/modules/brews/useBrews'
import { METHODS, methodLabel } from '@/modules/recipes/options'
import { recipeSummary } from '@/modules/recipes/recipe'
import { useRecipes } from '@/modules/recipes/useRecipes'
import { useAuthStore } from '@/stores/auth'
import type { BrewMethod } from '@/types/models'

const auth = useAuthStore()
const { greeting, today } = useGreeting()
const { brews, loaded } = useBrews()
const { run } = useActiveRun()
const { coffeeOf } = useShelf()
const { recipes } = useRecipes()

const steeping = computed(() => steepingBrews(brews.value))
const unrated = computed(() => latestUnrated(brews.value))
const quickStart = computed(() => quickStartRecipes(recipes.value))

const coffeeName = (bagId: string | null) => (bagId ? coffeeOf.value.get(bagId)?.name : null)

const filters: { value: BrewMethod | null; label: string }[] = [
    { value: null, label: 'All' },
    ...METHODS.map((m) => ({ value: m.value, label: m.label })),
]
const method = ref<BrewMethod | null>(null)
const limit = ref(HISTORY_PAGE)
const history = computed(() => historyBrews(brews.value, method.value))
const visible = computed(() => history.value.slice(0, limit.value))

watch(method, () => (limit.value = HISTORY_PAGE))

// More history rows load as the end of the list scrolls into view.
const sentinel = ref<HTMLElement | null>(null)
const observer = new IntersectionObserver(
    (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) limit.value += HISTORY_PAGE
    },
    { rootMargin: '200px' },
)
watch(sentinel, (element, previous) => {
    if (previous) observer.unobserve(previous)
    if (element) observer.observe(element)
})
onBeforeUnmount(() => observer.disconnect())
</script>

<template>
    <div>
        <PageHeader :title="greeting" :eyebrow="today">
            <template #title>
                {{ greeting }},<br />
                <span class="text-accent italic">{{ auth.username || 'barista' }}</span>
            </template>
            <template #actions>
                <SyncIndicator />
            </template>
        </PageHeader>

        <div class="space-y-8 px-5">
            <InProgressCards
                class="animate-rise"
                :run="run"
                :steeping="steeping"
                :coffee-of="coffeeOf"
            />

            <section
                v-if="unrated"
                class="animate-rise rounded-card border border-border/60 bg-surface p-4"
            >
                <RouterLink :to="`/brews/${unrated.id}`" class="flex items-center gap-3">
                    <MethodArt :method="unrated.method" class="size-11 shrink-0 text-text" />
                    <div class="min-w-0 flex-1">
                        <p class="text-xs font-semibold tracking-[0.14em] text-accent uppercase">
                            Rate your brew
                        </p>
                        <p class="truncate font-semibold">{{ brewTitle(unrated) }}</p>
                        <p class="text-sm text-text-muted">
                            {{ formatBrewDate(unrated.started_at) }}
                        </p>
                    </div>
                </RouterLink>
                <StarRating
                    class="mt-3 justify-center"
                    :model-value="null"
                    @update:model-value="(value) => rateBrew(unrated!.id, value)"
                />
            </section>

            <div
                class="bg-espresso-panel animate-rise relative overflow-hidden rounded-card p-6 shadow-[0_20px_40px_-20px_rgb(23_17_13/0.6)] [animation-delay:40ms]"
            >
                <EspressoCup class="absolute -right-4 -bottom-3 size-40 text-cream/90" />
                <p class="text-xs font-semibold tracking-[0.14em] text-accent uppercase">
                    Today's cup
                </p>
                <p
                    class="font-display font-soft mt-2 max-w-[11rem] text-[26px] leading-tight font-semibold"
                >
                    What are we brewing?
                </p>
                <div class="relative mt-6 flex flex-col items-start gap-3">
                    <RouterLink
                        to="/brew/new"
                        class="pressable bg-accent-gradient inline-flex items-center gap-2 rounded-full py-2.5 pr-4 pl-5 text-sm font-semibold text-white"
                    >
                        Choose recipe
                        <ArrowRight class="size-4" />
                    </RouterLink>
                    <RouterLink
                        to="/brew/quick"
                        class="pressable inline-flex items-center gap-2 py-1 pl-1 text-sm font-semibold text-cream/80"
                    >
                        <NotebookPen class="size-4" /> Quick log
                    </RouterLink>
                </div>
            </div>

            <section v-if="quickStart.length" class="animate-rise [animation-delay:80ms]">
                <h2 class="mb-3 flex items-baseline justify-between">
                    <span class="font-display font-soft text-xl font-semibold">Quick start</span>
                    <span v-if="quickStart.length > 2" class="text-xs text-text-muted"
                        >swipe →</span
                    >
                </h2>
                <div
                    class="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none]"
                >
                    <RouterLink
                        v-for="recipe in quickStart"
                        :key="recipe.id"
                        :to="`/brew/new?recipe=${recipe.id}`"
                        class="pressable w-40 shrink-0 snap-start rounded-card border border-border/70 bg-surface p-4 shadow-[0_8px_20px_-14px_rgb(43_29_20/0.4)]"
                    >
                        <div class="relative mb-3 h-20 text-text">
                            <div
                                class="absolute inset-x-4 top-4 bottom-0 rounded-full bg-accent/10 blur-xl"
                            />
                            <MethodArt :method="recipe.method" class="relative mx-auto h-full" />
                        </div>
                        <p class="text-[11px] font-semibold tracking-wide text-accent uppercase">
                            {{ methodLabel(recipe.method) }}
                        </p>
                        <p
                            class="font-display font-soft truncate text-lg leading-tight font-semibold"
                        >
                            {{ recipe.name }}
                        </p>
                        <p class="tabular mt-0.5 truncate text-xs text-text-muted">
                            {{ recipeSummary(recipe) }}
                        </p>
                    </RouterLink>
                </div>
            </section>

            <!-- Until there is something to quick-start, the tiles lead to recipes by method. -->
            <section v-else class="animate-rise [animation-delay:80ms]">
                <h2 class="mb-3 flex items-baseline justify-between">
                    <span class="font-display font-soft text-xl font-semibold">Methods</span>
                    <span class="text-xs text-text-muted">swipe →</span>
                </h2>
                <div
                    class="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none]"
                >
                    <RouterLink
                        v-for="item in METHODS"
                        :key="item.value"
                        :to="`/recipes?method=${item.value}`"
                        class="pressable w-40 shrink-0 snap-start rounded-card border border-border/70 bg-surface p-4 shadow-[0_8px_20px_-14px_rgb(43_29_20/0.4)]"
                    >
                        <div class="relative mb-3 h-24 text-text">
                            <div
                                class="absolute inset-x-4 top-4 bottom-0 rounded-full bg-accent/10 blur-xl"
                            />
                            <MethodArt :method="item.value" class="relative mx-auto h-full" />
                        </div>
                        <p class="font-display font-soft text-lg leading-tight font-semibold">
                            {{ item.label }}
                        </p>
                        <p class="mt-0.5 text-xs text-text-muted">{{ item.note }}</p>
                    </RouterLink>
                </div>
            </section>

            <section class="animate-rise [animation-delay:120ms]">
                <h2 class="font-display font-soft mb-3 text-xl font-semibold">History</h2>

                <div
                    v-if="loaded && brews.length === 0"
                    class="flex items-center gap-4 rounded-card border border-dashed border-border p-5"
                >
                    <div
                        class="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent/12"
                    >
                        <History class="size-5 text-accent" />
                    </div>
                    <p class="text-sm leading-snug text-text-muted">
                        Your brew journal is empty. Every cup you make will land here, rated and
                        noted.
                    </p>
                </div>

                <template v-else-if="loaded">
                    <div
                        class="-mx-5 mb-3 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]"
                        role="radiogroup"
                        aria-label="Method"
                    >
                        <button
                            v-for="filter in filters"
                            :key="filter.label"
                            type="button"
                            role="radio"
                            :aria-checked="method === filter.value"
                            class="pressable h-10 shrink-0 rounded-full border px-4 text-sm font-semibold"
                            :class="
                                method === filter.value
                                    ? 'border-transparent bg-accent text-accent-contrast'
                                    : 'border-border text-text-muted'
                            "
                            @click="method = filter.value"
                        >
                            {{ filter.label }}
                        </button>
                    </div>

                    <div class="space-y-2">
                        <BrewRow
                            v-for="brew in visible"
                            :key="brew.id"
                            :brew="brew"
                            :coffee-name="coffeeName(brew.bag_id)"
                        />
                    </div>
                    <p v-if="history.length === 0" class="py-8 text-center text-sm text-text-muted">
                        No {{ filters.find((f) => f.value === method)?.label }} brews yet.
                    </p>
                    <div v-if="visible.length < history.length" ref="sentinel" class="h-px" />
                </template>
            </section>
        </div>
    </div>
</template>
