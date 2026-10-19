import { computed } from 'vue'
import { db } from '@/lib/db'
import { useLiveQuery } from '@/composables/useLiveQuery'
import type { Recipe } from '@/types/models'
import { sortRecipes } from './recipe'

/** Non-deleted recipes, sorted for lists, live from the local database. */
export function useRecipes() {
    const data = useLiveQuery(
        async () =>
            sortRecipes((await db.recipes.toArray()).filter((recipe) => !recipe.deleted_at)),
        null as Recipe[] | null,
    )

    return {
        loaded: computed(() => data.value !== null),
        recipes: computed(() => data.value ?? []),
    }
}
