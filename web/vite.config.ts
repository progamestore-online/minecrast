import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2,wasm,json}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-pages',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 10 },
            },
          },
        ],
      },
      manifest: {
        name: 'MineCrast',
        short_name: 'MineCrast',
        description: 'Voxel block-building game with multiplayer',
        start_url: '/',
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#0f0f0f',
        theme_color: '#4ade80',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  server: { host: true },
  test: {
    environment: 'jsdom',
    css: true,
  },
})
