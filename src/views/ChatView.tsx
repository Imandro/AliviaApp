import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Sparkles, Phone, ShieldAlert, ArrowRight, RotateCcw, Mic, Volume2, VolumeX, X } from 'lucide-react';
import { getAiIntro } from '../utils/empatheticAI';
import { getAiReplyHybrid, hasOnlineAI, transcribeWithGroq, AiReply, AiTurn } from '../utils/aiProvider';
import { speakNatural, stopSpeaking, preloadVoices } from '../utils/tts';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  suggest?: { label: string; path: string }[];
  isCrisis?: boolean;
  source?: 'groq' | 'rules';
}

const TYPING_MS = 900;
const STORAGE_KEY = 'alivia-chat-v1';
const VOICE_KEY = 'alivia-voice-v1';

const QUICK_PROMPTS = [
  'Me siento ansioso/a',
  'No estoy durmiendo bien',
  'Me siento solo/a',
  'Tengo presión por un examen',
];

type VoiceSession = 'idle' | 'listening' | 'transcribing';

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

const loadHistory = (): ChatMessage[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const ChatView: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [onlineMode, setOnlineMode] = useState<boolean>(false);
  const [lastSource, setLastSource] = useState<'groq' | 'rules' | null>(null);
  const [crisisMode, setCrisisMode] = useState(false);
  const [voiceSession, setVoiceSession] = useState<VoiceSession>('idle');
  const [orbScale, setOrbScale] = useState(1);
  const [voiceOn, setVoiceOn] = useState<boolean>(() => {
    try {
      return localStorage.getItem(VOICE_KEY) !== 'off';
    } catch {
      return true;
    }
  });
  const [toast, setToast] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const nativeRecRef = useRef<any>(null);
  const finishedRef = useRef(false);
  const handleSendRef = useRef<(textArg?: string) => Promise<void> | undefined>(() => undefined);

  const showToast = useCallback((text: string) => {
    setToast(text);
    setTimeout(() => setToast(''), 2600);
  }, []);

  useEffect(() => {
    setOnlineMode(hasOnlineAI());
    preloadVoices();
    const saved = loadHistory();
    const t = setTimeout(() => {
      if (saved.length > 0) {
        setMessages(saved);
        if (saved.some(m => m.isCrisis)) setCrisisMode(true);
      } else {
        const intro = getAiIntro();
        setMessages([{ role: 'ai', text: intro.text, suggest: intro.suggest, source: 'rules' }]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping, voiceSession]);

  useEffect(() => {
    try {
      localStorage.setItem(VOICE_KEY, voiceOn ? 'on' : 'off');
    } catch {
      /* noop */
    }
  }, [voiceOn]);

  useEffect(() => {
    if (messages.length === 0) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
      } catch {
        /* noop */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [messages]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (
      voiceOn && last && last.role === 'ai' && !last.isCrisis &&
      !last.text.startsWith('Lo que me estás compartiendo')
    ) {
      const t = setTimeout(() => { speakNatural(last.text); }, 350);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [messages, voiceOn]);

  useEffect(() => {
    return () => {
      stopSpeaking();
      stopVoiceInternals();
    };
  }, []);

  const stopVoiceInternals = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    analyserRef.current = null;
    try {
      nativeRecRef.current?.abort();
    } catch {
      /* noop */
    }
    nativeRecRef.current = null;
    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    } catch {
      /* noop */
    }
    recorderRef.current = null;
    chunksRef.current = [];
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const startVolumeLoop = useCallback((stream: MediaStream) => {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const vol = Math.min(1, sum / data.length / 85);
        const breath = 0.5 + 0.5 * Math.sin(Date.now() / 1900);
        setOrbScale(0.92 + vol * 0.5 + breath * 0.09);
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      /* noop */
    }
  }, []);

  const finishVoice = useCallback(async (transcript: string) => {
    finishedRef.current = true;
    stopVoiceInternals();
    setVoiceSession('idle');
    const text = transcript.trim();
    if (!text) {
      showToast('No te escuché. Intenta de nuevo.');
      return;
    }
    await handleSendRef.current(text);
  }, [showToast, stopVoiceInternals]);

  const startVoice = useCallback(async () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const canMic = !!(navigator.mediaDevices?.getUserMedia) || !!SR;
    if (!canMic) {
      showToast('Tu navegador no soporta el micrófono.');
      return;
    }

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      showToast('Permite el micrófono para hablar con VIA.');
      return;
    }
    streamRef.current = stream;
    finishedRef.current = false;
    setOrbScale(1);

    if (SR) {
      const rec = new SR();
      rec.lang = 'es-ES';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      nativeRecRef.current = rec;
      rec.onresult = (event: any) => {
        const transcript: string = event?.results?.[0]?.[0]?.transcript ?? '';
        if (transcript) finishVoice(transcript);
      };
      rec.onerror = (event: any) => {
        if (event?.error === 'no-speech' || event?.error === 'aborted') {
          if (!finishedRef.current) finishVoice('');
        } else if (event?.error === 'not-allowed') {
          showToast('Permite el micrófono para hablar con VIA.');
          finishVoice('');
        }
      };
      rec.onend = () => {
        if (!finishedRef.current) finishVoice('');
      };
      try {
        rec.start();
        setVoiceSession('listening');
        startVolumeLoop(stream);
      } catch {
        finishVoice('');
      }
      return;
    }

    try {
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', ''].find(t => MediaRecorder.isTypeSupported(t)) ?? '';
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        if (finishedRef.current) return;
        const blob = new Blob(chunksRef.current, { type: mime || 'audio/webm' });
        if (blob.size < 500) {
          finishVoice('');
          return;
        }
        setVoiceSession('transcribing');
        const transcript = await transcribeWithGroq(blob);
        finishVoice(transcript);
      };
      rec.start(500);
      setVoiceSession('listening');
      startVolumeLoop(stream);
    } catch {
      showToast('No se pudo iniciar el micrófono.');
      stopVoiceInternals();
      setVoiceSession('idle');
    }
  }, [finishVoice, showToast, startVolumeLoop, stopVoiceInternals]);

  const cancelVoice = useCallback(() => {
    finishedRef.current = true;
    stopVoiceInternals();
    setVoiceSession('idle');
  }, [stopVoiceInternals]);

  const handleSend = useCallback(async (textArg?: string) => {
    const text = (textArg ?? input).trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = { role: 'user', text };
    const history: AiTurn[] = messages
      .filter(m => m.role === 'user' || (m.role === 'ai' && m.text))
      .slice(-12)
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const reply: AiReply = await getAiReplyHybrid(text, history, crisisMode);
    setLastSource(reply.source);
    if (reply.isCrisis) setCrisisMode(true);

    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: reply.text,
        suggest: reply.suggest,
        isCrisis: reply.isCrisis,
        source: reply.source,
      }]);
      setIsTyping(false);
    }, TYPING_MS + Math.min(text.length * 25, 800));
  }, [input, isTyping, messages, crisisMode]);

  handleSendRef.current = handleSend;

  const handleReset = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
    const intro = getAiIntro();
    setMessages([{ role: 'ai', text: intro.text, suggest: intro.suggest, source: 'rules' }]);
    setLastSource(null);
    setCrisisMode(false);
  };

  const statusLabel = crisisMode
    ? 'Acompañando en crisis'
    : lastSource === 'groq'
      ? 'IA en línea'
      : lastSource === 'rules'
        ? 'Modo guiado'
        : onlineMode
          ? 'IA en línea'
          : 'Modo guiado';

  const statusColor = crisisMode
    ? '#ff8a80'
    : lastSource === 'groq' || (onlineMode && lastSource !== 'rules')
      ? '#7fd6a1'
      : 'var(--accent-gold)';

  const speechSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition || navigator.mediaDevices?.getUserMedia);

  return (
    <div className="fade-in flex flex-col" style={{ height: '100%', minHeight: 'calc(100dvh - 280px)' }}>
      {voiceSession !== 'idle' && (
        <div style={styles.orbOverlay}>
          <div style={styles.orbBg}/>
          <div style={styles.orbHalo1} />
          <div style={styles.orbHalo2} />
          <button
            onClick={cancelVoice}
            style={styles.orbClose}
            aria-label="Cancelar voz"
          >
            <X size={20} color="rgba(255,255,255,0.85)" />
          </button>
          <div
            style={{
              ...styles.orbCore,
              transform: `scale(${orbScale})`,
              opacity: voiceSession === 'transcribing' ? 0.8 : 1,
            }}
          >
            <div style={styles.orbInner} />
          </div>
          <div
            style={{
              ...styles.orbRing,
              borderColor: voiceSession === 'transcribing' ? 'rgba(246, 211, 101, 0.5)' : 'rgba(167, 139, 250, 0.4)',
            }}
          />
          <div style={styles.orbRing2} />
          {voiceSession === 'transcribing' && <div style={styles.orbPulse} />}
        </div>
      )}

      <div className="glass-card flex flex-col gap-3" style={styles.introCard}>
        <div style={styles.introHeader}>
          <div style={styles.badgeGlow}>
            <Sparkles size={15} color="var(--accent-gold)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 className="title-small" style={{ color: 'var(--text-primary)' }}>VIA · ORIENTACIÓN EMOCIONAL</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: statusColor, display: 'inline-block', boxShadow: `0 0 8px ${statusColor}` }} />
              <p className="body-standard" style={{ fontSize: '10.5px', opacity: 0.7 }}>
                {statusLabel} · Escribe • o habla 🎙️
              </p>
            </div>
          </div>
          <button
            onClick={() => setVoiceOn(v => !v)}
            style={{
              ...styles.iconBtn,
              background: voiceOn ? 'rgba(var(--accent-gold-rgb), 0.14)' : 'rgba(0,0,0,0.12)',
              border: `1px solid ${voiceOn ? 'rgba(var(--accent-gold-rgb), 0.35)' : 'var(--border-color)'}`,
            }}
            title={voiceOn ? 'Silenciar la voz de VIA' : 'Activar la voz de VIA'}
          >
            {voiceOn ? <Volume2 size={15} color="var(--accent-gold)" /> : <VolumeX size={15} color="var(--text-muted)" />}
          </button>
          {messages.length > 1 && (
            <button onClick={handleReset} style={styles.iconBtn} title="Reiniciar conversación">
              <RotateCcw size={14} color="var(--text-muted)" />
            </button>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        style={styles.chatScroll}
        className="flex flex-col gap-3"
      >
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div
              className="fade-in"
              style={{
                ...styles.bubble,
                ...(msg.role === 'user' ? styles.userBubble : msg.isCrisis ? styles.crisisBubble : styles.aiBubble),
              }}
            >
              {msg.isCrisis && (
                <div style={styles.crisisHeader}>
                  <ShieldAlert size={14} color="#ff8a80" />
                  <span style={{ fontWeight: 700, fontSize: '11px', color: '#ff8a80' }}>CRISIS DETECTADA</span>
                </div>
              )}
              <p className="body-standard" style={{ fontSize: '13.5px', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {msg.text}
              </p>

              {msg.suggest && msg.suggest.length > 0 && (
                <div style={styles.suggestWrap}>
                  {msg.suggest.map((s, j) => (
                    <button key={j} onClick={() => navigate(s.path)} style={styles.suggestBtn}>
                      <span style={styles.suggestLabel}>{s.label}</span>
                      <ArrowRight size={12} />
                    </button>
                  ))}
                </div>
              )}

              {msg.role === 'ai' && msg.source && (
                <span style={styles.sourceTag}>
                  {msg.source === 'groq' ? 'IA en línea' : 'Modo guiado'}
                </span>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ ...styles.bubble, ...styles.aiBubble }} className="fade-in">
              <div style={styles.typingDots}>
                <span style={styles.dot} />
                <span style={{ ...styles.dot, animationDelay: '0.2s' }} />
                <span style={{ ...styles.dot, animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {messages.length >= 2 && messages.length < 6 && (
        <div style={styles.quickRow}>
          {QUICK_PROMPTS.map((q) => (
            <button key={q} onClick={() => handleSend(q)} style={styles.quickChip}>
              {q}
            </button>
          ))}
        </div>
      )}

      <div style={styles.inputBar}>
        <input
          type="text"
          placeholder="Escribe o habla con VIA…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          className="input-apple"
          style={{ flex: 1, padding: '12px 16px', fontSize: '13.5px' }}
        />
        <button
          onClick={startVoice}
          disabled={!speechSupported}
          title="Hablar con VIA"
          style={{
            ...styles.micBtn,
            background: voiceSession !== 'idle' ? 'linear-gradient(135deg, #f43f5e, #be123c)' : 'rgba(255, 255, 255, 0.06)',
            border: `1px solid ${voiceSession !== 'idle' ? 'rgba(244, 63, 94, 0.6)' : 'var(--border-color)'}`,
            boxShadow: voiceSession !== 'idle' ? '0 0 20px rgba(244, 63, 94, 0.45)' : 'none',
          }}
        >
          <Mic size={16} color={voiceSession !== 'idle' ? '#fff' : 'var(--text-secondary)'} />
        </button>
        <button onClick={() => handleSend()} disabled={!input.trim() || isTyping} style={styles.sendBtn}>
          <Send size={16} color="#fff" />
        </button>
      </div>

      {toast && (
        <div style={styles.toast}>
          {toast}
        </div>
      )}

      <button onClick={() => navigate('/sos')} style={styles.sosInline}>
        <Phone size={13} color="#ff8a80" />
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          En crisis? Líneas de ayuda gratuitas y contacto de emergencia →
        </span>
      </button>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  orbOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    background: 'radial-gradient(circle at 50% 42%, #241d4d 0%, #14102b 55%, #0a0818 100%)',
    animation: 'fadeInFast 0.3s ease forwards',
  },
  orbBg: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at 50% 45%, rgba(167,139,250,0.16) 0%, rgba(124,111,232,0.06) 45%, transparent 70%)',
  },
  orbHalo1: {
    position: 'absolute',
    width: '420px',
    height: '420px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(246,211,101,0.10) 0%, rgba(127,214,161,0.05) 40%, transparent 70%)',
    animation: 'spinSlow 26s linear infinite',
  },
  orbHalo2: {
    position: 'absolute',
    width: '560px',
    height: '560px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(244,168,195,0.06) 0%, transparent 65%)',
    animation: 'spinSlowRev 34s linear infinite',
  },
  orbClose: {
    position: 'absolute',
    top: 'max(18px, env(safe-area-inset-top))',
    right: '18px',
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.16)',
    background: 'rgba(255,255,255,0.07)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 5,
  },
  orbCore: {
    position: 'relative',
    zIndex: 2,
    width: '180px',
    height: '180px',
    borderRadius: '50%',
    background: 'radial-gradient(circle at 34% 28%, #f6d365 0%, #a78bfa 55%, #7fd6a1 100%)',
    boxShadow: '0 0 90px rgba(167,139,250,0.55), 0 0 180px rgba(246,211,101,0.25), inset 0 0 40px rgba(255,255,255,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.4s ease',
    willChange: 'transform',
  },
  orbInner: {
    width: '110px',
    height: '110px',
    borderRadius: '50%',
    background: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.15) 60%, transparent 100%)',
  },
  orbRing: {
    position: 'absolute',
    width: '280px',
    height: '280px',
    borderRadius: '50%',
    border: '1.5px solid rgba(167,139,250,0.4)',
    animation: 'spinSlow 14s linear infinite',
    transition: 'border-color 0.4s ease',
  },
  orbRing2: {
    position: 'absolute',
    width: '340px',
    height: '340px',
    borderRadius: '50%',
    border: '1px dashed rgba(246,211,101,0.22)',
    animation: 'spinSlowRev 22s linear infinite',
  },
  orbPulse: {
    position: 'absolute',
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    background: 'rgba(167,139,250,0.2)',
    animation: 'orbPing 1.1s ease-out infinite',
  },
  introCard: {
    padding: '14px 16px',
  },
  introHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  badgeGlow: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    background: 'rgba(var(--accent-gold-rgb), 0.12)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 0 14px rgba(var(--accent-gold-rgb), 0.15)',
  },
  iconBtn: {
    background: 'none',
    border: '1px solid transparent',
    cursor: 'pointer',
    padding: '7px',
    borderRadius: '11px',
    flexShrink: 0,
    transition: 'all 0.2s',
  },
  chatScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '14px 2px',
    maxHeight: '50dvh',
    scrollbarWidth: 'thin',
  },
  bubble: {
    maxWidth: '88%',
    padding: '12px 14px',
    borderRadius: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    position: 'relative',
  },
  aiBubble: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border-color)',
    borderBottomLeftRadius: '6px',
  },
  userBubble: {
    background: 'linear-gradient(135deg, rgba(var(--accent-gold-rgb), 0.25) 0%, rgba(var(--accent-sage-rgb), 0.15) 100%)',
    border: '1px solid rgba(var(--accent-gold-rgb), 0.2)',
    borderBottomRightRadius: '6px',
  },
  crisisBubble: {
    background: 'rgba(211, 47, 47, 0.1)',
    border: '1.5px solid rgba(211, 47, 47, 0.4)',
    borderBottomLeftRadius: '6px',
  },
  crisisHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  sourceTag: {
    fontSize: '9.5px',
    color: 'var(--text-muted)',
    opacity: 0.65,
    alignSelf: 'flex-start',
    letterSpacing: '0.4px',
  },
  suggestWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginTop: '2px',
  },
  suggestBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '12px',
    background: 'rgba(var(--accent-gold-rgb), 0.08)',
    border: '1px solid rgba(var(--accent-gold-rgb), 0.15)',
    cursor: 'pointer',
    color: 'var(--accent-gold)',
    fontSize: '12px',
    fontFamily: 'var(--font-title)',
    transition: 'all 0.2s',
  },
  suggestLabel: {
    fontWeight: 500,
  },
  typingDots: {
    display: 'flex',
    gap: '5px',
    padding: '4px 2px',
  },
  dot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: 'var(--text-muted)',
    animation: 'typingBounce 1.2s infinite',
  },
  quickRow: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    padding: '4px 2px 8px',
    scrollbarWidth: 'none',
  },
  quickChip: {
    flexShrink: 0,
    padding: '8px 13px',
    borderRadius: '999px',
    border: '1px solid rgba(var(--accent-gold-rgb), 0.25)',
    background: 'rgba(var(--accent-gold-rgb), 0.08)',
    color: 'var(--accent-gold)',
    fontSize: '11.5px',
    fontWeight: 700,
    fontFamily: 'var(--font-title)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  inputBar: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
  },
  micBtn: {
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.25s',
  },
  sendBtn: {
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    border: 'none',
    background: 'linear-gradient(135deg, var(--accent-gold) 0%, var(--accent-sage) 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    boxShadow: '0 6px 18px rgba(var(--accent-gold-rgb), 0.35)',
    transition: 'all 0.25s',
    opacity: 1,
    flexShrink: 0,
  },
  toast: {
    alignSelf: 'center',
    marginTop: '8px',
    padding: '8px 14px',
    borderRadius: '999px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-color)',
    fontSize: '11.5px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    animation: 'fadeInFast 0.25s ease forwards',
    zIndex: 5,
  },
  sosInline: {
    marginTop: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '6px',
  },
};