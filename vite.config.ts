import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/jigsaw/' : '/', // GitHub Pages project site; dev stays at root
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Jigsaw',
        short_name: 'Jigsaw',
        description: 'Turn your photos into jigsaw puzzles — everything stays on your device.',
        theme_color: '#1b1b1f',
        background_color: '#1b1b1f',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,wasm}'],
        // the lazy HEIC wasm chunk is worth precaching for offline phone use
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
}))
