<script setup lang="ts">
import { ref } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { setBagStatus } from '@/modules/coffees/actions'
import { formatGrams } from '@/modules/coffees/options'
import type { LowBag } from '@/modules/brews/actions'

const props = defineProps<{ low: LowBag | null }>()
const emit = defineEmits<{ done: [] }>()

const busy = ref(false)

async function finish(): Promise<void> {
    busy.value = true
    await setBagStatus(props.low!.bag, 'finished')
    emit('done')
}
</script>

<template>
    <BottomSheet :open="low !== null" title="Running low" @update:open="emit('done')">
        <p class="mb-5 text-text-muted">
            Only <strong class="text-text">{{ formatGrams(low?.remaining ?? 0) }}</strong> left in
            this bag. Mark it as finished?
        </p>
        <div class="space-y-2">
            <AppButton block :loading="busy" @click="finish">Mark finished</AppButton>
            <AppButton variant="ghost" block @click="emit('done')">Keep it</AppButton>
        </div>
    </BottomSheet>
</template>
