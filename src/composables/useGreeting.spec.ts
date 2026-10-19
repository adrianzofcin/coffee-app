import { describe, expect, it } from 'vitest'
import { greetingFor } from './useGreeting'

describe('greetingFor', () => {
    it.each([
        [5, 'Good morning'],
        [11, 'Good morning'],
        [12, 'Good afternoon'],
        [17, 'Good afternoon'],
        [18, 'Good evening'],
        [2, 'Good evening'],
    ])('hour %i → %s', (hour, expected) => {
        expect(greetingFor(hour)).toBe(expected)
    })
})
