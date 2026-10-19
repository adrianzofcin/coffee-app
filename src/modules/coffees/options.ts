import type { IntendedFor, RoastLevel } from '@/types/models'

/** Coffee-producing countries offered in the picker; any other value can be typed in. */
export const COUNTRIES: { name: string; flag: string }[] = [
    { name: 'Bolivia', flag: '🇧🇴' },
    { name: 'Brazil', flag: '🇧🇷' },
    { name: 'Burundi', flag: '🇧🇮' },
    { name: 'China', flag: '🇨🇳' },
    { name: 'Colombia', flag: '🇨🇴' },
    { name: 'Costa Rica', flag: '🇨🇷' },
    { name: 'DR Congo', flag: '🇨🇩' },
    { name: 'Ecuador', flag: '🇪🇨' },
    { name: 'El Salvador', flag: '🇸🇻' },
    { name: 'Ethiopia', flag: '🇪🇹' },
    { name: 'Guatemala', flag: '🇬🇹' },
    { name: 'Honduras', flag: '🇭🇳' },
    { name: 'India', flag: '🇮🇳' },
    { name: 'Indonesia', flag: '🇮🇩' },
    { name: 'Jamaica', flag: '🇯🇲' },
    { name: 'Kenya', flag: '🇰🇪' },
    { name: 'Laos', flag: '🇱🇦' },
    { name: 'Malawi', flag: '🇲🇼' },
    { name: 'Mexico', flag: '🇲🇽' },
    { name: 'Myanmar', flag: '🇲🇲' },
    { name: 'Nicaragua', flag: '🇳🇮' },
    { name: 'Panama', flag: '🇵🇦' },
    { name: 'Papua New Guinea', flag: '🇵🇬' },
    { name: 'Peru', flag: '🇵🇪' },
    { name: 'Rwanda', flag: '🇷🇼' },
    { name: 'Tanzania', flag: '🇹🇿' },
    { name: 'Thailand', flag: '🇹🇭' },
    { name: 'Uganda', flag: '🇺🇬' },
    { name: 'USA (Hawaii)', flag: '🇺🇸' },
    { name: 'Vietnam', flag: '🇻🇳' },
    { name: 'Yemen', flag: '🇾🇪' },
    { name: 'Zambia', flag: '🇿🇲' },
]

export function countryFlag(name: string | null): string | null {
    if (!name) return null

    return (
        COUNTRIES.find((country) => country.name.toLowerCase() === name.toLowerCase())?.flag ?? null
    )
}

export const PROCESSES = [
    'Washed',
    'Natural',
    'Honey',
    'Anaerobic',
    'Carbonic maceration',
    'Wet-hulled',
    'Experimental',
]

export const TASTING_NOTES = [
    'Chocolate',
    'Caramel',
    'Nutty',
    'Red berries',
    'Citrus',
    'Stone fruit',
    'Tropical',
    'Floral',
    'Honey',
    'Spices',
]

export const WEIGHT_PRESETS = [200, 250, 500, 1000]

export const ROAST_LEVELS: { value: RoastLevel; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'medium', label: 'Medium' },
    { value: 'dark', label: 'Dark' },
]

export const INTENDED_FOR: { value: IntendedFor; label: string }[] = [
    { value: 'espresso', label: 'Espresso' },
    { value: 'filter', label: 'Filter' },
    { value: 'omni', label: 'Omni' },
]

/** Label colour on the placeholder bag, by roast level. */
export const ROAST_COLORS: Record<RoastLevel | 'unknown', string> = {
    light: '#D9A066',
    medium: '#B06A35',
    dark: '#5E3A22',
    unknown: 'var(--accent)',
}

export function formatGrams(grams: number): string {
    return grams >= 1000 && grams % 1000 === 0 ? `${grams / 1000} kg` : `${Math.round(grams)} g`
}
