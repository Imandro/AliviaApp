import { describe, expect, it } from 'vitest';
import { updateDownloadPage } from '../scripts/download-page.mjs';
import { readFileSync } from 'node:fs';

const release = { version: '1.2.1', bytes: 8100717, sizeLabel: '7,7 MB', url: '/releases/v1.2.1/ALIVIA-android.apk' };
const site = 'https://alivia.lat';

describe('Download page metadata generation', () => {
  it('is stable across repeated builds and contains exactly one valid JSON-LD block', () => {
    const source = readFileSync('public/descarga.html', 'utf8');
    const once = updateDownloadPage(source, release, site);
    expect(updateDownloadPage(once, release, site)).toBe(once);
    expect(once.match(/<\/head>/g)).toHaveLength(1);
    const blocks = [...once.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    expect(blocks).toHaveLength(1);
    expect(JSON.parse(blocks[0][1])).toMatchObject({
      softwareVersion: '1.2.1', publisher: { name: 'ALIVIA', url: `${site}/` },
    });
  });
  it('removes orphaned metadata before body without changing the actual body', () => {
    const body = '<body><button>Descargar APK</button><script>var keep = 1;</script></body></html>';
    const broken = `<html><head><title>ALIVIA v1.2.0</title></head>"softwareVersion":"1.2.1"</script></head>${body}`;
    const fixed = updateDownloadPage(broken, release, site);
    expect(fixed.slice(fixed.indexOf('<body>'))).toBe(body);
    expect(fixed.slice(fixed.indexOf('</head>') + 7, fixed.indexOf('<body>')).trim()).toBe('');
  });
});
