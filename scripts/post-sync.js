/* Elimina artefactos exclusivos de la web (APK descargable) de los assets
   nativos después de `cap sync`, para que el APK no se empaquete a sí mismo. */
import { unlinkSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const assetsPublic = join(dirname(fileURLToPath(import.meta.url)), '..', 'android', 'app', 'src', 'main', 'assets', 'public');
const apk = join(assetsPublic, 'ALIVIA-1.0.apk');

try {
  if (existsSync(apk)) {
    unlinkSync(apk);
    console.log('post-sync: ALIVIA-1.0.apk eliminado de assets nativos ✓');
  }
} catch (err) {
  console.warn('post-sync: no se pudo limpiar el APK:', err.message);
}
