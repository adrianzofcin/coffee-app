<script setup lang="ts">
import BottomNav from './BottomNav.vue'
</script>

<template>
    <div class="mx-auto flex min-h-dvh max-w-lg flex-col">
        <main class="flex-1 pb-[calc(7rem+env(safe-area-inset-bottom))]">
            <slot />
        </main>
        <BottomNav />
    </div>
</template>
