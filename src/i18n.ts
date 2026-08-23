/* ----------------------------------------------------
   ALIVIA - INTERNACIONALIZACIÓN (base)
   Diccionarios es/en para textos de shell, navegación y
   Perfil. Las pantallas de contenido permanecen en español
   (material psicoeducativo revisado); esta base permite
   traducirlas progresivamente.
   ---------------------------------------------------- */

export type Lang = 'es' | 'en';

const KEY = 'alivia_lang';

export const getLang = (): Lang => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'en' ? 'en' : 'es';
  } catch {
    return 'es';
  }
};

export const setLang = (lang: Lang): void => {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* noop */
  }
};

const dict = {
  es: {
    nav_inicio: 'Inicio',
    nav_respirar: 'Respirar',
    nav_desahogo: 'Desahogo',
    nav_apoyo: 'Apoyo',
    nav_retos: 'Retos',
    nav_explorar: 'Explorar',
    perfil_chequeo: 'CHEQUEO DE BIENESTAR',
    perfil_privacidad: 'PRIVACIDAD',
    perfil_datos: 'MIS DATOS',
    perfil_recordatorios: 'RECORDATORIOS',
    sync_pending: 'cambio(s) sin sincronizar',
    sync_done: 'Todo sincronizado',
    lock_protected: 'Tu espacio está protegido',
    lock_unlock: 'Desbloquear',
    lock_verifying: 'Verificando…',
  },
  en: {
    nav_inicio: 'Home',
    nav_respirar: 'Breathe',
    nav_desahogo: 'Vent',
    nav_apoyo: 'Support',
    nav_retos: 'Streaks',
    nav_explorar: 'Explore',
    perfil_chequeo: 'WELLNESS CHECK-IN',
    perfil_privacidad: 'PRIVACY',
    perfil_datos: 'MY DATA',
    perfil_recordatorios: 'REMINDERS',
    sync_pending: 'change(s) waiting to sync',
    sync_done: 'All synced',
    lock_protected: 'Your space is protected',
    lock_unlock: 'Unlock',
    lock_verifying: 'Verifying…',
  },
} as const;

export type DictKey = keyof typeof dict.es;

/** Texto según idioma activo. */
export const t = (key: DictKey): string => dict[getLang()][key] ?? dict.es[key];
