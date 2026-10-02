/** Control de gestos esporádicos: ningún listener de scroll ni bucle por fotograma. */
export function getHomeMoodStreak(days: string[], today: string) {
  const dates = new Set(days);
  const cursor = new Date(`${today}T00:00:00`);
  let streak = 0;
  while (dates.has(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`)) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function animateHomeCompanion(element: HTMLElement, options: { inactive?: boolean; celebrate?: boolean } = {}) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  let timer: ReturnType<typeof setTimeout>;
  let finish: ReturnType<typeof setTimeout>;
  let turns = 0;
  let firstGesture = true;
  let loaded = false;
  let disposed = false;
  let blinkReady = false;
  let relaxReady = false;
  let happyReady = false;
  let sadReady = false;
  let caringReady = false;
  let blushReady = false;
  const basePose = () => options.inactive && sadReady ? 'sad' : 'normal';
  const clear = () => {
    clearTimeout(timer);
    clearTimeout(finish);
    element.dataset.pose = basePose();
  };
  const schedule = () => {
    clear();
    element.dataset.running = !document.hidden && !disposed ? 'true' : 'false';
    if (disposed || !loaded || document.hidden || (!blinkReady && !relaxReady && !happyReady && !caringReady && !blushReady)) return;
    timer = setTimeout(() => {
      ++turns;
      const expressions = (options.inactive ? ['caring'] as const : ['happy', 'caring', 'blush', 'relax'] as const).filter(pose => ({ happy: happyReady, caring: caringReady, blush: blushReady, relax: relaxReady })[pose]);
      const gesture = !saveData && turns % 2 === 0 && expressions.length > 0;
      element.dataset.pose = gesture ? expressions[(turns / 2 - 1) % expressions.length] : blinkReady ? 'blink' : basePose();
      finish = setTimeout(schedule, gesture ? 1400 : 180);
    }, saveData ? 5000 : firstGesture ? 1000 : 2400 + Math.random() * 600);
    firstGesture = false;
  };
  Promise.all(Array.from(element.querySelectorAll('img')).map(img => img.decode().then(() => true, () => false)))
    .then(([normal, blink, relax, happy, sad, caring, blush]) => {
      if (disposed) return;
      element.hidden = !normal;
      loaded = normal;
      blinkReady = blink;
      relaxReady = relax;
      happyReady = Boolean(happy);
      sadReady = Boolean(sad);
      caringReady = Boolean(caring);
      blushReady = Boolean(blush);
      if (options.celebrate && happyReady && !document.hidden) {
        clear();
        element.dataset.running = 'true';
        element.dataset.pose = 'celebrate';
        finish = setTimeout(schedule, 1800);
      } else schedule();
    });
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', schedule);
  return () => {
    disposed = true;
    clear();
    element.dataset.running = 'false';
    document.removeEventListener('visibilitychange', schedule);
    motion.removeEventListener('change', schedule);
  };
}
