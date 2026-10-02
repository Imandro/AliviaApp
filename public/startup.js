(() => {
  'use strict';
  const READY_EVENT = 'alivia:screen-ready';
  const INTRO_MS = 2800;
  const EXIT_MS = 650;
  const RECOVERY_MS = 12000;

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
    const started = performance.now();
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
      const remaining = motion.matches ? 0 : Math.max(0, INTRO_MS - (performance.now() - started));
      exitTimer = setTimeout(exit, remaining);
    };
    const onReady = () => {
      if (ready) return;
      ready = true;
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
