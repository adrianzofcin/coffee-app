import { computed } from 'vue'
import { db } from '@/lib/db'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { buildCoffeeViews, type CoffeeView } from './balance'

/** All coffees with their bags and remaining grams, live from the local database. */
export function useCoffees() {
    const data = useLiveQuery(async () => {
        const [coffees, bags, adjustments, brews] = await Promise.all([
            db.coffees.toArray(),
            db.bags.toArray(),
            db.bag_adjustments.toArray(),
            db.brews.toArray(),
        ])

        return { coffees, bags, views: buildCoffeeViews(coffees, bags, adjustments, brews) }
    }, null)

    return {
        loaded: computed(() => data.value !== null),
        views: computed<CoffeeView[]>(() => data.value?.views ?? []),
        /** Raw rows, incl. deleted ones, for suggestions and duplicate checks. */
        coffees: computed(() => data.value?.coffees ?? []),
        /** Raw bags, incl. deleted ones, so history can still name the coffee. */
        bags: computed(() => data.value?.bags ?? []),
    }
}
