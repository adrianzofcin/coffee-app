<script setup lang="ts">
import { computed } from 'vue'
import ColdBrewJar from '@/components/illustrations/ColdBrewJar.vue'
import EspressoCup from '@/components/illustrations/EspressoCup.vue'
import V60Dripper from '@/components/illustrations/V60Dripper.vue'
import type { BrewMethod } from '@/types/models'

const props = defineProps<{ method: BrewMethod }>()

const art = computed(
    () => ({ espresso: EspressoCup, v60: V60Dripper, cold_brew: ColdBrewJar })[props.method],
)
</script>

<template>
    <component :is="art" />
</template>
