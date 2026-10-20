export const TASTE_TAGS: { value: string; label: string }[] = [
    { value: 'sour', label: 'Sour' },
    { value: 'bitter', label: 'Bitter' },
    { value: 'balanced', label: 'Balanced' },
    { value: 'weak', label: 'Weak' },
    { value: 'strong', label: 'Strong' },
    { value: 'astringent', label: 'Astringent' },
    { value: 'sweet', label: 'Sweet' },
]

export function tasteLabel(value: string): string {
    return TASTE_TAGS.find((tag) => tag.value === value)?.label ?? value
}

/** History rows load in pages of this size while scrolling. */
export const HISTORY_PAGE = 20

/** Brews without a rating are offered for rating this long after brewing. */
export const RATE_WINDOW_MS = 24 * 60 * 60_000
