import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCrisisContext } from '../hooks/useCrisisContext';
import { Send, Phone, ShieldAlert, ShieldCheck, ArrowRight, RotateCcw, Mic, Volume2, VolumeX, X } from 'lucide-react';
import { getNavigationIntent } from '../utils/empatheticAI';
import { ViaAvatar } from '../components/ViaAvatar';
import {
  streamAiReply,
  hasOnlineAI,
  transcribeAudio,
  type AiReply,
  type AiTurn,
} from '../utils/aiProvider';
import { speakNatural, stopSpeaking, preloadVoices, unlockAudio } from '../utils/tts';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  suggest?: { label: string; path: string }[];
  isCrisis?: boolean;
  source?: 'groq' | 'rules';
}

const STORAGE_KEY = 'alivia-chat-v1';
const VOICE_KEY = 'alivia-voice-v1';

const QUICK_PROMPTS = [
  'Me siento ansioso/a',
  'No estoy durmiendo bien',
  'Me siento solo/a',
  'Tengo presión por un examen',
];

type VoiceSession = 'idle' | 'listening' | 'transcribing' | 'speaking';
type OrbTheme = 'dark' | 'light' | 'mono';

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

const getOrbTheme = (): OrbTheme => {
  try {
    const t = document.documentElement.getAttribute('data-theme');
    if (t === 'light' || t === 'mono') return t;
  } catch {
    /* noop */
  }
  return 'dark';
};

const ORB_BG: Record<OrbTheme, string> = {
  dark: 'radial-gradient(circle at 50% 42%, #23372b 0%, #16251c 55%, #0d1810 100%)',
  light: 'radial-gradient(circle at 50% 42%, #f2f3e8 0%, #e5e9dd 55%, #d5dbd0 100%)',
  mono: 'radial-gradient(circle at 50% 42%, #171717 0%, #0e0e0e 55%, #000000 100%)',
};

const ORB_LABEL: Record<Exclude<VoiceSession, 'idle'>, string> = {
  listening: 'Te escucho…',
  transcribing: 'Entendiendo…',
  speaking: 'VIA está respondiendo…',
};

const ORB_HINT: Record<Exclude<VoiceSession, 'idle'>, string> = {
  listening: 'Toca la burbuja para enviar',
  transcribing: 'Un momento…',
  speaking: 'Escucho cuando termines',
};

export const ChatView: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [onlineMode, setOnlineMode] = useState<boolean>(false);
  const [lastSource, setLastSource] = useState<'groq' | 'rules' | null>(null);
  const [crisisMode, setCrisisMode] = useState(false);
  const [voiceSession, setVoiceSession] = useState<VoiceSession>('idle');
  const [orbScale, setOrbScale] = useState(1);
  const [orbTheme, setOrbTheme] = useState<OrbTheme>('dark');
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
  const volumeDataRef = useRef<Uint8Array | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const nativeRecRef = useRef<any>(null);
  const voiceRunRef = useRef<AbortController | null>(null);
  const sendAbortRef = useRef<AbortController | null>(null);
  const quietMsRef = useRef(0);
  const spokenRef = useRef('');
  const messagesRef = useRef<ChatMessage[]>([]);
  const crisisRef = useRef(false);
  const sendNowRef = useRef<(() => void) | null>(null);
  const pendingNavRef = useRef<{ path: string; label: string } | null>(null);
  messagesRef.current = messages;
  crisisRef.current = crisisMode;

  // Crisis detection from user messages
  useCrisisContext({ lastUserMessage: messages[messages.length - 1]?.text });

  const isAIActive = isTyping || streamingText.length > 0;

  const [voiceEngaged, setVoiceEngaged] = useState(false);

  const showToast = useCallback((text: string) => {
    setToast(text);
    setTimeout(() => setToast(''), 2600);
  }, []);

  useEffect(() => {
    setOnlineMode(hasOnlineAI());
    preloadVoices();
    const saved = loadHistory();
    // Sin globo de bienvenida: la conversacion la abre siempre la persona.
    // Antes habia un setTimeout de 300ms que solo servia para que ese globo
    // apareciera despues, y durante ese tiempo la lista quedaba vacia.
    if (saved.length > 0) {
      setMessages(saved);
      if (saved.some(m => m.isCrisis)) setCrisisMode(true);
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping, streamingText, voiceSession]);

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
      voiceOn && voiceEngaged && voiceSession === 'idle' &&
      last && last.role === 'ai' &&
      last.text !== spokenRef.current
    ) {
      const t = setTimeout(() => {
        spokenRef.current = last.text;
        speakNatural(last.text);
      }, 350);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [messages, voiceOn, voiceEngaged, voiceSession]);

  useEffect(() => {
    return () => {
      voiceRunRef.current?.abort();
      stopSpeaking();
      stopVoiceInternals();
    };
  }, []);

  const stopVoiceInternals = useCallback(() => {
    voiceRunRef.current?.abort();
    sendNowRef.current = null;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    analyserRef.current = null;
    volumeDataRef.current = null;
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

  const isQuiet = useCallback((): boolean => {
    const anal = analyserRef.current;
    if (!anal) return false;
    if (!volumeDataRef.current) volumeDataRef.current = new Uint8Array(anal.frequencyBinCount);
    const data = volumeDataRef.current;
    anal.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    return sum / data.length < 24;
  }, []);

  const listenOnce = useCallback((ac: AbortSignal): Promise<string | null> => {
    return new Promise((resolve) => {
      let done = false;
      let triggerSend: (() => void) | null = null;
      const settle = (v: string | null) => {
        if (done) return;
        done = true;
        sendNowRef.current = null;
        resolve(v);
      };

      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        let lastInterim = '';
        const rec = new SR();
        rec.lang = 'es-ES';
        rec.interimResults = true;
        rec.maxAlternatives = 1;
        nativeRecRef.current = rec;
        rec.onresult = (event: any) => {
          let interim = '';
          for (let i = 0; i < (event?.results?.length ?? 0); i++) {
            const r = event.results[i];
            if (r?.isFinal) {
              const t: string = r[0]?.transcript ?? '';
              settle(t || null);
              try { rec.abort(); } catch { /* noop */ }
              return;
            }
            interim += r[0]?.transcript ?? '';
          }
          if (interim) lastInterim = interim;
        };
        rec.onerror = (event: any) => {
          if (event?.error === 'not-allowed') {
            showToast('Permite el micrófono para hablar con VIA.');
          }
          settle(null);
        };
        rec.onend = () => settle(null);
        ac.addEventListener('abort', () => {
          try { rec.abort(); } catch { /* noop */ }
          settle(null);
        }, { once: true });
        triggerSend = () => {
          if (done) return;
          if (lastInterim.trim()) {
            try { rec.abort(); } catch { /* noop */ }
            settle(lastInterim.trim());
          }
        };
        sendNowRef.current = triggerSend;
        try {
          rec.start();
        } catch {
          settle(null);
        }
        return;
      }

      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', ''].find(t => MediaRecorder.isTypeSupported(t)) ?? '';
      const stream = streamRef.current;
      if (!stream) {
        settle(null);
        return;
      }
      let rec: MediaRecorder | null = null;
      try {
        rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      } catch {
        settle(null);
        return;
      }
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        if (done) return;
        recorderRef.current = null;
        const blob = new Blob(chunksRef.current, { type: mime || 'audio/webm' });
        if (blob.size < 500) {
          settle(null);
          return;
        }
        const transcript = await transcribeAudio(blob);
        settle(transcript || null);
      };
      triggerSend = () => {
        if (done || !rec || rec.state !== 'recording') return;
        quietMsRef.current = 0;
        rec.stop();
      };
      sendNowRef.current = triggerSend;
      const silentCheck = window.setInterval(() => {
        if (done || !rec || rec.state !== 'recording') return;
        if (isQuiet()) {
          quietMsRef.current += 300;
          if (quietMsRef.current >= 2200) {
            quietMsRef.current = 0;
            rec.stop();
          }
        } else {
          quietMsRef.current = 0;
        }
      }, 300);
      ac.addEventListener('abort', () => {
        window.clearInterval(silentCheck);
        try { rec?.stop(); } catch { /* noop */ }
      }, { once: true });
      try {
        rec.start(500);
      } catch {
        window.clearInterval(silentCheck);
        settle(null);
      }
    });
  }, [isQuiet, showToast]);

  const sendCore = useCallback(async (text: string): Promise<string | null> => {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const current = messagesRef.current;
    const userMsg: ChatMessage = { role: 'user', text: trimmed };
    const history: AiTurn[] = current
      .filter(m => m.role === 'user' || (m.role === 'ai' && m.text))
      .slice(-12)
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));
    const historyTexts = current
      .filter(m => m.text)
      .slice(-8)
      .map(m => m.text);

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);
    setStreamingText('');

    const abort = new AbortController();
    sendAbortRef.current = abort;

    let reply: AiReply;
    try {
      reply = await streamAiReply(trimmed, { history, crisisMode: crisisRef.current, historyTexts }, {
        signal: abort.signal,
        onDelta: (_delta, full) => {
          setStreamingText(full);
          setIsTyping(false);
        },
      });
    } catch {
      // Sin conexión o fallo del servicio: nunca dejar el indicador colgado
      setIsTyping(false);
      setStreamingText('');
      sendAbortRef.current = null;
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      setMessages(prev => [...prev, {
        role: 'ai',
        text: offline
          ? 'Se me fue la señal. Lo que escribas se guarda igual y sale solo cuando vuelvas; mientras, Respiratory y el Desahogo funcionan sin internet.'
          : 'No pude procesar eso. Inténtalo otra vez en un momento.',
        source: 'rules',
      }]);
      return null;
    }

    sendAbortRef.current = null;
    setStreamingText('');
    setLastSource(reply.source);
    setIsTyping(false);
    setCrisisMode(v => (reply.exitedCrisis ? false : reply.isCrisis ? true : v));

    setMessages(prev => [...prev, {
      role: 'ai',
      text: reply.text,
      suggest: reply.suggest,
      isCrisis: reply.isCrisis,
      source: reply.source,
    }]);

    const nav = !reply.isCrisis && reply.mode === 'normal' ? getNavigationIntent(trimmed) : null;
    pendingNavRef.current = nav;
    if (nav && !voiceRunRef.current) {
      setTimeout(() => {
        if (pendingNavRef.current === nav) {
          pendingNavRef.current = null;
          navigate(nav.path);
          showToast(`Te llevo al ${nav.label} ahora mismo.`);
        }
      }, 1400);
    }
    return reply.text;
  }, [navigate, showToast]);

  const handleSend = useCallback(async (textArg?: string) => {
    const text = (textArg ?? input).trim();
    if (!text || isTyping) return;
    unlockAudio();
    setInput('');
    await sendCore(text);
  }, [input, isTyping, sendCore]);

  const startVoice = useCallback(async () => {
    if (voiceRunRef.current) return;
    unlockAudio();
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
    setOrbScale(1);
    setOrbTheme(getOrbTheme());
    setVoiceEngaged(true);
    const ac = new AbortController();
    voiceRunRef.current = ac;
    startVolumeLoop(stream);

    while (!ac.signal.aborted) {
      setVoiceSession('listening');
      const transcript = await listenOnce(ac.signal);
      if (ac.signal.aborted) break;
      if (!transcript) continue;

      setVoiceSession('transcribing');
      const replyText = await sendCore(transcript);
      if (ac.signal.aborted) break;
      if (!replyText) continue;

      setVoiceSession('speaking');
      spokenRef.current = replyText;
      await speakNatural(replyText);
      if (pendingNavRef.current) {
        const nav = pendingNavRef.current;
        pendingNavRef.current = null;
        navigate(nav.path);
        showToast(`Te llevo al ${nav.label} ahora mismo.`);
        break;
      }
    }

    stopVoiceInternals();
    voiceRunRef.current = null;
    setVoiceSession('idle');
  }, [listenOnce, sendCore, showToast, startVolumeLoop, stopVoiceInternals]);

  const cancelVoice = useCallback(() => {
    voiceRunRef.current?.abort();
    stopSpeaking();
    stopVoiceInternals();
    setVoiceSession('idle');
  }, [stopVoiceInternals]);

  const handleReset = () => {
    sendAbortRef.current?.abort();
    sendAbortRef.current = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
    setMessages([]);
    setLastSource(null);
    setCrisisMode(false);
    setIsTyping(false);
    setStreamingText('');
    spokenRef.current = '';
  };

  /**
   * Salir del modo crisis a peticion de la persona. El clasificador solo lo hace
   * cuando ella dice que esta bien, pero tambien tiene que poder hacerlo sin
   * depender de acertar con la frase exacta.
   */
  const handleCrisisExit = useCallback(() => {
    setCrisisMode(false);
    setMessages(prev => [
      ...prev,
      {
        role: 'ai' as const,
        text: 'Gracias por decírmelo. Me alegra que estés en un momento más tranquilo. El SOS y las líneas de ayuda siguen aquí cuando los necesites, sin prisa.',
        suggest: [{ label: 'Ver líneas de ayuda (SOS)', path: '/sos' }],
        source: 'rules' as const,
      },
    ]);
  }, []);

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
    ? 'var(--crisis)'
    : lastSource === 'groq' || (onlineMode && lastSource !== 'rules')
      ? '#7fd6a1'
      : 'var(--accent-gold)';

  const speechSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition || navigator.mediaDevices?.getUserMedia);

  return (
    <div className="fade-in flex flex-col" style={{ height: '100%', minHeight: 'calc(100dvh - 280px)' }}>
      {voiceSession !== 'idle' && (
        <div style={{ ...styles.orbOverlay, background: ORB_BG[orbTheme] }}>
          <div style={styles.orbBg} />
          <div style={styles.orbHalo1} />
          <div style={styles.orbHalo2} />
          <button
            onClick={cancelVoice}
            style={styles.orbClose}
            aria-label="Cancelar voz"
          >
            <X size={20} color="var(--text-primary)" />
          </button>
          <div
            onClick={() => sendNowRef.current?.()}
            style={{
              ...styles.orbCore,
              transform: `scale(${orbScale})`,
              opacity: voiceSession === 'transcribing' ? 0.8 : 1,
              cursor: voiceSession === 'listening' ? 'pointer' : 'default',
              animation: voiceSession === 'listening' ? 'orbPulse 2.4s ease-out infinite' : 'none',
            }}
          >
            <div style={{ ...styles.orbInner, animation: voiceSession === 'speaking' ? 'softFloat 2.2s ease-in-out infinite' : 'none' }} />
          </div>
          <div
            style={{
              ...styles.orbRing,
              borderColor:
                voiceSession === 'transcribing'
                  ? 'rgba(var(--accent-lavender-rgb), 0.55)'
                  : voiceSession === 'speaking'
                    ? 'rgba(var(--accent-sage-rgb), 0.55)'
                    : 'rgba(var(--accent-gold-rgb), 0.5)',
            }}
          />
          <div style={styles.orbRing2} />
          {voiceSession === 'transcribing' && <div style={styles.orbPulse} />}
          <div style={styles.orbLabel}>
            {ORB_LABEL[voiceSession as Exclude<VoiceSession, 'idle'>]}
          </div>
          <div style={styles.orbHint}>
            {ORB_HINT[voiceSession as Exclude<VoiceSession, 'idle'>]}
          </div>
        </div>
      )}

      <div className="glass-card flex flex-col gap-3" style={styles.introCard}>
        <div style={styles.introHeader}>
          <div style={styles.badgeGlow}>
            <img
              src="/avatars/via-normal-64.png"
              alt="VIA, mascota de Alivia"
              style={styles.viaMascot}
            />
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
            onClick={() => { setVoiceOn(v => !v); setVoiceEngaged(true); }}
            style={{
              ...styles.iconBtn,
              background: voiceOn ? 'rgba(var(--accent-gold-rgb), 0.14)' : 'rgba(0,0,0,0.12)',
              border: `1px solid ${voiceOn ? 'rgba(var(--accent-gold-rgb), 0.35)' : 'var(--border-color)'}`,
            }}
            title={voiceOn ? 'Silenciar la voz de VIA' : 'Activar la voz de VIA'}
          >
            {voiceOn ? <Volume2 size={15} color="var(--accent-gold)" /> : <VolumeX size={15} color="var(--text-muted)" />}
          </button>
          {crisisMode && (
            <button
              onClick={handleCrisisExit}
              style={{ ...styles.iconBtn, borderColor: 'rgba(var(--crisis-rgb), 0.4)' }}
              title="Ya estoy bien, salir del modo crisis"
            >
              <ShieldCheck size={15} color="var(--crisis)" />
            </button>
          )}
          {messages.length > 0 && (
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
        {messages.map((msg, i) => {
          const esUser = msg.role === 'user';
          const previa = i > 0 ? messages[i - 1] : null;
          // El avatar va solo al abrir una racha: dentro de un mismo turno ya no
          // hace falta repetirlo y el hueco se lee como un descuadre.
          const abreRacha = !previa || previa.role !== msg.role || Boolean(msg.isCrisis) !== Boolean(previa.isCrisis);
          return (
          <div
            key={i}
            className={`chat-row${esUser ? ' chat-row--user' : ''}${abreRacha ? ' chat-row--lead' : ''}`}
            data-crisis={msg.isCrisis ? 'true' : undefined}
          >
            {!esUser && abreRacha && (
              <ViaAvatar pose={msg.isCrisis ? 'comprensiva' : 'normal'} size={28} />
            )}
            <div
              className={`fade-in bubble ${esUser ? 'bubble--user' : msg.isCrisis ? 'bubble--crisis' : 'bubble--ai'}`}
            >
              {msg.isCrisis && (
                <div className="crisis-header">
                  <ShieldAlert size={14} color="var(--crisis)" />
                  <span>CRISIS DETECTADA</span>
                </div>
              )}
              <p>{msg.text}</p>

              {msg.suggest && msg.suggest.length > 0 && (
                <div className="chat-suggest">
                  {msg.suggest.map((s, j) => (
                    <button key={j} onClick={() => navigate(s.path)}>
                      <span>{s.label}</span>
                      <ArrowRight size={12} />
                    </button>
                  ))}
                </div>
              )}

              {msg.role === 'ai' && msg.source && (
                <span className="chat-source">
                  {msg.source === 'groq' ? 'Acompañamiento en línea' : 'Modo guiado'}
                </span>
              )}
            </div>
          </div>
          );
        })}

        {streamingText && (
          <div className="chat-row chat-row--lead" data-crisis={crisisMode ? 'true' : undefined}>
            <ViaAvatar pose="normal" size={28} />
            <div className={`fade-in bubble ${crisisMode ? 'bubble--crisis' : 'bubble--ai'}`}>
              <p>
                {streamingText}
                <span className="chat-caret" />
              </p>
            </div>
          </div>
        )}

        {isTyping && !streamingText && (
          <div className="chat-row chat-row--lead" data-crisis={crisisMode ? 'true' : undefined}>
            <ViaAvatar pose="normal" size={28} />
            <div className="fade-in bubble bubble--ai">
              <div className="chat-wait">
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Con la lista vacia los chips hacen de unica ayuda visible, asi que tambien
          se muestran al abrir. Se ocultan mientras la IA responde (1 mensaje) y
          se retiran a los 6 para no saturar una conversacion ya empezada. */}
      {(messages.length === 0 || (messages.length >= 2 && messages.length < 6)) && (
        <div style={styles.quickRow}>
          {QUICK_PROMPTS.map((q) => (
            <button key={q} onClick={() => handleSend(q)} style={styles.quickChip}>
              {q}
            </button>
          ))}
        </div>
      )}

      <div
        style={{
          ...styles.inputBar,
          visibility: isAIActive ? 'hidden' : 'visible',
          opacity: isAIActive ? 0 : 1,
          pointerEvents: isAIActive ? 'none' : 'auto',
          height: isAIActive ? 0 : 'auto',
          overflow: isAIActive ? 'hidden' : 'visible',
          transition: 'opacity 0.2s ease, visibility 0.2s ease, height 0.2s ease',
          marginTop: isAIActive ? 0 : '4px',
        }}
      >
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
            disabled={!speechSupported || voiceSession !== 'idle'}
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
        <Phone size={13} color="var(--crisis)" />
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
    animation: 'fadeInFast 0.3s ease forwards',
  },
  orbBg: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at 50% 45%, rgba(var(--accent-gold-rgb), 0.13) 0%, rgba(var(--accent-sage-rgb), 0.06) 45%, transparent 70%)',
  },
  orbHalo1: {
    position: 'absolute',
    width: '420px',
    height: '420px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(var(--accent-gold-rgb), 0.10) 0%, rgba(var(--accent-sage-rgb), 0.05) 40%, transparent 70%)',
    animation: 'spinSlow 26s linear infinite',
  },
  orbHalo2: {
    position: 'absolute',
    width: '560px',
    height: '560px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(var(--accent-lavender-rgb), 0.07) 0%, transparent 65%)',
    animation: 'spinSlowRev 34s linear infinite',
  },
  orbClose: {
    position: 'absolute',
    top: 'max(18px, env(safe-area-inset-top))',
    right: '18px',
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    border: '1px solid var(--border-color-active)',
    background: 'rgba(0,0,0,0.06)',
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
    background: 'radial-gradient(circle at 34% 28%, var(--accent-gold) 0%, var(--accent-lavender) 50%, var(--accent-sage) 100%)',
    boxShadow: '0 0 90px rgba(var(--accent-sage-rgb), 0.45), 0 0 180px rgba(var(--accent-gold-rgb), 0.22), inset 0 0 40px rgba(255,255,255,0.25)',
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
    border: '1.5px solid rgba(var(--accent-gold-rgb), 0.5)',
    animation: 'spinSlow 14s linear infinite',
    transition: 'border-color 0.4s ease',
  },
  orbRing2: {
    position: 'absolute',
    width: '340px',
    height: '340px',
    borderRadius: '50%',
    border: '1px dashed rgba(var(--accent-gold-rgb), 0.25)',
    animation: 'spinSlowRev 22s linear infinite',
  },
  orbPulse: {
    position: 'absolute',
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    background: 'rgba(var(--accent-lavender-rgb), 0.25)',
    animation: 'orbPing 1.1s ease-out infinite',
  },
  orbLabel: {
    position: 'absolute',
    top: '70%',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: 'var(--font-display)',
    fontSize: '17px',
    fontWeight: 600,
    letterSpacing: '0.04em',
    color: 'var(--text-primary)',
    opacity: 0.85,
  },
  orbHint: {
    position: 'absolute',
    top: '76%',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: 'var(--font-title)',
    fontSize: '11px',
    letterSpacing: '0.03em',
    color: 'var(--text-primary)',
    opacity: 0.55,
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
    background: 'rgba(255, 255, 255, 0.92)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 0 14px rgba(var(--accent-gold-rgb), 0.15)',
    overflow: 'hidden',
    flexShrink: 0,
  },
  viaMascot: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
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