# 🌿 ALIVIA - Tu Espacio de Calma

Una aplicación web de bienestar mental diseñada para adolescentes y jóvenes, con estética Apple premium, modo oscuro/claro y un enfoque en **privacidad total (100% local, sin servidor)**.

---

## ✨ Funcionalidades Principales

* 📊 **Registro de estado de ánimo:** Deslizador visual 1–5 con emojis, frases motivacionales y bitácora personal.
* 🫁 **Ejercicios de respiración guiada:** 3 modos (*Box 4-4-4-4*, *Relajación 4-7-8*, *Coherente 5-5*) con círculo animado y mezclador de sonido ambiente.
* 🔥 **Diario terapéutico (Burn Journal):** Escribe pensamientos abrumadores y míralos disolverse en partículas.
* 🧘 **Actividades de afrontamiento:** 4 ejercicios guiados paso a paso (*Pausa somática*, *Reset frío*, *Surfear la urgencia*, *Plan de 10 min*).
* 🖐️ **Técnica de conexión a tierra 5-4-3-2-1:** Ejercicio sensorial guiado para momentos de ansiedad.
* 🎴 **Tarjetas de crisis:** Información validada para ataques de pánico, ganas de consumir, conflicto familiar y autolesión/suicidio.
* 🆘 **Pantalla SOS:** Directorio de líneas de crisis gratuitas (MX, CO, AR, US) y contacto seguro local.
* 📈 **Progreso y racha:** Estadísticas de actividades completadas con racha de días consecutivos.
* 🌗 **Modo oscuro/claro:** Temas *"Calma Profunda"* y *"Salvia Suave"* con transiciones suaves.

---

## 🛠️ Tecnologías Utilizadas

* **React 18 + TypeScript** — Desarrollo de interfaz robusta y tipada.
* **Vite 5** — Entorno de desarrollo rápido y empaquetador eficiente.
* **React Router** — Navegación del cliente con soporte para *deep links*.
* **Lucide React** — Iconografía moderna y minimalista.
* **Web Audio API** — Síntesis de sonido ambiental local (ruido marrón, olas, ondas binaurales).
* **localStorage** — Persistencia de datos 100% local en el navegador para máxima privacidad.
* **PWA (Progressive Web App)** — Service worker y *manifest* para instalación en dispositivos móviles y de escritorio.
* **CSS puro** — Propiedades personalizadas (*design tokens*) para un diseño fluido de estilo Apple.

---

## 📋 Requisitos Previos

Asegúrate de contar con lo siguiente instalado en tu equipo:
* **Node.js:** Versión 18+
* **npm:** Gestor de paquetes
* **Git:** Para clonar el repositorio

---

## 🚀 Instalación y Configuración

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/Imandro/ALIVIA.git
   ```

2. **Navegar al directorio del proyecto:**
   ```bash
   cd ALIVIA
   ```

3. **Instalar dependencias:**
   ```bash
   npm install
   ```

4. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

---

## 💻 Scripts Disponibles

En el directorio del proyecto puedes ejecutar:

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo local con recarga rápida (*HMR*). |
| `npm run build` | Compila TypeScript y genera la versión optimizada para producción. |
| `npm run preview` | Permite visualizar localmente la versión compilada de producción. |

---

## 🔒 Privacidad

Toda la información se procesa y almacena exclusivamente en tu dispositivo mediante `localStorage`. Ningún dato de estado de ánimo, notas ni registros sale de tu navegador ni se envía a servidores externos.

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Consulta el archivo `LICENSE` para más detalles.
