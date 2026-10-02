const READY_EVENT = 'alivia:screen-ready';

/** Se emite desde un efecto dentro del Suspense que ya mostró la pantalla real. */
export function signalScreenReady() {
  // Si la red impidió cargar el controlador, la pantalla lista debe ser utilizable.
  const overlay = document.getElementById('app-preloader');
  if (overlay && !overlay.hasAttribute('data-startup-mounted')) {
    document.getElementById('root')?.removeAttribute('inert');
    overlay.remove();
    return;
  }
  window.dispatchEvent(new Event(READY_EVENT));
}

