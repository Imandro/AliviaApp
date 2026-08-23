import React from 'react'
import ReactDOM from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import './fonts.css'
import './index.css'
import App from './App.tsx'
import { syncSystemBarsTheme, getSavedTheme } from './utils/systemBars'
import { readCache } from './utils/apiClient'

syncSystemBarsTheme(getSavedTheme());

// Recordatorios locales (solo app nativa): aplica preferencias guardadas
if (Capacitor.isNativePlatform()) {
  import('./utils/reminders').then(({ applyDailyReminder, getReminderPrefs, syncCheckInReminder }) => {
    const prefs = getReminderPrefs();
    void applyDailyReminder(prefs);
    const lastCheckin = readCache<{ created_at: string }[]>('/api/assessments')?.[0]?.created_at ?? null;
    void syncCheckInReminder(prefs, lastCheckin);
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

// El service worker solo aplica a la web; en la app nativa se omite.
if ('serviceWorker' in navigator && !Capacitor.isNativePlatform()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
