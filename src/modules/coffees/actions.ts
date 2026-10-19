import { db } from '@/lib/db'
import {
    batchWrite,
    insertRecord,
    newId,
    softDelete,
    storePhoto,
    updateRecord,
} from '@/lib/data/repository'
import { requireUserId } from '@/lib/data/session'
import { photoPath } from '@/lib/photos'
import type { Bag, BagStatus, Coffee, Draft } from '@/types/models'
import type { BagView } from './balance'

export type CoffeeInput = Draft<Coffee>
export type BagInput = Pick<
    Bag,
    'roast_date' | 'weight_g' | 'price' | 'purchase_date' | 'is_frozen'
>

function newBag(coffeeId: string, input: BagInput): Draft<Bag> {
    return { ...input, coffee_id: coffeeId, status: 'sealed', opened_at: null, finished_at: null }
}

export async function createCoffee(
    input: CoffeeInput,
    bag: BagInput,
    photo: Blob | null,
): Promise<string> {
    const id = newId()
    const path = photo ? photoPath(requireUserId(), 'coffees', id, photo) : null

    await batchWrite(async () => {
        await insertRecord('coffees', { ...input, id, photo_path: path })
        await insertRecord('bags', newBag(id, bag))
        if (photo && path) await storePhoto(path, photo)
    })

    return id
}

/**
 * @param photo undefined = keep, null = remove, Blob = replace
 */
export async function updateCoffee(
    id: string,
    changes: Partial<CoffeeInput>,
    photo?: Blob | null,
): Promise<void> {
    await batchWrite(async () => {
        let photoChange = {}

        if (photo === null) photoChange = { photo_path: null }
        if (photo) {
            const path = photoPath(requireUserId(), 'coffees', id, photo)
            await storePhoto(path, photo)
            photoChange = { photo_path: path }
        }

        await updateRecord('coffees', id, { ...changes, ...photoChange })
    })
}

export function setRating(coffeeId: string, rating: number | null): Promise<void> {
    return updateRecord('coffees', coffeeId, { rating })
}

export async function deleteCoffee(coffeeId: string): Promise<void> {
    await batchWrite(async () => {
        const bags = await db.bags.where({ coffee_id: coffeeId }).toArray()
        for (const bag of bags.filter((b) => !b.deleted_at)) await softDelete('bags', bag.id)
        await softDelete('coffees', coffeeId)
    })
}

export async function addBag(coffeeId: string, input: BagInput): Promise<void> {
    await insertRecord('bags', newBag(coffeeId, input))
}

export function updateBag(bagId: string, changes: Partial<BagInput>): Promise<void> {
    return updateRecord('bags', bagId, changes)
}

export function setBagStatus(bag: Bag, status: BagStatus): Promise<void> {
    const now = new Date().toISOString()

    return updateRecord('bags', bag.id, {
        status,
        opened_at: status === 'sealed' ? null : (bag.opened_at ?? now),
        finished_at: status === 'finished' ? now : null,
    })
}

export function setFrozen(bag: Bag, frozen: boolean): Promise<void> {
    return updateRecord('bags', bag.id, { is_frozen: frozen })
}

export function deleteBag(bagId: string): Promise<void> {
    return softDelete('bags', bagId)
}

/** Taking coffee out of a sealed bag means it has been opened. */
async function openIfSealed(bag: Bag): Promise<void> {
    if (bag.status === 'sealed') await setBagStatus(bag, 'open')
}

/** The scale says X grams are left: store the difference as an event. */
export async function setActualWeight(view: BagView, measured: number): Promise<void> {
    const delta = Math.round((measured - view.remaining) * 10) / 10
    if (delta === 0) return

    await batchWrite(async () => {
        await insertRecord('bag_adjustments', {
            bag_id: view.bag.id,
            type: 'set_weight',
            delta_g: delta,
            measured_g: measured,
            note: null,
        })
        if (delta < 0) await openIfSealed(view.bag)
    })
}

export async function removeGrams(
    view: BagView,
    grams: number,
    note: string | null,
): Promise<void> {
    const removed = Math.min(grams, view.remaining)
    if (removed <= 0) return

    await batchWrite(async () => {
        await insertRecord('bag_adjustments', {
            bag_id: view.bag.id,
            type: 'remove',
            delta_g: -removed,
            measured_g: null,
            note,
        })
        await openIfSealed(view.bag)
    })
}
