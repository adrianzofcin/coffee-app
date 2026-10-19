<script setup lang="ts">
import { Download, Share, SquarePlus } from 'lucide-vue-next'
import { usePwaStore } from '@/stores/pwa'

const pwa = usePwaStore()
</script>

<template>
    <div
        v-if="pwa.showIosInstallHint"
        class="rounded-card border border-border bg-surface p-4 text-sm"
    >
        <p class="font-semibold">Install the app</p>
        <p class="mt-1 text-text-muted">
            Tap
            <Share class="inline size-4 align-text-bottom" />
            <strong class="text-text">Share</strong>, then
            <SquarePlus class="inline size-4 align-text-bottom" />
            <strong class="text-text">Add to Home Screen</strong>. Sign in again inside the
            installed app.
        </p>
    </div>
    <button
        v-else-if="pwa.canPromptInstall"
        class="flex w-full items-center gap-3 rounded-card border border-border bg-surface p-4 text-left text-sm"
        @click="pwa.promptInstall"
    >
        <Download class="size-5 text-accent" />
        <span class="flex-1 font-semibold">Install the app</span>
    </button>
</template>
