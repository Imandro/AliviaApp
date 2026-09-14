import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { callNative, hasNativeBridge } from './nativeBridge';

/**
 * Feedback háptico sutil (solo nativo; en web es un no-op).
 * Refuerza momentos clave: SOS, completar ejercicios, cambiar de pestaña.
 */

const IMPACT_MAP = {
  [ImpactStyle.Light]: 'light',
  [ImpactStyle.Medium]: 'medium',
  [ImpactStyle.Heavy]: 'heavy',
};

const NOTIFICATION_MAP = {
  [NotificationType.Success]: 'success',
  [NotificationType.Error]: 'error',
  [NotificationType.Warning]: 'warning',
};

export const haptic = (style: ImpactStyle = ImpactStyle.Light): void => {
  if (Capacitor.isNativePlatform()) {
    Haptics.impact({ style }).catch(() => {
      /* noop */
    });
    return;
  }
  if (hasNativeBridge()) {
    void callNative('haptics.impact', { style: IMPACT_MAP[style] ?? 'light' }).catch(() => {
      /* noop */
    });
  }
};

export const hapticSuccess = (): void => {
  if (Capacitor.isNativePlatform()) {
    Haptics.notification({ type: NotificationType.Success }).catch(() => {
      /* noop */
    });
    return;
  }
  if (hasNativeBridge()) {
    void callNative('haptics.notification', { type: NOTIFICATION_MAP[NotificationType.Success] }).catch(
      () => {
        /* noop */
      }
    );
  }
};

export const hapticSos = (): void => {
  haptic(ImpactStyle.Heavy);
};