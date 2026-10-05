import { useEffect, useRef, useState } from 'react';
import './LiviVoice.css';

export type LiviVoiceState = 'listening' | 'transcribing' | 'speaking';

const POSES = ['normal', 'comprensiva', 'feliz', 'parpadeo'] as const;

export function LiviVoice({ state, inputLevel = 0 }: {
  state: LiviVoiceState;
  inputLevel?: number;
  fullMotionPreview?: boolean;
}) {
  const base = import.meta.env.BASE_URL;
  const stage = useRef<HTMLDivElement>(null);
  const targetLevel = useRef(0);
  const [ready, setReady] = useState(false);
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    let active = true;
    // Decode every complete pose before allowing expression changes.
    void Promise.all(POSES.map(async pose => {
      const image = new Image();
      image.src = `${base}mascota-inicio-${pose}.webp`;
      await image.decode();
    })).then(() => { if (active) setReady(true); }).catch(() => {
      // Keep the original base visible if a secondary pose cannot load.
    });
    return () => { active = false; };
  }, [base]);

  useEffect(() => {
    targetLevel.current = state === 'listening' && Number.isFinite(inputLevel)
      ? Math.min(1, Math.max(0, inputLevel)) : 0;
  }, [state, inputLevel]);

  useEffect(() => {
    if (!ready) return;
    let timer: ReturnType<typeof setTimeout>;
    let active = true;
    const schedule = () => {
      timer = setTimeout(() => {
        if (!active) return;
        setBlinking(true);
        timer = setTimeout(() => {
          if (!active) return;
          setBlinking(false);
          schedule();
        }, 110 + Math.random() * 60);
      }, 2300 + Math.random() * 3800);
    };
    schedule();
    return () => { active = false; clearTimeout(timer); };
  }, [ready]);

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    let frame = 0;
    let last = 0;
    let level = 0;
    let mouth = 0;
    let nextSyllable = 0;
    let opening = 0;
    let syllables = 0;
    const update = (now: number) => {
      const elapsed = last ? Math.min(64, now - last) : 16;
      last = now;
      const blend = 1 - Math.exp(-elapsed / 85);
      level += (targetLevel.current - level) * blend;
      element.style.setProperty('--input-level', level.toFixed(3));
      // Visual speech cadence only: no audio access or voice-engine changes.
      if (state === 'speaking' && ready && now >= nextSyllable) {
        syllables++;
        const pause = syllables % 7 === 0 || Math.random() < .15;
        opening = pause ? 0 : .3 + Math.random() * .65;
        nextSyllable = now + (pause ? 300 + Math.random() * 350 : 95 + Math.random() * 125);
      }
      mouth += ((state === 'speaking' && ready ? opening : 0) - mouth) * blend;
      element.style.setProperty('--mouth-open', mouth.toFixed(3));
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => { cancelAnimationFrame(frame); };
  }, [state, ready]);

  return (
    <div ref={stage} className="livi-voice-stage" data-state={state}
      data-ready={ready} data-blinking={blinking}>
      <div className="livi-voice-react">
        <div className="livi-voice-ack">
          <div className="livi-voice-mascot" role="img" aria-label="Livi, mascota de Alivia">
            <img className="livi-pose-normal" src={`${base}mascota-inicio-normal.webp`} alt="" draggable={false} />
            <img className="livi-pose-caring" src={`${base}mascota-inicio-comprensiva.webp`} alt="" draggable={false} />
            <img className="livi-pose-warm" src={`${base}mascota-inicio-feliz.webp`} alt="" draggable={false} />
            <img className="livi-pose-blink" src={`${base}mascota-inicio-parpadeo.webp`} alt="" draggable={false} />
            <svg className="livi-beak" viewBox="0 0 144 324" aria-hidden="true">
              <path d="M64 133H80V158H64Z" fill="white" />
              <path d="M65 147L72 136L79 147L72 158Z" fill="#efb925" />
              <path className="livi-beak-mouth" d="M67 146Q72 148 77 146L72 155Z" fill="#153321" />
            </svg>
          </div>
        </div>
      </div>
      <div className="livi-surroundings" aria-hidden="true">
        {state === 'listening' && <>
          {['left', 'right'].map(side => (
            <svg key={side} className={`livi-listen-signal livi-listen-${side}`} viewBox="0 0 36 48">
              <path d="M3 3Q20 24 3 45" />
              <path d="M13 8Q26 24 13 40" />
              <path d="M23 14Q31 24 23 34" />
            </svg>
          ))}
        </>}
        {state === 'transcribing' && (
          <svg className="livi-thought-signal" viewBox="0 0 70 48">
            <path className="livi-thought-link" d="M9 35L31 10L60 27" />
            <circle cx="9" cy="35" r="3.5" />
            <circle cx="31" cy="10" r="3.5" />
            <circle cx="60" cy="27" r="3.5" />
          </svg>
        )}
        {state === 'speaking' && <>
          <span className="livi-bla livi-bla-one">bla</span>
          <span className="livi-bla livi-bla-two">bla</span>
          <span className="livi-bla livi-bla-three">bla</span>
        </>}
      </div>
    </div>
  );
}
