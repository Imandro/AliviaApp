# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
versionado con [SemVer](https://semver.org/lang/es/).

## [No publicado]

### Añadido

- **Página de descarga del APK** (`/descarga.html`), con su propio diseño: botón de
  descarga, datos reales del binario publicado (v1.2.0 · 4,8 MB · Android 7.0+ ·
  universal), SHA-256, requisitos, los cuatro pasos de instalación, aviso sobre el
  "origen desconocido" de Android, alternativas (PWA, compilar desde el código,
  notas de la versión) y un FAQ de 8 preguntas. Tiene canonical, Open Graph y
  entrada propia en el sitemap.
- **El landing enlaza a esa página** desde el nav, el hero y el footer. Los botones
  "Descargar Android" ya no apuntan directo al asset de GitHub: apuntan a la página,
  que a su vez enlaza al asset. Así el visitante que llega desde un buscador recibe
  instrucciones de instalación en lugar de un `.apk` sin contexto.

### Corregido

- **El service worker respondía `/descarga.html` con el `index.html` de la SPA.**
  `navigateFallbackDenylist` solo excluía `/landing`, así que la página nueva se
  habría visto como la app. Añadido `/^\/descarga/` a la lista.
- **Datos del APK desactualizados**: el landing y el README decían "3,6 MB" (el
  asset publicado mide 5.032.862 bytes) y "v1.0" (el último release es v1.2.0).
- **README**: el enlace de descarga apuntaba a `ALIVIA-1.0.apk`, un nombre de
  archivo que no existe en ningún release; ahora lleva a `/descarga.html`.

## [1.3.0] — 2026-09-30

### Seguridad

- **Las claves ya no viajan en el bundle.** `VITE_GROQ_API_KEY` se compilaba dentro
  del JavaScript y quedaba accesible para cualquiera que abriera las herramientas
  de desarrollo del navegador, con la cuota de la app. Ahora el cliente habla con
  `/api/ai/*` y es una Lambda nueva (`alivia-ai`, fuera del VPC como el TTS) la
  que guarda las claves en Secrets Manager y reenvía. Es el único cambio de este
  bloque que no se puede revertir sin perder las claves.
- **Rate limit por IP** en el proxy (cubos de tokens), con `429` hacia el cliente
  para que caiga a las reglas locales en vez de reintentar en bucle.
- **El proxy acota lo que le piden**: temperatura y `max_tokens` con techo, lista
  de modelos en servidor y el mensaje `system` forzado al principio. Una petición
  manipulada ya no puede pedir una respuesta de crisis ni saltarse las instrucciones.

### Cambiado

- **Proveedor híbrido.** El chat pasa a **OpenAI** (`gpt-4.1-mini`, que responde
  bastante mejor en español) y la transcripción de voz se queda en **Groq**
  (Whisper v3 turbo). No se unificó porque las eficiencias no coinciden: la voz en
  OpenAI costaría ~$0.006 por minuto frente a $0.04 por hora en Groq, unas nueve
  veces más. Si `OPENAI_API_KEY` no está configurado, el chat cae a Groq
  automáticamente, así que el deploy actual sigue funcionando sin cambios.
- `VITE_GROQ_MODEL` pasa a `VITE_OPENAI_MODEL`, y el modo directo de desarrollo
  usa dos claves separadas en vez de una.

### Añadido

- **Detección de crisis por niveles** en vez de una lista de palabras clave
  (`src/utils/crisisSafety.ts`). Distingue "me siento solo" de "quiero morirme",
  reconoce texto escrito con las letras separadas (`q u i e r o m o r i r`),
  distingue "estoy muerto de hambre" de "quiero morir", hereda el contexto del
  historial para que "si lo hago" siga contando como nivel 3, y expone qué
  señal concreta se detectó para pasársela al modelo.
- **Salida del modo crisis**: se puede cerrar escribiendo que se está bien o con
  el botón nuevo del encabezado. Antes el modo se activaba y solo se quitaba
  reiniciando toda la conversación.
- **Streaming de tokens**: VIA responde mientras se escribe, en vez de esperar la
  respuesta completa y añadir 900 ms de espera artificial después.
- **Red de seguridad en crisis**: si la respuesta del modelo no menciona ninguna
  ayuda humana, se le añade sola antes de mostrarla.
- **117 tests**, 6 archivos, cubriendo el clasificador de crisis, el failover, el
  rate limit, el parseo de SSE, la sanitización del proxy y elección de upstream.

### Corregido

- **El failover de modelos no funcionaba**: un fallo de red en el primer modelo
  abortaba la cadena entera (`catch` con `return null`), dejando al usuario sin IA
  aunque quedaran modelos libres.
- **El filtro anti-eco nunca hacía match**: `normalize()` quitaba las vocales
  acentuadas antes de comparar, así que cualquier respuesta en español con tilde
  pasaba el filtro. Ahora normaliza por NFD y además mira el solapamiento de
  palabras, que detecta el eco reformulado.
- **Un 429 degradaba a todos los usuarios en silencio**; ahora el cliente recibe el
  código y cae a las reglas locales de forma explícita.
- **La lista de modelos llevaba un id dudoso**: `qwen/qwen3.6-27b` aparecía en
  listados de terceros pero no en la documentación oficial de Groq, donde hoy
  figura `qwen/qwen3.8-27b`. Ese 3.6 salía de la lista. Nota de transparencia: en
  la primera versión de esta entrada afirmé que no existía en el catálogo; era una
  conclusión sin verificar y fue incorrecta.
- **Una entrada de diario positiva ("un logro grande") se puntuaba como neutra**:
  el patrón era `logr[ée]`, que no cubre "logro".
- **El chequeo de bienestar se tragaba los errores** de la llamada IA, sin
  `try/catch`, y evaluaba la crisis solo sobre los contadores, ignorando el
  resumen del diario, que es donde más señales de crisis aparecen.

### Cambiado

- **Prompts versionados** en `src/utils/aiPrompts.ts`, separados de la lógica de
  red. En crisis la temperatura baja a 0.4 (una respuesta serena y predecible
  importa más que la variedad) y el prompt incluye la evidencia concreta
  detectada, para que el modelo sepa si hay un método o solo ideación.
- El diario completo ya no viaja al modelo: recibe un resumen agregado y, como
  máximo, los últimos 8 turnos de conversación.
- La lista de modelos acepta un failover separado por comas, en servidor
  (`OPENAI_MODELS`, `GROQ_MODELS`) y en desarrollo (`VITE_OPENAI_MODEL`).

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
