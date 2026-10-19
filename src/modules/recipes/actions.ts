import { db } from '@/lib/db'
import { insertRecord, softDelete, updateRecord, withoutSystemFields } from '@/lib/data/repository'
import type { Draft, Recipe } from '@/types/models'

export async function createRecipe(input: Draft<Recipe>): Promise<string> {
    return (await insertRecord('recipes', input)).id
}

export function updateRecipe(id: string, changes: Partial<Draft<Recipe>>): Promise<void> {
    return updateRecord('recipes', id, changes)
}

export async function duplicateRecipe(id: string): Promise<string> {
    const original = await db.recipes.get(id)
    if (!original) throw new Error('Recipe not found.')

    return createRecipe({
        ...withoutSystemFields(original),
        name: `${original.name} (copy)`.slice(0, 100),
        is_favorite: false,
        last_brewed_at: null,
    })
}

export function setFavorite(recipe: Recipe, favorite: boolean): Promise<void> {
    return updateRecord('recipes', recipe.id, { is_favorite: favorite })
}

export function deleteRecipe(id: string): Promise<void> {
    return softDelete('recipes', id)
}
