import { useId } from 'react';
import { loadingSymbol as logo, loadingSignature as banner } from './loadingArtwork';
import './LoadingBrand.css';

/** La firma de marca queda construida durante las esperas internas. */
export function LoadingBrand() {
  const id = useId();
  return (
    <>
      <div className="brand-atmosphere" aria-hidden="true" />
      <div className="loading-brand" role="status" aria-label="Cargando ALIVIA">
        <svg className="brand-symbol" viewBox="0 0 2412 3222" aria-hidden="true">
          <defs><mask id={`${id}-symbol`} style={{ maskType: 'alpha' }}><image href={logo} width="2412" height="3222" /></mask></defs>
          <g mask={`url(#${id}-symbol)`}>
            <image className="brand-fill" href={logo} width="2412" height="3222" />
            <path className="brand-draw" pathLength="1" strokeWidth="880" d="M 620 3050 C 10 2590 20 1710 440 1280 C 980 760 1860 630 2200 60" />
            <path className="brand-draw brand-draw-wing" pathLength="1" strokeWidth="740" d="M 1640 1210 C 2520 1260 2460 2220 1950 2670 C 1620 2960 1340 3050 800 3220" />
            <path className="brand-draw brand-draw-ribbon" pathLength="1" strokeWidth="370" d="M 1060 2530 C 1400 2090 1430 1870 1200 1860 C 960 1860 1020 2200 1390 2530" />
          </g>
        </svg>
        <img className="brand-signature" src={banner} width="174" height="77" alt="" aria-hidden="true" />
        <p className="brand-tagline" aria-hidden="true">Tu espacio. Tu ritmo.</p>
      </div>
      <div className="brand-wait" aria-hidden="true"><span className="brand-wait-track" /><span className="brand-wait-label">Un momento para ti</span></div>
    </>
  );
}
