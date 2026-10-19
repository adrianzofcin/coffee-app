import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// The icon is full-bleed (dark background, artwork inside the maskable safe zone),
// so maskable and Apple icons use it without padding; corners fall back to espresso.
const fullBleed = { padding: 0, resizeOptions: { background: '#17110D' } }

export default defineConfig({
    headLinkOptions: {
        preset: '2023',
    },
    preset: {
        ...minimal2023Preset,
        maskable: { ...minimal2023Preset.maskable, ...fullBleed },
        apple: { ...minimal2023Preset.apple, ...fullBleed },
    },
    images: ['public/icon.svg'],
})
