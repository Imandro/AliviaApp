<div align="center">

<img src=".github/assets/logo-banner.png" alt="ALIVIA — Tu espacio de calma" width="380">

### Refugio digital de bienestar mental para adolescentes y jóvenes

**Una sola base de código React. Web, Android e iOS. Cero dependencia de la señal.**

<br>

[![CI](https://github.com/Imandro/AliviaApp/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Imandro/AliviaApp/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/Imandro/AliviaApp?style=flat-square&color=E9C86B)](https://github.com/Imandro/AliviaApp/releases/latest)
[![License](https://img.shields.io/github/license/Imandro/AliviaApp?style=flat-square&color=8CB08D)](LICENSE)
[![Web](https://img.shields.io/badge/web-alivia.lat-2C533D?style=flat-square)](https://alivia.lat)

![React](https://img.shields.io/badge/React_18-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript_5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_5-646CFF?style=flat-square&logo=vite&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor_8-119EFF?style=flat-square&logo=capacitor&logoColor=white)
![Swift](https://img.shields.io/badge/Swift-WKWebView-F05138?style=flat-square&logo=swift&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-RDS-336791?style=flat-square&logo=postgresql&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-Lambda%20%2B%20S3%20%2B%20CloudFront%20%2B%20RDS-232F3E?style=flat-square&logo=amazon-aws&logoColor=white)

**[Abrir la web](https://d3gm2ziao5tkw0.cloudfront.net)** ·
**[Descargar Android](https://alivia.lat/descarga.html)** ·
**[Landing del proyecto](https://alivia.lat/landing.html)** ·
**[Reportar un problema](https://github.com/Imandro/AliviaApp/issues)**

</div>

---

> [!IMPORTANT]
> **Si estás en crisis, esto no sustituye la ayuda profesional.**
> Usa el botón **SOS** dentro de la app para ver líneas de crisis gratuitas de tu país,
> o contacta a tu servicio local de emergencias. No estás solo.

---

## Qué es ALIVIA

**ALIVIA** es una aplicación de bienestar mental para adolescentes y jóvenes. Ofrece herramientas de primera línea — ejercicios de respiración, diario terapéutico, chequeos de bienestar, chat con IA empática (Livi), biblioteca de guías, juegos de regulación emocional y botón SOS con líneas de crisis — **todo funcionando 100 % offline** y sincronizando cuando hay conexión. Una sola base de código React sirve Web (PWA), Android nativo (Capacitor) e iOS nativo (Swift/WKWebView).

## Qué resuelve

| Problema | Solución en ALIVIA |
|---|---|
| **Ansiedad y pánico en el momento** | Respiración guiada (Box 4·4·4·4, 4-7-8, coherente 5·5), técnica Tierra 5-4-3-2-1 por voz, 4 ejercicios de afrontamiento paso a paso. |
| **Falta de espacio para desahogarse** | *Burn Journal*: escribe y observa tus pensamientos disolverse en partículas; todo local, privado y exportable. |
| **No saber cómo estás realmente** | Chequeo de bienestar cada 5 días (estrés, ansiedad, depresión) + **Radar de Bienestar** con gráficas de tendencia y rachas. |
| **Soledad y falta de apoyo** | Chat **Livi** (IA que pregunta *por qué* antes de aconsejar), **Conecta con alguien** (plantillas para pedir ayuda), comunidad anónima por temas. |
| **Crisis sin saber a quién llamar** | Botón **SOS** con líneas gratuitas de 6 países centroamericanos, contacto de emergencia configurable, detección de riesgo por niveles. |
| **Falta de hábitos y motivación** | 8 minijuegos de regulación, **Planes y Retos** con metas y rachas, 20 recordatorios locales + push, biblioteca interactiva con quiz. |
| **Privacidad y control de datos** | Bloqueo biométrico + cortina de privacidad, exportación JSON + HTML imprimible, i18n es/en, datos guardados primero en el dispositivo. |

## Contexto: Hackathon Kronox 2026

ALIVIA nace como proyecto para competir en la **categoría aficionado del Hackathon Nicaragua 2026 Kronox**. El reto: crear una solución tecnológica de impacto social con recursos limitados. Elegimos salud mental juvenil porque es una necesidad real, silenciosa y desatendida en nuestra región.

## Por qué existe

**1 de cada 7** adolescentes entre 10 y 19 años vive con un trastorno mental diagnosticable, y cerca de la mitad nunca recibe atención (OMS). La ansiedad no espera a que haya turno disponible: aparece a las 2 a.m., antes de un examen, después de una pelea en casa.

ALIVIA pone herramientas de primera línea exactamente ahí — en el bolsillo, sin esperas, sin estigma y sin depender de que haya internet.

## Cuatro experiencias, un código

| Experiencia | Estado | Detalle |
|---|---|---|
| Web responsive | Producción ([alivia.lat](https://alivia.lat)) | SPA instalable como PWA: manifest + precache completo con Workbox |
| App Android nativa | APK en [alivia.lat/releases](https://alivia.lat/releases.json) y GitHub Releases · AAB listo para Play | Capacitor 8: ícono adaptativo, splash screen, permisos y firma propios |
| App iOS nativa | IPA ad-hoc / TestFlight | Shell Swift (WKWebView) propio con puente nativo: biometría, hápticos, notificaciones, cortina de privacidad |
| PWA instalada | iOS / Android | Al instalarse, el modo standalone redirige todo a la app |

El mismo bundle de Vite corre en las cuatro: no hay código duplicado ni pantallas que se porten a medias.

---

## Stack Tecnológico

| Capa | Tecnologías |
|---|---|
| **Frontend** | React 18, TypeScript 5.6, Vite 5, React Router, Lucide icons |
| **Nativo Android** | Capacitor 8, Gradle 8, JDK 21, Android SDK 36 |
| **Nativo iOS** | Swift, WKWebView, XcodeGen (project.yml) |
| **Backend** | AWS Lambda (Node.js), PostgreSQL 16 (RDS), pg driver |
| **Infraestructura** | CloudFormation/SAM (4 stacks), CloudFront, S3, EventBridge, Secrets Manager |
| **IA / Voz** | OpenAI (gpt-4.1-mini), Groq (Whisper), ElevenLabs (TTS), Edge TTS, Google TTS |
| **Testing / Calidad** | Vitest (141 tests), TypeScript strict, ESLint + Prettier |

---

## Modelo Entidad-Relación (BD Relacional - 3FN)

El esquema está normalizado hasta la **Tercera Forma Normal (3FN)**, superando el requisito de 2FN. Todas las tablas tienen clave primaria, no hay dependencias parciales ni transitivas, y las relaciones se modelan con claves foráneas explícitas.

```mermaid
erDiagram
    ROLES ||--o{ USERS : "catálogo (FK)"
    USERS ||--o{ SESSIONS : "1:N"
    USERS ||--o{ ASSESSMENTS : "1:N"
    USERS ||--o{ MOOD_ENTRIES : "1:N (por fecha)"
    USERS ||--|| EMERGENCY_CONTACT : "1:1"
    USERS ||--o{ COMPLETED_ACTIVITIES : "1:N"
    USERS ||--o{ COMMUNITY_POSTS : "1:N (author)"
    USERS ||--o{ PLANS : "1:N"
    USERS ||--|| NOTIFICATION_PREFERENCES : "1:1"
    USERS ||--o{ PUSH_SUBSCRIPTIONS : "1:N"
    USERS ||--o{ CRISIS_CONTACT_LOG : "1:N"
    PLANS ||--o{ PLAN_GOALS : "1:N"
    PLANS ||--o{ PLAN_ACTIVITIES : "1:N"
    USERS }o--o{ AUDIT_LOG : "actor (FK opcional)"

    ROLES { TEXT code PK, TEXT name, TEXT description, TIMESTAMPTZ created_at }
    USERS { UUID id PK, TEXT username UK, TEXT email UK, TEXT phone UK, TEXT name, TEXT password_hash, TEXT role FK, BOOLEAN is_active, TEXT[] problems, TEXT[] situations, TEXT[] strategies, TEXT trusted_person, TEXT trusted_phone, BOOLEAN wants_contact, TEXT[] changes, TEXT goals_text, BOOLEAN onboarding_done, TIMESTAMPTZ created_at, TIMESTAMPTZ updated_at }
    SESSIONS { TEXT token PK, UUID user_id FK, TIMESTAMPTZ created_at, TIMESTAMPTZ expires_at }
    MOOD_ENTRIES { DATE date PK, INTEGER score, TEXT note }
    EMERGENCY_CONTACT { INTEGER id PK (CHECK=1), TEXT name, TEXT phone }
    COMPLETED_ACTIVITIES { TEXT id, TEXT title, TIMESTAMPTZ completed_at, DATE date, PK (id, date) }
    COMMUNITY_POSTS { SERIAL id PK, TEXT author, TEXT content, TEXT topic, INTEGER likes, TIMESTAMPTZ created_at }
    PLANS { SERIAL id PK, TEXT title, TEXT area, TIMESTAMPTZ created_at }
    PLAN_GOALS { SERIAL id PK, INTEGER plan_id FK, TEXT title, BOOLEAN done, TIMESTAMPTZ created_at }
    PLAN_ACTIVITIES { SERIAL id PK, INTEGER plan_id FK, TEXT title, TEXT duration, BOOLEAN done, TIMESTAMPTZ created_at }
    NOTIFICATION_PREFERENCES { UUID user_id PK FK, JSONB settings, TIMESTAMPTZ updated_at }
    PUSH_SUBSCRIPTIONS { BIGSERIAL id PK, UUID user_id FK, TEXT endpoint UK, JSONB subscription, TIMESTAMPTZ created_at, TIMESTAMPTZ updated_at }
    ASSESSMENTS { SERIAL id PK, UUID user_id FK, TEXT type, INTEGER stress, INTEGER anxiety, INTEGER depression, TEXT level, BOOLEAN crisis, TEXT[] recommendations, TEXT ai_advice, TIMESTAMPTZ created_at }
    CRISIS_CONTACT_LOG { SERIAL id PK, UUID user_id FK, INTEGER assessment_id FK, TEXT channel, TEXT detail, TIMESTAMPTZ created_at }
    AUDIT_LOG { BIGSERIAL id PK, UUID actor_id FK, TEXT actor_role, TEXT action, TEXT entity, TEXT entity_id, JSONB detail, TIMESTAMPTZ created_at }
```

> **Notas de normalización:**  
> - **1FN:** Atributos atómicos (arrays `TEXT[]` son nativos de PostgreSQL).  
> - **2FN:** Sin dependencias parciales — claves compuestas dependen totalmente de su PK.  
> - **3FN:** Sin dependencias transitivas — `users.role` apunta a catálogo `roles` (FK), no a otra columna no-clave.  
> - **Integridad referencial:** FK con `ON DELETE CASCADE`/`SET NULL`; `roles` es catálogo cerrado.

---

## Arquitectura (Resumen)

```
Cliente (Web PWA / Android / iOS)          AWS Cloud
┌─────────────────────────────────┐        ┌─────────────────────────┐
│ React 18 + TypeScript (Vite)    │        │ CloudFront + Lambda     │
│  ├── Caché local (lecturas)     │◄──────►│  ├── alivia-api (VPC)   │
│  └── Cola FIFO (escrituras)     │        │  ├── alivia-ai (SSE)    │
└─────────────────────────────────┘        │  ├── alivia-tts (voz)   │
                                           │  └── EventBridge (cron) │
                                           └───────────┬─────────────┘
                                                       ▼
                                              ┌─────────────────┐
                                              │ RDS PostgreSQL  │
                                              │    (esquema)    │
                                              └─────────────────┘
```

- **Un código, tres nativos**: mismo bundle en navegador, Capacitor (Android) y Swift (iOS).
- **Backend serverless**: Lambdas Node con `pg`, contraseñas **scrypt**, sesiones Bearer 30 días.
- **Seguridad IA**: rate limit por IP, temperaturas acotadas, `system` message forzado.
- **Offline-first**: lecturas con caché, escrituras encoladas (FIFO), sincronización automática al reconectar.

---

## Interfaces y Desarrollo (100%)

22 pantallas totalmente navegables y funcionales:

| Categoría | Vistas |
|---|---|
| **Inmediatas** | Dashboard, Respiración (Box, 4-7-8, Coherente), Tierra 5-4-3-2-1, Tarjetas de crisis, SOS, Afrontamiento |
| **Diarias** | Burn Journal, Chequeo bienestar, Radar bienestar, Planes y retos, Comunidad anónima, 8 Juegos sensoriales |
| **Acompañamiento** | Chat Livi (IA + voz), Biblioteca inteligente, Conecta con alguien, Alertas MINSA-SILAIS, Recordatorios, Onboarding |
| **Privacidad** | Bloqueo biométrico, Exportar datos (JSON/HTML), Temas, Idioma |
| **Admin** | Panel administración (usuarios, bitácora, métricas) — gated por roles |

Todas las vistas tienen formularios funcionales, navegación bottom-bar, y funcionan offline.

---

## Inicio Rápido

**Requisitos:** Node.js 18+ y npm.

```bash
git clone https://github.com/Imandro/AliviaApp.git
cd AliviaApp
npm install
npm run dev          # http://localhost:5173 (Vite + HMR)
npm test             # 141 tests Vitest
npm run build        # typecheck + bundle producción
npm run preview      # vista previa del build
```

### Android
```bash
npm run sync:android  # build web + cap sync
cd android
./gradlew assembleDebug     # APK prueba
./gradlew assembleRelease   # APK firmado (requiere keystore)
./gradlew bundleRelease     # AAB para Play Store
```

### iOS
```bash
npm run sync:ios      # build web iOS + copia a ios/Web
cd ios && xcodegen    # genera Alivia.xcodeproj
open Alivia.xcodeproj # compila y firma en Xcode
```

---

## Testing y Calidad

| Comando | Qué hace |
|---|---|
| `npm test` | 141 tests Vitest (roles, offline, crisis, TTS, IA, export, auth, RBAC) |
| `npm run typecheck` | TypeScript strict mode — cero `any` |
| `npm run lint` | ESLint + Prettier — commits convencionales, imports ordenados |
| `npm run build` | Vite: typecheck + minify + tree-shaking + hash assets |

---

## API (Endpoints Principales)

| Endpoint | Métodos | Descripción |
|---|---|---|
| `/api/auth/register · /login · /logout` | POST | Ciclo de sesión (scrypt + Bearer 30d) |
| `/api/auth/me · /profile` | GET · PUT | Usuario actual / editar perfil |
| `/api/moods` | GET · POST | Historial de ánimo (1-5) |
| `/api/contacts` | GET · PUT · DELETE | Contacto de emergencia |
| `/api/activities` | GET · POST | Ejercicios completados y racha |
| `/api/posts · /posts/like` | GET · POST · DELETE | Comunidad anónima por temas |
| `/api/plans` | GET · POST · PUT · DELETE | Planes, metas, actividades |
| `/api/assessments` | GET · POST | Chequeos bienestar + contacto crisis |
| `/api/notifications/*` | GET · POST · PUT | Preferencias, suscripciones push, dispatch |
| `/api/tts` | GET | Síntesis voz (ElevenLabs → Edge → Google) |
| `/api/ai/chat` | POST | Proxy IA Livi (SSE streaming) |
| `/api/ai/transcribe` | POST | Transcripción voz (Whisper) |
| `/api/admin/users` | GET · PATCH | Gestión cuentas (rol **admin**) |
| `/api/admin/audit` | GET | Bitácora acciones (rol **admin/auditor**) |
| `/api/admin/stats` | GET | Métricas agregadas (rol **admin/auditor**) |

---

## Seguridad y Roles (100%)

Tres roles definidos en BD (`roles` catálogo) y código (`api/auth/_roles.ts`, `src/utils/roles.ts`):

| Rol | Permisos | Restricciones |
|---|---|---|
| **usuario** (default) | `app.use` — usar app con sus datos | No ve panel admin, no toca cuentas ajenas |
| **admin** | `app.use`, `users.manage`, `stats.view`, `audit.read` | No puede cambiarse su propio rol ni desactivarse |
| **auditor** | `app.use`, `stats.view`, `audit.read` | Solo lectura — nunca muta datos |

**Cómo se garantiza el 100%:**
- **Matriz de permisos** (no `if role === 'admin'` sueltos): handlers usan `requirePermission()` → 401 sin sesión, 403 sin permiso.
- **Defensa en profundidad**: BD re-valida en `fn_admin_update_user`; ni bug ni `UPDATE` directo escalan privilegios.
- **Auditoría transaccional**: cambios de rol/estado escriben en `audit_log` en la misma transacción (`fn_log_audit`).
- **Desactivar = cerrar sesión**: borra sesiones y token deja de resolver; login distingue 401 (credenciales) vs 403 (cuenta desactivada).
- **Sin auto-escalada**: registro nunca acepta `role` del cliente; toda cuenta nace `usuario`.

---

## Estructura del Proyecto

```text
├── api/                  # Lambdas serverless (AWS + pg)
│   ├── _db.ts            # Pool, esquema, funciones SQL
│   ├── auth/             # Registro, login, sesiones, roles
│   ├── admin/            # Panel: usuarios, bitácora, métricas
│   ├── notifications/    # Recordatorios, push, cron dispatch
│   ├── tts.ts            # Síntesis voz (triple motor)
│   └── ai.ts             # Proxy IA (failover, rate limit, SSE)
├── db/                   # schema.sql + functions.sql (referencia)
├── infra/                # CloudFormation/SAM: net, db, app, web
├── ios/                  # Shell Swift (WKWebView) + XcodeGen
├── public/               # fonts, landing.html, descarga.html
├── scripts/              # build-lambda, ios-sync, post-sync
├── .github/workflows/    # CI, deploy-aws (OIDC), ios-build
├── src/
│   ├── components/       # UI reutilizable (Header, Nav, SyncToast, AppLock…)
│   ├── views/            # 22 pantallas (Dashboard, Breathe, Chat, SOS, Radar…)
│   ├── games/            # 8 juegos sensoriales sin meta
│   ├── i18n.ts           # Diccionarios es/en
│   └── utils/            # apiClient, aiProvider, crisisSafety, exportData, appLock, auth…
└── android/              # Capacitor 8 generado
```

---

## Control de Versiones

Evidencia en GitHub del flujo completo previo al evento:

| Comando | Evidencia |
|---|---|
| `git commit` | [Historial legible](https://github.com/Imandro/AliviaApp/commits/main) — convencionales, atómicos, en español |
| `git push` | Push a `origin/main` tras cada PR mergeado (ej. PR #31, #30) |
| `git pull --rebase` | Rebase automático antes de integrar remotos (`reflog` lo confirma) |
| `git merge` | Merge de PRs vía GitHub (ej. `Merge pull request #31...`) |

**Workflow:** Rama feature → commits atómicos → PR → review → merge (squash/rebase) → push a main → deploy auto (GitHub Actions OIDC). Sin commits directos a `main`.

---

## Ejecución y Demostración

El sistema se ejecuta localmente sin errores:

```bash
git clone https://github.com/Imandro/AliviaApp.git
cd AliviaApp
npm install
npm run dev          # desarrollo en http://localhost:5173
npm test             # 141 tests pasan
npm run build        # build producción
npm run preview      # vista previa build
```

**Evidencia de operatividad:** [Video de navegación completa](https://github.com/Imandro/AliviaApp/wiki/Demo) — recorre Dashboard, Respiración, Burn Journal, Chequeo, Radar, Chat Livi, SOS, Biblioteca, Planes, Comunidad, Juegos, Admin (roles), Perfil, Onboarding, offline-first sync, biometría, exportación JSON/HTML.

---

## Despliegue (AWS)

```bash
# 1. Red
aws cloudformation deploy --template-file infra/net.yaml --stack-name alivia-net

# 2. Base de datos
aws cloudformation deploy --template-file infra/database.yaml --stack-name alivia-db \
  --parameter-overrides DatabasePassword=<password>

# 3. Lambdas (api, ai, tts) + EventBridge cron
npm run build:lambda
sam build --template-file infra/app.yaml --build-dir .aws-sam/build-app
sam deploy --template-file .aws-sam/build-app/template.yaml --stack-name alivia-app --region us-east-1 \
  --parameter-overrides DatabasePassword=<password> GitHubOwner=<owner> GitHubRepo=<repo> \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM --resolve-s3

# 4. Web (S3 + CloudFront)
aws cloudformation deploy --template-file infra/web.yaml --stack-name alivia-web
```

En `main` el workflow **Deploy to AWS** (`.github/workflows/deploy-aws.yml`) hace todo vía OIDC (`AWS_ROLE_ARN`), sin claves AWS en el repo.

---

## Variables de Entorno (Resumen)

| Variable | Dónde | Para qué |
|---|---|---|
| `DATABASE_URL` | Lambda `alivia-api` | Conexión RDS PostgreSQL |
| `OPENAI_API_KEY` | Lambda `alivia-ai` | Chat Livi (Secrets Manager) |
| `GROQ_API_KEY` | Lambda `alivia-ai` | Whisper voz (Secrets Manager) |
| `ELEVENLABS_API_KEY` | Lambda `alivia-tts` | Voz Livi (Secrets Manager) |
| `CRON_SECRET · VAPID_*` | Lambda `alivia-api` | Push web + cron dispatch |
| `VITE_API_URL · VITE_TTS_URL` | Build nativo iOS/Android | Orígenes absolutos para shells nativos |

**Nunca se commitean:** `.env`, `.env.local`, `*.jks`, `keystore.properties` (en `.gitignore`).

---

## Seguridad y Privacidad

- Contraseñas **scrypt**; sesiones Bearer 30 días.
- Secretos solo en variables de entorno y Secrets Manager; **ninguna clave de proveedor llega al bundle** (cliente usa `/api/ai/*` y `/api/tts`).
- Rate limit por IP, temperaturas acotadas, `system` message forzado en proxy IA.
- Sin anuncios ni perfiles públicos: comunidad anónima moderada por temas.
- Datos personales **primero en dispositivo**; nube recibe lo mínimo para sincronizar.
- Bloqueo biométrico + cortina de privacidad opcionales; exportación total en cualquier momento.

### Qué sale del dispositivo

- **Chat Livi** → viaja a OpenAI (proveedor externo) para contexto; mensajes de riesgo se marcan antes de enviar.
- **Todo lo demás** (ánimo, diario, planes, contactos, posts) → se guarda en dispositivo y solo sincroniza lo que el usuario registra.
- **Voz** → transcripción en Groq (`whisper-large-v3-turbo`), no se conserva en servicios propios.
- **Conversaciones** → guardadas en dispositivo (`alivia-chat-v1`), nunca en servidor.

---

## Equipo: DataStorm

**DataStorm** — Estudiantes de la **UNAN León** (Universidad Nacional Autónoma de Nicaragua, León), **Centro Universitario Regional (CUR) Somoto**.

| Integrante | Rol | Redes |
|---|---|---|
| **Zayri Azriel Wilson Sanchez** | Líder y diseñador | [@zayriaz](https://instagram.com/zayriaz) · [GitHub](https://github.com/ZAyriaz28) |
| **Mario Alejandro Ruiz Alvarez** | Comunicador y desarrollador | [@_imandro](https://instagram.com/_imandro) · [TikTok](https://tiktok.com/@_imandro) · [Web](https://_imandro.dev) |
| **Freddy Jonathan Rivera Reyes** | Desarrollador Frontend | [@dy.jona_g](https://instagram.com/dy.jona_g) · [GitHub](https://github.com/Jonax17) |
| **Erika Massiel Padilla Davila** | Marketing y creadora visual | [@___MASI_M](https://instagram.com/___MASI_M) |
| **Pablo Antonio Sanchez Espinoza** | Supervisor marketing y editor | [@sanchez_pab](https://instagram.com/sanchez_pab) |

Construimos ALIVIA con calma, código limpio y foco en el usuario real: adolescentes y jóvenes de Nicaragua y Centroamérica que necesitan herramientas de salud mental accesibles, privadas y que funcionen sin internet.

> **Proyecto abierto.** Si ALIVIA te sirve, adáptala a tu comunidad — para eso es libre.

[![GitHub](https://img.shields.io/badge/sigue_al_proyecto-AliviaApp-181717?style=flat-square&logo=github)](https://github.com/Imandro/AliviaApp)

---

## Licencia

[MIT](LICENSE) © Equipo DataStorm

<div align="center">
<sub>ALIVIA no sustituye la atención profesional. Si hay riesgo, contacta ayuda inmediata.</sub>
</div>