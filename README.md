<div align="center">

<img src=".github/assets/logo-banner.png" alt="ALIVIA — Tu espacio de calma" width="380">

### Refugio digital de bienestar mental para adolescentes y jóvenes

**Una sola base de código React. Tres experiencias nativas. Cero dependencia de la señal.**

<br>

[![CI](https://github.com/Imandro/AliviaApp/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Imandro/AliviaApp/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/Imandro/AliviaApp?style=flat-square&color=E9C86B)](https://github.com/Imandro/AliviaApp/releases/latest)
[![License](https://img.shields.io/github/license/Imandro/AliviaApp?style=flat-square&color=8CB08D)](LICENSE)
[![Web](https://img.shields.io/badge/web-alivia--tu--salud.vercel.app-2C533D?style=flat-square)](https://alivia-tu-salud.vercel.app)

![React](https://img.shields.io/badge/React_18-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript_5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_5-646CFF?style=flat-square&logo=vite&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor_8-119EFF?style=flat-square&logo=capacitor&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?style=flat-square&logo=postgresql&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-serverless-000000?style=flat-square&logo=vercel&logoColor=white)

**[Abrir la web](https://alivia-tu-salud.vercel.app)** ·
**[Descargar Android](https://github.com/Imandro/AliviaApp/releases/latest/download/ALIVIA-1.0.apk)** ·
**[Landing del proyecto](https://alivia-tu-salud.vercel.app/landing)** ·
**[Reportar un problema](https://github.com/Imandro/AliviaApp/issues)**

</div>

---

> [!IMPORTANT]
> **Si estás en crisis, esto no sustituye la ayuda profesional.**
> Usa el botón **SOS** dentro de la app para ver líneas de crisis gratuitas de tu país,
> o contacta a tu servicio local de emergencias. No estás solo.

---

## Por qué existe

**1 de cada 7** adolescentes entre 10 y 19 años vive con un trastorno mental diagnosticable, y cerca de la mitad nunca recibe atención (OMS). La ansiedad no espera a que haya turno disponible: aparece a las 2 a.m., antes de un examen, después de una pelea en casa.

ALIVIA pone herramientas de primera línea exactamente ahí — en el bolsillo, sin esperas, sin estigma y sin depender de que haya internet.

## Tres experiencias, un código

| Experiencia | Estado | Detalle |
|---|---|---|
| Web responsive | Producción | SPA instalable como PWA (manifest + service worker) |
| App Android nativa | v1.0 firmada | Capacitor 8: ícono adaptativo, splash screen y permisos propios |
| PWA instalada | iOS / Android | Al instalarse, el modo standalone redirige todo a la app |

## Características

### En el momento — calma inmediata

| Módulo | Descripción |
|---|---|
| **Respiración guiada** | Box 4·4·4·4, Relajación 4-7-8 y Coherente 5·5. Círculo animado y mezclador de sonido sintetizado en tiempo real con Web Audio API (ruido marrón, olas, ondas binaurales): nada pregrabado. |
| **Tierra 5-4-3-2-1** | Técnica sensorial guiada por voz para volver al presente. |
| **Tarjetas de crisis** | Contenido validado para pánico, ganas de consumir, conflicto familiar y autolesión. |
| **SOS** | Líneas de crisis gratuitas (MX · CO · AR · US), emergencias y contacto seguro configurable a un toque. |
| **Reset frío · Pausa somática · Surfear la urgencia** | Cuatro ejercicios de afrontamiento paso a paso. |

### Todos los días — construir bienestar

| Módulo | Descripción |
|---|---|
| **Burn Journal** | Diario terapéutico: escribe lo que te abruma y obsérvalo disolverse en partículas. |
| **Chequeo de bienestar** | Escala de estrés, ansiedad y depresión cada 5 días, con recomendaciones personalizadas. |
| **Planes y retos** | Metas por área de vida con racha de días consecutivos. |
| **Comunidad anónima** | Posts por temas y apoyo entre pares, sin perfiles públicos ni exposición. |
| **Juegos de regulación** | 4 minijuegos diseñados para bajar revoluciones (burbujas, memoria, secuencia, tierra). |

### Acompañamiento

| Módulo | Descripción |
|---|---|
| **VIA (chat IA)** | Compañero conversacional empático: pregunta *por qué* te sientes así antes de aconsejar y te lleva directo a la función correcta de la app. Entrada por voz con transcripción Whisper. |
| **Temas** | Calma Profunda (oscuro), Salvia Suave (claro) y monocromático, con transiciones suaves. |

## Arquitectura

```mermaid
flowchart LR
    subgraph Cliente["Cliente — Web PWA / App Android nativa"]
        UI["React 18 + TypeScript<br/>(mismo build de Vite)"]
        CACHE[("Caché local<br/>de lecturas")]
        OUTBOX[("Cola FIFO<br/>de escrituras")]
        UI <--> CACHE
        UI --> OUTBOX
    end

    subgraph Nube["Vercel"]
        API["API serverless /api/*<br/>sesiones scrypt · CORS"]
        TTS["Proxy TTS<br/>Edge WS → respaldo"]
    end

    DB[("Neon PostgreSQL")]

    UI -- "online" --> API
    OUTBOX -.->|"reconexión automática"| API
    UI -.-> TTS
    API --> DB
```

- **Un código, dos nativos:** el mismo bundle corre en navegador y dentro del contenedor Capacitor (`android/`), con icono adaptativo, splash, permiso de micrófono y firma release propia.
- **Backend serverless:** funciones Node en Vercel con `pg`, contraseñas **scrypt**, sesiones Bearer de 30 días y esquema autogestionado (`db/schema.sql` + `db/functions.sql`).
- **Tipografía y assets propios:** Quicksand variable + Lato auto-hospedadas; sin CDNs externos.

## Offline-first

La app no se apaga cuando se va la red. `src/utils/apiClient.ts` implementa:

```mermaid
sequenceDiagram
    participant U as Usuario
    participant A as App (local)
    participant S as Servidor /api/*

    U->>A: Registra ánimo / escribe post / edita plan
    alt hay conexión
        A->>S: Mutación inmediata
        S-->>A: 200 OK + caché actualizada
    else sin conexión
        A->>A: Guarda en dispositivo + encola (FIFO)
        Note over A: La UI responde al instante<br/>(actualización optimista)
    end
    A--)S: Al reconectar: reenvío en orden + revalidación silenciosa
    A-->>U: "Todo sincronizado"
```

1. **Lecturas con caché** — cada `GET` exitoso se persiste; sin red se sirve la última respuesta conocida.
2. **Escrituras encoladas** — las mutaciones fallidas por red entran a una cola FIFO persistente.
3. **Sincronización automática** — al reconectar (`online`, apertura de la app o intervalo de 30 s); errores 4xx se descartan, fallos de red pausan el reintento.
4. **Revalidación silenciosa** — tras sincronizar se refrescan las lecturas clave en segundo plano.
5. **UI honesta** — indicador discreto con cambios pendientes y confirmación visual.

## Rendimiento y calidad

| Métrica | Valor |
|---|---|
| Bundle web (gzip) | ~180 KB JS + 4.4 KB CSS |
| APK firmado | ~3.6 MB |
| Paridad web ↔ app | 100 % (mismo build) |
| Fuentes | Auto-hospedadas, 0 peticiones a CDNs |
| CI | Typecheck + build en cada push/PR |
| Dependencias runtime | React, React Router, Lucide, pg, Capacitor |

## Inicio rápido

**Requisitos:** Node.js 18+ y npm.

```bash
git clone https://github.com/Imandro/AliviaApp.git
cd AliviaApp
npm install
npm run dev          # servidor de desarrollo en Vite
```

Build de producción (typecheck + bundle): `npm run build` · Vista previa: `npm run preview`.

## App Android

La app nativa comparte el 100 % del código web. Requisitos: **JDK 21**, **Android SDK 36** (`android/local.properties` apunta al SDK) y las dependencias de Capacitor ya incluidas.

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android   # si aún no están
npm run sync:android        # build web + cap sync + limpieza de assets
cd android
./gradlew assembleDebug     # APK de prueba
./gradlew assembleRelease   # APK firmado (requiere keystore)
./gradlew bundleRelease     # AAB para Play Store
```

**Firma release:** crea `android/keystore.properties` (excluido de git):

```properties
storeFile=keystore/alivia-release.jks
storePassword=TU_CLAVE
keyAlias=alivia
keyPassword=TU_CLAVE
```

Artefactos en `android/app/build/outputs/`. Las descargas públicas se distribuyen
vía [GitHub Releases](https://github.com/Imandro/AliviaApp/releases/latest).

> `scripts/post-sync.js` elimina el APK descargable de los assets nativos tras cada
> `cap sync` para que el binario no se empaquete a sí mismo.

## Variables de entorno

| Variable | Ámbito | Descripción |
|---|---|---|
| `DATABASE_URL` | Servidor (Vercel) | Cadena de conexión a Neon PostgreSQL con SSL. |
| `VITE_GROQ_API_KEY` | Build cliente | Llave de Groq para VIA: chat, transcripción de voz y TTS alternativo. |

Nunca se commitean: `.env`, `.env.local`, `*.jks` y `keystore.properties` están en `.gitignore`.

## API

Todas las rutas responden cabeceras CORS compartidas (`api/_cors.ts`) para consumo desde la WebView nativa.

| Endpoint | Métodos | Descripción |
|---|---|---|
| `/api/auth/register` · `/login` · `/logout` | POST | Ciclo de sesión (scrypt + token Bearer, 30 días). |
| `/api/auth/me` · `/profile` | GET · PUT | Usuario actual / edición de perfil. |
| `/api/moods` | GET · POST | Historial de ánimo diario (1-5). |
| `/api/contacts` | GET · PUT · DELETE | Contacto seguro de emergencia. |
| `/api/activities` | GET · POST | Ejercicios completados y racha. |
| `/api/posts` · `/posts/like` | GET · POST · DELETE | Comunidad anónima por temas. |
| `/api/plans` | GET · POST · PUT · DELETE | Planes, metas y actividades. |
| `/api/assessments` | GET · POST | Chequeos de bienestar y registro de contacto en crisis. |
| `/api/tts` | GET | Síntesis de voz con doble motor (Edge WebSocket → respaldo). |

## Estructura del proyecto

```text
├── api/                  # Funciones serverless (Vercel + pg)
│   ├── _db.ts            #   Pool, esquema y funciones SQL
│   ├── _cors.ts          #   Cabeceras CORS compartidas
│   ├── tts.ts            #   Síntesis de voz (doble motor)
│   └── auth/             #   Registro, login, perfil, sesiones
├── db/                   # Esquema y funciones SQL de referencia
├── public/
│   ├── fonts/            # Tipografía propia (Quicksand variable + Lato)
│   └── landing.html      # Landing del proyecto (redirige a la app en modo PWA)
├── scripts/
│   └── post-sync.js      # Limpieza de assets tras cap sync
├── src/
│   ├── components/       # UI reutilizable (Header, Navigation, SyncToast…)
│   ├── views/            # Pantallas (Dashboard, Breathe, Chat, SOS, Radar…)
│   ├── games/            # Minijuegos de regulación emocional
│   └── utils/
│       ├── apiClient.ts  # Motor offline-first (caché + cola FIFO)
│       ├── auth.ts       # Sesión y perfil con respaldo local
│       ├── localDb.ts    # Datos con actualizaciones optimistas
│       ├── systemBars.ts # Tema de barras del sistema (Android 15+)
│       └── tts.ts        # Voz natural (Edge WS → proxy → SpeechSynthesis)
└── android/              # Proyecto nativo generado por Capacitor 8
    └── app/src/main/java/com/alivia/salud/MainActivity.java
```

## Despliegue

**Web + API (Vercel):**

1. Crea el proyecto en Vercel con framework **Vite**, o despliega por CLI: `npx vercel deploy --prod --yes`.
2. Configura `DATABASE_URL` en *Settings → Environment Variables*.
3. La app y la API `/api/*` se publican juntas (`vercel.json`). La landing vive en [`/landing`](https://alivia-tu-salud.vercel.app/landing).

**Play Store:** genera el AAB (`bundleRelease`) súbelo con la misma clave de firma de los releases anteriores.

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `invalid source release: 21` al compilar | Gradle usa un JDK < 21 | Apunta `JAVA_HOME` a un JDK 21 antes de invocar `gradlew`. |
| `Keystore file … not found` | Ruta relativa mal resuelta | Verifica que `storeFile` en `keystore.properties` sea relativa a `android/`. |
| La API responde CORS error desde la app | Despliegue sin `api/_cors.ts` | Asegúrate de desplegar la versión actual del backend. |
| PWA no muestra la landing instalada | Comportamiento esperado | En modo standalone la landing redirige a `/` por diseño. |
| Sin sonido en TTS dentro de WebView | Motor Edge bloqueado | El proxy `/api/tts` actúa como respaldo; revisa su despliegue. |

## Hoja de ruta

- [ ] Notificaciones locales de recordatorio de chequeo
- [ ] Exportación del historial personal (JSON/PDF)
- [ ] Modo acompañante: compartir progreso con persona de confianza
- [ ] Publicación en Google Play (AAB firmado)
- [ ] Build iOS vía Capacitor

## Contribuir

Las contribuciones de **contenido psicoeducativo, accesibilidad y traducciones** son especialmente bienvenidas.

```bash
git checkout -b feature/mi-funcion     # o fix/, docs/, content/
npm run build                          # typecheck + bundle antes de enviar
```

Convención de commits: `feat(área): …`, `fix(área): …`, `docs: …`, `chore: …` — claros, atómicos y en español.

## Seguridad y privacidad

- Contraseñas con **scrypt**; sesiones Bearer con expiración a 30 días.
- Secretos solo en variables de entorno; claves de firma excluidas del repositorio.
- Sin anuncios ni perfiles públicos: la comunidad es anónima y moderada por temas.
- Los datos personales se guardan primero en el dispositivo; la nube recibe lo mínimo para sincronizar.
- Contenido de crisis contrastado contra fuentes oficiales. Reporta imprecisiones abriendo un issue con etiqueta `content`.

### Recursos de crisis incluidos en la app

| País | Línea | Contacto |
|---|---|---|
| México | Línea de la Vida | 800 911 2000 |
| Colombia | Línea 106 | 106 |
| Argentina | Salud Mental Responde | 135 / 0800 345 1435 |
| EE. UU. | 988 Suicide & Crisis Lifeline | 988 |

> Verifica siempre el canal oficial vigente de tu país.

## Equipo

<div align="center">

**DataStorm**

Proyecto abierto construido con calma.
Si ALIVIA te sirve, adáptala a tu comunidad — para eso es libre.

[![GitHub](https://img.shields.io/badge/sigue_al_proyecto-AliviaApp-181717?style=flat-square&logo=github)](https://github.com/Imandro/AliviaApp)

</div>

## Licencia

[MIT](LICENSE) © Equipo DataStorm

<div align="center">
<sub>ALIVIA no sustituye la atención profesional. Si hay riesgo, contacta ayuda inmediata.</sub>
</div>
