import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',

      injectRegister: 'auto',
      registerType: 'autoUpdate',

      devOptions: {
        enabled: false,
      },

      workbox: {
          navigateFallbackDenylist: [/^\/api/],
      },

      manifest: {
        name: 'Écaille',
        short_name: 'Écaille',
        description: 'Agenda et setlists du groupe',
        theme_color: '#10B981',
        background_color: '#ffffff',
        display: 'standalone',

        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
    }),
  ],
})