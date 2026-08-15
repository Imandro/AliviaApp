import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Sparkles, Phone, ShieldAlert, ArrowRight } from 'lucide-react';
import { getAiReply, getAiIntro } from '../utils/empatheticAI';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  suggest?: { label: string; path: string }[];
  isCrisis?: boolean;
}

const TYPING_MS = 1400;

export const ChatView: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const intro = getAiIntro();
      setMessages([{ role: 'ai', text: intro.text, suggest: intro.suggest }]);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isTyping) return;

    const reply = getAiReply(text);
    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: reply.text,
        suggest: reply.suggest,
        isCrisis: reply.isCrisis,
      }]);
      setIsTyping(false);
    }, TYPING_MS + Math.min(text.length * 40, 1200));
  };

  return (
    <div className="fade-in flex flex-col" style={{ height: '100%', minHeight: 'calc(100dvh - 280px)' }}>
      <div className="glass-card flex flex-col gap-3" style={styles.introCard}>
        <div style={styles.introHeader}>
          <div style={styles.badgeGlow}>
            <Sparkles size={15} color="var(--accent-gold)" />
          </div>
          <div>
            <h3 className="title-small" style={{ color: 'var(--text-primary)' }}>ORIENTACIÓN EMOCIONAL</h3>
            <p className="body-standard" style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>
              Conversa libremente. No soy un profesional clínico: soy un acompañamiento digital.
            </p>
          </div>
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