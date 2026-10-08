/* Prueba real del bot de alertas SILAIS (AliviaApp).
   Usa el MISMO codigo de produccion (api/alerts.ts) compilado con esbuild.

   Uso:
     node scripts/alert-test.mjs --dry          # imprime lo que se enviaria
     node scripts/alert-test.mjs                # envia real al numero de prueba

   Credenciales: whatsapp-secret.local.json (raiz, gitignored) o env vars:
     WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, SILAIS_TEST_NUMBER
   Las pruebas NUNCA llegan al SILAIS: los mensajes [PRUEBA ...] se redirigen
   a SILAIS_TEST_NUMBER dentro de sendToSilais. */

import { build } from 'esbuild';
import { readFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dry = process.argv.includes('--dry');

// --to <numero>: sobreescribe el numero de prueba (nunca el SILAIS real).
const toIdx = process.argv.indexOf('--to');
const SILAIS_REAL = '50584132841';
let customTo = null;
if (toIdx !== -1) {
  customTo = (process.argv[toIdx + 1] ?? '').replace(/\D/g, '');
  if (!customTo) { console.error('--to requiere un numero'); process.exit(2); }
  if (customTo === SILAIS_REAL) { console.error('Las pruebas NUNCA se envian al SILAIS real; usa tu numero de prueba.'); process.exit(2); }
}

// Credenciales desde archivo local gitignored.
const secretPath = join(root, 'whatsapp-secret.local.json');
if (existsSync(secretPath)) {
  const cfg = JSON.parse(readFileSync(secretPath, 'utf8'));
  for (const k of ['WHATSAPP_TOKEN','WHATSAPP_PHONE_NUMBER_ID','SILAIS_TEST_NUMBER','WHATSAPP_TEMPLATE_NAME']) {
    if (cfg[k] && !process.env[k]) process.env[k] = String(cfg[k]);
  }
}
const token = (process.env.WHATSAPP_TOKEN ?? '').trim();
const phoneId = (process.env.WHATSAPP_PHONE_NUMBER_ID ?? '').trim();
let testNumber = customTo ?? (process.env.SILAIS_TEST_NUMBER ?? '').replace(/\D/g, '');

if (customTo) process.env.SILAIS_TEST_NUMBER = customTo;
else if (testNumber) process.env.SILAIS_TEST_NUMBER = testNumber;

// Compila el handler real de produccion ANTES de validar credenciales
// (para dry mode poder construir el mensaje sin credenciales).
const outfile = join(root, 'api', 'lambda', 'dist-alerts', 'alert-test-bundle.mjs');
mkdirSync(dirname(outfile), { recursive: true });
await build({
  bundle: true, platform: 'node', target: 'node22', format: 'esm',
  entryPoints: [join(root, 'api', 'alerts.ts')],
  outfile, minify: true, logLevel: 'silent',
});
const { buildAlertMessage, sendToSilais, PRUEBA_PREFIX } = await import(pathToFileURL(outfile).href);
rmSync(outfile, { force: true });

const real = buildAlertMessage({
  name: 'Prueba tecnica Alivia',
  alertType: 'Prueba del bot (no es emergencia)',
  department: 'Managua',
  municipality: 'Managua',
  note: 'Mensaje de prueba automatico de scripts/alert-test.mjs',
});
const message = [
  `${PRUEBA_PREFIX} ALIVIA - NO ES UNA EMERGENCIA]`,
  'Esta es una prueba tecnica del bot de alertas Alivia. NO requiere accion.',
  'Si lo recibiste, el envio a traves de WhatsApp Cloud API funciona.',
  '',
  real,
].join('\n');

if (!token || !phoneId) {
  if (dry) {
    console.log('=== MODO DRY (no se envia nada) ===');
    console.log('Credenciales: no configuradas (dry mode)');
    console.log('Destino de prueba:', testNumber ? '+' + testNumber : '(sin configurar)');
    console.log('Destino del SILAIS real: 50584132841 (nunca se usa en pruebas)');
    console.log('--- Mensaje (simulado) ---');
    console.log(message);
    process.exit(0);
  }
  console.error('Faltan credenciales: WHATSAPP_TOKEN y WHATSAPP_PHONE_NUMBER_ID (whatsapp-secret.local.json o env vars).');
  process.exit(2);
}
if (!dry && !testNumber) {
  console.error('Falta SILAIS_TEST_NUMBER (tu numero de prueba). Sin el, una prueba NO se envia para no alarmar al SILAIS.');
  process.exit(2);
}

if (dry) {
  console.log('=== MODO DRY (no se envia nada) ===');
  console.log('Token:', token.slice(0,6) + '...' + token.slice(-4));
  console.log('Phone ID:', phoneId);
  console.log('Destino de prueba:', testNumber ? '+' + testNumber : '(sin configurar)');
  console.log('Destino del SILAIS real: 50584132841 (nunca se usa en pruebas)');
  console.log('--- Mensaje ---');
  console.log(message);
  process.exit(0);
}

console.log('Enviando prueba a +' + testNumber + ' ...');
const out = await sendToSilais(message);
if (!out.ok) {
  console.error(`FALLO (${out.status}): ${out.detail}`);
  if (/Invalid parameter|131026|template/.test(out.detail)) {
    console.error('Pista: Meta exige plantilla aprobada para el primer mensaje. Aproba una plantilla (param {{1}}) y pon su nombre en WHATSAPP_TEMPLATE_NAME.');
  }
  process.exit(1);
}
console.log(`OK — wamid: ${out.waMessageId ?? '(sin id)'}`);