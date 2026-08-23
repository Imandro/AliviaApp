import React, { useEffect, useState } from 'react';
import { CloudOff, Check, RefreshCw } from 'lucide-react';
import { t } from '../i18n';

/**
 * Indicador discreto del estado de sincronización offline-first:
 * - Muestra cuántos cambios esperan sincronización.
 * - Confirma cuando todo quedó sincronizado tras reconectar.
 */
export const SyncToast: React.FC = () => {
  const [pending, setPending] = useState(0);
  const [syncedVisible, setSyncedVisible] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const onPending = (e: Event) => {
      const count = (e as CustomEvent<{ count: number }>).detail?.count ?? 0;
      setPending(count);
      setSyncedVisible(false);
    };
    const onSynced = () => {
      const hadPending = pending > 0;
      setSyncing(false);
      if (hadPending) {
        window.setTimeout(() => {
          setSyncedVisible(true);
          window.setTimeout(() => setSyncedVisible(false), 2600);
        }, 150);
      }
      void checkPending();
    };
    const onFlushing = () => {
      if (pending > 0) setSyncing(true);
    };
    const checkPending = () => setPending(0);

    window.addEventListener('alivia:pending', onPending);
    window.addEventListener('alivia:synced', onSynced);
    window.addEventListener('alivia:flushing', onFlushing);
    return () => {
      window.removeEventListener('alivia:pending', onPending);
      window.removeEventListener('alivia:synced', onSynced);
      window.removeEventListener('alivia:flushing', onFlushing);
    };
  }, [pending]);

  if (!pending && !syncedVisible) return null;

  const pillStyle: React.CSSProperties = {
    position: 'fixed',
    left: '50%',
    transform: 'translateX(-50%)',
    bottom: 'calc(104px + env(safe-area-inset-bottom))',
    zIndex: 900,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '9px 16px',
    borderRadius: 999,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-color-glow)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
    color: syncedVisible ? '#7dd88f' : 'var(--text-secondary)',
    fontFamily: 'var(--font-title)',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.02em',
    pointerEvents: 'none',
    animation: 'fadeInFast 0.25s ease forwards',
    maxWidth: 'calc(100vw - 32px)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  };

  if (syncedVisible) {
    return (
      <div style={pillStyle} role="status">
        <Check size={14} /> {t('sync_done')}
      </div>
    );
  }

  return (
    <div style={pillStyle} role="status">
      {syncing ? <RefreshCw size={13} /> : <CloudOff size={14} />}
      {pending} {t('sync_pending')}
    </div>
  );
};
