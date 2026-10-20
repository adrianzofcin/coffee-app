<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ChevronDown, Ellipsis, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import SubPageHeader from '@/components/layout/SubPageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import StarRating from '@/components/ui/StarRating.vue'
import BagActionsSheet from '@/components/coffees/BagActionsSheet.vue'
import BagRow from '@/components/coffees/BagRow.vue'
import BagSheet from '@/components/coffees/BagSheet.vue'
import CoffeeArt from '@/components/coffees/CoffeeArt.vue'
import { deleteCoffee, setRating } from '@/modules/coffees/actions'
import { countryFlag, formatGrams, INTENDED_FOR, ROAST_LEVELS } from '@/modules/coffees/options'
import { useCoffees } from '@/modules/coffees/useCoffees'
import type { BagView } from '@/modules/coffees/balance'
import RecipeCard from '@/components/recipes/RecipeCard.vue'
import { useRecipes } from '@/modules/recipes/useRecipes'
import BrewRow from '@/components/brews/BrewRow.vue'
import { useBrews } from '@/modules/brews/useBrews'

const route = useRoute()
const router = useRouter()
const { views, loaded } = useCoffees()
const { recipes } = useRecipes()

const coffeeRecipes = computed(() => recipes.value.filter((r) => r.coffee_id === route.params.id))

const { brews } = useBrews()
const coffeeBrews = computed(() => {
    const bagIds = new Set(view.value?.bags.map((b) => b.bag.id))

    return brews.value.filter((brew) => brew.bag_id && bagIds.has(brew.bag_id))
})
const showAllBrews = ref(false)

const view = computed(() => views.value.find((v) => v.coffee.id === route.params.id) ?? null)
const coffee = computed(() => view.value?.coffee ?? null)

watch([loaded, view], ([isLoaded, current]) => {
    if (isLoaded && !current) void router.replace('/coffees')
})

const rating = computed({
    get: () => coffee.value?.rating ?? null,
    set: (value) => coffee.value && void setRating(coffee.value.id, value),
})

const facts = computed(() => {
    const c = coffee.value
    if (!c) return []

    const label = <T,>(list: { value: T; label: string }[], value: T | null) =>
        list.find((item) => item.value === value)?.label ?? null

    return [
        {
            label: 'Origin',
            value: [c.country, c.region].filter(Boolean).join(', ') || null,
            prefix: countryFlag(c.country),
        },
        { label: 'Producer', value: c.producer },
        { label: 'Variety', value: c.variety },
        { label: 'Altitude', value: c.altitude },
        { label: 'Process', value: c.process },
        { label: 'Roast', value: label(ROAST_LEVELS, c.roast_level) },
        { label: 'Best for', value: label(INTENDED_FOR, c.intended_for) },
        { label: 'Decaf', value: c.is_decaf ? 'Yes' : null },
    ].filter((fact) => fact.value)
})

const showFinished = ref(false)
const menuOpen = ref(false)
const confirmDelete = ref(false)
const deleting = ref(false)
const activeBag = ref<BagView | null>(null)
const actionsOpen = ref(false)
const bagSheetOpen = ref(false)
const editingBag = ref<BagView | null>(null)

// Keep the sheet in sync with live data after an action changes the bag.
watch(views, () => {
    if (!activeBag.value) return
    activeBag.value = view.value?.bags.find((b) => b.bag.id === activeBag.value!.bag.id) ?? null
})

function openBag(bag: BagView): void {
    activeBag.value = bag
    actionsOpen.value = true
}

function editBag(): void {
    editingBag.value = activeBag.value
    actionsOpen.value = false
    bagSheetOpen.value = true
}

function newBag(): void {
    editingBag.value = null
    bagSheetOpen.value = true
}

async function remove(): Promise<void> {
    deleting.value = true
    await deleteCoffee(coffee.value!.id)
    await router.replace('/coffees')
}
</script>

<template>
    <div v-if="view && coffee" class="pb-10">
        <div class="relative">
            <CoffeeArt
                :photo-path="coffee.photo_path"
                :roast-level="coffee.roast_level"
                class="aspect-[4/3] w-full"
            />
            <div
                class="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg to-transparent"
            />
            <div class="absolute inset-x-0 top-0">
                <SubPageHeader transparent back="/coffees">
                    <template #actions>
                        <RouterLink
                            :to="`/coffees/${coffee.id}/edit`"
                            class="pressable flex size-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur"
                            aria-label="Edit coffee"
                        >
                            <Pencil class="size-5" />
                        </RouterLink>
                        <button
                            type="button"
                            class="pressable flex size-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur"
                            aria-label="More"
                            @click="menuOpen = true"
                        >
                            <Ellipsis class="size-5" />
                        </button>
                    </template>
                </SubPageHeader>
            </div>
        </div>

        <div class="relative -mt-8 space-y-7 px-5">
            <section class="animate-rise">
                <p class="text-xs font-semibold tracking-[0.14em] text-accent uppercase">
                    <span v-if="countryFlag(coffee.country)" class="mr-1">{{
                        countryFlag(coffee.country)
                    }}</span>
                    {{ coffee.roaster }}
                </p>
                <h1 class="font-display font-soft mt-1 text-[32px] leading-tight font-semibold">
                    {{ coffee.name }}
                </h1>
                <StarRating v-model="rating" class="mt-3 -ml-0.5" />

                <div
                    class="mt-5 grid grid-cols-3 divide-x divide-border/70 rounded-card border border-border/60 bg-surface py-3 text-center"
                >
                    <div>
                        <p class="tabular font-display text-xl font-semibold">
                            {{ formatGrams(view.remaining) }}
                        </p>
                        <p class="text-xs text-text-muted">left</p>
                    </div>
                    <div>
                        <p class="tabular font-display text-xl font-semibold">
                            {{ view.currentBag ? view.currentBag.daysSinceRoast : '–' }}
                        </p>
                        <p class="text-xs text-text-muted">days since roast</p>
                    </div>
                    <div>
                        <p class="tabular font-display text-xl font-semibold">
                            {{ view.bags.length }}
                        </p>
                        <p class="text-xs text-text-muted">
                            {{ view.bags.length === 1 ? 'bag' : 'bags' }} bought
                        </p>
                    </div>
                </div>
            </section>

            <section v-if="coffee.tasting_notes.length" class="animate-rise [animation-delay:60ms]">
                <h2
                    class="mb-2.5 text-xs font-semibold tracking-[0.14em] text-text-muted uppercase"
                >
                    Tasting notes
                </h2>
                <div class="flex flex-wrap gap-1.5">
                    <span
                        v-for="note in coffee.tasting_notes"
                        :key="note"
                        class="rounded-full bg-accent/12 px-3 py-1.5 text-sm font-semibold text-accent"
                    >
                        {{ note }}
                    </span>
                </div>
            </section>

            <section v-if="facts.length" class="animate-rise [animation-delay:90ms]">
                <dl class="grid grid-cols-2 gap-2">
                    <div
                        v-for="fact in facts"
                        :key="fact.label"
                        class="rounded-control bg-surface-muted px-3.5 py-2.5"
                    >
                        <dt class="text-xs text-text-muted">{{ fact.label }}</dt>
                        <dd class="truncate font-medium">
                            <span v-if="fact.prefix" class="mr-1">{{ fact.prefix }}</span
                            >{{ fact.value }}
                        </dd>
                    </div>
                </dl>
            </section>

            <section v-if="coffee.notes" class="animate-rise [animation-delay:120ms]">
                <h2
                    class="mb-2.5 text-xs font-semibold tracking-[0.14em] text-text-muted uppercase"
                >
                    Notes
                </h2>
                <p class="font-display text-lg leading-relaxed whitespace-pre-line italic">
                    “{{ coffee.notes }}”
                </p>
            </section>

            <section class="animate-rise [animation-delay:150ms]">
                <div class="mb-3 flex items-center justify-between">
                    <h2 class="font-display font-soft text-xl font-semibold">Bags</h2>
                    <button
                        type="button"
                        class="pressable flex items-center gap-1 text-sm font-semibold text-accent"
                        @click="newBag"
                    >
                        <Plus class="size-4" /> Add bag
                    </button>
                </div>

                <div class="space-y-2">
                    <BagRow
                        v-for="bag in view.activeBags"
                        :key="bag.bag.id"
                        :view="bag"
                        @click="openBag(bag)"
                    />
                    <p
                        v-if="!view.activeBags.length"
                        class="rounded-card border border-dashed border-border p-4 text-sm text-text-muted"
                    >
                        All bags are finished. Bought it again? Add a new bag.
                    </p>
                </div>

                <template v-if="view.finishedBags.length">
                    <button
                        type="button"
                        class="mt-3 flex items-center gap-1 text-sm font-semibold text-text-muted"
                        @click="showFinished = !showFinished"
                    >
                        Finished bags ({{ view.finishedBags.length }})
                        <ChevronDown
                            class="size-4 transition-transform"
                            :class="{ 'rotate-180': showFinished }"
                        />
                    </button>
                    <div v-if="showFinished" class="mt-2 space-y-2">
                        <BagRow
                            v-for="bag in view.finishedBags"
                            :key="bag.bag.id"
                            :view="bag"
                            @click="openBag(bag)"
                        />
                    </div>
                </template>
            </section>

            <section class="animate-rise [animation-delay:180ms]">
                <div class="mb-3 flex items-center justify-between">
                    <h2 class="font-display font-soft text-xl font-semibold">Recipes</h2>
                    <RouterLink
                        :to="`/recipes/new?coffee=${coffee.id}`"
                        class="pressable flex items-center gap-1 text-sm font-semibold text-accent"
                    >
                        <Plus class="size-4" /> New recipe
                    </RouterLink>
                </div>
                <div v-if="coffeeRecipes.length" class="space-y-2">
                    <RecipeCard v-for="recipe in coffeeRecipes" :key="recipe.id" :recipe="recipe" />
                </div>
                <p
                    v-else
                    class="rounded-card border border-dashed border-border p-4 text-sm text-text-muted"
                >
                    Dialled in a recipe for this coffee? Save it here.
                </p>
            </section>

            <section v-if="coffeeBrews.length" class="animate-rise [animation-delay:210ms]">
                <h2 class="mb-3 flex items-baseline justify-between">
                    <span class="font-display font-soft text-xl font-semibold">Brews</span>
                    <span class="tabular text-sm text-text-muted"
                        >{{ coffeeBrews.length }} so far</span
                    >
                </h2>
                <div class="space-y-2">
                    <BrewRow
                        v-for="brew in showAllBrews ? coffeeBrews : coffeeBrews.slice(0, 5)"
                        :key="brew.id"
                        :brew="brew"
                    />
                </div>
                <button
                    v-if="coffeeBrews.length > 5 && !showAllBrews"
                    type="button"
                    class="mt-3 text-sm font-semibold text-accent"
                    @click="showAllBrews = true"
                >
                    Show all {{ coffeeBrews.length }}
                </button>
            </section>
        </div>

        <BagActionsSheet v-model:open="actionsOpen" :view="activeBag" @edit="editBag" />
        <BagSheet v-model:open="bagSheetOpen" :coffee-id="coffee.id" :bag="editingBag?.bag" />

        <BottomSheet v-model:open="menuOpen">
            <button
                type="button"
                class="pressable flex h-13 w-full items-center gap-3 rounded-control px-3 font-medium text-danger active:bg-surface-muted"
                @click="((menuOpen = false), (confirmDelete = true))"
            >
                <Trash2 class="size-5" /> Delete coffee
            </button>
        </BottomSheet>

        <BottomSheet v-model:open="confirmDelete" title="Delete this coffee?">
            <p class="mb-5 text-text-muted">
                {{ coffee.name }} and all its bags will be removed. Brews you logged with it stay in
                your history.
            </p>
            <div class="space-y-2">
                <AppButton variant="danger" block :loading="deleting" @click="remove"
                    >Delete coffee</AppButton
                >
                <AppButton variant="ghost" block @click="confirmDelete = false">Cancel</AppButton>
            </div>
        </BottomSheet>
    </div>
</template>
