# AGENTS.md

ALIVIA — bienestar emocional. React + Vite PWA, API en AWS Lambda, Postgres en RDS. Una sola base de código sirve web, Android (Capacitor) e iOS (shell Swift/WKWebView).

## Comandos

```bash
npm test                  # = vitest run (293 tests). No añadas --run, ya está en el script
npx vitest run src/utils/officialResources.test.ts    # un solo archivo
npm run build             # orden fijo: build:seo -> tsc -b -> vite build
npm run build:lambda     # requerido antes de cualquier sam build
```

Las Lambdas usan `nodejs22.x` y ambos workflows fijan `node-version: 22`. Esta máquina tiene Node 24 y npm 11, que funcionan, pero una diferencia de comportamiento entre 22 y 24 es la causa más probable si algo falla en CI y no en local. `package-lock.json` es `lockfileVersion: 3`.

El orden de `npm run build` importa: `build:seo` escribe `public/sitemap.xml` y `public/seo/`, y Vite copia `public/` a `dist/`. Si `build:seo` falla, la cadena `&&` corta el build y el deploy no ocurre — es intencional, no un bug.

CI ejecuta exactamente: `npm ci` → `npm run build` → `npm run build:lambda` → `npm test`.

### Android

```bash
npm run sync:android                                    # build web + cap sync + limpia assets
cd android && .\gradlew.bat assembleRelease --no-daemon # AAB (Play) / assembleDebug para local
node scripts/release-apk.mjs <apk> --version 1.2.1 --publish --invalidate
```

Requiere `android/local.properties` con `sdk.dir` y `JAVA_HOME`. SDK en `C:\Android\Sdk`, JDK 21.

**La versión del APK vive en dos sitios**: `versionName` en `android/app/build.gradle` y el `--version` que pasas a `release-apk.mjs`, que es lo que escribe `public/releases.json`. Si divergen, la página de descarga miente en su título. `build-seo.mjs` inyecta el valor del manifiesto en las metas, pero no puede arreglar el `build.gradle`. Al publicar, commitea también el `releases.json` que genera el script.

## Tests

- Vitest corre en `environment: 'node'` e incluye **solo `*.test.ts`**. Un `.test.tsx` no se ejecuta nunca y no da ningún error.
- No hay jsdom ni testing-library, y es una decisión deliberada (`src/components/useCompanionDialog.test.ts` lo explica). `src/test/setup.ts` implementa `localStorage` a mano. Para probar lógica de componente, replica la lógica en vez de montar el componente.
- **Nunca fijes conteos como literales.** Los tests derivan de `OFFICIAL_RESOURCES.length`. Un literal desfasado ya dejó el CI en rojo dos veces.
- Al cambiar contenido de biblioteca o recursos, regenera: `npm run build:seo`.

## Arquitectura

- **`HashRouter` es intencional.** El shell de Capacitor carga desde `file://`; con `BrowserRouter` la navegación resuelve a `file:///chat` y la app se rompe. Por eso el SEO no viene de las rutas de la app.
- **El SEO es contenido generado, no rutas.** `scripts/build-seo.mjs` lee `GUIDES`, `LIBRARY` y `OFFICIAL_RESOURCES` y produce `public/seo/`. Edita siempre `src/utils/*.ts`, **nunca** `public/seo/`: está gitignored y se reconstruye en cada build.
- **CloudFront Function**: deja pasar cualquier URI que contenga un punto; todo lo demás cae en `index.html`. Por eso las páginas nuevas llevan extensión. URLs limpias exigen tocar `infra/web.yaml` y desplegar.
- **`src/utils/resourceApi.ts` es código muerto**: solo lo importa su propio test. Arreglarlo no cambia el bundle de la app.
- **La IA no se decide en el frontend.** `src/utils/aiProvider.ts` es un proxy a `/api/ai`; la cadena de upstreams vive en `api/ai.ts` (chat: gemini → openai → groq; voz: groq) y el bucle de failover en `api/lambda/ai-handler.ts`. No pongas lógica de proveedor en el cliente.
- `api/lambda/dist*` son artefactos gitignored, pero `sam build` los empaqueta: ejecuta `npm run build:lambda` antes.
- La BD es **RDS PostgreSQL 16**, no DynamoDB. `api/_db.ts` + `db/*.sql`.

## Deploy

4 stacks: `alivia-net`, `alivia-db`, `alivia-app` (SAM), `alivia-web`.

**`deploy-aws.yml` nunca corre `sam deploy`.** Solo actualiza código de Lambda y sincroniza S3. Cualquier cambio en `infra/*.yaml` requiere un despliegue manual (`aws cloudformation deploy` / `sam deploy`, ver README ~L358-366).

- El sync a S3 usa `--delete` con `--exclude "releases/*"`. **Sin ese exclude, cada deploy de la web borra el APK** y la descarga devuelve `index.html` con 200 en lugar de un 404. No lo quites.
- `validate-infra` corre en PRs; los deploys se omiten en PRs.
- `main` tiene protección: checks requeridos `build` y `validate-infra`, force-push y borrado bloqueados, admins **no** forzados, `strict: false`.

## Secretos y firma

- Keystore de release: `android/keystore/release.jks` + `android/keystore.properties`. Gitignored, nunca los commitees.
- Las claves de proveedores viven en AWS Secrets Manager y llegan a la Lambda como GitHub secrets. El navegador nunca las ve.
- `{{resolve:...}}` en templates **no** se refresca en un cambio solo de secreto: actualiza la Lambda directamente o cambia el template.

## Convenciones

- Comentarios largos explicando **por qué**, no qué. Los ficheros de `src/utils/` mezclan español y acentos en comentarios; los identificadores van sin acentos. Respeta el idioma del fichero que toques.
- `CHANGELOG.md` se mantiene a mano bajo `[No publicado]`. Añade entradas para cambios con efecto visible.
- Todo es UTF-8 **sin BOM**. La consola de PowerShell muestra `Ã©` en acentos: es la consola, no el fichero. No "arregles" la codificación.
- PowerShell: sin `&&` (usa `;`), sin `head`, y `Select-String` no tiene `-Recurse`.
- `aws` y `sam` no están en el PATH por defecto: antepón PATH de Machine + User.

## Anomalías conocidas

No son tuyas, no las "arregles" de paso:

- `gh` — un binario de 43 MB commiteado en la raíz. Casi seguro un `git add` accidental.
- `README.md` dice "141 tests" (son 293) y `.env.example` aún dice "AI (VIA)" tras el rename a **Livi**.
- `public/sitemap.xml` está gitignored a propósito: generarlo commiteado metía un diff diario por el `lastmod`.

# Alivia: contexto y preferencias del usuario

Alivia es el proyecto de DataStorm para acercar el bienestar emocional a adolescentes y jóvenes en Nicaragua. Livi es la mascota verde con rostro claro y lazo amarillo; preservar los recursos y la identidad existentes.

- Siempre iniciar o reutilizar una vista previa local, comprobarla, abrirla en Codex y entregar su enlace al desarrollar. Mantener el servidor disponible para que el usuario revise y pida correcciones.
- El usuario ejecuta los commits y pushes. No hacerlos ni publicar cambios sin una instrucción nueva y explícita.
- En la conversación por voz, reemplazar la burbuja por Livi: escuchar con movimientos atentos y reactivos, pensar con gestos visibles y responder abriendo y cerrando el pico durante el estado de habla. El alcance es solo frontend: conservar la voz existente y no modificar el backend, el chat de texto ni la identidad de la mascota.
- Mantener el encabezado, navegación, cierre y ubicación del panel de voz existente. El usuario autorizó integrar su fondo con la página y suavizar el diseño para eliminar el efecto de cuadro dentro de otro cuadro. No convertirlo en una pantalla completa ni añadir controles de demostración visibles.
- Comprobar los recursos, el código y los chats anteriores antes de inventar aspectos del proyecto. No afirmar que se recuerda información que no se ha recuperado.
- El usuario quiere animaciones claras y expresivas en los tres estados. Su último brief exige respetar movimiento reducido: conservar expresiones y parpadeos, con una versión calmada sin gestos amplios.
- El nuevo brief reemplaza la estrategia de poses raster: autoriza redibujar Livi como SVG articulado a partir de los recursos originales. Priorizar actuación de cabeza, ojos, alas, cuerpo, listón y pico; validar fidelidad en reposo con superposición y revisar grabaciones en escritorio y móvil. Evitar cortes, uniones visibles y piezas desprendidas.
- El usuario rechazó las actuaciones elaboradas y pidió cerrar el trabajo restaurando la versión sencilla: recursos originales completos al escuchar y entender, y pico pequeño al responder. Se restauró la copia Alivia_Livi_frontend; no reintroducir el SVG articulado ni «El encaje» ni añadir nuevas coreografías sin una nueva instrucción. Conservar voz, backend e interfaz y entregar el preview local.
- Sobre esa versión sencilla, el usuario pidió efectos exteriores sin tocar a Livi: dos señales de escucha junto a la cabeza, puntos conectados al entender y tres «bla» que aparecen, desaparecen y vuelven a empezar al responder. Mantener los efectos separados de las imágenes y del pico existentes.
