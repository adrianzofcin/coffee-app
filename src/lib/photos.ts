import { db } from '@/lib/db'
import { supabase } from '@/lib/supabase'

const MAX_EDGE = 1600
const BUCKET = 'photos'

function canvasToBlob(
    canvas: HTMLCanvasElement,
    type: string,
    quality: number,
): Promise<Blob | null> {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

/**
 * Downscales a camera photo to at most 1600 px and re-encodes it (WebP, JPEG
 * where the browser cannot encode WebP), typically 150–300 kB.
 */
export async function compressImage(file: Blob): Promise<Blob> {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const webp = await canvasToBlob(canvas, 'image/webp', 0.8)
    if (webp?.type === 'image/webp') return webp

    const jpeg = await canvasToBlob(canvas, 'image/jpeg', 0.85)
    if (!jpeg) throw new Error('Could not process the photo.')

    return jpeg
}

export function photoPath(userId: string, folder: string, recordId: string, blob: Blob): string {
    const extension = blob.type === 'image/webp' ? 'webp' : 'jpg'
    // A fresh name per upload, so cached copies of an old photo never show up.
    const suffix = crypto.randomUUID().slice(0, 8)

    return `${userId}/${folder}/${recordId}-${suffix}.${extension}`
}

/** Local copy first (works offline), otherwise download once and keep it. */
export async function loadPhoto(path: string): Promise<Blob | null> {
    const local = await db.photos.get(path)
    if (local) return local.blob

    if (!supabase || !navigator.onLine) return null

    const { data, error } = await supabase.storage.from(BUCKET).download(path)
    if (error || !data) return null

    await db.photos.put({ path, blob: data, uploaded: true })

    return data
}
