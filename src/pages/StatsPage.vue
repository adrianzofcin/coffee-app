<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import StatsChart from '@/components/illustrations/StatsChart.vue'
</script>

<template>
    <div>
        <PageHeader title="Stats" eyebrow="By the numbers" />
        <EmptyState
            title="Nothing to count yet"
            text="Brews, grams, money spent and your best beans, once you start brewing."
        >
            <template #art><StatsChart class="relative size-full" /></template>
        </EmptyState>
    </div>
</template>
