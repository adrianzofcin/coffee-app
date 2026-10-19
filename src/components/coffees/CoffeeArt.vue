<script setup lang="ts">
import { computed } from 'vue'
import CoffeeBag from '@/components/illustrations/CoffeeBag.vue'
import { usePhotoUrl } from '@/composables/usePhotoUrl'
import { ROAST_COLORS } from '@/modules/coffees/options'
import type { RoastLevel } from '@/types/models'

const props = defineProps<{ photoPath: string | null; roastLevel: RoastLevel | null }>()

const url = usePhotoUrl(() => props.photoPath)
const color = computed(() => ROAST_COLORS[props.roastLevel ?? 'unknown'])
</script>

<template>
    <div class="relative overflow-hidden bg-surface-muted">
        <img v-if="url" :src="url" alt="" class="size-full object-cover" />
        <div
            v-else
            class="flex size-full items-center justify-center text-text"
            :style="{
                background: `radial-gradient(circle at 50% 60%, color-mix(in oklab, ${color} 22%, transparent), transparent 70%)`,
            }"
        >
            <CoffeeBag class="size-[78%]" :color="color" />
        </div>
    </div>
</template>
