import { describe, it, expect, vi, beforeEach } from 'vitest';

// El comportamiento depende de isNativeShell, que se evalua al importar.
const nativeMock = { value: false };
vi.mock('./nativeShell', () => ({
  get isNativeShell() {
    return nativeMock.value;
  },
}));

const CLOUDFRONT = 'https://d3gm2ziao5tkw0.cloudfront.net';

async function load(env: Record<string, unknown>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) {
    vi.stubEnv(k, v as string);
  }
  return import('./apiBase');
}

describe('apiBase segun el shell', () => {
  beforeEach(() => {
    nativeMock.value = false;
    vi.unstubAllEnvs();
  });

  it('en web usa rutas relativas (mismo origen que CloudFront)', async () => {
    const mod = await load({});
    expect(mod.API_BASE).toBe('');
    expect(mod.TTS_ORIGIN).toBe('');
  });

  it('en nativo cae al origen de CloudFront, no a rutas relativas', async () => {
    // Regresion: sin VITE_API_URL, API_BASE se quedaba en '' y las peticiones
    // relativas a file:// rompian el registro en la app nativa.
    nativeMock.value = true;
    const mod = await load({});
    expect(mod.API_BASE).toBe(CLOUDFRONT);
    expect(mod.TTS_ORIGIN).toBe(CLOUDFRONT);
  });

  it('en nativo respeta VITE_API_URL y VITE_TTS_URL si estan', async () => {
    nativeMock.value = true;
    const mod = await load({
      VITE_API_URL: 'https://api.example.com',
      VITE_TTS_URL: 'https://tts.example.com',
    });
    expect(mod.API_BASE).toBe('https://api.example.com');
    expect(mod.TTS_ORIGIN).toBe('https://tts.example.com');
  });

  it('ignora las variables en web (debe seguir siendo relativo)', async () => {
    nativeMock.value = false;
    const mod = await load({ VITE_API_URL: 'https://api.example.com' });
    expect(mod.API_BASE).toBe('');
  });
});