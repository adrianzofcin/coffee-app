/** "12 Oct" (adds the year when it is not the current one). */
export function formatShortDate(isoDate: string, now = new Date()): string {
    const date = new Date(`${isoDate}T12:00:00`)
    const sameYear = date.getFullYear() === now.getFullYear()

    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        ...(sameYear ? {} : { year: 'numeric' }),
    })
}

/** "just now", "5 min ago", "3 h ago", "2 days ago" */
export function formatRelativeTime(iso: string, now = Date.now()): string {
    const minutes = Math.round((now - Date.parse(iso)) / 60_000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes} min ago`

    const hours = Math.round(minutes / 60)
    if (hours < 24) return `${hours} h ago`

    const days = Math.round(hours / 24)

    return days === 1 ? 'yesterday' : `${days} days ago`
}
