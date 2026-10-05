import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
let chat = execFileSync('git', ['show','HEAD:src/views/ChatView.tsx'], { encoding: 'utf8' });
chat = chat.replace("import { ViaAvatar } from '../components/ViaAvatar';", "import { ViaAvatar } from '../components/ViaAvatar';\nimport { LiviVoice } from '../components/LiviVoice';");
chat = chat.replace('preloadVoices, unlockAudio }', 'preloadVoices, unlockAudio, playSpeechAudio }');
chat = chat.replace('Toca la burbuja para enviar', 'Toca a Livi para enviar');
// La prueba local usa el mismo panel y no añade controles a la interfaz.
chat = chat.replace("  const [voiceSession, setVoiceSession] = useState<VoiceSession>('idle');", "  const demoVoice = import.meta.env.DEV && new URLSearchParams(window.location.search).get('livi-preview') === '1';\n  const [voiceSession, setVoiceSession] = useState<VoiceSession>(demoVoice ? 'listening' : 'idle');");
chat = chat.replace('onClick={() => sendNowRef.current?.()}', `onClick={() => {
              if (!demoVoice) { sendNowRef.current?.(); return; }
              unlockAudio();
              setVoiceSession('transcribing');
              void fetch('/work/livi-preview-voz.wav').then(res => res.arrayBuffer()).then(async bytes => {
                setVoiceSession('speaking');
                await playSpeechAudio(bytes);
                setVoiceSession('listening');
              }).catch(() => setVoiceSession('listening'));
            }}`);
chat = chat.replace('              transform: `scale(${orbScale})`,', "              background: 'none',\n              boxShadow: 'none',\n              borderRadius: 0,");
chat = chat.replace("              animation: voiceSession === 'listening' ? 'orbPulse 2.4s ease-out infinite' : 'none',", "              animation: 'none',");
chat = chat.replace(`<div style={{ ...styles.orbInner, animation: voiceSession === 'speaking' ? 'softFloat 2.2s ease-in-out infinite' : 'none' }} />`, `<LiviVoice state={voiceSession} inputLevel={Math.max(0, (orbScale - 1) / .5)} />`);
fs.writeFileSync('src/views/ChatView.tsx', chat);
let css = fs.readFileSync('src/components/LiviVoice.css','utf8');
css = css.slice(css.indexOf('.livi-voice-react'));
css = css.replaceAll('.livi-voice[data-state=', '.livi-voice-stage[data-state=');
css = css.replace(/\.livi-voice-caption[^\n]*\n/g,'').replace(/\.livi-voice-wave[^\n]*\n/g,'');
css = css.replace(/@media \(max-height:[^\n]*\n/g,'');
css = css.replace('.livi-voice, .livi-voice *', '.livi-voice-stage, .livi-voice-stage *');
css = `.livi-voice-stage { --livi-gold: var(--accent-gold); position: relative; width: 90px; height: 203px; pointer-events: none; }\n[data-theme=mono] .livi-voice-mascot { filter: grayscale(1); }\n` + css;
css = css.replace('bottom: 35px', 'bottom: -4px').replace('top: 0;', 'top: -18px;');
fs.writeFileSync('src/components/LiviVoice.css',css);
