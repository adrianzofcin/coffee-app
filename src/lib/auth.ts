const USERNAME_PATTERN = /^[a-z0-9._-]{1,64}$/

export function normalizeUsername(username: string): string {
    return username.trim().toLowerCase()
}

export function isValidUsername(username: string): boolean {
    return USERNAME_PATTERN.test(normalizeUsername(username))
}

/** Supabase Auth only knows e-mails, so a username maps to a technical address. */
export function usernameToEmail(username: string, domain: string): string {
    return `${normalizeUsername(username)}@${domain}`
}

export function emailToUsername(email: string | undefined): string {
    return email?.split('@')[0] ?? ''
}

export type SignInErrorKind = 'invalid_credentials' | 'offline' | 'not_configured' | 'unknown'

export const signInErrorMessages: Record<SignInErrorKind, string> = {
    invalid_credentials: 'Incorrect username or password.',
    offline: "You're offline. Connect to the internet to sign in.",
    not_configured: 'Supabase is not configured yet.',
    unknown: 'Something went wrong. Please try again.',
}

export function classifySignInError(error: {
    status?: number
    name?: string
    code?: string
}): SignInErrorKind {
    if (error.code === 'invalid_credentials' || error.status === 400) {
        return 'invalid_credentials'
    }

    if (error.name === 'AuthRetryableFetchError' || error.status === 0) {
        return 'offline'
    }

    return 'unknown'
}
