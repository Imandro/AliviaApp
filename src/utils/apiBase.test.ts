import { describe, it, expect, vi, beforeEach } from 'vitest';

// El comportamiento depende de isNativeShell, que se evalua al importar.
const nativeMock = { value: false };
vi.mock('./nativeShell', () => ({
  get isNativeShell() {
    return nativeMock.value;
  },
}));

const SITE = 'https://alivia.lat';

async function load(env: Record<string, unknown>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) {
    vi.stubEnv(k, v as string);
  }
  const [base, origins] = await Promise.all([import('./apiBase'), import('./apiOrigins')]);
  return { ...base, ...origins };
}

describe('apiBase segun el shell', () => {
  beforeEach(() => {
    nativeMock.value = false;
    vi.unstubAllEnvs();
  });

  it('en web usa rutas relativas (mismo origen que nginx)', async () => {
    const mod = await load({});
    expect(mod.API_BASE).toBe('');
    expect(mod.TTS_ORIGIN).toBe('');
  });

  it('en nativo cae a la IP publica de Azure, no a rutas relativas', async () => {
    // Regresion historica: sin un origen absoluto, API_BASE se quedaba en '' y
    // las peticiones relativas a file:// rompian el registro en la app nativa.
    nativeMock.value = true;
    const mod = await load({});
    expect(mod.API_BASE).toBe(mod.AZURE_ORIGIN);
    expect(mod.TTS_ORIGIN).toBe(mod.AZURE_ORIGIN);
    expect(mod.API_BASE).toMatch(/^http:\/\//);
  });

  it('nunca cae a localhost en nativo', async () => {
    // El requisito de la migracion a Azure es que la app hable con la IP
    // publica del servidor, no con la maquina donde se compilo. Si API_BASE
    // llegara a ser '', el shell nativo resolveria contra file:// y fallaria.
    nativeMock.value = true;
    const mod = await load({});
    expect(mod.API_BASE).not.toBe('');
    expect(mod.API_BASE).not.toMatch(/localhost|127\.0\.0\.1/);
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

  it('la IP de Azure no usa https, porque una IP publica no tiene certificado', async () => {
    // Si algún día esto cambia, el TLS del shell nativo empieza a fallar con un
    // error poco descriptivo, así que queda fijado aquí.
    const mod = await load({});
    expect(mod.AZURE_ORIGIN).toBe(`http://${mod.AZURE_IP}`);
    expect(mod.SITE_ORIGIN).toBe(SITE);
  });
});