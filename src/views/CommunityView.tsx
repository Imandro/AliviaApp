import React, { useState, useEffect } from 'react';
import { Users, Heart, Send, ShieldCheck, MessageCircle } from 'lucide-react';
import { getPosts, createPost, likePost, type CommunityPost } from '../utils/localDb';

const TOPICS = ['todos', 'bienestar', 'ansiedad', 'tristeza', 'hábitos', 'historias', 'consejos'];

export const CommunityView: React.FC = () => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [topic, setTopic] = useState('todos');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [sending, setSending] = useState(false);
  const [likedSet, setLikedSet] = useState<Set<number>>(new Set());

  useEffect(() => {
    load(topic);
  }, [topic]);

  const load = async (t: string) => {
    const data = await getPosts(t);
    setPosts(data);
  };

  const handlePost = async () => {
    const text = content.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const post = await createPost(text, topic === 'todos' ? 'bienestar' : topic, author.trim() || 'Anónimo');
      setPosts(prev => [post, ...prev]);
      setContent('');
    } finally {
      setSending(false);
    }
  };

  const handleLike = async (postId: number) => {
    if (likedSet.has(postId)) return;
    await likePost(postId);
    setLikedSet(prev => new Set(prev).add(postId));
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: p.likes + 1 } : p));
  };

  const timeAgo = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  return (
    <div className="fade-in flex flex-col gap-4">
      <div className="glass-card flex flex-col gap-3" style={styles.heroCard}>
        <div style={styles.heroHeader}>
          <Users size={16} color="var(--accent-rose)" />
          <h3 className="title-small" style={{ color: 'var(--text-primary)' }}>COMUNIDAD GLOBAL</h3>
        </div>
        <p className="body-standard" style={{ fontSize: '12px', opacity: 0.75 }}>
          Un espacio moderado y seguro para compartir experiencias, consejos y mensajes de apoyo. Sé amable, siempre. 
        </p>

        <div style={styles.topicRow}>
          {TOPICS.map(t => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              style={{
                ...styles.topicBtn,
                ...(topic === t ? { background: 'rgba(var(--accent-rose-rgb), 0.15)', color: 'var(--accent-rose)', borderColor: 'rgba(var(--accent-rose-rgb), 0.25)' } : {}),
              }}
            >
              {t === 'todos' ? 'Todos' : t}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card flex flex-col gap-3">
        <div style={styles.cardHeader}>
          <MessageCircle size={15} color="var(--text-muted)" />
          <h4 className="title-small" style={{ fontSize: '12px' }}>COMPARTIR MENSAJE</h4>
        </div>
        <textarea
          placeholder="Comparte algo que te haya ayudado, una experiencia o un mensaje de apoyo… (sé respetuoso, el espacio es de todxs)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="input-apple"
          style={{ minHeight: '84px', resize: 'vertical', fontSize: '13px' }}
          maxLength={500}
        />
        <input
          type="text"
          placeholder="Tu nombre (opcional, se muestra como Anónimo)"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="input-apple"
          maxLength={30}
        />
        <div className="flex justify-between items-center">
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{content.length}/500</span>
          <button onClick={handlePost} disabled={!content.trim() || sending} className="btn-primary" style={{ padding: '10px 18px', borderRadius: '14px', fontSize: '12.5px' }}>
            <Send size={14} />
            Publicar
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {posts.length === 0 ? (
          <div className="glass-card flex flex-col items-center gap-2" style={{ padding: '28px', textAlign: 'center' }}>
            <ShieldCheck size={28} color="var(--text-muted)" style={{ opacity: 0.5 }} />
            <p className="body-standard" style={{ fontSize: '12px', opacity: 0.6 }}>
              Aún no hay mensajes en {topic}. ¡Sé la primera persona en compartir algo con la comunidad!
            </p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="glass-card fade-in" style={styles.postCard}>
              <div style={styles.postHeader}>
                <div style={styles.avatar}>
                  {post.author.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={styles.postAuthor}>{post.author}</span>
                  <span style={styles.postTime}> · {timeAgo(post.created_at)}</span>
                </div>
                <span style={styles.topicTag}>
                  {post.topic}
                </span>
              </div>
              <p className="body-standard" style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                {post.content}
              </p>
              <div style={styles.postFooter}>
                <button
                  onClick={() => handleLike(post.id)}
                  disabled={likedSet.has(post.id)}
                  style={{
                    ...styles.likeBtn,
                    ...(likedSet.has(post.id) ? { color: 'var(--accent-rose)', background: 'rgba(var(--accent-rose-rgb), 0.1)' } : {}),
                  }}
                >
                  <Heart size={15} fill={likedSet.has(post.id) ? 'var(--accent-rose)' : 'none'} />
                  <span>{post.likes}</span>
                </button>
                <span style={styles.calmaNote}> Todos estamos en proceso</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  heroCard: {
    background: 'linear-gradient(135deg, rgba(var(--accent-rose-rgb), 0.07) 0%, rgba(var(--accent-lavender-rgb), 0.03) 100%)',
    border: '1px solid rgba(var(--accent-rose-rgb), 0.12)',
    padding: '16px',
  },
  heroHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  topicRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  topicBtn: {
    padding: '8px 12px',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    background: 'rgba(0,0,0,0.15)',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-title)',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  postCard: {
    padding: '16px',
  },
  postHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
  },
  avatar: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(var(--accent-gold-rgb), 0.25), rgba(var(--accent-lavender-rgb), 0.25))',
    border: '1px solid rgba(var(--accent-gold-rgb), 0.25)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: 'var(--text-primary)',
    fontWeight: 600,
    fontSize: '14px',
    fontFamily: 'var(--font-title)',
  },
  postAuthor: {
    fontSize: '12.5px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-title)',
  },
  postTime: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  topicTag: {
    fontSize: '10.5px',
    fontFamily: 'var(--font-title)',
    color: 'var(--accent-lavender)',
    background: 'rgba(var(--accent-lavender-rgb), 0.1)',
    padding: '4px 9px',
    borderRadius: '10px',
    border: '1px solid rgba(var(--accent-lavender-rgb), 0.15)',
  },
  postFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '12px',
  },
  likeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'none',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '6px 12px',
    color: 'var(--text-muted)',
    fontSize: '12.5px',
    fontFamily: 'var(--font-title)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  calmaNote: {
    fontSize: '10.5px',
    color: 'var(--text-muted)',
    opacity: 0.7,
  },
};