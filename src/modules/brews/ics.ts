/** Calendar reminder for a cold brew (docs/content/brew.md, D16). */
export interface CalendarEvent {
    uid: string
    title: string
    start: Date
    /** Length of the event block in the calendar. */
    durationMin?: number
}

const pad = (value: number) => String(value).padStart(2, '0')

/** 2026-10-20T06:15:00Z → 20261020T061500Z */
export function icsDate(date: Date): string {
    return (
        `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
        `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
    )
}

function escapeText(value: string): string {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n')
}

function endOf(event: CalendarEvent): Date {
    return new Date(event.start.getTime() + (event.durationMin ?? 15) * 60_000)
}

/** iCalendar file with an alert at the start time. Lines end with CRLF as the format requires. */
export function buildIcs(event: CalendarEvent, now = new Date()): string {
    const title = escapeText(event.title)

    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Coffee//Brew reminder//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${event.uid}@coffee-app`,
        `DTSTAMP:${icsDate(now)}`,
        `DTSTART:${icsDate(event.start)}`,
        `DTEND:${icsDate(endOf(event))}`,
        `SUMMARY:${title}`,
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${title}`,
        'TRIGGER:PT0M',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR',
        '',
    ].join('\r\n')
}

/** Fallback when the system cannot open .ics files (test T2). */
export function googleCalendarUrl(event: CalendarEvent): string {
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.title,
        dates: `${icsDate(event.start)}/${icsDate(endOf(event))}`,
    })

    return `https://calendar.google.com/calendar/render?${params}`
}

/**
 * Hands the event to the system share sheet (calendar apps pick it up),
 * or downloads the file where sharing files is not supported.
 */
export async function offerCalendarEvent(event: CalendarEvent): Promise<void> {
    const file = new File([buildIcs(event)], 'cold-brew.ics', { type: 'text/calendar' })

    if (navigator.canShare?.({ files: [file] })) {
        try {
            await navigator.share({ files: [file], title: event.title })
            return
        } catch (error) {
            // Closing the share sheet is not an error worth a download.
            if ((error as Error).name === 'AbortError') return
        }
    }

    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = file.name
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
