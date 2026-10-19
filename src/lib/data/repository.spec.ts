import 'fake-indexeddb/auto'
import { reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db'
import { insertRecord, softDelete, updateRecord } from '@/lib/data/repository'
import { setCurrentUserId } from '@/lib/data/session'

const USER = '00000000-0000-0000-0000-00000000000a'

function draft(tastingNotes: string[]) {
    return {
        name: 'Guji',
        roaster: 'Doubleshot',
        country: null,
        region: null,
        producer: null,
        variety: null,
        altitude: null,
        process: null,
        roast_level: null,
        intended_for: null,
        is_decaf: false,
        tasting_notes: tastingNotes,
        rating: null,
        notes: null,
        photo_path: null,
    }
}

describe('repository', () => {
    beforeEach(async () => {
        await db.clearAll()
        setCurrentUserId(USER)
    })

    afterEach(() => setCurrentUserId(null))

    it('stores values coming from reactive form state', async () => {
        const form = reactive({ notes: ['Floral'] })

        const coffee = await insertRecord('coffees', draft(form.notes))
        await updateRecord('coffees', coffee.id, { tasting_notes: reactive(['Citrus']) })

        expect((await db.coffees.get(coffee.id))?.tasting_notes).toEqual(['Citrus'])
    })

    it('fills system fields and queues the record', async () => {
        const coffee = await insertRecord('coffees', draft([]))

        expect(coffee).toMatchObject({ user_id: USER, deleted_at: null })
        expect(await db.outbox.where({ table: 'coffees', key: coffee.id }).count()).toBe(1)
    })

    it('soft deletes instead of removing', async () => {
        const coffee = await insertRecord('coffees', draft([]))
        await softDelete('coffees', coffee.id)

        expect((await db.coffees.get(coffee.id))?.deleted_at).not.toBeNull()
    })

    it('refuses to write without a signed-in user', async () => {
        setCurrentUserId(null)

        await expect(insertRecord('coffees', draft([]))).rejects.toThrow('Not signed in.')
    })
})
