import { afterEach, describe, expect, it, vi } from 'vitest';
import { enableHomeCompanionDrag } from './homeCompanionDrag';

function fixture() {
  const page = Object.assign(new EventTarget(), { innerWidth: 390, innerHeight: 844 });
  vi.stubGlobal('window', page);
  const style = { transform: '', setProperty: vi.fn() };
  const anchor = { style, dataset: {} as Record<string, string>, getBoundingClientRect: () => {
    const [x, y] = (style.transform.match(/-?\d+(?:\.\d+)?/g) ?? ['0', '0']).map(Number);
    return { left: 330 + x, top: 80 + y, width: 48, height: 115 };
  } };
  let captured: number | null = null;
  const button = Object.assign(new EventTarget(), {
    setPointerCapture: (id: number) => { captured = id; },
    hasPointerCapture: (id: number) => captured === id,
    releasePointerCapture: () => { captured = null; },
  });
  const dispose = enableHomeCompanionDrag(anchor as unknown as HTMLElement, button as unknown as HTMLButtonElement);
  function send(type: string, props: Record<string, unknown> = {}) {
    const event = Object.assign(new Event(type, { cancelable: true }), { pointerId: 1, isPrimary: true, button: 0, clientX: 350, clientY: 100, ...props });
    button.dispatchEvent(event);
    return event;
  }
  return { page, anchor, button, send, dispose, captured: () => captured };
}
afterEach(() => vi.unstubAllGlobals());
describe('arrastre de la mascota', () => {
  it.each(['mouse', 'touch'])('sigue el puntero %s y no abre el diálogo al soltar', pointerType => {
    const f = fixture();
    f.send('pointerdown', { pointerType });
    expect(f.captured()).toBe(1);
    expect(f.anchor.dataset.held).toBe('true');
    f.send('pointermove', { clientX: 200, clientY: 220 });
    expect(f.anchor.style.transform).toBe('translate(-150px, 120px)');
    f.send('pointerup');
    expect(f.captured()).toBeNull();
    expect(f.anchor.dataset.held).toBeUndefined();
    expect(f.send('click', { detail: 1 }).defaultPrevented).toBe(true);
    expect(f.send('click', { detail: 0 }).defaultPrevented).toBe(false);
    f.dispose();
  });
  it('conserva el toque normal y tolera pequeños movimientos', () => {
    const f = fixture();
    f.send('pointerdown');
    f.send('pointermove', { clientX: 352, clientY: 102 });
    f.send('pointerup');
    expect(f.send('click', { detail: 1 }).defaultPrevented).toBe(false);
    f.dispose();
  });
  it('mantiene la mascota visible y cambia el diálogo de lado', () => {
    const f = fixture();
    f.send('pointerdown');
    f.send('pointermove', { clientX: -1000, clientY: 2000 });
    expect(f.anchor.style.transform).toBe('translate(-318px, 637px)');
    expect(f.anchor.dataset.dialogSide).toBe('right');
    f.send('pointerup');
    f.page.innerHeight = 500;
    f.page.dispatchEvent(new Event('resize'));
    expect(f.anchor.style.transform).toBe('translate(-318px, 293px)');
    f.dispose();
  });
  it('ignora otros punteros, termina al cancelar y permite un nuevo toque', () => {
    const f = fixture();
    f.send('pointerdown');
    f.send('pointermove', { pointerId: 2, clientX: 100 });
    expect(f.anchor.style.transform).toBe('translate(0px, 0px)');
    f.send('pointercancel');
    expect(f.anchor.dataset.held).toBeUndefined();
    expect(f.captured()).toBeNull();
    f.send('pointerdown');
    f.send('pointerup');
    expect(f.send('click', { detail: 1 }).defaultPrevented).toBe(false);
    f.dispose();
  });
  it('permite mover con las flechas y elimina los eventos al desmontar', () => {
    const f = fixture();
    expect(f.send('keydown', { key: 'ArrowLeft' }).defaultPrevented).toBe(true);
    expect(f.anchor.style.transform).toBe('translate(-16px, 0px)');
    f.dispose();
    f.send('pointerdown');
    f.send('pointermove', { clientX: 100 });
    expect(f.anchor.style.transform).toBe('translate(-16px, 0px)');
  });
});
