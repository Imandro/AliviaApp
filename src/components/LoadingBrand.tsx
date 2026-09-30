import { useEffect, useState } from 'react';
import logoBanner from '../assets/logo-banner.png';
import './LoadingBrand.css';

/** Visual de carga compartido; no controla ni retrasa la carga de la app. */
export function LoadingBrand() {
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return (
    <div className="loading-brand" role="status" aria-label="Cargando ALIVIA">
      <div className="loading-brand-media" aria-hidden="true">
        <img src={logoBanner} alt="" className={playing && !failed && !reducedMotion ? 'loading-brand-poster is-hidden' : 'loading-brand-poster'} />
        {!failed && !reducedMotion && (
          <video
            autoPlay muted loop playsInline preload="auto"
            onPlaying={() => setPlaying(true)}
            onError={() => setFailed(true)}
            onAbort={() => setPlaying(false)}
          >
            <source src={`${import.meta.env.BASE_URL}videos/alivia-pop.webm`} type="video/webm" />
          </video>
        )}
      </div>
      <span className="loading-brand-label">Cargando tu espacio seguro…</span>
    </div>
  );
}
