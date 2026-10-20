import { computed } from 'vue'
import { db, type ActiveRun } from '@/lib/db'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { useCoffees } from '@/modules/coffees/useCoffees'
import type { Brew } from '@/types/models'
import { bagOptions, coffeeByBag, latestFirst } from './brew'

/** Non-deleted brews, newest first, live from the local database. */
export function useBrews() {
    const data = useLiveQuery(
        async () => latestFirst(await db.brews.toArray()),
        null as Brew[] | null,
    )

    return {
        loaded: computed(() => data.value !== null),
        brews: computed(() => data.value ?? []),
    }
}

/** The brew in progress on this device, if any. */
export function useActiveRun() {
    const data = useLiveQuery(
        async () => (await db.active_run.get('current')) ?? null,
        undefined as ActiveRun | null | undefined,
    )

    return {
        loaded: computed(() => data.value !== undefined),
        run: computed(() => data.value ?? null),
    }
}

/** Bags to brew from and the coffee behind every bag, for pickers and history rows. */
export function useShelf() {
    const { loaded, views, coffees, bags } = useCoffees()

    return {
        loaded,
        options: computed(() => bagOptions(views.value)),
        coffeeOf: computed(() => coffeeByBag(bags.value, coffees.value)),
    }
}
