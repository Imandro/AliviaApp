import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Sparkles, Phone, ShieldAlert, ArrowRight, RotateCcw } from 'lucide-react';
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
  const scrollRef = useRef<HTMLDivElement>(null);

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
  }, [messages, isTyping]);

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

  const handleSend = useCallback(async () => {
    const text = input.trim();
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

  return (
    <div className="fade-in flex flex-col" style={{ height: '100%', minHeight: 'calc(100dvh - 280px)' }}>
      <div className="glass-card flex flex-col gap-3" style={styles.introCard}>
        <div style={styles.introHeader}>
          <div style={styles.badgeGlow}>
            <Sparkles size={15} color="var(--accent-gold)" />
          </div>
          <div style={{ flex: 1 }}>
            <h3 className="title-small" style={{ color: 'var(--text-primary)' }}>VIA · ORIENTACIÓN EMOCIONAL</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: statusColor, display: 'inline-block', boxShadow: `0 0 8px ${statusColor}` }} />
              <p className="body-standard" style={{ fontSize: '10.5px', opacity: 0.7 }}>
                {statusLabel} · Conversa libremente. No soy un profesional clínico: soy un acompañamiento digital.
              </p>
            </div>
          </div>
          {messages.length > 1 && (
            <button onClick={handleReset} style={styles.resetBtn} title="Reiniciar conversación">
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

      <div style={styles.inputBar}>
        <input
          type="text"
          placeholder="Cuéntame cómo te sientes…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          className="input-apple"
          style={{ flex: 1, padding: '12px 16px', fontSize: '13.5px' }}
        />
        <button onClick={handleSend} disabled={!input.trim() || isTyping} style={styles.sendBtn}>
          <Send size={16} color="#fff" />
        </button>
      </div>

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
  resetBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '10px',
    opacity: 0.75,
  },
  chatScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '14px 2px',
    maxHeight: '52dvh',
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
  inputBar: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
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