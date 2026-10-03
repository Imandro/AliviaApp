/** Keeps the sticky companion movable without replacing its pose animations. */
export function enableHomeCompanionDrag(anchor: HTMLElement, button: HTMLButtonElement) {
  let x = 0;
  let y = 0;
  let gesture: { id: number; startX: number; startY: number; x: number; y: number; moved: boolean } | null = null;
  let suppressClick = false;

  function place(nextX: number, nextY: number) {
    const rect = anchor.getBoundingClientRect();
    const left = rect.left - x;
    const top = rect.top - y;
    const margin = 12;
    x = Math.max(margin - left, Math.min(nextX, window.innerWidth - margin - rect.width - left));
    y = Math.max(margin - top, Math.min(nextY, window.innerHeight - margin - rect.height - top));
    anchor.style.transform = `translate(${x}px, ${y}px)`;
    anchor.dataset.dialogSide = left + x < Math.min(200, window.innerWidth - 94) + 22 ? 'right' : 'left';
    anchor.style.setProperty('--companion-dialog-top', `${Math.max(margin - top - y, Math.min(34, window.innerHeight - margin - top - y - 130))}px`);
    const thoughtTop = Math.max(margin - top - y, -30);
    anchor.style.setProperty('--companion-thought-top', `${thoughtTop}px`);
    // Face is about a third of the sprite height; keep the dots at its temple.
    anchor.style.setProperty('--companion-thought-dot-top', `${rect.height * .3 - thoughtTop}px`);
  }
  function down(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0 || gesture) return;
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
    suppressClick = true;
    anchor.dataset.dragging = 'true';
    place(gesture.x + dx, gesture.y + dy);
  }
  function end(event: PointerEvent) {
    if (!gesture || event.pointerId !== gesture.id) return;
    suppressClick = gesture.moved || event.type === 'pointercancel';
    gesture = null;
    delete anchor.dataset.dragging;
    delete anchor.dataset.held;
    if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
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
    place(x + step[0], y + step[1]);
  }
  const constrain = () => place(x, y);
  button.addEventListener('pointerdown', down);
  button.addEventListener('pointermove', move);
  button.addEventListener('pointerup', end);
  button.addEventListener('pointercancel', end);
  button.addEventListener('lostpointercapture', end);
  button.addEventListener('click', click);
  button.addEventListener('keydown', keydown);
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
    window.removeEventListener('resize', constrain);
    window.removeEventListener('scroll', constrain, true);
    if (gesture && button.hasPointerCapture(gesture.id)) button.releasePointerCapture(gesture.id);
    delete anchor.dataset.dragging;
    delete anchor.dataset.held;
  };
}
