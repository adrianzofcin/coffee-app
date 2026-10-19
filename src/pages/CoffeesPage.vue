<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Plus, Search, X } from 'lucide-vue-next'
import PageHeader from '@/components/layout/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import CoffeeBag from '@/components/illustrations/CoffeeBag.vue'
import CoffeeCard from '@/components/coffees/CoffeeCard.vue'
import SyncIndicator from '@/components/SyncIndicator.vue'
import { matchesSearch, sortCoffeeViews, type CoffeeSort } from '@/modules/coffees/balance'
import { formatGrams } from '@/modules/coffees/options'
import { useCoffees } from '@/modules/coffees/useCoffees'

const { views, loaded } = useCoffees()

const tab = ref<'active' | 'archive'>('active')
const query = ref('')
const sort = ref<CoffeeSort>('roast_date')

const sorts: { value: CoffeeSort; label: string }[] = [
    { value: 'roast_date', label: 'Roast date' },
    { value: 'remaining', label: 'Remaining' },
    { value: 'rating', label: 'Rating' },
]

const active = computed(() => views.value.filter((v) => v.isActive))
const archived = computed(() => views.value.filter((v) => !v.isActive))
const totalGrams = computed(() => active.value.reduce((sum, v) => sum + v.remaining, 0))

const visible = computed(() =>
    sortCoffeeViews(
        (tab.value === 'active' ? active.value : archived.value).filter((v) =>
            matchesSearch(v, query.value),
        ),
        sort.value,
    ),
)
</script>

<template>
    <div>
        <PageHeader title="Coffees" eyebrow="Your shelf">
            <template #actions>
                <SyncIndicator />
                <RouterLink
                    to="/coffees/new"
                    class="pressable bg-accent-gradient flex size-11 items-center justify-center rounded-full text-white shadow-[0_8px_18px_-8px_var(--accent)]"
                    aria-label="Add coffee"
                >
                    <Plus class="size-6" />
                </RouterLink>
            </template>
        </PageHeader>

        <template v-if="loaded && views.length === 0">
            <EmptyState
                title="The shelf is empty"
                text="Add the bag you're drinking right now. It takes ten seconds."
            >
                <template #art><CoffeeBag class="relative size-full" /></template>
                <RouterLink
                    to="/coffees/new"
                    class="pressable bg-accent-gradient inline-flex items-center gap-2 rounded-full px-5 py-3 font-semibold text-white"
                >
                    <Plus class="size-5" /> Add coffee
                </RouterLink>
            </EmptyState>
        </template>

        <div v-else-if="loaded" class="space-y-4 px-5">
            <p class="-mt-2 text-sm text-text-muted">
                <strong class="tabular text-text">{{ formatGrams(totalGrams) }}</strong> of coffee
                at home across {{ active.length }} {{ active.length === 1 ? 'coffee' : 'coffees' }}
            </p>

            <div class="grid grid-cols-2 rounded-full bg-surface-muted p-1 text-sm font-semibold">
                <button
                    v-for="option in ['active', 'archive'] as const"
                    :key="option"
                    type="button"
                    class="h-10 rounded-full capitalize transition-colors"
                    :class="tab === option ? 'bg-surface text-text shadow-sm' : 'text-text-muted'"
                    @click="tab = option"
                >
                    {{ option }}
                    <span class="tabular ml-1 text-text-muted">
                        {{ option === 'active' ? active.length : archived.length }}
                    </span>
                </button>
            </div>

            <div class="flex gap-2">
                <label class="relative flex-1">
                    <span class="sr-only">Search</span>
                    <Search
                        class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-text-muted"
                    />
                    <input
                        v-model="query"
                        type="search"
                        placeholder="Search name, roaster, origin"
                        class="h-11 w-full rounded-full border border-transparent bg-surface-muted pr-9 pl-10 text-[16px] outline-none focus:border-accent focus:bg-surface"
                    />
                    <button
                        v-if="query"
                        type="button"
                        class="absolute inset-y-0 right-2 flex w-7 items-center justify-center text-text-muted"
                        aria-label="Clear search"
                        @click="query = ''"
                    >
                        <X class="size-4" />
                    </button>
                </label>
            </div>

            <div class="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
                <button
                    v-for="option in sorts"
                    :key="option.value"
                    type="button"
                    class="pressable h-9 shrink-0 rounded-full border px-4 text-sm font-medium"
                    :class="
                        sort === option.value
                            ? 'border-accent bg-accent/12 text-accent'
                            : 'border-border text-text-muted'
                    "
                    @click="sort = option.value"
                >
                    {{ option.label }}
                </button>
            </div>

            <TransitionGroup
                tag="div"
                class="space-y-3"
                move-class="transition-transform duration-300"
            >
                <CoffeeCard v-for="view in visible" :key="view.coffee.id" :view="view" />
            </TransitionGroup>

            <p v-if="visible.length === 0" class="py-10 text-center text-sm text-text-muted">
                <template v-if="query">Nothing matches “{{ query }}”.</template>
                <template v-else-if="tab === 'archive'"
                    >Finished coffees will show up here.</template
                >
                <template v-else>Everything is finished. Time to buy coffee!</template>
            </p>
        </div>
    </div>
</template>
