<script setup lang="ts">
withDefaults(defineProps<{ steam?: boolean }>(), { steam: true })
</script>

<template>
    <svg
        viewBox="0 0 120 120"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
    >
        <g v-if="steam" class="stroke-current" stroke-width="3" opacity="0.7">
            <path
                class="animate-steam origin-bottom [transform-box:fill-box] [animation-delay:0s]"
                d="M48 44c-4-5 4-9 0-15s4-9 0-13"
            />
            <path
                class="animate-steam origin-bottom [transform-box:fill-box] [animation-delay:1.1s]"
                d="M60 42c-4-5 4-9 0-15s4-9 0-13"
            />
            <path
                class="animate-steam origin-bottom [transform-box:fill-box] [animation-delay:2.2s]"
                d="M72 44c-4-5 4-9 0-15s4-9 0-13"
            />
        </g>
        <ellipse
            cx="60"
            cy="98"
            rx="44"
            ry="8"
            class="fill-accent/15 stroke-current"
            stroke-width="3"
        />
        <path d="M86 62c12-2 18 4 16 12s-10 11-19 9" class="stroke-current" stroke-width="3.5" />
        <path
            d="M28 56h64v10c0 17-14 28-32 28S28 83 28 66z"
            class="fill-ill stroke-current"
            stroke-width="3.5"
        />
        <ellipse
            cx="60"
            cy="56"
            rx="32"
            ry="6"
            class="fill-accent stroke-current"
            stroke-width="3.5"
        />
        <path d="M44 55c6 2 12-2 18 0s10 1 12-1" class="stroke-accent-deep" stroke-width="2.5" />
    </svg>
</template>
