import logo from '../assets/logo-vertical.png';
import './LoadingBrand.css';

/** El mismo lenguaje visual del arranque, sin descargar ni reiniciar videos. */
export function LoadingBrand() {
  return (
    <div className="loading-brand" role="status" aria-label="Cargando ALIVIA">
      <div className="loading-brand-emblem" aria-hidden="true">
        <img src={logo} alt="" width="96" height="128" />
      </div>
      <span className="loading-brand-name" aria-hidden="true">alivia</span>
      <span className="loading-brand-tagline" aria-hidden="true">Un momento para ti.</span>
      <span className="loading-brand-pulse" aria-hidden="true"><i /><i /><i /></span>
      <span className="loading-brand-label">Preparando tu espacio seguro…</span>
    </div>
  );
}
