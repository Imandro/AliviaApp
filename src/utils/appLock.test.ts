import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetStorage } from '../test/setup';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' },
}));

vi.mock('@capacitor-community/privacy-screen', () => ({
  PrivacyScreen: { enable: vi.fn(async () => {}), disable: vi.fn(async () => {}) },
}));

vi.mock('capacitor-native-biometric', () => ({
  NativeBiometric: {
    isAvailable: vi.fn(async () => ({ isAvailable: false, biometryType: 'none' })),
    verifyIdentity: vi.fn(async () => {}),
  },
  BiometryType: {
    FACE_ID: 'face',
    FACE_AUTHENTICATION: 'face-authentication',
    IRIS_AUTHENTICATION: 'iris',
    TOUCH_ID: 'touch',
    FINGERPRINT: 'fingerprint',
    MULTIPLE: 'multiple',
  },
}));

describe('appLock — bloqueo por biometría y/o PIN', () => {
  let appLock: typeof import('./appLock');

  beforeEach(async () => {
    resetStorage();
    vi.restoreAllMocks();
    vi.resetModules();
    appLock = await import('./appLock');
  });

  it('prefs por defecto: bloqueo apagado y método biométrico', () => {
    expect(appLock.getPrivacyPrefs()).toEqual(appLock.DEFAULT_PRIVACY_PREFS);
    expect(appLock.getPrivacyPrefs().biometricLock).toBe(false);
  });

  it('setPrivacyPrefs hace merge sin pisar lo ya guardado', () => {
    appLock.setPrivacyPrefs({ lockMethod: 'pin' });
    const next = appLock.setPrivacyPrefs({ biometricLock: true });
    expect(next).toEqual({ privacyScreen: false, biometricLock: true, lockMethod: 'pin' });
  });

  it('prefs antiguas sin lockMethod heredan el valor por defecto', () => {
    localStorage.setItem('alivia_privacy_prefs', JSON.stringify({ privacyScreen: true, biometricLock: true }));
    const prefs = appLock.getPrivacyPrefs();
    expect(prefs.lockMethod).toBe('biometric');
    expect(prefs.privacyScreen).toBe(true);
  });

  it('PIN: crear, verificar y quitar', async () => {
    expect(appLock.hasAppPin()).toBe(false);
    expect(await appLock.setAppPin('1234')).toBe(true);
    expect(appLock.hasAppPin()).toBe(true);
    expect(await appLock.verifyAppPin('1234')).toBe(true);
    expect(await appLock.verifyAppPin('4321')).toBe(false);
    expect(await appLock.verifyAppPin('123')).toBe(false);

    const raw = localStorage.getItem('alivia_app_pin');
    expect(raw).toBeTruthy();
    expect(raw).not.toContain('"1234"');

    appLock.clearAppPin();
    expect(appLock.hasAppPin()).toBe(false);
    expect(await appLock.verifyAppPin('1234')).toBe(false);
  });

  it('PIN: rechaza códigos con formato inválido', async () => {
    expect(await appLock.setAppPin('123')).toBe(false);
    expect(await appLock.setAppPin('12345')).toBe(false);
    expect(await appLock.setAppPin('12ab')).toBe(false);
    expect(await appLock.setAppPin('12345678')).toBe(false);
    expect(appLock.hasAppPin()).toBe(false);
    expect(appLock.isPinFormatValid('1234')).toBe(true);
    expect(appLock.isPinFormatValid('12345')).toBe(false);
  });

  it('effectiveLockMethod descarta lo que no está disponible', () => {
    const effective = appLock.effectiveLockMethod;
    expect(effective({ lockMethod: 'biometric' }, true, false)).toBe('biometric');
    expect(effective({ lockMethod: 'biometric' }, false, true)).toBe('pin');
    expect(effective({ lockMethod: 'biometric' }, false, false)).toBeNull();
    expect(effective({ lockMethod: 'both' }, true, true)).toBe('both');
    expect(effective({ lockMethod: 'both' }, false, true)).toBe('pin');
    expect(effective({ lockMethod: 'both' }, true, false)).toBe('biometric');
    expect(effective({ lockMethod: 'pin' }, false, true)).toBe('pin');
    expect(effective({ lockMethod: 'pin' }, false, false)).toBeNull();
  });

  it('resolveLockPlan: bloqueo apagado → inactivo', async () => {
    const plan = await appLock.resolveLockPlan();
    expect(plan.active).toBe(false);
    expect(plan.needsPin).toBe(false);
    expect(plan.needsBiometric).toBe(false);
  });

  it('resolveLockPlan: método PIN pide el PIN propio', async () => {
    appLock.setPrivacyPrefs({ biometricLock: true, lockMethod: 'pin' });
    await appLock.setAppPin('1234');
    const plan = await appLock.resolveLockPlan();
    expect(plan).toMatchObject({ active: true, needsBiometric: false, needsPin: true });
  });

  it('resolveLockPlan: ambos en web (sin biometría) se resuelve como PIN', async () => {
    appLock.setPrivacyPrefs({ biometricLock: true, lockMethod: 'both' });
    await appLock.setAppPin('2580');
    const plan = await appLock.resolveLockPlan();
    expect(plan).toMatchObject({ active: true, needsBiometric: false, needsPin: true });
  });

  it('resolveLockPlan: biométrico sin biometría ni PIN → inactivo', async () => {
    appLock.setPrivacyPrefs({ biometricLock: true, lockMethod: 'biometric' });
    const plan = await appLock.resolveLockPlan();
    expect(plan.active).toBe(false);
  });

  it('resolveLockPlan: método PIN sin PIN creado → inactivo', async () => {
    appLock.setPrivacyPrefs({ biometricLock: true, lockMethod: 'pin' });
    const plan = await appLock.resolveLockPlan();
    expect(plan.active).toBe(false);
  });
});
