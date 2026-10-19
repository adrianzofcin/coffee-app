<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import RecipeCard from '@/components/illustrations/RecipeCard.vue'
</script>

<template>
    <div>
        <PageHeader title="Recipes" eyebrow="Your playbook" />
        <EmptyState
            title="No recipes yet"
            text="Espresso, V60 and Cold Brew with step-by-step pours and timers."
            badge="Coming soon"
        >
            <template #art><RecipeCard class="relative size-full" /></template>
        </EmptyState>
    </div>
</template>
