/* ----------------------------------------------------
   ALIVIA - PRIVACIDAD
   - Pantalla de privacidad: oculta el contenido cuando la
     app pasa a segundo plano (multitasking de Android).
   - Bloqueo biométrico: exige huella/rojo o PIN del
     dispositivo para entrar. Fallback a credencial del
     sistema si la biometría falla.
   En web ambos son no-op (la configuración se guarda igual).
   ---------------------------------------------------- */

import { Capacitor } from '@capacitor/core';
import { PrivacyScreen } from '@capacitor-community/privacy-screen';
import { NativeBiometric, BiometryType } from 'capacitor-native-biometric';

const PREFS_KEY = 'alivia_privacy_prefs';

export interface PrivacyPrefs {
  /** Oculta el contenido en el multitasking (solo nativo). */
  privacyScreen: boolean;
  /** Exige huella/rostro o PIN al abrir la app (solo nativo). */
  biometricLock: boolean;
}

export const DEFAULT_PRIVACY_PREFS: PrivacyPrefs = {
  privacyScreen: false,
  biometricLock: false,
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
  if (!Capacitor.isNativePlatform()) return;
  const { privacyScreen } = getPrivacyPrefs();
  try {
    if (privacyScreen) void PrivacyScreen.enable();
    else void PrivacyScreen.disable();
  } catch {
    /* noop */
  }
};

export interface BiometryInfo {
  available: boolean;
  /** Etiqueta amable para mostrar en la UI. */
  label: string;
}

export const biometryInfo = async (): Promise<BiometryInfo> => {
  if (!Capacitor.isNativePlatform()) return { available: false, label: '' };
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
};

/**
 * Pide identidad biométrica o PIN del dispositivo.
 * Resuelve true si pasó; false si canceló/falló (el gate ofrece reintentar).
 */
export const authenticateWithBiometry = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return true;
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
};
