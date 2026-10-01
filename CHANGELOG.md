# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
versionado con [SemVer](https://semver.org/lang/es/).

## [1.3.0] — 2026-09-30

### Seguridad

- **La clave de Groq ya no viaja en el bundle.** `VITE_GROQ_API_KEY` se compilaba
  dentro del JavaScript y quedaba accesible para cualquiera que abriera las
  herramientas de desarrollo del navegador, con la cuota de la app. Ahora el cliente
  habla con `/api/ai/*` y es una Lambda nueva (`alivia-ai`, fuera del VPC como el
  TTS) la que guarda la clave en Secrets Manager y reenvía a Groq. Es el único
  cambio de este bloque que no se puede revertir sin perder la clave.
- **Rate limit por IP** en el proxy (cubos de tokens), con `429` hacia el cliente
  para que caiga a las reglas locales en vez de reintentar en bucle.
- **El proxy acota lo que le piden**: temperatura y `max_tokens` con techo, lista
  de modelos en servidor y el mensaje `system` forzado al principio. Una petición
  manipulada ya no puede pedir una respuesta críptica ni saltarse las instrucciones.

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
- **109 tests**, 5 archivos, cubriendo el clasificador de crisis, el failover, el
  rate limit, el parseo de SSE y la sanitización del proxy.

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
- **La lista de modelos tenía uno inválido**: `qwen/qwen3.6-27b` no existe en el
  catálogo de Groq, así que uno de los tres intentos de failover siempre fallaba.
  La lista se corrigió y reordenó: `gpt-oss-20b` primero por velocidad y precio.
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
- `VITE_GROQ_MODEL` acepta una lista separada por comas y se documentó
  `GROQ_MODELS` en el servidor.

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
