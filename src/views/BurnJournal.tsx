import React, { useState } from 'react';
import { PenTool, Trash2, Heart } from 'lucide-react';
import { ParticleCanvas } from '../components/ParticleCanvas';
import { saveJournalEntry, JournalRecord } from '../utils/journalDb';

interface BurnJournalProps {
  theme: 'light' | 'dark' | 'mono';
}

const VIA_COMFORT: Record<string, string> = {
  crisis: "Lo que escribiste es muy serio. Por favor, llévalo a alguien de confianza o a una línea de crisis hoy mismo; no tienes que enfrentarlo solo/a.",
  ansiedad: "VIA notó que hoy te pesaba mucho la ansiedad. Lo quiero tener en cuenta para acompañarte mejor. Respira lento, estás segura/o aquí.",
  tristeza: "VIA sabe que hoy fue una carga triste de soltar. Lo tendré presente para cuidarte. Tu pecho se vuelve más ligero ahora.",
  enojo: "Ese enojo merecía salir. VIA lo tiene en cuenta y te acompaña para canalizarlo con calma, paso a paso.",
  soledad: "VIA te escuchó en esa soledad y no estás solo/a que lo escribas. Estoy aquí contigo para que no lo cargues a solas.",
  miedo: "Ese miedo era muy tuyo, te creo. VIA lo guarda con cuidado y te ayudará a sentirte más segura/o.",
  crisis_valor: "",
};

const therapeuticQuotes = [
  "Lo has soltado muy bien. Siente cómo tu pecho se vuelve más ligero. Todo va a estar bien.",
  "El dolor que escribiste ya no vive aquí. Respira profundamente y deja que el viento se lo lleve.",
  "No tienes que cargar con todo a solas. Está bien soltar. Eres valiente por expresarlo.",
  "Tus pensamientos son solo nubes pasando. Tú eres el cielo limpio que hay detrás.",
  "Esto también pasará. Te abrazamos en silencio. Sigue adelante paso a paso.",
];

export const BurnJournal: React.FC<BurnJournalProps> = ({ theme }) => {
  const [text, setText] = useState<string>('');
  const [isDissolving, setIsDissolving] = useState<boolean>(false);
  const [dissolvedText, setDissolvedText] = useState<string>('');
  const [comfortQuote, setComfortQuote] = useState<string | null>(null);
  const [viaNote, setViaNote] = useState<string | null>(null);

  const handleLetGo = () => {
    if (!text.trim()) return;
    const record: JournalRecord = saveJournalEntry(text);
    setViaNote(record.crisis ? VIA_COMFORT.crisis : (VIA_COMFORT[record.emotion] ?? null));
    setDissolvedText(text);
    setIsDissolving(true);
    setComfortQuote(null);
  };

  const handleDissolveComplete = () => {
    setIsDissolving(false);
    setText('');
    const randomIdx = Math.floor(Math.random() * therapeuticQuotes.length);
    setComfortQuote(therapeuticQuotes[randomIdx]);
  };

  const handleWriteAgain = () => {
    setComfortQuote(null);
    setViaNote(null);
  };

  return (
    <div className="fade-in flex flex-col gap-4">
      <div className="glass-card" style={styles.infoCard}>
        <div style={styles.header}>
          <PenTool size={16} color="var(--accent-lavender)" />
          <h3 className="title-small" style={{ color: 'var(--text-primary)' }}>DIARIO DE DESAHOGO</h3>
        </div>
        <p className="body-standard" style={{ marginTop: '8px', fontSize: '13px', opacity: 0.8 }}>
          Escribe lo que te enoja, te asusta o te da ansiedad. Al terminar, presiona "Dejar Ir" y observa cómo tus pensamientos se disuelven y se desvanecen para siempre de manera segura.
        </p>
      </div>

      <div className="glass-card" style={styles.notebookCard}>
        {comfortQuote ? (
          <div className="fade-in" style={styles.comfortContainer}>
            <div style={styles.comfortHeartGlow}>
              <Heart size={32} color="var(--accent-rose)" />
            </div>
            <h3 className="title-medium" style={{ color: 'var(--accent-rose)', fontSize: '20px' }}>Pensamiento liberado</h3>
            <p className="body-lead text-center" style={styles.comfortQuote}>
              "{comfortQuote}"
            </p>
            {viaNote && (
              <p className="body-standard text-center" style={styles.viaNote}>
                💛 {viaNote}
              </p>
            )}
            <button
              onClick={handleWriteAgain}
              className="btn-primary"
              style={{ width: '80%', maxWidth: '220px', background: 'rgba(var(--accent-lavender-rgb), 0.12)', color: 'var(--accent-lavender)', marginTop: '8px' }}
            >
              Escribir de nuevo
            </button>
          </div>
        ) : (
          <div style={styles.editorContainer}>
            {(isDissolving || dissolvedText) && (
              <ParticleCanvas
                text={dissolvedText}
                isDissolving={isDissolving}
                onComplete={handleDissolveComplete}
                theme={theme}
              />
            )}

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="¿Qué te abruma hoy? No te contengas, nadie lo leerá..."
              disabled={isDissolving}
              style={{
                ...styles.textarea,
                opacity: isDissolving ? 0 : 1,
                pointerEvents: isDissolving ? 'none' : 'auto',
                color: theme === 'dark' ? 'rgba(240, 247, 244, 0.75)' : 'rgba(27, 38, 34, 0.75)',
              }}
            />

            {!isDissolving && (
              <div className="flex justify-between items-center" style={{ marginTop: '12px', opacity: text.trim() ? 1 : 0.5, transition: 'opacity 0.2s' }}>
                <span className="body-standard" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {text.length} caracteres
                </span>
                <button
                  onClick={handleLetGo}
                  disabled={!text.trim()}
                  className="btn-primary"
                  style={{
                    ...styles.burnBtn,
                    background: text.trim() ? 'rgba(var(--accent-lavender-rgb), 0.15)' : 'rgba(255,255,255,0.02)',
                    color: text.trim() ? 'var(--accent-lavender)' : 'var(--text-muted)',
                    cursor: text.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Trash2 size={14} />
                  Dejar Ir
                </button>
              </div>
            )}

            {isDissolving && (
              <div style={styles.dissolvingIndicator}>
                <span style={styles.dissolvingText}>Liberando tu mente...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  infoCard: {
    background: 'linear-gradient(135deg, rgba(var(--accent-lavender-rgb), 0.08) 0%, rgba(var(--accent-rose-rgb), 0.03) 100%)',
    border: '1px solid rgba(var(--accent-lavender-rgb), 0.12)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  notebookCard: {
    minHeight: '320px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    padding: '20px',
    background: 'rgba(0,0,0,0.12)',
  },
  editorContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    height: '100%',
  },
  textarea: {
    flex: 1,
    minHeight: '220px',
    background: 'transparent',
    border: 'none',
    resize: 'none',
    fontFamily: 'var(--font-body)',
    fontSize: '15px',
    fontWeight: 300,
    lineHeight: '1.6',
    outline: 'none',
    padding: '4px',
    transition: 'opacity 0.3s ease',
  },
  burnBtn: {
    width: 'auto',
    padding: '10px 20px',
    borderRadius: '16px',
    fontSize: '13px',
  },
  dissolvingIndicator: {
    position: 'absolute',
    bottom: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10,
  },
  dissolvingText: {
    fontSize: '12px',
    fontFamily: 'var(--font-title)',
    letterSpacing: '0.05em',
    color: 'var(--accent-lavender)',
    animation: 'pulseText 1.5s infinite alternate ease-in-out',
  },
  comfortContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    padding: '20px 10px',
  },
  comfortHeartGlow: {
    width: '68px',
    height: '68px',
    borderRadius: '50%',
    background: 'rgba(var(--accent-rose-rgb), 0.08)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 0 30px rgba(var(--accent-rose-rgb), 0.15)',
    animation: 'pulseHeartGlow 3s infinite alternate ease-in-out',
  },
  comfortQuote: {
    fontSize: '14px',
    lineHeight: '1.7',
    fontStyle: 'italic',
    color: 'var(--text-secondary)',
    maxWidth: '280px',
  },
  viaNote: {
    fontSize: '12.5px',
    lineHeight: '1.6',
    color: 'var(--accent-lavender)',
    maxWidth: '300px',
    opacity: 0.9,
  },
};

if (typeof document !== 'undefined') {
  const styleTag = document.createElement('style');
  styleTag.innerHTML = `
    @keyframes pulseText {
      0% { opacity: 0.5; }
      100% { opacity: 1; }
    }
    @keyframes pulseHeartGlow {
      0% { transform: scale(0.95); opacity: 0.8; }
      100% { transform: scale(1.05); opacity: 1; }
    }
  `;
  document.head.appendChild(styleTag);
}
