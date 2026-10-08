/** Keeps the sticky companion movable without replacing its pose animations. */

/**
 * Límites dentro de los que se mueve la mascota.
 *
 * Antes se usaba window.innerWidth/innerHeight, pero el app vive dentro de un
 * contenedor centrado que en tablet/escritorio mide menos que la ventana: al
 * soltar, la mascota se "amarraba" 12px del borde de la PANTALLA, quedaba
 * fuera de .app-content y overflow-x: hidden la recortaba (desaparecía).
 *
 * Se mide el área de contenido real; si no existe (tests, render previo),
 * se cae a la ventana, que es lo que pasaba siempre.
 */
function limits(anchorEl: HTMLElement) {
  const win = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
  const host = typeof anchorEl.closest === 'function' ? anchorEl.closest('.app-content') : null;
  if (!host) return win;
  const box = host.getBoundingClientRect();
  return { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
}

export function enableHomeCompanionDrag(anchor: HTMLElement, button: HTMLButtonElement) {
  let x = 0;
  let y = 0;
  let gesture: { id: number; startX: number; startY: number; x: number; y: number; moved: boolean } | null = null;
  let suppressClick = false;
  let dockedSide: 'left' | 'right' | null = null;
  let settling: Animation | null = null;

  function stopSettling() {
    if (!settling) return;
    // Retomar desde la posición visible si se vuelve a agarrar durante el deslizamiento.
    const matrix = new DOMMatrixReadOnly(getComputedStyle(anchor).transform);
    x = matrix.m41;
    y = matrix.m42;
    settling.cancel();
    settling = null;
    anchor.style.transform = `translate(${x}px, ${y}px)`;
  }

  function dock(animate = true) {
    const rect = anchor.getBoundingClientRect();
    const left = rect.left - x;
    const lim = limits(anchor);
    dockedSide ??= rect.left + rect.width / 2 < (lim.left + lim.right) / 2 ? 'left' : 'right';
    const from = anchor.style.transform;
    place(dockedSide === 'left' ? lim.left + 12 - left : lim.right - 12 - rect.width - left, y);
    // El regreso solicitado es un desplazamiento simple, sin rebotes ni sacudidas,
    // también cuando el sistema reduce las animaciones decorativas.
    if (animate && anchor.animate) {
      const animation = anchor.animate([{ transform: from }, { transform: anchor.style.transform }], {
        duration: 650, easing: 'cubic-bezier(.45,0,.2,1)',
      });
      settling = animation;
      animation.onfinish = () => { if (settling === animation) settling = null; };
    }
  }

  function place(nextX: number, nextY: number) {
    const rect = anchor.getBoundingClientRect();
    const left = rect.left - x;
    const top = rect.top - y;
    const margin = 12;
    const lim = limits(anchor);
    x = Math.max(lim.left + margin - left, Math.min(nextX, lim.right - margin - rect.width - left));
    y = Math.max(lim.top + margin - top, Math.min(nextY, lim.bottom - margin - rect.height - top));
    anchor.style.transform = `translate(${x}px, ${y}px)`;
    anchor.dataset.dialogSide = left + x - lim.left < Math.min(200, lim.right - lim.left - 94) + 22 ? 'right' : 'left';
    anchor.style.setProperty('--companion-dialog-top', `${Math.max(margin - top - y, Math.min(34, lim.bottom - margin - top - y - 130))}px`);
    const thoughtTop = Math.max(margin - top - y, -30);
    anchor.style.setProperty('--companion-thought-top', `${thoughtTop}px`);
    // Face is about a third of the sprite height; keep the dots at its temple.
    anchor.style.setProperty('--companion-thought-dot-top', `${rect.height * .3 - thoughtTop}px`);
  }
  function down(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0 || gesture) return;
    stopSettling();
    suppressClick = false;
    gesture = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x, y, moved: false };
    button.setPointerCapture(event.pointerId);
    anchor.dataset.held = 'true';
  }
  function move(event: PointerEvent) {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    if (!gesture.moved && Math.hypot(dx, dy) < 5) return;
    gesture.moved = true;
    dockedSide = null;
    suppressClick = true;
    anchor.dataset.dragging = 'true';
    place(gesture.x + dx, gesture.y + dy);
  }
  function end(event: PointerEvent) {
    if (!gesture || event.pointerId !== gesture.id) return;
    suppressClick = gesture.moved || event.type === 'pointercancel';
    const moved = gesture.moved;
    gesture = null;
    delete anchor.dataset.dragging;
    delete anchor.dataset.held;
    if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
    if (moved) dock();
  }
  function click(event: MouseEvent) {
    if (suppressClick && event.detail !== 0) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }
  function keydown(event: KeyboardEvent) {
    const steps: Record<string, [number, number]> = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] };
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    stopSettling();
    dockedSide = null;
    place(x + step[0], y + step[1]);
  }
  function keyup(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    stopSettling();
    dock();
  }
  const constrain = () => {
    stopSettling();
    if (dockedSide && !gesture) dock(false);
    else place(x, y);
  };
  button.addEventListener('pointerdown', down);
  button.addEventListener('pointermove', move);
  button.addEventListener('pointerup', end);
  button.addEventListener('pointercancel', end);
  button.addEventListener('lostpointercapture', end);
  button.addEventListener('click', click);
  button.addEventListener('keydown', keydown);
  button.addEventListener('keyup', keyup);
  window.addEventListener('resize', constrain);
  window.addEventListener('scroll', constrain, true);
  constrain();
  return () => {
    button.removeEventListener('pointerdown', down);
    button.removeEventListener('pointermove', move);
    button.removeEventListener('pointerup', end);
    button.removeEventListener('pointercancel', end);
    button.removeEventListener('lostpointercapture', end);
    button.removeEventListener('click', click);
    button.removeEventListener('keydown', keydown);
    button.removeEventListener('keyup', keyup);
    settling?.cancel();
    window.removeEventListener('resize', constrain);
    window.removeEventListener('scroll', constrain, true);
    if (gesture && button.hasPointerCapture(gesture.id)) button.releasePointerCapture(gesture.id);
    delete anchor.dataset.dragging;
    delete anchor.dataset.held;
  };
}
