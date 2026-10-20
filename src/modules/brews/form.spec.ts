import { describe, expect, it } from 'vitest'
import { buildIcs, googleCalendarUrl, icsDate } from './ics'
import { emptyBrewForm, formToBrew, fromLocalInput, toLocalInput, validateBrewForm } from './form'
import { formatCountdown } from './format'

describe('brew form', () => {
    const now = new Date('2026-10-20T10:00:00')

    it('requires a dose and checks ranges', () => {
        const form = { ...emptyBrewForm('v60', now), water: '6000', time: 'abc' }
        expect(validateBrewForm(form)).toEqual({
            dose: 'Required.',
            water: 'Enter 1–5000 g.',
            time: 'Use minutes:seconds, e.g. 2:45.',
        })
    })

    it('checks yield only for espresso and rejects future dates', () => {
        const form = {
            ...emptyBrewForm('espresso', now),
            dose: '18',
            water: '99999',
            yield: '600',
            started_at: '2026-10-20T11:00',
        }
        expect(validateBrewForm(form, { checkDate: true, now })).toEqual({
            yield: 'Enter 1–500 g.',
            started_at: 'Cannot be in the future.',
        })
    })

    it('maps the form to brew fields', () => {
        const fields = formToBrew({
            ...emptyBrewForm('espresso', now),
            dose: '18,5',
            water: '250',
            yield: '38',
            time: '0:28',
            notes: '  ',
        })
        expect(fields).toMatchObject({
            dose_g: 18.5,
            water_g: null,
            yield_g: 38,
            brew_time_s: 28,
            notes: null,
        })
        expect(
            formToBrew({ ...emptyBrewForm('cold_brew'), dose: '100', time: '1:00' }).brew_time_s,
        ).toBeNull()
    })

    it('round-trips datetime-local values', () => {
        const iso = fromLocalInput('2026-10-20T08:15')
        expect(toLocalInput(iso)).toBe('2026-10-20T08:15')
    })
})

describe('calendar reminder', () => {
    const event = {
        uid: 'abc',
        title: 'Cold Brew ready: Kenya, Kiambu',
        start: new Date('2026-10-21T06:15:00Z'),
    }

    it('builds an iCalendar event with an alarm at the start', () => {
        const ics = buildIcs(event, new Date('2026-10-20T20:00:00Z'))
        expect(ics).toContain('DTSTART:20261021T061500Z')
        expect(ics).toContain('DTEND:20261021T063000Z')
        expect(ics).toContain('SUMMARY:Cold Brew ready: Kenya\\, Kiambu')
        expect(ics).toContain('TRIGGER:PT0M')
        expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR')
    })

    it('links to Google Calendar as a fallback', () => {
        const url = new URL(googleCalendarUrl(event))
        expect(url.searchParams.get('dates')).toBe('20261021T061500Z/20261021T063000Z')
        expect(url.searchParams.get('text')).toBe(event.title)
    })

    it('formats UTC dates', () => {
        expect(icsDate(new Date('2026-01-02T03:04:05Z'))).toBe('20260102T030405Z')
    })

    it('formats time left', () => {
        expect(formatCountdown(380 * 60_000)).toBe('6 h 20 min')
        expect(formatCountdown(12 * 60_000)).toBe('12 min')
        expect(formatCountdown(120 * 60_000)).toBe('2 h')
        expect(formatCountdown(0)).toBe('< 1 min')
    })
})
