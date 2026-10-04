import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { House } from 'lucide-react';

type SceneTime = 'dawn' | 'day' | 'sunset' | 'night';

const getSceneTime = (date: Date): SceneTime => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 9) return 'dawn';
  if (hour >= 9 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'sunset';
  return 'night';
};

export function NotFoundView() {
  const [now, setNow] = useState(() => new Date());
  const [isBlinking, setIsBlinking] = useState(false);
  const sceneTime = getSceneTime(now);
  const mascotPose = sceneTime === 'sunset' || sceneTime === 'night' ? 'relax' : 'normal';

  useEffect(() => {
    const updateTime = () => setNow(new Date());
    const updateTimeInterval = window.setInterval(updateTime, 60_000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') updateTime();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(updateTimeInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let blinkTimeout = 0;
    const blinkInterval = window.setInterval(() => {
      setIsBlinking(true);
      blinkTimeout = window.setTimeout(() => setIsBlinking(false), 240);
    }, 5_200);

    return () => {
      window.clearInterval(blinkInterval);
      window.clearTimeout(blinkTimeout);
    };
  }, []);

  return (
    <section className="not-found-page" aria-labelledby="not-found-title">
      <div className="not-found-card">
        <div className="not-found-scene" data-time={sceneTime} aria-hidden="true">
          <span className="not-found-sun" />
          <span className="not-found-moon" />
          <span className="not-found-star not-found-star-one" />
          <span className="not-found-star not-found-star-two" />
          <span className="not-found-star not-found-star-three" />
          <span className="not-found-star not-found-star-four" />
          <span className="not-found-hill not-found-hill-back" />
          <span className="not-found-hill not-found-hill-front" />
          <img
            key={mascotPose}
            className={`not-found-mascot not-found-mascot-${mascotPose}`}
            src={`/mascota-${mascotPose}.png`}
            alt=""
          />
          {isBlinking && (
            <img className="not-found-mascot not-found-mascot-blink" src="/mascota-parpadeo.png" alt="" />
          )}
        </div>
        <p className="not-found-code">ERROR 404</p>
        <h1 id="not-found-title">Esta página se perdió en el camino</h1>
        <p className="not-found-message">
          Parece que tomamos un desvío. Livi ya encontró el camino de vuelta y te acompaña
          a un lugar conocido.
        </p>
        <Link className="btn-primary not-found-home" to="/">
          <House size={19} aria-hidden="true" />
          Volver al inicio
        </Link>
      </div>
    </section>
  );
}
