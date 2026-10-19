import { computed, onBeforeUnmount, ref } from 'vue'

export function greetingFor(hour: number): string {
    if (hour >= 5 && hour < 12) return 'Good morning'
    if (hour >= 12 && hour < 18) return 'Good afternoon'

    return 'Good evening'
}

export function useGreeting() {
    const now = ref(new Date())
    const timer = setInterval(() => (now.value = new Date()), 60_000)
    onBeforeUnmount(() => clearInterval(timer))

    const greeting = computed(() => greetingFor(now.value.getHours()))
    const today = computed(() =>
        now.value.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
    )

    return { greeting, today }
}
