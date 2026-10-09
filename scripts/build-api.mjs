import { build } from 'esbuild';
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
await build({
  entryPoints: ['api/http/main.ts'], outfile: 'dist-api/server.js',
  bundle: true, platform: 'node', target: 'node22', format: 'esm',
  external: ['pg', 'ws', 'web-push'], sourcemap: false,
});
mkdirSync('dist-api/db', { recursive: true });
copyFileSync('db/functions.sql', 'dist-api/db/functions.sql');
writeFileSync('dist-api/package.json', JSON.stringify({ type: 'module' }));
console.log('Portable API built in dist-api');
