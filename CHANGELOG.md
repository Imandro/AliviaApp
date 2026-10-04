# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
versionado con [SemVer](https://semver.org/lang/es/).

## [No publicado]

### Corregido

- **La descarga del APK estaba rota y no daba ninguna señal.** El deploy hacía
  `aws s3 sync dist/ --delete`, así que borraba las claves del APK —que se suben a
  mano con `npm run release:apk` y no viven en `dist/`— en cada despliegue de la
  web. CloudFront pedía el paquete, no lo encontraba y la Function de fallback
  devolvía `index.html`: la página recibía 99 KB de `text/html` con **200** en
  lugar de un 404, y el hash no cuadraba sin que nada lo indicara. El sync ahora
  lleva `--exclude "releases/*"`.
- **El APK ya no venía con una build antigua.** El shell nativo empaqueta `dist` y
  lo sirve desde `file://`, así que es una foto fija: la v1.2.0 no tenía ni los
  recursos oficiales (le faltaba el chunk `OfficialResourcesView`) ni el nombre
  Livi. La v1.2.1 se reconstruye desde el código actual.
- **`versionName` decía `1.0` mientras el manifiesto publicaba `1.2.0`.** Android
  usa el `versionCode` para decidir si una instalación es una actualización, y el
  `versionName` es lo que ve la persona en el móvil. Ahora ambos salen de la
  release: `versionCode 2`, `versionName "1.2.1"`.

### Cambiado

- **La mascota se llama Livi.** El rename venía a medias y el prompt de sistema
  decía `Eres "Livi"` seguido de `TE LLAMAS VIA` en la misma frase, así que el
  modelo se presentaba con el nombre viejo. Ahora la identidad está unificada en
  el prompt, en `MODEL_LABELS` y en todos los textos visibles (chat, diario de
  desahogo, chequeo de bienestar, spotlight, 404, banner del dashboard, etiquetas
  de accesibilidad). `stripPreamble` también limpia el prefijo `Livi:` que ahora
  anteponen los modelos, y `PROMPT_VERSION` sube a `2026-10-04.1` para poder
  atribuir el cambio en telemetría. No se renombran el canal de telemetría `via` ni
  el id `via-chat`: el primero lo valida la API y el segundo está persistido en las
  preferencias de cada usuario.

- **La página de descarga se rehace desde cero** (`public/descarga.html`). El
  argumento pasa de "te baja revoluciones" a privacidad y autonomía, con la
  tabla "lo que sale de tu teléfono es exactamente nada" como sección central:
  qué se queda en el dispositivo, qué no sale nunca y qué solo cruza internet si
  tú lo enciendes. Encima van las cifras (4,8 MB · 0 anuncios · 0 rastreo · MIT).
- **Mockup interactivo del teléfono** con las pantallas reales —Inicio, Respira y
  Cosas—, con los iconos lucide que usa la app y la mascota del proyecto. La
  versión anterior no mostraba el producto: cero capturas, cero demostración.
- **Barra de progreso real y verificación SHA-256 en el navegador.** El APK ya no
  se descarga desde GitHub, sino desde `alivia.lat`; al ser *same-origin* se puede
  leer el `ReadableStream` (progreso, velocidad y tiempo restantetrue) y calcular
  el hash con WebCrypto. Si el hash no cuadra no se guarda nada. Antes el código
  admitía en un comentario que no se podía hacer nada de eso.
- **Detección de plataforma**: en iOS, donde no se puede instalar un APK, el
  botón pasa a ofrecer la versión web en vez de fallar al pulsar.
- **Tabla comparativa** web instalable frente a APK, y sección de verificación
  con los comandos `Get-FileHash` y `shasum -a 256` para comprobarlo a mano.
- `index.html`: el JSON-LD ya no anuncia "Juegos de calma" sino "Cosas que no
  importan (juegos sin meta)".
- **El chat ya no abre con un globo de bienvenida.** La conversación la empieza
  siempre la persona; `getAiIntro` desaparece. Se va también el `setTimeout` de
  300 ms que solo servía para que ese globo apareciera después, y durante el cual
  la lista de mensajes quedaba vacía. Los cuatro chips rápidos se muestran ahora
  también con la lista vacía, para que sirvan de ayuda al primer mensaje.
- **Los globos de texto pasan a clases CSS** en vez de un objeto de estilos en
  línea. Ganan cola real (pseudo-elemento en lugar de radio asimétrico), ancho
  máximo `min(82%, 46ch)` —a 88 % una línea larga rozaba el borde en pantallas de
  360 px— y agrupado por racha: el avatar solo aparece al abrir un turno nuevo.
- **El aviso de crisis sale de un token `--crisis`** en vez de `#ff8a80` fijo. El
  color estaba cableado en cuatro sitios y con `--accent-rose` en modo mono el
  aviso se volvía gris, que es justo cuando más tiene que destacar. Ningún tema
  redefine ese token a propósito.
- **Las respuestas por defecto dejan de sonar a catálogo.** Se quitan las
  cabeceras de muletilla ("Gracias por compartir", "Entiendo que", "Estoy
  contigo") que hacían que las cuatro sonaran idénticas, y el metacomentario "he
  notado que mencionas «ansiedad»" que delata el buscador de palabras clave. También
  se van el sermón de "te llevo a…" y los textos de error y sin conexión.

### Corregido

- **Los juegos ya se juegan sin desplazar.** En `/games/:id` el Header y la navbar se
  retiran y el escenario queda centrado en la pantalla completa. Antes entre ambos
  ocupaban 184 px, el escenario no cabía en un iPhone SE y había que arrastrar el dedo;
  como la navbar va en `position: absolute` **con** `pointer-events` sobre el contenido,
  al desplazar el escenario se quedaba debajo y la barra se comía los toques. Ahora la
  barra del juego solo lleva volver, el nombre y el SOS, y el escenario no se mueve.
- **`npm run release:apk -- --invalidate` fallaba siempre** con
  `InvalidArgument`. `execFileSync` no pasa por shell, así que los tres paths de
  CloudFront llegaban a la CLI como un único argumento con espacios en vez de tres.
- **Espacio colgante en la salida de crisis** (`aiProvider.ts`): la interpolación
  condicional dentro de la frase producía "eso,  y que te cueste menos" cuando el
  valor era falso. Ahora la frase se arma por partes y se une con espacios.
- **El SOS desaparece en la pantalla de "juego no encontrado".** Al retirar el
  Header y la navbar en `/games/:id` para que el escenario no se desplace, la
  rama de error de `GameView` —que no renderiza la barra de juego— se quedó sin
  ningún acceso a las líneas de crisis: el único control era "Ver todos los
  juegos". Ahora lleva el mismo `SosButton` que la barra. En una app de salud
  mental la salida a crisis no puede depender de que la ruta sea válida.
- **Una PWA instalada se quedaba en el bundle viejo para siempre.** El service
  worker llamaba `skipWaiting()` pero no `clientsClaim()`: se actualizaba en
  segundo plano y el tab ya abierto seguía con el contenido anterior hasta que
  alguien recargaba a mano. Con `clientsClaim` el tab cambia solo.
- **La caché local del catálogo de recursos no se invalidaba al cambiar la
  fuente.** `resourceApi` guardaba la lista en `localStorage` con TTL de 7 días,
  así que un recurso retirado seguía visible en dispositivos ya instalados
  durante una semana. La entrada lleva ahora número de versión y las versiones
  antigas se descartan.

### Añadido

- **VIA tiene rostro en el chat.** Los globos de la IA llevan un avatar de 28 px
  que cambia de expresión: `comprensiva` cuando hay crisis detectada, `normal` en
  reposo y parpadeo cada 5,2 s. Los avatares son recortes de rostro generados a
  partir de las 7 poses de cuerpo entero que ya existían (`mascota-inicio-*.webp`),
  porque esas figuras de 144×324 no se leen a ese tamaño. 33 KB en total, sin arte
  nuevo, y precacheadas por el service worker para que funcionen sin conexión.
- **El APK se sirve desde el propio dominio**, en `/releases/` del bucket de la
  web, sin tocar la plantilla de CloudFormation: la CloudFront Function
  `alivia-spa-fallback` ya deja pasar cualquier URI con un punto. Con
  `Content-Type: application/vnd.android.package-archive`, `Content-Disposition`
  y `Cache-Control` por ruta.
- **`scripts/release-apk.mjs`** (`npm run release:apk`): sube el APK, calcula su
  SHA-256 y **escribe `public/releases.json`**, que pasa a ser la única fuente de
  verdad de versión, tamaño y hash. La página y el landing los leen de ahí en vez
  de llevar el dato escrito a mano. Rechaza archivos que no empiecen por la firma
  `PK` de un ZIP, para no publicar por error una descarga a medias.
- **Rutas `/releases/` y `/releases.json` en `robots.txt`**: son un binario y un
  JSON, no páginas, y no merece la pena que un crawler baje 4,8 MB.
- **Siete generadores de sonido suave** en `src/utils/sounds.ts`, incluido un
  helper de ruido filtrado (base de `marimbaNote`, `woodSound`, `polishSound`,
  `creaseSound`, `sweepSound`, `beadSound`, `dartSound`, `placeSound`). Ninguno
  premia ni castiga: no hay arpegio de acierto ni tono de error.
- **`hapticTick()`** en `src/utils/haptics.ts`: vibración imperceptible con
  *throttle* de 110 ms, porque estas tareas generan decenas de toques por
  segundo y el motor nativo no debe recibir una ráfaga.
- **`SensoryStage`**, cascarón compartido por los ocho juegos: panel, área
  jugable y pista. Elimina la duplicación de estructura que tenían los juegos
  anteriores.
- **`toStagePoint`, `fitCanvas` y `TINTS`** en `SensoryStage.tsx`, para el
  manejo de coordenadas y el buffer del canvas en píxeles lógicos.
- **Página de descarga del APK** (`/descarga.html`), con su propio diseño: botón de
  descarga, datos reales del binario publicado (v1.2.0 · 4,8 MB · Android 7.0+ ·
  universal), SHA-256, requisitos, los cuatro pasos de instalación, aviso sobre el
  "origen desconocido" de Android, alternativas (PWA, compilar desde el código,
  notas de la versión) y un FAQ de 10 preguntas. Tiene canonical, Open Graph y
  entrada propia en el sitemap.
- **El landing enlaza a esa página** desde el nav, el hero y el footer. Los botones
  "Descargar Android" ya no apuntan directo al asset de GitHub: apuntan a la página,
  que a su vez enlaza al asset. Así el visitante que llega desde un buscador recibe
  instrucciones de instalación en lugar de un `.apk` sin contexto.

### Cambiado

- **Los juegos ya no son juegos.** Los ocho minijuegos anteriores (burbujas,
  memoria, Secuencia VIA, Ancla 5-4-3-2-1, Marea Respira, Cuadrícula de
  Anclaje, Piloto de Pensamientos y Semilla que Crece) se sustituyen por ocho
  tareas deliberadamente aburridas: **Moneda Vieja** (frotar una moneda oxidada
  hasta que reluce), **Pila de Bloques** (apilar tablitas que enderezan solas),
  **Marimba Chiquita** (ocho barras en pentatónica de Re), **Dardos al Corcho**,
  **Enhebrar Cuentas** (el hilo se afloja con el peso), **Barrer Polvo**,
  **Doblar Papel** (los pliegues se quedan marcados) y **Ordenar Fichas**.
- **Sin meta.** Se elimina todo el aparato de recompensas: no hay puntuación,
  estrellas, niveles, turnos, fallos, reloj ni tarjeta de "terminaste". El único
  indicador es una frase de estado en palabras. Ningún juego tiene final; solo
  se sale.
- **Los iconos dejan de ser emoji.** El campo `GameMeta.emoji` (que mezclaba
  símbolos tipográficos como `✵` con emoji de color como `🌊`) se sustituye por
  `GameMeta.icon`, un nombre que se resuelve a iconos de `lucide-react` en el
  nuevo `src/utils/gameIcons.tsx`. El catálogo sigue siendo un módulo puro sin
  React, así que se puede testear en node.
- **Copy y descubrimiento**: la sección pasa a llamarse "Cosas Que No
  Importan" en la lista, el dashboard y `explore`; el recordatorio de las 17:30
  se reescribió; y el catálogo de la IA ahora las llama "juegos sensoriales,
  aburridos y sin meta".
- **Documentación**: `README.md` y `public/landing.html` ya no prometen "cuatro
  minijuegos de regulación"; describen las ocho tareas nuevas.

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
