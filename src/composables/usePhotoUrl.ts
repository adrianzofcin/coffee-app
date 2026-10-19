import { onScopeDispose, ref, watch, type Ref, type WatchSource } from 'vue'
import { loadPhoto } from '@/lib/photos'

/** Object URL for a stored photo; revoked automatically. */
export function usePhotoUrl(path: WatchSource<string | null | undefined>): Ref<string | null> {
    const url = ref<string | null>(null)
    let current: string | null = null

    function revoke(): void {
        if (current) URL.revokeObjectURL(current)
        current = null
    }

    watch(
        path,
        async (value) => {
            revoke()
            url.value = null
            if (!value) return

            const blob = await loadPhoto(value)
            if (!blob) return

            current = URL.createObjectURL(blob)
            url.value = current
        },
        { immediate: true },
    )

    onScopeDispose(revoke)

    return url
}
