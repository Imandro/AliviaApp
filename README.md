# ALIVIA - Tu Espacio de Calma

Una aplicación web de bienestar mental diseñada para adolescentes y jóvenes, con estética Apple premium, modo oscuro/claro y datos guardados en la nube (Neon PostgreSQL vía API serverless).

## Funcionalidades

- **Registro de estado de ánimo** — Deslizador visual 1-5 con emojis, frases y bitácora personal (guardado en Neon)
- **Ejercicios de respiración guiada** — 3 modos (Box 4-4-4-4, Relajación 4-7-8, Coherente 5-5) con círculo animado y mezclador de sonido
- **Diario terapéutico (Burn Journal)** — Escribe pensamientos abrumadores y míralos disolverse en partículas
- **Actividades de afrontamiento** — 4 ejercicios guiados paso a paso (Pausa somática, Reset frío, Surfear la urgencia, Plan de 10 min) con estadísticas y racha guardadas en Neon
- **Técnica de conexión a tierra 5-4-3-2-1** — Ejercicio sensorial guiado
- **Tarjetas de crisis** — Información validada para ataques de pánico, ganas de consumir, conflicto familiar y autolesión/suicidio
- **Pantalla SOS** — Directorio de líneas de crisis gratuitas (MX, CO, AR, US) y contacto seguro (guardado en Neon)
- **Progreso y racha** — Estadísticas de actividades completadas con racha de días consecutivos
- **Modo oscuro/claro** — Tema "Calma Profunda" y "Salvia Suave" con transiciones suaves

## Tecnologías

- **React 18** + **TypeScript**
- **Vite 5** (build tool)
- **React Router** (navegación con deep links)
- **Lucide React** (iconografía)
- **Web Audio API** (síntesis de sonido: ruido marrón, olas, ondas binaurales)
- **Neon PostgreSQL** (base de datos en la nube)
- **Vercel Serverless Functions** (API `/api/*` con `pg`)
- **PWA** (service worker + manifest para instalación)
- **CSS** puro con propiedades personalizadas (design tokens)

## Scripts

```bash
npm run dev      # Inicia servidor de desarrollo
npm run build    # Compila TypeScript + Vite build
npm run preview  # Vista previa del build de producción
```

## Configuración de la base de datos (Neon)

1. Copia el archivo `.env` con tu `DATABASE_URL` de Neon (nunca se sube a git).
2. Las tablas (`mood_entries`, `emergency_contact`, `completed_activities`) se crean automáticamente al primer uso. El esquema de referencia está en `db/schema.sql`.

## Despliegue en Vercel

1. Sube el repositorio a GitHub.
2. En Vercel: **New Project** → importa el repo → framework **Vite**.
3. Agrega la variable de entorno `DATABASE_URL` en **Settings → Environment Variables**.
4. Deploy. La app y la API `/api/*` se despliegan juntas (config en `vercel.json`).

## Requisitos

- Node.js 18+
- npm

## Instalación

```bash
npm install
npm run dev
```

## Licencia

MIT
