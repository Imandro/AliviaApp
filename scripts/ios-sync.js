/* Copia dist-ios/ (build de Vite con base=./ y VITE_IOS_SHELL=1) a ios/Web/
   para que el proyecto XcodeGen lo incluya como folder reference en el bundle. */
import { cpSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, '..', 'dist-ios');
const dest = join(__dirname, '..', 'ios', 'Web');

if (!existsSync(src)) {
  console.error('ios-sync: dist-ios/ no existe. Ejecuta primero: npm run build:ios:web');
  process.exit(1);
}

if (existsSync(dest)) {
  rmSync(dest, { recursive: true });
}

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`ios-sync: dist-ios/ → ios/Web/ copiado (${dest})`);
