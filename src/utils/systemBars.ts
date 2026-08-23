import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';

// Sincroniza el color de iconos de las barras del sistema con el tema de la app
// (la web lo hace vía meta theme-color; en nativo se usa el plugin SystemBars).
export const syncSystemBarsTheme = (theme: 'light' | 'dark' | 'mono'): void => {
  if (!Capacitor.isNativePlatform()) return;
  const style = theme === 'light' ? SystemBarsStyle.Light : SystemBarsStyle.Dark;
  SystemBars.setStyle({ style }).catch(() => {
    /* noop */
  });
};

export const getSavedTheme = (): 'light' | 'dark' | 'mono' => {
  try {
    const saved = localStorage.getItem('alivia-theme');
    return saved === 'light' || saved === 'dark' || saved === 'mono' ? saved : 'dark';
  } catch {
    return 'dark';
  }
};
