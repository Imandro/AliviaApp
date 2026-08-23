# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
versionado con [SemVer](https://semver.org/lang/es/).

## [1.0.0] — 2026-08-23

### Añadido

- **App Android nativa** vía Capacitor 8 (`com.alivia.salud`): icono adaptativo,
  splash screen de marca, permiso de micrófono y build release firmado.
- **Motor offline-first** (`src/utils/apiClient.ts`): caché de lecturas, cola FIFO
  persistente de escrituras, sincronización automática al reconectar y revalidación
  silenciosa en segundo plano.
- **Actualizaciones optimistas** para ánimos, actividades, comunidad, planes,
  chequeos y perfil — la UI responde al instante con o sin conexión.
- **Indicador de sincronización** (`SyncToast`) con cambios pendientes y confirmación.
- **CORS compartido** (`api/_cors.ts`) en todas las funciones serverless para consumo
  desde la WebView nativa.
- **Fuentes propias auto-hospedadas** (Quicksand variable + Lato) en la app y la web;
  cero dependencia de CDNs externos.
- **Landing del proyecto** en `/landing` con demo interactiva offline-first y guardia
  PWA: en modo standalone redirige automáticamente a la app instalada.
- **Soporte edge-to-edge** (Android 15/16): safe-areas en header, navegación y
  pantallas de sesión; escala de texto fija (`textZoom`) y overscroll nativo desactivado
  para paridad visual total con la web.
- **CI**: typecheck + build en cada push y pull request.
- Distribución pública vía GitHub Releases (APK firmado).

### Cambiado

- `npm run sync:android`: flujo único de build + sync + limpieza de assets.

### Seguridad

- Claves de firma y variables de entorno excluidas del repositorio;
  binarios APK distribuidos exclusivamente por Releases.
