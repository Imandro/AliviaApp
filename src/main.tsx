import React from 'react'
import ReactDOM from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import './fonts.css'
import './index.css'
import App from './App.tsx'
import { syncSystemBarsTheme, getSavedTheme } from './utils/systemBars'
import { readCache } from './utils/apiClient'
import { isNativeShell } from './utils/nativeShell'

syncSystemBarsTheme(getSavedTheme());

// Recordatorios locales nativos: ampliar la ventana de alarmas cada vez que se reabre la app.
if (Capacitor.isNativePlatform()) {
  const refreshNativeReminders = () => {
    import('./utils/reminders').then(({ applyDailyReminder, getReminderPrefs, syncCheckInReminder }) => {
      const prefs = getReminderPrefs();
      const lastCheckin = readCache<{ created_at: string }[]>('/api/assessments')?.[0]?.created_at ?? null;
      if (lastCheckin) void syncCheckInReminder(prefs, lastCheckin);
      else void applyDailyReminder(prefs);
    }).catch((err) => {
      console.error('No se pudieron actualizar los recordatorios locales:', err);
    });
  };
  refreshNativeReminders();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshNativeReminders();
  });
  void import('@capacitor/local-notifications').then(({ LocalNotifications }) =>
    LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
      const path = event.notification.extra?.path;
      if (typeof path === 'string' && /^\/[a-z0-9/-]*$/i.test(path)) {
        window.location.hash = `#${path}`;
      }
    })
  ).catch((err) => {
    console.error('No se pudo registrar el acceso desde notificaciones:', err);
  });
}

// En la web, target="_blank" abre pestaña nueva. En el WebView nativo no existe
// multi-window: interceptamos esos enlaces y los mandamos al navegador/WhatsApp
// del sistema (el bridge de Capacitor abre intents para URLs externas).
if (Capacitor.isNativePlatform()) {
  document.addEventListener(
    'click',
    (e) => {
      const ev = e as MouseEvent;
      if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      const anchor = (ev.target as HTMLElement | null)?.closest?.('a[target="_blank"]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || !/^https?:/i.test(href)) return;
      ev.preventDefault();
      window.location.assign(href);
    },
    true
  );
}

// El service worker solo aplica a la web; en cualquier shell nativo se omite.
if ('serviceWorker' in navigator && !isNativeShell) {
  // El precache de pantallas offline no debe competir con la primera pantalla.
  let registrationTimer: ReturnType<typeof setTimeout>;
  const scheduleRegistration = (delay: number) => {
    clearTimeout(registrationTimer);
    registrationTimer = setTimeout(() => {
      void navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('No se pudo preparar el modo offline:', err);
      });
    }, delay);
  };
  window.addEventListener('load', () => scheduleRegistration(30000), { once: true });
  window.addEventListener('alivia:screen-ready', () => scheduleRegistration(5000), { once: true });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
