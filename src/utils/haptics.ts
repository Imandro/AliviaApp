import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Feedback háptico sutil (solo nativo; en web es un no-op).
 * Refuerza momentos clave: SOS, completar ejercicios, cambiar de pestaña.
 */
export const haptic = (style: ImpactStyle = ImpactStyle.Light): void => {
  if (!Capacitor.isNativePlatform()) return;
  Haptics.impact({ style }).catch(() => {
    /* noop */
  });
};

export const hapticSuccess = (): void => {
  if (!Capacitor.isNativePlatform()) return;
  Haptics.notification({ type: NotificationType.Success }).catch(() => {
    /* noop */
  });
};

export const hapticSos = (): void => {
  haptic(ImpactStyle.Heavy);
};
