import { nextTick } from 'vue'

/** After a failed save, bring the first error message of the form into view. */
export async function scrollToFirstError(formId: string): Promise<void> {
    await nextTick()
    document
        .querySelector(`#${formId} .text-danger`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
