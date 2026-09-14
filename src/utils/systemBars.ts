import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { callNative, hasNativeBridge } from './nativeBridge';

// Sincroniza el color de iconos de las barras del sistema con el tema de la app
// (la web lo hace vía meta theme-color; en nativo se usa el plugin SystemBars
// o el bridge Swift↔JS del shell iOS).
export const syncSystemBarsTheme = (theme: 'light' | 'dark' | 'mono'): void => {
  const style = theme === 'light' ? SystemBarsStyle.Light : SystemBarsStyle.Dark;

  if (Capacitor.isNativePlatform()) {
    SystemBars.setStyle({ style }).catch(() => {
      /* noop */
    });
    return;
  }
  if (hasNativeBridge()) {
    void callNative('systemBars.setStyle', { style, theme }).catch(() => {
      /* noop */
    });
  }
};

export const getSavedTheme = (): 'light' | 'dark' | 'mono' => {
  try {
    const saved = localStorage.getItem('alivia-theme');
    return saved === 'light' || saved === 'dark' || saved === 'mono' ? saved : 'dark';
  } catch {
    return 'dark';
  }
};