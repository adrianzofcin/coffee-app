<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import CoffeeBag from '@/components/illustrations/CoffeeBag.vue'
</script>

<template>
    <div>
        <PageHeader title="Coffees" eyebrow="Your shelf" />
        <EmptyState
            title="The shelf is empty"
            text="Track every bag you buy: roast date, origin and how many grams are left."
            badge="Coming next"
        >
            <template #art><CoffeeBag class="relative size-full" /></template>
        </EmptyState>
    </div>
</template>
