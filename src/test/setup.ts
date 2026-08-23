/* Entorno mínimo para probar utilidades que asumen navegador. */

// Prototipo con métodos no-enumerables; los DATOS son propiedades propias
// enumerables para que Object.keys(localStorage) se comporte como el navegador.
const lsProto = {
  getItem(k: string): string | null {
    return Object.prototype.hasOwnProperty.call(this, k) ? (this as any)[k] : null;
  },
  setItem(k: string, v: string): void {
    (this as any)[k] = String(v);
  },
  removeItem(k: string): void {
    delete (this as any)[k];
  },
  clear(): void {
    for (const k of Object.keys(this)) delete (this as any)[k];
  },
  key(i: number): string | null {
    return Object.keys(this)[i] ?? null;
  },
};

const storage: any = Object.create(lsProto);

Object.defineProperty(storage, 'length', {
  get: () => Object.keys(storage).length,
});

(globalThis as any).localStorage = storage;

// Window mínimo: los utils usan CustomEvent/dispatchEvent/timeout del navegador.
(globalThis as any).CustomEvent = class {
  type: string;
  detail: unknown;
  constructor(type: string, init?: { detail?: unknown }) {
    this.type = type;
    this.detail = init?.detail;
  }
};
(globalThis as any).addEventListener = () => {};
(globalThis as any).removeEventListener = () => {};
(globalThis as any).dispatchEvent = () => true;
if (!(globalThis as any).window) {
  (globalThis as any).window = globalThis;
}

export const resetStorage = (): void => {
  for (const k of Object.keys(storage)) delete storage[k];
};
