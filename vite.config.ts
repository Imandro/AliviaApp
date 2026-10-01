import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      // El shell nativo iOS (WKWebView) carga desde file:// y no aplica service worker
      disable: mode === 'ios',
      registerType: 'autoUpdate',
      // El registro se hace manualmente en src/main.tsx (omite shells nativos)
      injectRegister: false,
      // La metadata real de ALIVIA y sus iconos vive en public/manifest.json.
      manifest: false,
      workbox: {
        importScripts: ['/push-sw.js'],
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,json,webm}'],
        // Las 3 imagenes de la mascota (511 KB) solo se usan en la pantalla 404,
        // un caso raro. Precachearlas obliga a descargarlas en la primera visita
        // sin aportar nada al arranque offline habitual.
        globIgnores: [
          'sw.js',
          'workbox-*.js',
          '**/ALIVIA-*.apk',
          '**/mascota-*.png',
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/landing/],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
}))