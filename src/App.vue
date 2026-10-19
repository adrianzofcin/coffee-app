<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import AppShell from '@/components/layout/AppShell.vue'
import UpdateBanner from '@/components/UpdateBanner.vue'

const route = useRoute()
</script>

<template>
    <AppShell v-if="route.meta.layout === 'app'">
        <RouterView v-slot="{ Component }">
            <Transition name="page" mode="out-in">
                <component :is="Component" />
            </Transition>
        </RouterView>
    </AppShell>
    <RouterView v-else />

    <UpdateBanner />
</template>
