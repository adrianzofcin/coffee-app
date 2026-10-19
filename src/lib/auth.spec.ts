import { describe, expect, it } from 'vitest'
import {
    classifySignInError,
    emailToUsername,
    isValidUsername,
    normalizeUsername,
    usernameToEmail,
} from './auth'

describe('username mapping', () => {
    it('normalizes whitespace and case', () => {
        expect(normalizeUsername('  Jano ')).toBe('jano')
    })

    it('maps a username to the technical e-mail', () => {
        expect(usernameToEmail(' Jano ', 'coffee.local')).toBe('jano@coffee.local')
    })

    it('maps an e-mail back to the username', () => {
        expect(emailToUsername('jano@coffee.local')).toBe('jano')
        expect(emailToUsername(undefined)).toBe('')
    })

    it.each(['jano', 'jano.novak', 'j_n-1'])('accepts %s', (name) => {
        expect(isValidUsername(name)).toBe(true)
    })

    it.each(['', 'ján', 'jano novak', 'jano@x', 'a'.repeat(65)])('rejects "%s"', (name) => {
        expect(isValidUsername(name)).toBe(false)
    })
})

describe('classifySignInError', () => {
    it('treats wrong credentials as invalid_credentials', () => {
        expect(classifySignInError({ code: 'invalid_credentials', status: 400 })).toBe(
            'invalid_credentials',
        )
    })

    it('treats fetch failures as offline', () => {
        expect(classifySignInError({ name: 'AuthRetryableFetchError', status: 0 })).toBe('offline')
    })

    it('falls back to unknown', () => {
        expect(classifySignInError({ status: 500 })).toBe('unknown')
    })
})
