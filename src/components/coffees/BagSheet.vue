<script setup lang="ts">
import { ref, watch } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import BagFields from './BagFields.vue'
import { addBag, updateBag } from '@/modules/coffees/actions'
import {
    bagToForm,
    emptyBagForm,
    formToBag,
    validateBag,
    type BagFormState,
    type FormErrors,
} from '@/modules/coffees/form'
import type { Bag } from '@/types/models'

const open = defineModel<boolean>('open', { required: true })

/** Without a bag the sheet adds a new one to the coffee. */
const props = defineProps<{ coffeeId: string; bag?: Bag | null }>()

const form = ref<BagFormState>(emptyBagForm())
const errors = ref<FormErrors<BagFormState>>({})
const saving = ref(false)
const formKey = ref(0)

watch(open, (value) => {
    if (!value) return
    form.value = props.bag ? bagToForm(props.bag) : emptyBagForm()
    errors.value = {}
    formKey.value++
})

async function save(): Promise<void> {
    errors.value = validateBag(form.value)
    if (Object.keys(errors.value).length > 0) return

    saving.value = true
    if (props.bag) await updateBag(props.bag.id, formToBag(form.value))
    else await addBag(props.coffeeId, formToBag(form.value))
    saving.value = false
    open.value = false
}
</script>

<template>
    <BottomSheet v-model:open="open" :title="bag ? 'Edit bag' : 'New bag'">
        <form
            class="max-h-[70dvh] space-y-5 overflow-y-auto pb-1"
            novalidate
            @submit.prevent="save"
        >
            <BagFields :key="formKey" v-model="form" :errors="errors" />
            <AppButton type="submit" block :loading="saving">{{
                bag ? 'Save' : 'Add bag'
            }}</AppButton>
        </form>
    </BottomSheet>
</template>
