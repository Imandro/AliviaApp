/**
 * Publica el APK de Android como asset de alivia.lat.
 *
 * Por que sirve el APK desde el propio servidor y no desde GitHub Releases: el
 * paquete servido desde el propio dominio es same-origin, asi que la pagina de
 * descarga puede leer el stream, mostrar una barra de progreso real y
 * verificar el SHA-256 en el navegador con WebCrypto. Con un salto a
 * github.com las tres cosas son imposibles sin descargar dos veces.
 *
 * Dos destinos, segun `--azure`:
 *
 *   (por defecto) AWS: sube a S3 e invalida CloudFront.
 *   --azure        VM de Azure: deja el APK en dist/releases/v<version>/, que es
 *                  justo lo que deploy-azure.yml copia al servidor.
 *
 * Uso:
 *   node scripts/release-apk.mjs <ruta-al-apk> [--version 1.2.0] [--publish] [--invalidate]
 *   node scripts/release-apk.mjs <ruta-al-apk> --version 1.2.1 --publish --azure
 *
 * Sin --publish solo escribe public/releases.json, que es el manifiesto que
 * leen la pagina de descarga y el landing para no repetir version, tamano ni
 * hash a mano.
 */

import { createHash } from 'crypto';
import { execFileSync } from 'child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const ACCOUNT_ID = process.env.AWS_ACCOUNT_ID || '283519660369';
const BUCKET = process.env.FRONTEND_BUCKET_NAME || `alivia-frontend-${ACCOUNT_ID}`;
const DIST_ID = process.env.CLOUDFRONT_DIST_ID || 'E1AJLHH9ROPSJF';
const REMOTE_KEY = 'releases/ALIVIA-android.apk';
const ASSET_NAME = 'ALIVIA-android.apk';

/**
 * El APK se versiona en su propia ruta, no en `latest`: un CDN con TTL largo
 * no debe servir un binario viejo por culpa de una URL estable. La pagina
 * apunta a la version concreta que declara el manifiesto.
 */
const versionedKey = version => `releases/v${version}/${ASSET_NAME}`;

const FLAGS = new Set(['publish', 'invalidate', 'azure']);
const VALUED = new Set(['version']);

const argv = process.argv.slice(2);
const positional = [];
let version;
let publish = false;
let invalidate = false;
let azure = false;

for (let i = 0; i < argv.length; i += 1) {
  const arg = argv[i];
  if (!arg.startsWith('--')) {
    positional.push(arg);
  } else if (VALUED.has(arg.slice(2))) {
    version = argv[i + 1];
    i += 1;
  } else if (FLAGS.has(arg.slice(2))) {
    if (arg === '--publish') publish = true;
    if (arg === '--invalidate') invalidate = true;
    if (arg === '--azure') azure = true;
  } else {
    console.error(`Opción desconocida: ${arg}`);
    process.exit(1);
  }
}

const apkPath = positional[0];

if (!apkPath) {
  console.error('Falta la ruta del APK.\n  node scripts/release-apk.mjs ruta.apk [--version 1.2.0] [--publish] [--invalidate] [--azure]');
  process.exit(1);
}

// --invalidate solo tiene sentido contra CloudFront. Aceptarlo con --azure lo
// haria fallar mas tarde, en mitad de la subida, cuando el APK ya esta escrito.
if (azure && invalidate) {
  console.error('--invalidate es de CloudFront y no aplica a la VM de Azure (nginx no cachea /releases/).');
  process.exit(1);
}

if (!existsSync(apkPath)) {
  console.error(`No existe el archivo: ${apkPath}`);
  process.exit(1);
}

// Un APK es un ZIP: empieza con la firma local "PK\x03\x04". Esto evita subir
// un HTML de error descarga a medias y publicarlo como si fuera la app.
const fd = readFileSync(apkPath);
if (fd[0] !== 0x50 || fd[1] !== 0x4b) {
  console.error('El archivo no parece un APK/ZIP (firma PK ausente). Revisa la descarga.');
  process.exit(1);
}

const bytes = fd.length;
const sha256 = createHash('sha256').update(fd).digest('hex');
const resolvedVersion = version || (await currentVersion()) || '0.0.0';

const mb = bytes / (1024 * 1024);
const sizeLabel = `${mb.toFixed(1).replace('.', ',')} MB`;

/** Lee la version de un APK ya subido, para no tener que pasarla a mano. */
async function currentVersion() {
  // En la VM de Azure no hay S3 que consultar: la version sale de la que ya hay
  // en public/releases.json, que es el mismo manifiesto que consume la pagina de
  // descarga. Preguntar a AWS exigiria tener credenciales para un destino que ya
  // no se usa.
  if (azure) {
    try {
      return JSON.parse(readFileSync(join(root, 'public', 'releases.json'), 'utf8')).version;
    } catch {
      return undefined;
    }
  }
  try {
    const out = execFileSync(
      'aws',
      ['s3api', 'head-object', '--bucket', BUCKET, '--key', REMOTE_KEY],
      { encoding: 'utf8' },
    );
    return JSON.parse(out).Metadata?.version;
  } catch {
    return undefined;
  }
}

const manifest = {
  version: resolvedVersion,
  asset: ASSET_NAME,
  bytes,
  sizeLabel,
  sha256,
  // Ruta same-origin: es la que permite la descarga con progreso y hash.
  url: `/${versionedKey(resolvedVersion)}`,
  minAndroid: '7.0',
  publishedAt: new Date().toISOString().slice(0, 10),
};

const publicDir = join(root, 'public');
mkdirSync(publicDir, { recursive: true });
writeFileSync(join(publicDir, 'releases.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`version    ${manifest.version}`);
console.log(`bytes      ${bytes} (${sizeLabel})`);
console.log(`sha256     ${sha256}`);
console.log(`manifiesto public/releases.json`);

if (!publish) {
  console.log('\nDry run. Añade --publish para subirlo al bucket.');
  process.exit(0);
}

const key = versionedKey(resolvedVersion);
const tmp = join(root, 'node_modules', '.cache', ASSET_NAME);
mkdirSync(dirname(tmp), { recursive: true });
copyFileSync(apkPath, tmp);

// --- Azure: el APK se queda en dist/, que es lo que copia el deploy ---------
if (azure) {
  // Se escribe en dist/releases/v<version>/ y no en la raiz de releases/ a
  // proposito: `dist/` se reconstruye en cada `npm run build`, asi que un APK
  // en la raiz se perderia al compilar. Ademas la URL lleva la version, que es
  // lo que evita que un CDN con TTL largo sirva un binario viejo por una URL
  // estable.
  //
  // El alias `releases/ALIVIA-android.apk` que se publica en AWS no se replica:
  // el manifiesto (releases.json) ya apunta a la ruta versionada, y esa es la
  // que usa la pagina de descarga.
  const dir = join(root, 'dist', 'releases', `v${resolvedVersion}`);
  mkdirSync(dir, { recursive: true });
  copyFileSync(apkPath, join(dir, ASSET_NAME));

  console.log(`\nescrito en dist/releases/v${resolvedVersion}/${ASSET_NAME}`);
  console.log('public/releases.json actualizado con el sha256 y el tamano.');
  console.log(
    '\nFalta subirlo a la VM: `npm run build` (reconstruye dist/) y despues push a main.\n' +
      'deploy-azure.yml copia dist/ sin borrar lo anterior, asi que el APK llega intacto.',
  );
  console.log(`\nlisto. ${bytes} bytes, sha256 ${sha256.slice(0, 16)}…`);
  process.exit(0);
}

// --- AWS: S3 + CloudFront ---------------------------------------------------
// max-age corto a proposito: la URL lleva la version, y asi una reemision
// rapida del binario se propaga en minutos en lugar de quedarse cacheada
// una semana. immutable solo seria correcto si la version no se reemitiera.
const cacheControl = 'public, max-age=3600, must-revalidate';

console.log(`\nsubiendo a s3://${BUCKET}/${key}`);
execFileSync(
  'aws',
  [
    's3',
    'cp',
    tmp,
    `s3://${BUCKET}/${key}`,
    '--content-type',
    'application/vnd.android.package-archive',
    '--content-disposition',
    `attachment; filename="${ASSET_NAME}"`,
    '--cache-control',
    cacheControl,
    '--metadata',
    `version=${manifest.version},sha256=${sha256},bytes=${bytes}`,
    '--only-show-errors',
  ],
  { stdio: 'inherit' },
);

// Mirror estable en `releases/ALIVIA-android.apk`. La CloudFront Function
// deja pasar cualquier ruta con punto, asi que ambas llegan a S3 sin tocar
// el stack. Se publica sin cache para que `latest` nunca sirva un binario
// viejo por el TTL de una version anterior.
console.log(`subiendo alias a s3://${BUCKET}/${REMOTE_KEY}`);
execFileSync(
  'aws',
  [
    's3',
    'cp',
    tmp,
    `s3://${BUCKET}/${REMOTE_KEY}`,
    '--content-type',
    'application/vnd.android.package-archive',
    '--content-disposition',
    `attachment; filename="${ASSET_NAME}"`,
    '--cache-control',
    'no-cache, must-revalidate',
    '--metadata',
    `version=${manifest.version},sha256=${sha256},bytes=${bytes}`,
    '--only-show-errors',
  ],
  { stdio: 'inherit' },
);

if (invalidate) {
  // Cada path va como argumento propio: execFileSync no pasa por shell, asi que
  // un unico string con espacios llega a la CLI como un solo path y CloudFront lo
  // rechaza con InvalidArgument.
  const paths = [`/${key}`, `/${REMOTE_KEY}`, '/releases.json'];
  console.log('\ninvalidando CloudFront');
  execFileSync(
    'aws',
    [
      'cloudfront',
      'create-invalidation',
      '--distribution-id',
      DIST_ID,
      '--paths',
      ...paths,
      '--query',
      'Invalidation.Id',
      '--output',
      'text',
    ],
    { stdio: 'inherit' },
  );
}

console.log(`\nlisto. ${bytes} bytes, sha256 ${sha256.slice(0, 16)}…`);
