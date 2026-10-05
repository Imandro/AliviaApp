import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
fs.writeFileSync('public/descarga.html', execFileSync('git', ['show', 'HEAD:public/descarga.html']));
const out = 'C:/Users/zayri/Documents/Codex/2026-10-04/li/outputs/Alivia_Livi_frontend';
for (const file of ['AGENTS.md', 'CHANGELOG.md', 'src/views/ChatView.tsx', 'src/components/LiviVoice.tsx', 'src/components/LiviVoice.css', 'work/vite-livi.config.mjs']) {
  fs.mkdirSync(path.dirname(path.join(out, file)), { recursive: true });
  fs.copyFileSync(file, path.join(out, file));
}
fs.writeFileSync(path.join(out, 'LEEME.md'), `# Livi: cambios de frontend

Repositorio: https://github.com/Imandro/AliviaApp
Rama local: livi-voz-animada. Sin commit, push ni despliegue.

Livi se anima como una pieza completa con poses originales alineadas y mezcladas sin separar partes. Al escuchar, respira, mira y asiente. Al pensar, cambia la expresión y hace una pausa antes de sonreír. Al hablar, mueve el pico y acompaña las frases con leves inclinaciones y pausas.

Escuchando: mirada comprensiva, parpadeo, doble asentimiento y aleteo breve. Pensando: la mirada busca respuesta, las alas se recogen y vuelve a abrirse con una sonrisa de comprensión. Hablando: el pico se mueve por frases y las alas acompañan el ritmo con pausas. Las piezas se mantienen solapadas en el cuello y usan la silueta de la mascota. La animación del pico acompaña el estado speaking; es visual, no una sincronización por fonemas o intensidad del audio. Las animaciones de Livi siguen visibles aunque la preferencia general de movimiento reducido las desactivaría.

No se modifica src/utils/tts.ts ni el backend. No se agrega voz o muestra de audio.

Vista local: http://127.0.0.1:8795/?livi-preview=1#/chat
Tocar Livi muestra pensando y hablando sin audio ni llamadas a la IA. X regresa al chat normal. La demostración solo está disponible en desarrollo.

Arranque: node node_modules/vite/bin/vite.js --config work/vite-livi.config.mjs
La configuración local dirige las solicitudes habituales de API a alivia.lat. No incluye credenciales.

Validación: compilación TypeScript y SEO/Vite/PWA aprobada. Los tres estados se comprobaron en la vista local.
`);
