<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
    /** Water poured right now, g/s; null when the kettle rests. */
    rate: number | null
    /** Share of the cone filled with water, 0–1. */
    level: number
    /** Share of the server filled with coffee, 0–1. */
    served: number
    /** The bed has had water: darker grounds. */
    wet: boolean
    bubbling: boolean
    swirling: boolean
    dripping: boolean
    paused: boolean
}>()

// Cone interior: the bed fills the tip, water rises above it up to the rim.
const BED_TOP = 122
const RIM = 76
const SERVER_BOTTOM = 232
const SERVER_HEIGHT = 50

const clamp = (value: number) => Math.min(1, Math.max(0, value))

const waterY = computed(() => BED_TOP - clamp(props.level) * (BED_TOP - RIM))
const hasWater = computed(() => props.level > 0.01)
const serverY = computed(() => SERVER_BOTTOM - clamp(props.served) * SERVER_HEIGHT)
const pouring = computed(() => props.rate !== null && props.rate > 0)
/** A faster pour is a thicker stream. */
const streamWidth = computed(() => Math.min(5, 1.6 + (props.rate ?? 0) * 0.45))
const streamEnd = computed(() => (hasWater.value ? waterY.value : BED_TOP - 4))
</script>

<template>
    <svg
        viewBox="0 0 200 250"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        class="stage"
        :class="{ 'is-paused': paused }"
    >
        <defs>
            <clipPath id="pour-cone">
                <path d="M47 74h106l-44 76h-18z" />
            </clipPath>
            <clipPath id="pour-server">
                <path d="M62 178h76l-4 44c-1 9-7 13-15 13H81c-8 0-14-4-15-13z" />
            </clipPath>
            <linearGradient id="pour-coffee" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#7a4a2c" />
                <stop offset="1" stop-color="#3e2416" />
            </linearGradient>
        </defs>

        <!-- Server -->
        <g>
            <path
                d="M58 172h84l-4 50c-1 12-9 17-19 17H81c-10 0-18-5-19-17z"
                class="fill-cream/5 stroke-current"
                stroke-width="3"
                opacity="0.75"
            />
            <path
                d="M142 184c10 0 13 5 12 12s-7 10-14 9"
                class="stroke-current"
                stroke-width="3"
                opacity="0.75"
            />
            <g clip-path="url(#pour-server)">
                <rect
                    x="56"
                    width="90"
                    height="60"
                    fill="url(#pour-coffee)"
                    class="transition-[y] duration-700 ease-out"
                    :y="serverY"
                />
                <path
                    v-if="served > 0.02"
                    class="wave transition-transform duration-700 ease-out"
                    :style="{ transform: `translateY(${serverY}px)` }"
                    d="M40 0q10-3 20 0t20 0 20 0 20 0 20 0 20 0 20 0v4H40z"
                    fill="#9a6440"
                    opacity="0.6"
                />
            </g>
            <path d="M70 186v34" class="stroke-cream/25" stroke-width="3" />
        </g>

        <!-- Drips into the server -->
        <g v-if="dripping" class="fill-[#6b3f26]">
            <circle cx="100" cy="162" r="2.6" class="drip" />
            <circle cx="100" cy="162" r="2.2" class="drip [animation-delay:0.45s]" />
            <circle cx="100" cy="162" r="2.4" class="drip [animation-delay:0.9s]" />
        </g>

        <!-- Dripper, swirls as one piece -->
        <g class="dripper" :class="{ 'is-swirling': swirling }">
            <path d="M84 150h32v9H84z" class="fill-ill stroke-current" stroke-width="3" />
            <path d="M58 160h84" class="stroke-current" stroke-width="4" />
            <path d="M44 72h112l-45 78H89z" class="fill-ill stroke-current" stroke-width="3.5" />
            <path
                d="M156 86c12 0 16 7 13 15s-11 12-21 10"
                class="stroke-current"
                stroke-width="3.5"
            />

            <g clip-path="url(#pour-cone)">
                <!-- Paper and ribs -->
                <path d="M47 74h106l-44 76h-18z" class="fill-cream/10" />
                <path
                    d="M66 80l28 60M134 80l-28 60M84 80l14 58M116 80l-14 58"
                    class="stroke-current"
                    stroke-width="1.5"
                    opacity="0.2"
                />

                <!-- Coffee bed -->
                <path
                    class="bed transition-[fill] duration-1000"
                    :class="{ 'is-blooming': bubbling }"
                    :style="{ fill: wet ? '#4a2b1b' : '#b07d55' }"
                    d="M60 124q40-9 80 0l-24 30H84z"
                />

                <!-- Water above the bed -->
                <g v-if="hasWater">
                    <rect
                        x="40"
                        width="120"
                        height="90"
                        class="transition-[y] duration-500 ease-out"
                        :y="waterY"
                        fill="#8a5a38"
                        opacity="0.55"
                    />
                    <path
                        class="wave transition-transform duration-500 ease-out"
                        :class="{ 'is-fast': pouring }"
                        :style="{ transform: `translateY(${waterY - 1.5}px)` }"
                        d="M20 0q10-3 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0v3H20z"
                        fill="#c79a74"
                        opacity="0.7"
                    />
                </g>

                <!-- Bloom bubbles -->
                <g v-if="bubbling" class="fill-cream/70">
                    <circle cx="86" :cy="BED_TOP - 2" r="1.8" class="bubble" />
                    <circle
                        cx="100"
                        :cy="BED_TOP - 4"
                        r="2.4"
                        class="bubble [animation-delay:0.6s]"
                    />
                    <circle
                        cx="112"
                        :cy="BED_TOP - 2"
                        r="1.6"
                        class="bubble [animation-delay:1.2s]"
                    />
                    <circle
                        cx="94"
                        :cy="BED_TOP - 3"
                        r="1.4"
                        class="bubble [animation-delay:1.7s]"
                    />
                    <circle
                        cx="106"
                        :cy="BED_TOP - 3"
                        r="1.9"
                        class="bubble [animation-delay:2.2s]"
                    />
                </g>
            </g>

            <!-- Paper edge above the rim -->
            <path
                d="M50 72l6-6 6 6 6-6 6 6 6-6 6 6 6-6 6 6 6-6 6 6 6-6 6 6 6-6 6 6 6-6 6 6"
                class="stroke-cream/50"
                stroke-width="2"
            />
        </g>

        <!-- Gooseneck kettle spout and stream -->
        <g class="kettle" :class="{ 'is-pouring': pouring }">
            <path
                d="M170 2h40v30c0 8-5 12-12 12h-16c-7 0-12-4-12-12z"
                class="fill-ill stroke-current"
                stroke-width="3.5"
            />
            <path d="M166 2h48" class="stroke-current" stroke-width="4" />
            <path
                d="M170 34c-14 2-16 22-28 18-5-2-8-5-14-5"
                class="stroke-current"
                stroke-width="5"
            />
        </g>
        <path
            v-if="pouring"
            class="stream stroke-cream/85"
            :stroke-width="streamWidth"
            :d="`M127 48C118 60 104 66 101 ${streamEnd}`"
        />
        <g v-if="pouring" class="stroke-cream/60" stroke-width="1.5">
            <ellipse cx="101" :cy="streamEnd" rx="6" ry="1.6" class="ripple" />
            <ellipse
                cx="101"
                :cy="streamEnd"
                rx="6"
                ry="1.6"
                class="ripple [animation-delay:0.6s]"
            />
        </g>
    </svg>
</template>

<style scoped>
.kettle {
    opacity: 0;
    transform: translate(18px, -14px) rotate(-8deg);
    transform-origin: 200px 0;
    transition:
        opacity 400ms ease,
        transform 500ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.kettle.is-pouring {
    opacity: 1;
    transform: none;
}

.stream {
    stroke-dasharray: 7 3;
    animation: flow 0.45s linear infinite;
}

.wave {
    animation: wave 2.4s linear infinite;
}

.wave.is-fast {
    animation-duration: 0.9s;
}

.drip {
    animation: fall 1.35s ease-in infinite;
    opacity: 0;
}

.bubble {
    transform-box: fill-box;
    transform-origin: center;
    animation: bubble 2.2s ease-out infinite;
    opacity: 0;
}

.ripple {
    transform-box: fill-box;
    transform-origin: center;
    animation: ripple 1.2s ease-out infinite;
}

.bed {
    transform-box: fill-box;
    transform-origin: 50% 100%;
}

.bed.is-blooming {
    animation: bloom 3s ease-in-out infinite;
}

.dripper {
    transform-box: view-box;
    transform-origin: 100px 160px;
}

.dripper.is-swirling {
    animation: swirl 1.1s ease-in-out infinite;
}

.is-paused * {
    animation-play-state: paused !important;
}

@keyframes flow {
    to {
        stroke-dashoffset: -10;
    }
}

@keyframes wave {
    to {
        translate: -40px 0;
    }
}

@keyframes fall {
    0% {
        opacity: 0;
        transform: translateY(0);
    }
    15% {
        opacity: 1;
    }
    100% {
        opacity: 0.8;
        transform: translateY(46px);
    }
}

@keyframes bubble {
    0% {
        opacity: 0;
        transform: translateY(0) scale(0.4);
    }
    30% {
        opacity: 1;
    }
    100% {
        opacity: 0;
        transform: translateY(-10px) scale(1.2);
    }
}

@keyframes ripple {
    from {
        opacity: 0.9;
        transform: scale(0.4);
    }
    to {
        opacity: 0;
        transform: scale(1.8);
    }
}

@keyframes bloom {
    0%,
    100% {
        transform: scaleY(1);
    }
    50% {
        transform: scaleY(1.12);
    }
}

@keyframes swirl {
    0%,
    100% {
        transform: rotate(0deg);
    }
    25% {
        transform: rotate(-3deg) translateX(-2px);
    }
    75% {
        transform: rotate(3deg) translateX(2px);
    }
}

@media (prefers-reduced-motion: reduce) {
    .stage * {
        animation: none !important;
    }
}
</style>
