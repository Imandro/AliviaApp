import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    {
      name: 'alivia-visible-startup',
      apply: 'build',
      transformIndexHtml: {
        order: 'post',
        handler: (html) => html.replace(
          /<link rel="stylesheet"([^>]+)>/g,
          '<link rel="stylesheet"$1 media="print" data-app-styles onload="this.media=\'all\'">',
        ),
      },
    },
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
        globPatterns: ['**/*.{js,css,html,svg,png,webp,ico,woff2,json,webm}'],
        // Las 3 imagenes de la mascota (511 KB) solo se usan en la pantalla 404,
        // un caso raro. Precachearlas obliga a descargarlas en la primera visita
        // sin aportar nada al arranque offline habitual.
        globIgnores: [
          'sw.js',
          'workbox-*.js',
          '**/ALIVIA-*.apk',
          '**/mascota-*.png',
          // El manifiesto de la release (version, bytes, sha256) cambia en cada
          // publicacion del APK. Precacacheado, el service worker seguiria
          // sirviendo el hash y la URL de la version anterior a quien ya
          // visito la pagina, y la verificacion en navegador fallaria.
          // Case igual que la API: siempre a la red.
          'releases.json',
          // Los videos antiguos ya no participan en las pantallas de carga.
          'videos/alivia-reveal.webm',
          'videos/alivia-pop.webm',
          // Marcas del Hackathon KRONOX 2026: los iconos magenta/cian y el favicon
          // del hackathon solo aparecen dentro de la galeria del pie, que se abre
          // bajo demanda. Precachearlos engorda la primera visita sin aporte.
          // Los dos logos de la franja (~21 KB) si se precachean para que la
          // atribucion siga visible sin conexion.
          'kronox/01-*.png',
          'kronox/camping*.png',
          'kronox/favicon-hackathon.ico',
        ],
        navigateFallback: '/index.html',
        // Las paginas estaticas de marketing van sueltas: sin esto el service
        // worker responderia /descarga.html con el index.html de la SPA y el
        // visitante veria la app en vez de la pagina de descarga.
        navigateFallbackDenylist: [/^\/api\//, /^\/landing/, /^\/descarga/],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
}))
