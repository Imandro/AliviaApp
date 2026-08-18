import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Sparkles, Phone, ShieldAlert, ArrowRight, RotateCcw, Mic, Volume2, VolumeX } from 'lucide-react';
import { getAiIntro } from '../utils/empatheticAI';
import { getAiReplyHybrid, hasOnlineAI, AiReply, AiTurn } from '../utils/aiProvider';

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

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export const ChatView: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [onlineMode, setOnlineMode] = useState<boolean>(false);
  const [lastSource, setLastSource] = useState<'groq' | 'rules' | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState<boolean>(() => {
    try {
      return localStorage.getItem(VOICE_KEY) !== 'off';
    } catch {
      return true;
    }
  });
  const [toast, setToast] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const showToast = useCallback((text: string) => {
    setToast(text);
    setTimeout(() => setToast(''), 2600);
  }, []);

  useEffect(() => {
    setOnlineMode(hasOnlineAI());
    const saved = loadHistory();
    const t = setTimeout(() => {
      if (saved.length > 0) {
        setMessages(saved);
      } else {
        const intro = getAiIntro();
        setMessages([{ role: 'ai', text: intro.text, suggest: intro.suggest, source: 'rules' }]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping, listening]);

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
    if (voiceOn && last && last.role === 'ai' && !last.isCrisis && !last.text.startsWith('Lo que me estás compartiendo')) {
      const t = setTimeout(() => speak(last.text), 350);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [messages, voiceOn]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
        window.speechSynthesis?.cancel();
      } catch {
        /* noop */
      }
    };
  }, []);

  const loadSpanishVoice = useCallback((): SpeechSynthesisVoice | null => {
    const synth = window.speechSynthesis;
    if (!synth) return null;
    const voices = synth.getVoices();
    if (voices.length === 0) return null;
    return (
      voices.find(v => v.lang.startsWith('es') && /google/i.test(v.name)) ||
      voices.find(v => v.lang.startsWith('es') && v.localService) ||
      voices.find(v => v.lang.startsWith('es')) ||
      null
    );
  }, []);

  const speak = useCallback((text: string) => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const clean = text.replace(/[💛🎉✅]/gu, '').replace(/\s+/g, ' ').trim();
    if (!clean) return;
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = 'es-ES';
    const voice = loadSpanishVoice();
    if (voice) utter.voice = voice;
    utter.rate = 0.94;
    utter.pitch = 0.95;
    utter.volume = 1;
    synth.speak(utter);
  }, [loadSpanishVoice]);

  const toggleMic = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      showToast('Tu navegador no soporta voz. Prueba Chrome o Edge.');
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = 'es-ES';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    recognitionRef.current = rec;
    rec.onresult = (event: any) => {
      const transcript: string = event?.results?.[0]?.[0]?.transcript ?? '';
      if (transcript) {
        setInput(transcript);
        setTimeout(() => handleSend(transcript), 150);
      }
    };
    rec.onerror = (event: any) => {
      setListening(false);
      if (event?.error === 'not-allowed') showToast('Permite el micrófono para hablar con VIA.');
      else if (event?.error === 'no-speech') showToast('No te escuché. Intenta de nuevo.');
    };
    rec.onend = () => setListening(false);
    try {
      rec.start();
      setListening(true);
    } catch {
      showToast('No se pudo iniciar el micrófono.');
    }
  }, [listening, showToast]);

  const handleSend = useCallback(async (textArg?: string) => {
    const text = (textArg ?? input).trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = { role: 'user', text };
    const history: AiTurn[] = messages
      .filter(m => m.role === 'user' || (m.role === 'ai' && m.text))
      .slice(-12)
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.role === 'user' ? m.text : m.text,
      }));

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const reply: AiReply = await getAiReplyHybrid(text, history);
    setLastSource(reply.source);

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
  }, [input, isTyping, messages]);

  const handleReset = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
    const intro = getAiIntro();
    setMessages([{ role: 'ai', text: intro.text, suggest: intro.suggest, source: 'rules' }]);
    setLastSource(null);
  };

  const statusLabel = lastSource === 'groq'
    ? 'IA en línea'
    : lastSource === 'rules'
      ? 'Modo guiado'
      : onlineMode
        ? 'IA en línea'
        : 'Modo guiado';

  const statusColor = lastSource === 'groq' || (onlineMode && lastSource !== 'rules')
    ? '#7fd6a1'
    : 'var(--accent-gold)';

  const speechSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  return (
    <div className="fade-in flex flex-col" style={{ height: '100%', minHeight: 'calc(100dvh - 280px)' }}>
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
                {statusLabel} · Puedes escribir • o hablar 🎙️
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

        {listening && (
          <div style={styles.listeningChip}>
            <span style={styles.listeningDot} />
            <span>Escuchándote…</span>
          </div>
        )}

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
          placeholder={listening ? 'Te estoy escuchando…' : 'Escribe o habla con VIA…'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          className="input-apple"
          style={{ flex: 1, padding: '12px 16px', fontSize: '13.5px' }}
        />
        <button
          onClick={toggleMic}
          disabled={!speechSupported}
          title="Hablar con VIA"
          style={{
            ...styles.micBtn,
            background: listening ? 'linear-gradient(135deg, #f43f5e, #be123c)' : 'rgba(255, 255, 255, 0.06)',
            border: `1px solid ${listening ? 'rgba(244, 63, 94, 0.6)' : 'var(--border-color)'}`,
            boxShadow: listening ? '0 0 20px rgba(244, 63, 94, 0.45)' : 'none',
          }}
        >
          <Mic size={16} color={listening ? '#fff' : 'var(--text-secondary)'} />
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
  listeningChip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    alignSelf: 'center',
    padding: '7px 16px',
    borderRadius: '999px',
    background: 'rgba(244, 63, 94, 0.1)',
    border: '1px solid rgba(244, 63, 94, 0.3)',
    fontSize: '12px',
    fontWeight: 700,
    color: '#fb7185',
    animation: 'fadeInFast 0.25s ease forwards',
  },
  listeningDot: {
    width: '9px',
    height: '9px',
    borderRadius: '50%',
    background: '#f43f5e',
    animation: 'pulseSoft 1.1s infinite',
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