# AGENTS.md — Alivia

App de bienestar emocional. Monorepo de un solo paquete: SPA Vite/React + API serverless + shells nativos Capacitor (Android/iOS).

## Comandos

Verifica siempre con Node **22** (ver nota npm abajo):

```bash
npm ci                 # instalar (usa el lockfile)
npm run dev            # Vite dev server
npm run build          # build:seo + tsc -b + vite build  (genera dist/)
npm test               # vitest run
npm run build:lambda   # esbuild -> api/lambda/dist{,‑tts,‑ai,‑alerts}/
npx tsc --noEmit -p tsconfig.app.json   # typecheck del frontend solo
```

Orden de verificación: `npm run build` -> `npm run build:lambda` -> `npm test`.

### Por qué `build:lambda` va antes de los tests

`api/bundles.test.ts` carga los cuatro bundles desde `api/lambda/dist*/` para detectar referencias sin importar, que compilan bien y solo fallan al arrancar en AWS. Los directorios `dist*` están en `.gitignore`, así que sin ese build el test falla. En local, tras clonar o cambiar código de `api/`, corre `npm run build:lambda` antes de `npm test`.

## Estructura

| Ruta | Rol |
|---|---|
| `src/` | SPA React. Tests unitarios colgados al lado (`*.test.ts`). |
| `api/` | Lógica de negocio del backend, **independiente de AWS**. |
| `api/lambda/` | Solo el cableado Lambda: `handler.ts`, `router.ts`, `adapter.ts` + un `*-handler.ts` por función. |
| `db/` | `schema.sql`, `functions.sql`. `api/_db.ts` lee `db/functions.sql` desde `process.cwd()`. |
| `infra/` | AWS SAM (`app`, `net`, `database`, `web`). Vigente pero **sustituido** por `infra/azure/`. |
| `infra/azure/` | Destino actual: Bicep (VM, red, Key Vault) + `vm-setup.sh`. Ver `infra/azure/README.md`. |
| `api/server/` | Backend HTTP de Node 22 para la VM de Azure. Un solo proceso para toda la API. |
| `server/dist/` | Bundle del backend de la VM. Generado por `npm run build:lambda`, gitignored. |
| `scripts/` | esbuild, SEO, APK, sync de plataformas. |
| `work/` | Scripts de diseño/animación (Livi). No es parte del build. |
| `android/`, `ios/` | Shells nativos. El web se compila aparte (ver abajo). |

**Punto clave de arquitectura:** el enrutado y los handlers no conocen el runtime. Hay dos cableados sobre el mismo `api/`:

- `api/lambda/adapter.ts` traduce el evento AWS a `{ method, path, query, body, headers }`.
- `api/server/index.ts` construye ese mismo objeto desde `IncomingMessage` de Node.

`router.ts` solo hace `METHOD path -> handler`, y los handlers de `api/` solo conocen `ApiRequest`/`ApiResponse` de `_types.ts`. **Añadir una ruta o cambiar un handler va en `api/` y en `api/lambda/router.ts`, nunca en un `*-handler.ts` ni en `api/server/index.ts`.** Es lo que permite mantener AWS y Azure a la vez.

## Azure: destino actual

Una VM Ubuntu 22.04 con Node 22, PostgreSQL 15 y nginx. Sustituye a las 4 Lambdas + RDS + S3/CloudFront. Documentación y comandos: **`infra/azure/README.md`**.

- `api/server/index.ts` sirve **toda** la API en un proceso (`npm run start:server` tras `npm run build:lambda`). Las 4 Lambdas estaban separadas por el NAT Gateway del VPC; en una VM no aplica y por eso TTS, IA y alertas comparten proceso.
- El chat de IA hace streaming SSE sobre `ServerResponse`. `awslambda.streamifyResponse` no existe fuera de Lambda.
- El NSG solo abre 22, 80 y 443. PostgreSQL (5432) y Node (3000) quedan en loopback; `HOST=127.0.0.1` en la unidad systemd.
- nginx necesita `proxy_buffering off` en `/api/`, o el streaming SSE llega al móvil de golpe al final.
- **Las notificaciones push dependen de un timer de systemd**, `alivia-notify.timer` (cada 15 min, `Persistent=true`), que en AWS era EventBridge Scheduler. Es la única parte del sistema que no nace de una petición de un usuario: si el timer se rompe, nada lo nota salvo quien esperaba un recordatorio. Comprueba con `systemctl list-timers alivia-notify.timer`.
- **`npm run release:apk` tiene dos destinos.** Sin flags sube a S3 e invalida CloudFront (AWS). Con `--azure` escribe en `dist/releases/v<version>/` y solo actualiza `public/releases.json`. `--invalidate` junto con `--azure` se rechaza. En Azure el APK se prepara **después** de `npm run build`, porque el build borra `dist/` entero.
- **PENDIENTE:** la IP pública de Azure está en **dos** ficheros que deben coincidir: `src/utils/apiOrigins.ts` (`AZURE_IP`) y `android/app/src/main/res/xml/network_security_config.xml`. Si divergen, el APK compila pero no puede llamar a la API. `android/app/build.gradle` tiene un guardia que hace fallar `assembleRelease` mientras el placeholder siga ahí (deja pasar `assembleDebug`).

## Android y Azure: cleartext

`targetSdkVersion = 36` (>= 28) hace que Android **bloquee el HTTP en claro por defecto**. Como el backend de Azure se sirve en `http://<ip>` —una IP suelta no puede tener certificado TLS— sin una excepción la app no arranca contra el servidor: `IOException: Cleartext HTTP traffic to <ip> not permitted`.

La excepción está en `res/xml/network_security_config.xml`, y es **por dominio, no global**: `cleartextTrafficPermitted="false"` en `base-config` y `true` solo para localhost y la IP de la API. Poner `android:usesCleartextTraffic="true"` a pelo permitiría HTTP en claro hacia cualquier host, exponiendo el token de sesión y los datos de la persona usuaria ante un intermediario.

## Contexto seguro: web por IP vs APK

Web en `http://<ip>` pierde service worker (modo offline), push, instalación como PWA, geolocalización y `crypto.subtle`, porque todo eso exige contexto seguro. El **APK no sufre nada**: su WebView sirve el bundle desde `http://localhost`, que sí es contexto seguro.

Consecuencia práctica: la web servida por IP no es instalable ni envía push. Para arreglarlo hace falta dominio propio + TLS, y entonces `AZURE_ORIGIN` pasa a `https://` y se puede borrar el bloque de cleartext.

**La contraseña de PostgreSQL es distinta de la de SSH**, a propósito: si compartieran secreto, entrar en la base de datos daría también acceso por SSH.

## AWS: las 4 Lambdas (legacy, aún en el repo)

`npm run build:lambda` genera cuatro bundles de Lambda **más** `server/dist/` para la VM de Azure. Las cuatro Lambdas están separadas con una razón distinta cada una:

| Lambda | Bundle | Entorno | Por qué está separada |
|---|---|---|---|
| `alivia-api` | `dist/` | dentro del VPC | Habla con RDS. `api`, `alivia-alerts` |
| `alivia-tts` | `dist-tts/` | fuera del VPC | Salida a Bing/Google; en el VPC exigiría NAT Gateway (~$32/mes). |
| `alivia-ai` | `dist-ai/` | fuera del VPC | Salida a `api.groq.com`. Sin DB. |
| `alivia-alerts` | `dist-alerts/` | fuera del VPC | Salida a `graph.facebook.com`. |

Dos cosas que romperán el deploy si no se respetan, **tanto en AWS como en Azure**:

- **`external: ['pg', 'ws', 'web-push']`** en `scripts/build-lambda.mjs`. `web-push` es CommonJS y hace `require('crypto')`; si esbuild lo empaqueta en un bundle ESM, Node 22 revienta con `Dynamic require of crypto is not supported` y el proceso no arranca. Se resuelve en runtime porque el script escribe un `package.json` por bundle con las dependencias nativas y el deploy corre `npm install --omit=dev` dentro de cada `dist*` antes de empaquetar.
- **`db/` tiene que viajar junto al bundle** (`cpSync` de `db/` a cada `dist*/`). Sin ese directorio, `api/_db.ts` deja `FUNCTIONS_SQL` en `''` y las funciones SQL nunca se crean.

`scripts/build-lambda.mjs` genera un `package.json` por bundle con solo sus dependencias de runtime. TTS no lleva `pg`; `ai` y `alerts` no llevan ninguna (usan `fetch` nativo de Node 22). `server/dist/` lleva las tres, porque el proceso de la VM sirve TTS, IA y alertas junto a la API.

## Deploy: AWS (saliente) y Azure (actual)

Dos workflows conviven. **No borres `deploy-aws.yml` ni `infra/*.yaml` hasta que Azure esté verificado en producción.**

**`deploy-azure.yml`** es el actual. Push a `main` o `workflow_dispatch`; los PR solo ejecutan `npm run build:lambda` + `npm test`. OIDC con `azure/login` (`vars.AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_RESOURCE_GROUP`, `VM_HOST`, `VM_ADMIN_USERNAME`). Compila en el runner y copia por SSH, autorizando la clave del runner con `az vm user update`.

Al copiar `dist/` **no se borra lo que ya hay en el servidor**: el APK vive en `dist/releases/` y lo sube `npm run release:apk` a mano. Es el mismo motivo del `--exclude "releases/*` en el deploy de S3.

El backend se reinicia con `systemctl restart alivia-api` y el workflow verifica que `/api/auth/me` devuelva **401** (no 200, no 502). Un 401 sin token prueba la cadena entera: internet → NSG → nginx → Node → PostgreSQL.

**`deploy-aws.yml`** es el de AWS. OIDC con `secrets.AWS_ROLE_ARN`, región `us-east-1`; los PR ejecutan `sam validate` + `sam build` (`validate-infra`) y nunca despliegan. Front con `aws s3 sync dist/ ... --delete --exclude "releases/*"`.

Cache en ambos: `assets/` con `max-age=31536000,immutable`; `index.html`, `sw.js`, `manifest.webmanifest` y `releases.json` con `no-cache,must-revalidate`.

### Variables: tresbatis distintos

- **Build del frontend**: `VITE_*` se leen en tiempo de build. Hay que declararlos en `env:` del step o el bundle sale sin la clave VAPID y el service worker no puede suscribirse.
  - `VITE_API_URL`, `VITE_TTS_URL`, `VITE_VAPID_PUBLIC_KEY` → `vars`
- **Runtime de la Lambda**: `DATABASE_URL`, `OPENAI_API_KEY`, `GROQ_API_KEY` → Secrets Manager. El navegador nunca ve las claves de IA; habla con `/api/ai/*`.
- **`VITE_AI_DIRECT=1`** mete las claves **dentro** del bundle JS. Solo desarrollo local, nunca en un build publicado.

En web las llamadas a `/api/*` son relativas (mismo origen). En shells nativos no valen rutas relativas, así que `src/utils/apiBase.ts` pide el origen a `originFor()` de `src/utils/apiOrigins.ts`: `VITE_API_URL`/`VITE_TTS_URL` si existen, si no `AZURE_IP`, si no `SITE_ORIGIN`. La IP va antes del dominio a propósito porque es el estado real del despliegue y `alivia.lat` puede seguir sin resolver.

## Entorno nativo

`npm run sync:android` = `build` + `cap sync` + `post-sync.js`.
`npm run sync:ios` = `build:ios:web` (`--base=./ --outDir dist-ios --mode ios`) + `ios-sync.js`.

El build de iOS usa `--base=./` porque el WKWebView carga desde `file://`, y desactiva el service worker (`mode === 'ios'`). `injectRegister: false`: el registro es manual en `src/main.tsx` y omite los shells nativos.

Secretos de firma en `android/keystore/` y `android/keystore.properties`, ambos en `.gitignore`.

## Gotchas

**Node 22 en todos los workflows, nunca 24.** El `package-lock.json` solo puede satisfacer una versión de npm: con Node 24 (npm 11), `npm ci` falla con `Missing: lightningcss-* from lock file`. Local: usar 22 para no reproducirlo. (Node 24 funciona para `npm run build` y los tests; el fallo es de `npm ci` en CI.)

**Service worker: `globIgnores` está cargado de decisiones deliberadas.** Si añades un asset a `public/` y no precarga, alguien lo verá sin conexión; si lo precargas sin querer, engorda la primera visita. `releases.json` debe quedarse siempre en la red (su hash cambia en cada publicación del APK). `navigateFallbackDenylist` ya excluye `/api/`, `/landing`, `/descarga`, `/seo/`.

**`api/_db.ts` crea el schema al arrancar** (`ensureSchema` / `ensureFunctions`, idempotentes con `IF NOT EXISTS`). Las columnas nuevas van como `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` aparte del `CREATE`, porque `CREATE TABLE IF NOT EXISTS` no añade columnas a tablas existentes.

**CORS es `*`** en `api/_cors.ts`, a propósito: la app nativa consume la API desde otro origen.

**`notificationDispatchHandler`** lo llama el cron de EventBridge cada minuto con `CRON_SECRET`, no un usuario, y por eso no usa `getUserFromRequest`.

**`db/alivia-modelo-relacional-er.svg`** y `dist/`, `.git-rewrite/`, `work/` no son parte del build. El `.gitignore` deja fuera `.env.*` salvo `.env.example` y bloquea `infra/samconfig.toml` porque contiene `DatabasePassword` en claro.

## Antes de tocar infra

`infra/` (SAM) está acoplado a AWS; `infra/azure/` (Bicep) a Azure. Ninguno de los dos toca `api/`: los handlers no saben dónde corren, y por eso el backend tiene dos cableados sobre la misma lógica (`api/lambda/` y `api/server/`). La web y las shells nativos solo dependen de `VITE_*` y de `src/utils/apiOrigins.ts`.

La app trata datos de salud mental. Cambios a ciegas en auth, roles, cifrado o en lo que sale a internet tienen consecuencias reales: `npm test` en verde es el mínimo, no la prueba de que el cambio es seguro.

## Toolchain local (Android)

El build del APK necesita **dos** JDK, no uno:

- **JDK 21** (`JAVA_HOME`) para Gradle y los plugins de Capacitor. `@capacitor/local-notifications` fija `languageVersion=21` y el build falla con `Cannot find a Java installation ... matching: {languageVersion=21}` si no está.
- **Android SDK 36** (`compileSdkVersion`/`targetSdkVersion` en `android/variables.gradle`) más `platform-tools` y `build-tools;36.0.0`.

`android/local.properties` con `sdk.dir` no se versiona. El keystore (`android/keystore/`, `android/keystore.properties`) tampoco: sin él, `assembleRelease` produce `app-release-unsigned.apk`, que Android no instala.