(() => {
  'use strict';
  const READY_EVENT = 'alivia:screen-ready';
  const MOBILE_INTRO_MS = 2800;
  const DESKTOP_INTRO_MS = 4000;
  const MOBILE_READY_MS = 600;
  const EXIT_MS = 650;
  const RECOVERY_MS = 12000;
  const LANDING_KEY = 'alivia:landing-v1';

  /** Primera visita: manda a la landing y no deja montar la app.
   *
   * Va aqui y no en React a proposito. Este script corre antes de que se
   * cargue el bundle, asi que en la PWA instalada y en la app nativa
   * (Capacitor / iOS) funciona igual que en web: no depende de que React ya
   * haya montado ni de ninguna peticion. Un locate en React dejaria ver el
   * preloader un instante y, si el bundle tardaba, abriria la app sin pasar
   * por la landing.
   *
   * location.replace y no location.assign: replace no deja entrada en el
   * historial, asi que el boton "atras" no devuelve a la landing.
   */
  const gateLanding = () => {
    try {
      if (localStorage.getItem(LANDING_KEY) === '1') return;

      // A los buscadores se les sirve la app directamente: si caen en la
      // landing, Google indexaria la pagina de presentacion en vez del sitio.
      const agent = navigator.userAgent || '';
      if (/bot|crawler|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot/i.test(agent)) {
        localStorage.setItem(LANDING_KEY, '1');
        return;
      }

      // En nativo el origen es capacitor:// o file://, no un host web. La
      // landing esta dentro del bundle (webDir: dist), asi que la ruta relativa
      // resuelve; aun asi se comprueba que exista el fichero.
      location.replace('/landing.html');
    } catch (err) {
      // Si localStorage esta bloqueado (modo privado, WebView restrictiva) no
      // se puede recordar la visita. Es preferible dejar entrar a la app antes
      // que dejar a nadie atrapado en un bucle de redireccion.
    }
  };

  gateLanding();

  /** Conserva una sola capa desde el HTML hasta que React haya pintado la pantalla. */
  function mountStartup() {
    const overlay = document.getElementById('app-preloader');
    if (!overlay) return;
    overlay.setAttribute('data-startup-mounted', '');
    const device = window.navigator;
    if (device?.connection?.saveData || (device?.hardwareConcurrency && device.hardwareConcurrency <= 4)) {
      overlay.setAttribute('data-lite', '');
    }

    const root = document.getElementById('root');
    const recovery = document.getElementById('startup-recovery');
    const retry = document.getElementById('startup-retry');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const introMs = window.matchMedia('(min-width: 768px) and (pointer: fine)').matches
      ? DESKTOP_INTRO_MS : MOBILE_INTRO_MS;
    const started = performance.now();
    const mobile = window.matchMedia('(max-width: 767px)').matches;
    let readyAt = started;
    let ready = false;
    let leaving = false;
    let exitTimer;
    let removeTimer;

    const reload = () => window.location.reload();
    const remove = () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
      clearTimeout(recoveryTimer);
      window.removeEventListener(READY_EVENT, onReady);
      motion.removeEventListener('change', onMotionChange);
      overlay.removeEventListener('transitionend', onTransitionEnd);
      retry?.removeEventListener('click', reload);
      root?.removeAttribute('inert');
      overlay.remove();
    };
    const onTransitionEnd = (event) => {
      if (event.target === overlay && event.propertyName === 'opacity' && leaving) remove();
    };
    const exit = () => {
      if (leaving) return;
      leaving = true;
      clearTimeout(recoveryTimer);
      if (motion.matches) { remove(); return; }
      overlay.classList.add('is-leaving');
      // Respaldo para pestañas en segundo plano, donde transitionend puede no llegar.
      removeTimer = setTimeout(remove, EXIT_MS + 80);
    };
    const scheduleExit = () => {
      clearTimeout(exitTimer);
      const minimumEnd = Math.max(started + introMs, readyAt + (mobile ? MOBILE_READY_MS : 0));
      const remaining = motion.matches ? 0 : Math.max(0, minimumEnd - performance.now());
      exitTimer = setTimeout(exit, remaining);
    };
    const onReady = () => {
      if (ready) return;
      ready = true;
      readyAt = performance.now();
      scheduleExit();
    };
    const onMotionChange = () => {
      if (leaving && motion.matches) remove();
      else if (ready) scheduleExit();
    };
    const recoveryTimer = setTimeout(() => {
      if (ready) return;
      overlay.classList.add('has-recovery');
      if (recovery) recovery.hidden = false;
    }, RECOVERY_MS);

    retry?.addEventListener('click', reload);
    overlay.addEventListener('transitionend', onTransitionEnd);
    window.addEventListener(READY_EVENT, onReady);
    motion.addEventListener('change', onMotionChange);
    return remove;
  }

  mountStartup();
})();
