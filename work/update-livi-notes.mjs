import fs from 'node:fs';
const p='work/package-livi-frontend.mjs'; let s=fs.readFileSync(p,'utf8');
s=s.replace('Livi sustituye la esfera en el panel de voz existente. El fondo se integra con la página para eliminar el cuadro interior, los aros son más suaves y se mantienen encabezado y navegación. Usa los recursos originales de la mascota.','Livi se anima como una pieza completa con poses originales alineadas y mezcladas sin separar partes. Al escuchar, respira, mira y asiente. Al pensar, cambia la expresión y hace una pausa antes de sonreír. Al hablar, mueve el pico y acompaña las frases con leves inclinaciones y pausas.');
s=s.replace('gestos atentos y reactivos. Pensando: gestos visibles. Hablando: pico que abre y cierra durante la respuesta.', 'expresiones originales del personaje, movimientos de cuerpo con pausas y gestos diferenciados. El pico abre y cierra durante la respuesta.');
fs.writeFileSync(p,s);
