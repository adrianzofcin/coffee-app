<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronDown } from 'lucide-vue-next'
import SubPageHeader from '@/components/layout/SubPageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import BagFields from '@/components/coffees/BagFields.vue'
import CoffeeFields from '@/components/coffees/CoffeeFields.vue'
import PhotoPicker from '@/components/coffees/PhotoPicker.vue'
import { db } from '@/lib/db'
import { scrollToFirstError } from '@/composables/scrollToError'
import { addBag, createCoffee, updateCoffee } from '@/modules/coffees/actions'
import { findSameCoffee, usedValues } from '@/modules/coffees/balance'
import {
    coffeeToForm,
    emptyBagForm,
    emptyCoffeeForm,
    formToBag,
    formToCoffee,
    validateBag,
    validateCoffee,
    type BagFormState,
    type CoffeeFormState,
    type FormErrors,
} from '@/modules/coffees/form'
import { useCoffees } from '@/modules/coffees/useCoffees'
import type { Coffee } from '@/types/models'

const route = useRoute()
const router = useRouter()
const { coffees } = useCoffees()

const editId = computed(() => (route.params.id as string | undefined) ?? null)
const isEdit = computed(() => editId.value !== null)

const form = ref<CoffeeFormState>(emptyCoffeeForm())
const bag = ref<BagFormState>(emptyBagForm())
const photo = ref<Blob | null | undefined>(undefined)
const existingPhotoPath = ref<string | null>(null)
const showDetails = ref(false)
const coffeeErrors = ref<FormErrors<CoffeeFormState>>({})
const bagErrors = ref<FormErrors<BagFormState>>({})
const saving = ref(false)
const duplicate = ref<Coffee | null>(null)

watch(
    editId,
    async (id) => {
        if (!id) return
        const coffee = await db.coffees.get(id)
        if (!coffee || coffee.deleted_at) return void router.replace('/coffees')

        form.value = coffeeToForm(coffee)
        existingPhotoPath.value = coffee.photo_path
        showDetails.value = true
    },
    { immediate: true },
)

const alive = computed(() => coffees.value.filter((c) => !c.deleted_at))
const usedRoasters = computed(() => usedValues(alive.value, (c) => c.roaster))
const usedCountries = computed(() => usedValues(alive.value, (c) => c.country))
const usedProcesses = computed(() => usedValues(alive.value, (c) => c.process))
const usedNotes = computed(() => [...new Set(alive.value.flatMap((c) => c.tasting_notes))])

function validate(): boolean {
    coffeeErrors.value = validateCoffee(form.value)
    bagErrors.value = isEdit.value ? {} : validateBag(bag.value)

    if (bagErrors.value.price) showDetails.value = true

    return Object.keys(coffeeErrors.value).length === 0 && Object.keys(bagErrors.value).length === 0
}

async function save(): Promise<void> {
    if (saving.value) return
    if (!validate()) return void scrollToFirstError('coffee-form')

    if (isEdit.value) {
        saving.value = true
        await updateCoffee(editId.value!, formToCoffee(form.value), photo.value)
        await router.replace(`/coffees/${editId.value}`)
        return
    }

    duplicate.value = findSameCoffee(coffees.value, form.value.name, form.value.roaster)
    if (!duplicate.value) await create()
}

async function create(): Promise<void> {
    saving.value = true
    duplicate.value = null
    const id = await createCoffee(
        { ...formToCoffee(form.value), photo_path: null },
        formToBag(bag.value),
        photo.value ?? null,
    )
    await router.replace(`/coffees/${id}`)
}

async function addToExisting(): Promise<void> {
    const existing = duplicate.value!
    saving.value = true
    duplicate.value = null
    await addBag(existing.id, formToBag(bag.value))
    await router.replace(`/coffees/${existing.id}`)
}
</script>

<template>
    <div class="pb-28">
        <SubPageHeader
            :title="isEdit ? 'Edit coffee' : 'New coffee'"
            :back="isEdit ? `/coffees/${editId}` : '/coffees'"
        />

        <form
            id="coffee-form"
            class="animate-rise space-y-4 px-5 pt-4"
            novalidate
            @submit.prevent="save"
        >
            <section class="space-y-5 rounded-card border border-border/60 bg-surface p-5">
                <CoffeeFields
                    v-model="form"
                    section="basics"
                    :errors="coffeeErrors"
                    :used-roasters="usedRoasters"
                />
                <BagFields v-if="!isEdit" v-model="bag" part="main" :errors="bagErrors" />
            </section>

            <button
                type="button"
                class="pressable flex w-full items-center justify-between rounded-card border border-border/60 bg-surface px-5 py-4 font-semibold"
                :aria-expanded="showDetails"
                @click="showDetails = !showDetails"
            >
                <span class="text-left">
                    More details
                    <span class="block text-sm font-normal text-text-muted">
                        Photo, origin, process, taste{{ isEdit ? '' : ', price' }}
                    </span>
                </span>
                <ChevronDown
                    class="size-5 transition-transform"
                    :class="{ 'rotate-180': showDetails }"
                />
            </button>

            <section
                v-if="showDetails"
                class="animate-rise space-y-5 rounded-card border border-border/60 bg-surface p-5"
            >
                <PhotoPicker v-model="photo" :existing-path="existingPhotoPath" />
                <CoffeeFields
                    v-model="form"
                    section="details"
                    :used-countries="usedCountries"
                    :used-processes="usedProcesses"
                    :used-notes="usedNotes"
                />
                <BagFields v-if="!isEdit" v-model="bag" part="extras" :errors="bagErrors" />
            </section>
        </form>

        <!-- Teleported: animated (transformed) ancestors would break position: fixed. -->
        <Teleport to="body">
            <div
                class="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg border-t border-border/50 bg-bg/90 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl"
            >
                <AppButton type="submit" form="coffee-form" block :loading="saving">
                    {{ isEdit ? 'Save changes' : 'Add coffee' }}
                </AppButton>
            </div>
        </Teleport>

        <BottomSheet
            :open="duplicate !== null"
            title="You already have this coffee"
            @update:open="duplicate = null"
        >
            <p class="mb-5 text-text-muted">
                <strong class="text-text">{{ duplicate?.name }}</strong> from
                {{ duplicate?.roaster }} is on your shelf. Add this as a new bag, so ratings and
                history stay together?
            </p>
            <div class="space-y-2">
                <AppButton block :loading="saving" @click="addToExisting"
                    >Add as a new bag</AppButton
                >
                <AppButton variant="secondary" block @click="create"
                    >Create a separate coffee</AppButton
                >
            </div>
        </BottomSheet>
    </div>
</template>
