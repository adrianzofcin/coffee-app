let currentUserId: string | null = null

export function setCurrentUserId(id: string | null): void {
    currentUserId = id
}

export function requireUserId(): string {
    if (!currentUserId) {
        throw new Error('Not signed in.')
    }

    return currentUserId
}
