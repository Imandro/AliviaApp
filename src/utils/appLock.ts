/* ----------------------------------------------------
   ALIVIA - PRIVACIDAD
   - Pantalla de privacidad: oculta el contenido cuando la
     app pasa a segundo plano (multitasking de Android/iOS).
   - Bloqueo al abrir la app, con método configurable:
       · biometría del sistema (huella/rostro, con respaldo
         al PIN/patrón del dispositivo),
       · PIN propio de ALIVIA (4 dígitos, funciona en web
         y en nativo),
       · ambos (biometría y después PIN).
   En web la biometría no existe: solo PIN.
   En iOS shell (WKWebView) se usa el bridge Swift↔JS.
   ---------------------------------------------------- */

import { Capacitor } from '@capacitor/core';
import { PrivacyScreen } from '@capacitor-community/privacy-screen';
import { NativeBiometric, BiometryType } from 'capacitor-native-biometric';
import { callNative, hasNativeBridge } from './nativeBridge';

const PREFS_KEY = 'alivia_privacy_prefs';
const PIN_KEY = 'alivia_app_pin';

/** Dígitos del PIN propio de ALIVIA. */
export const PIN_LENGTH = 4;
/** Intentos fallidos antes de la pausa temporal. */
export const PIN_MAX_ATTEMPTS = 5;
/** Pausa tras agotar los intentos. */
export const PIN_LOCKOUT_MS = 30_000;

/** Cómo se pide la identidad al abrir la app. */
export type LockMethod = 'biometric' | 'pin' | 'both';

export interface PrivacyPrefs {
  /** Oculta el contenido en el multitasking (solo nativo). */
  privacyScreen: boolean;
  /** Exige identidad al abrir la app (web y nativo). */
  biometricLock: boolean;
  /** Método elegido: biometría del sistema, PIN propio o ambos. */
  lockMethod: LockMethod;
}

export const DEFAULT_PRIVACY_PREFS: PrivacyPrefs = {
  privacyScreen: false,
  biometricLock: false,
  lockMethod: 'biometric',
};

export const getPrivacyPrefs = (): PrivacyPrefs => {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PRIVACY_PREFS };
    const parsed = JSON.parse(raw) as Partial<PrivacyPrefs>;
    return { ...DEFAULT_PRIVACY_PREFS, ...parsed };
  } catch {
    return { ...DEFAULT_PRIVACY_PREFS };
  }
};

export const setPrivacyPrefs = (patch: Partial<PrivacyPrefs>): PrivacyPrefs => {
  const next = { ...getPrivacyPrefs(), ...patch };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
  return next;
};

/** Aplica el estado actual de la pantalla de privacidad (llamar al iniciar y al cambiar). */
export const applyPrivacyScreen = (): void => {
  const { privacyScreen } = getPrivacyPrefs();
  if (Capacitor.isNativePlatform()) {
    try {
      if (privacyScreen) void PrivacyScreen.enable();
      else void PrivacyScreen.disable();
    } catch {
      /* noop */
    }
    return;
  }
  if (hasNativeBridge()) {
    void callNative('privacy.set', { enabled: privacyScreen }).catch(() => {
      /* noop */
    });
  }
};

export interface BiometryInfo {
  available: boolean;
  /** Etiqueta amable para mostrar en la UI. */
  label: string;
}

export const biometryInfo = async (): Promise<BiometryInfo> => {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await NativeBiometric.isAvailable();
      if (!res.isAvailable) return { available: false, label: '' };
      switch (res.biometryType) {
        case BiometryType.FACE_ID:
        case BiometryType.FACE_AUTHENTICATION:
        case BiometryType.IRIS_AUTHENTICATION:
          return { available: true, label: 'Reconocimiento facial' };
        case BiometryType.TOUCH_ID:
        case BiometryType.FINGERPRINT:
          return { available: true, label: 'Huella digital' };
        case BiometryType.MULTIPLE:
          return { available: true, label: 'Huella o rostro' };
        default:
          return { available: true, label: 'Datos biométricos' };
      }
    } catch {
      return { available: false, label: '' };
    }
  }
  if (hasNativeBridge()) {
    try {
      const res = (await callNative('biometric.isAvailable')) as {
        available?: boolean;
        biometryType?: string;
      };
      const available = !!res.available;
      if (!available) return { available: false, label: '' };
      switch (res.biometryType) {
        case 'faceID':
        case 'opticID':
          return { available: true, label: 'Reconocimiento facial' };
        case 'touchID':
          return { available: true, label: 'Huella digital' };
        default:
          return { available: true, label: 'Datos biométricos' };
      }
    } catch {
      return { available: false, label: '' };
    }
  }
  return { available: false, label: '' };
};

/**
 * Pide identidad biométrica o PIN del dispositivo.
 * Resuelve true si pasó; false si canceló/falló (el gate ofrece reintentar).
 */
export const authenticateWithBiometry = async (): Promise<boolean> => {
  if (Capacitor.isNativePlatform()) {
    try {
      await NativeBiometric.verifyIdentity({
        reason: 'Desbloquea ALIVIA para ver tu espacio',
        title: 'ALIVIA bloqueada',
        subtitle: 'Verifica tu identidad',
        useFallback: true, // permite PIN/patrón del dispositivo como respaldo
        maxAttempts: 3,
      });
      return true;
    } catch {
      return false;
    }
  }
  if (hasNativeBridge()) {
    try {
      await callNative('biometric.verify', { reason: 'Desbloquea ALIVIA para ver tu espacio' });
      return true;
    } catch {
      return false;
    }
  }
  return true;
};

/* ----------------------------------------------------
   PIN propio de ALIVIA
   Se guarda solo el hash con sal: el código en claro nunca
   toca el almacenamiento. Sirve en web y en nativo.
   ---------------------------------------------------- */

interface PinRecord {
  salt: string;
  hash: string;
}

export const isPinFormatValid = (pin: string): boolean => /^\d{4}$/.test(pin);

const readPinRecord = (): PinRecord | null => {
  try {
    const raw = localStorage.getItem(PIN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PinRecord>;
    if (typeof parsed.salt !== 'string' || typeof parsed.hash !== 'string') return null;
    return { salt: parsed.salt, hash: parsed.hash };
  } catch {
    return null;
  }
};

const randomSalt = (): string => {
  const bytes = new Uint8Array(8);
  const webCrypto = globalThis.crypto as Crypto | undefined;
  if (webCrypto?.getRandomValues) {
    webCrypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
};

const sha256Hex = async (input: string): Promise<string> => {
  const subtle = (globalThis.crypto as Crypto | undefined)?.subtle;
  if (subtle?.digest) {
    try {
      const digest = await subtle.digest('SHA-256', new TextEncoder().encode(input));
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      /* cae al respaldo de abajo */
    }
  }
  // Respaldo para WebViews sin contexto seguro: 4 variantes FNV/DJB.
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  let h3 = 0xdeadbeef;
  let h4 = 0x1b873593;
  for (let i = 0; i < input.length; i += 1) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 + c, 2246822519);
    h3 = Math.imul(h3 ^ (c + i), 3266489917);
    h4 = Math.imul(h4 + (c << (i % 5)), 668265263);
  }
  return [h1, h2, h3, h4].map((h) => (h >>> 0).toString(16).padStart(8, '0')).join('');
};

export const hasAppPin = (): boolean => readPinRecord() !== null;

export const setAppPin = async (pin: string): Promise<boolean> => {
  if (!isPinFormatValid(pin)) return false;
  const salt = randomSalt();
  const hash = await sha256Hex(`${salt}:${pin}`);
  try {
    localStorage.setItem(PIN_KEY, JSON.stringify({ salt, hash } satisfies PinRecord));
    return true;
  } catch {
    return false;
  }
};

export const verifyAppPin = async (pin: string): Promise<boolean> => {
  const record = readPinRecord();
  if (!record || !isPinFormatValid(pin)) return false;
  return (await sha256Hex(`${record.salt}:${pin}`)) === record.hash;
};

export const clearAppPin = (): void => {
  try {
    localStorage.removeItem(PIN_KEY);
  } catch {
    /* noop */
  }
};

/* ----------------------------------------------------
   Plan de bloqueo: qué se pide al abrir la app.
   ---------------------------------------------------- */

export interface LockPlan {
  /** true si hay que mostrar la pantalla de bloqueo. */
  active: boolean;
  needsBiometric: boolean;
  needsPin: boolean;
  method: LockMethod;
}

/**
 * Método efectivo: descarta lo que no puede funcionar
 * (sin biometría en el dispositivo o sin PIN creado).
 */
export const effectiveLockMethod = (
  prefs: Pick<PrivacyPrefs, 'lockMethod'>,
  bioAvailable: boolean,
  pinAvailable: boolean
): LockMethod | null => {
  let method = prefs.lockMethod;
  if ((method === 'biometric' || method === 'both') && !bioAvailable) method = 'pin';
  if ((method === 'pin' || method === 'both') && !pinAvailable) method = 'biometric';
  if (method === 'biometric' && !bioAvailable) return null;
  if (method === 'pin' && !pinAvailable) return null;
  return method;
};

/** Resuelve qué pedir ahora mismo al abrir la app. */
export const resolveLockPlan = async (): Promise<LockPlan> => {
  const prefs = getPrivacyPrefs();
  const empty: LockPlan = { active: false, needsBiometric: false, needsPin: false, method: prefs.lockMethod };
  if (!prefs.biometricLock) return empty;
  const bio = await biometryInfo();
  const method = effectiveLockMethod(prefs, bio.available, hasAppPin());
  if (!method) return empty;
  return {
    active: true,
    needsBiometric: method === 'biometric' || method === 'both',
    needsPin: method === 'pin' || method === 'both',
    method,
  };
};