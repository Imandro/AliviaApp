# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
versionado con [SemVer](https://semver.org/lang/es/).

## [1.1.2] — 2026-08-23

### Corregido

- **Tipografía**: `font-synthesis: none` en toda la app — los pesos que la fuente
  no tiene (p. ej. 800 sobre Quicksand) ya no se falsifican estirando los glifos;
  se resuelven con el peso real más cercano. Afectaba a 51 textos.

### Cambiado

- **Landing**: eliminada la fila de comando `git clone`; enlace de GitHub con ícono
  y usuario; mensajes repetidos (sin internet/offline-first) deduplicados; anclas
  con margen bajo la barra fija y glow sutil en tarjetas al pasar el cursor.

## [1.1.1] — 2026-08-23

### Eliminado

- **Marco decorativo de la app**: se retiró el borde grueso, esquinas redondeadas,
  sombra envolvente y línea dorada superior que enmarcaban la aplicación
  (visibles en pantallas grandes y tabletas). La app ahora ocupa toda la pantalla
  en cualquier dispositivo, como una app nativa.

## [1.1.0] — 2026-08-23

### Añadido

- **Code-splitting por pantalla** (`React.lazy` + Suspense): bundle inicial de
  603 KB → 298 KB (−50 %); cada vista viaja en su propio chunk y carga al vuelo.
- **Atajos de app** (manifest shortcuts): SOS, Respirar y Desahogo accesibles con
  presión larga sobre el icono en Android.
- **Feedback háptico nativo** (`@capacitor/haptics`): SOS (fuerte), cambio de pestaña
  (ligero) y ejercicios completados (notificación de éxito). No-op en web.
- Precache de fuentes y landing en el service worker (`alivia-v3`).

### Corregido

- **VIA sin conexión**: antes el indicador "escribiendo…" quedaba colgado si la
  llamada a IA fallaba; ahora responde con un mensaje amable y recuerda que todo
  lo escrito se sincroniza al reconectar.

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
