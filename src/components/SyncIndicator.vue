<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { CloudAlert, CloudCheck, CloudOff, CloudUpload, RefreshCw } from 'lucide-vue-next'
import { useSyncStore } from '@/stores/sync'

const sync = useSyncStore()

const indicator = computed(() => {
    if (sync.isSyncing)
        return { icon: RefreshCw, label: 'Syncing', tone: 'text-accent', spin: true }
    if (sync.failedCount > 0 || sync.state.status === 'error') {
        return { icon: CloudAlert, label: 'Sync problem', tone: 'text-danger' }
    }
    if (sync.state.status === 'offline')
        return { icon: CloudOff, label: 'Offline', tone: 'text-text-muted' }
    if (sync.pendingCount > 0)
        return { icon: CloudUpload, label: 'Waiting to sync', tone: 'text-accent' }

    return { icon: CloudCheck, label: 'Synced', tone: 'text-text-muted' }
})
</script>

<template>
    <RouterLink
        to="/settings"
        class="pressable relative flex size-11 items-center justify-center rounded-full"
        :class="indicator.tone"
        :aria-label="indicator.label"
        :title="indicator.label"
    >
        <component
            :is="indicator.icon"
            class="size-5"
            :class="{ 'animate-spin': indicator.spin }"
        />
        <span
            v-if="sync.pendingCount > 0 && !sync.isSyncing"
            class="tabular absolute top-1 right-0.5 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] leading-4 font-bold text-accent-contrast"
        >
            {{ sync.pendingCount }}
        </span>
    </RouterLink>
</template>
