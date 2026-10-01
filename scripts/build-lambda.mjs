import { build } from 'esbuild';
import { rmSync, mkdirSync, writeFileSync, readFileSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const apiDir = join(root, 'api', 'lambda');
const outDir = join(apiDir, 'dist');
const ttsOutDir = join(apiDir, 'dist-tts');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

rmSync(outDir, { recursive: true, force: true });
rmSync(ttsOutDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
mkdirSync(ttsOutDir, { recursive: true });

const shared = {
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  external: ['pg', 'ws'],
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

writeRuntimePackage(outDir, 'alivia-api', {
  pg: pkg.dependencies.pg,
  ws: pkg.dependencies.ws,
});

// La Lambda de TTS solo usa `ws`; no necesita `pg`.
writeRuntimePackage(ttsOutDir, 'alivia-tts', {
  ws: pkg.dependencies.ws,
});

console.log('Lambda build complete:', outDir);
console.log('TTS Lambda build complete:', ttsOutDir);

