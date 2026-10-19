<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Camera, LoaderCircle, Trash2 } from 'lucide-vue-next'
import { compressImage } from '@/lib/photos'
import { usePhotoUrl } from '@/composables/usePhotoUrl'

/** undefined = unchanged, null = removed, Blob = new photo */
const photo = defineModel<Blob | null | undefined>({ default: undefined })

const props = defineProps<{ existingPath?: string | null }>()

const input = ref<HTMLInputElement>()
const processing = ref(false)
const error = ref<string | null>(null)
const existingUrl = usePhotoUrl(() => props.existingPath)
const newUrl = ref<string | null>(null)

watch(photo, (value) => {
    if (newUrl.value) URL.revokeObjectURL(newUrl.value)
    newUrl.value = value ? URL.createObjectURL(value) : null
})
onBeforeUnmount(() => newUrl.value && URL.revokeObjectURL(newUrl.value))

const preview = computed(() => {
    if (photo.value === null) return null

    return newUrl.value ?? existingUrl.value
})

async function onChange(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return

    processing.value = true
    error.value = null
    try {
        photo.value = await compressImage(file)
    } catch {
        error.value = 'This photo could not be read.'
    } finally {
        processing.value = false
        if (input.value) input.value.value = ''
    }
}
</script>

<template>
    <div>
        <p class="mb-1.5 text-sm font-medium text-text-muted">Photo</p>
        <div class="flex items-center gap-3">
            <button
                type="button"
                class="pressable relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-card border-2 border-dashed border-border bg-surface-muted text-text-muted"
                @click="input?.click()"
            >
                <img
                    v-if="preview"
                    :src="preview"
                    alt=""
                    class="absolute inset-0 size-full object-cover"
                />
                <LoaderCircle v-else-if="processing" class="size-6 animate-spin" />
                <Camera v-else class="size-7" :stroke-width="1.5" />
            </button>
            <div class="flex flex-col items-start gap-1 text-sm">
                <button type="button" class="font-semibold text-accent" @click="input?.click()">
                    {{ preview ? 'Change photo' : 'Add photo' }}
                </button>
                <button
                    v-if="preview"
                    type="button"
                    class="flex items-center gap-1 text-text-muted"
                    @click="photo = null"
                >
                    <Trash2 class="size-4" /> Remove
                </button>
                <p v-if="error" class="text-danger">{{ error }}</p>
            </div>
        </div>
        <input ref="input" type="file" accept="image/*" class="hidden" @change="onChange" />
    </div>
</template>
