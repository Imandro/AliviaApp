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
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,json}'],
        globIgnores: ['sw.js', 'workbox-*.js', '**/ALIVIA-*.apk'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/landing/],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
}))