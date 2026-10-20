import { localDate } from '@/modules/coffees/balance'

/** "08:15" */
export function formatClock(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

/** "Today, 08:15", "Yesterday, 19:02", "Mon 12 Oct, 08:15" (with the year when it differs). */
export function formatBrewDate(iso: string, now = new Date()): string {
    const date = new Date(iso)
    const day = localDate(date)
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)

    let label: string
    if (day === localDate(now)) label = 'Today'
    else if (day === localDate(yesterday)) label = 'Yesterday'
    else {
        label = date.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
        })
    }

    return `${label}, ${formatClock(iso)}`
}

/** Time left: "6 h 20 min", "12 min", "< 1 min" */
export function formatCountdown(ms: number): string {
    const minutes = Math.ceil(ms / 60_000)
    if (minutes < 1) return '< 1 min'

    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60

    if (hours === 0) return `${rest} min`

    return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}
