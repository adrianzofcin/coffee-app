<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import AppShell from '@/components/layout/AppShell.vue'
import UpdateBanner from '@/components/UpdateBanner.vue'

const route = useRoute()
</script>

<template>
    <AppShell
        v-if="route.meta.layout === 'app' || route.meta.layout === 'sub'"
        :nav="route.meta.layout === 'app'"
    >
        <RouterView v-slot="{ Component }">
            <Transition name="page" mode="out-in">
                <component :is="Component" :key="route.path" />
            </Transition>
        </RouterView>
    </AppShell>
    <RouterView v-else />

    <UpdateBanner />
</template>
