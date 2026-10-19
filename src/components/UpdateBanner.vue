<script setup lang="ts">
import { ref } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import { usePwaStore } from '@/stores/pwa'

const pwa = usePwaStore()
const updating = ref(false)

async function update(): Promise<void> {
    updating.value = true
    await pwa.applyUpdate()
}
</script>

<template>
    <Transition
        enter-from-class="-translate-y-4 opacity-0"
        leave-to-class="-translate-y-4 opacity-0"
        enter-active-class="transition duration-200"
        leave-active-class="transition duration-200"
    >
        <div
            v-if="pwa.needRefresh"
            class="fixed inset-x-0 top-0 z-50 mx-auto max-w-lg px-3 pt-[calc(0.75rem+env(safe-area-inset-top))]"
            role="status"
        >
            <div class="flex items-center gap-3 rounded-card bg-text p-3 pl-4 text-bg shadow-xl">
                <RefreshCw class="size-5 shrink-0" />
                <p class="flex-1 text-sm font-medium">New version available</p>
                <button class="px-2 text-sm opacity-70" @click="pwa.dismissUpdate">Later</button>
                <button
                    class="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-contrast"
                    :disabled="updating"
                    @click="update"
                >
                    {{ updating ? 'Updating…' : 'Reload' }}
                </button>
            </div>
        </div>
    </Transition>
</template>
