import { build } from 'esbuild';
import { rmSync, mkdirSync, writeFileSync, readFileSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const apiDir = join(root, 'api', 'lambda');
const outDir = join(apiDir, 'dist');
const ttsOutDir = join(apiDir, 'dist-tts');
const aiOutDir = join(apiDir, 'dist-ai');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

rmSync(outDir, { recursive: true, force: true });
rmSync(ttsOutDir, { recursive: true, force: true });
rmSync(aiOutDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
mkdirSync(ttsOutDir, { recursive: true });
mkdirSync(aiOutDir, { recursive: true });

// `web-push` es CommonJS y usa `require('crypto')` por dentro. Si esbuild lo
// empaqueta dentro de un bundle ESM, al ejecutarlo en Node 22 revienta con
// "Dynamic require of crypto is not supported" y la Lambda entera no arranca.
// Por eso se declara external: se resuelve en tiempo de ejecucion con npm
// install desde el package.json que se genera mas abajo.
const shared = {
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  external: ['pg', 'ws', 'web-push'],
  minify: true,
  sourcemap: false,
};

// Lambda de API: dentro del VPC, habla con RDS.
await build({
  ...shared,
  entryPoints: [join(apiDir, 'handler.ts')],
  outfile: join(outDir, 'handler.js'),
});

// Lambda de TTS: FUERA del VPC para conservar salida a internet sin NAT Gateway.
await build({
  ...shared,
  entryPoints: [join(apiDir, 'tts-handler.ts')],
  outfile: join(ttsOutDir, 'handler.js'),
});

// Lambda de IA: tambien FUERA del VPC (necesita salir a api.groq.com) y sin DB.
// El directorio lo crean los rmSync/mkdirSync de arriba, junto a los otros dos.
await build({
  ...shared,
  entryPoints: [join(apiDir, 'ai-handler.ts')],
  outfile: join(aiOutDir, 'handler.js'),
});

// api/_db.ts lee db/functions.sql desde process.cwd() en tiempo de ejecucion,
// asi que el directorio db/ tiene que viajar dentro del paquete de Lambda.
cpSync(join(root, 'db'), join(outDir, 'db'), { recursive: true });

// SAM ejecuta `npm install` sobre este package.json, asi que las dependencias
// nativas de runtime se declaran aqui en vez de copiarse a mano.
function writeRuntimePackage(dir, name, deps) {
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify(
      {
        name,
        version: pkg.version,
        type: 'module',
        dependencies: deps,
      },
      null,
      2
    )
  );
}

// `web-push` va aqui porque va marcada como external arriba: SAM corre
// `npm install` sobre este package.json y laLambda la encuentra en node_modules.
writeRuntimePackage(outDir, 'alivia-api', {
  pg: pkg.dependencies.pg,
  ws: pkg.dependencies.ws,
  'web-push': pkg.dependencies['web-push'],
});

// La Lambda de TTS solo usa `ws`; no necesita `pg`.
writeRuntimePackage(ttsOutDir, 'alivia-tts', {
  ws: pkg.dependencies.ws,
});

// La Lambda de IA usa fetch nativo (Node 22), sin dependencias de runtime.
writeRuntimePackage(aiOutDir, 'alivia-ai', {});

console.log('Lambda build complete:', outDir);
console.log('TTS Lambda build complete:', ttsOutDir);
console.log('AI Lambda build complete:', aiOutDir);

