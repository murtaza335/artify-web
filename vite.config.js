import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Inlines the icon sprite into index.html, so icons are there before any script runs.
const inlineIcons = {
  name: 'artify-inline-icons',
  transformIndexHtml: (html) => html.replace('<!-- icons -->', readFileSync(new URL('./src/ui/icons.svg', import.meta.url), 'utf8'))
};

// Colours here mirror tokens.css (--bg-deep and --bg); the manifest cannot read CSS.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 800
  },
  plugins: [
    inlineIcons,
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'og-image.png'],
      manifest: {
        name: 'Artify',
        short_name: 'Artify',
        description: 'Endless shard art. Tap for the next one, solve it as a puzzle, throw paint, or build your own.',
        start_url: './#/reform',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#1B1016',
        theme_color: '#0F0A0E',
        categories: ['entertainment', 'games', 'lifestyle'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true
      }
    })
  ]
});
