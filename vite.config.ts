import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

// GitHub Pages serves the app from /<repo-name>/; the deploy workflow sets BASE_PATH.
const base = process.env.BASE_PATH ?? '/'

// GitHub Pages has no SPA rewrites, so deep links fall back to a copy of index.html.
function spaFallback(): Plugin {
    let outDir = ''

    return {
        name: 'spa-fallback-404',
        apply: 'build',
        configResolved(config) {
            outDir = resolve(config.root, config.build.outDir)
        },
        closeBundle() {
            copyFileSync(resolve(outDir, 'index.html'), resolve(outDir, '404.html'))
        },
    }
}

export default defineConfig({
    base,
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
        __APP_BUILD__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? 'local'),
    },
    plugins: [
        vue(),
        tailwindcss(),
        VitePWA({
            registerType: 'prompt',
            injectRegister: false,
            includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
            manifest: {
                id: base,
                name: 'Coffee',
                short_name: 'Coffee',
                description: 'Personal coffee companion: beans, recipes and brews.',
                lang: 'en',
                start_url: base,
                scope: base,
                display: 'standalone',
                orientation: 'portrait',
                background_color: '#FAF6F1',
                theme_color: '#FAF6F1',
                icons: [
                    { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
                    { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
                    { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
                    {
                        src: 'maskable-icon-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                // Non-latin Inter subsets are never needed for an English UI.
                globIgnores: ['404.html', '**/inter-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2'],
                navigateFallback: 'index.html',
                cleanupOutdatedCaches: true,
            },
        }),
        spaFallback(),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
})
