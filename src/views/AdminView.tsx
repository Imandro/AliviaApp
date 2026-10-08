import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, ScrollText, BarChart3, ShieldAlert, ShieldCheck, Power, Search, RefreshCw } from 'lucide-react';
import { BackButton } from '../components/BackButton';
import type { SafeUser } from '../utils/auth';
import { canUser, roleOf, ROLE_CODES, ROLE_LABELS, type Role } from '../utils/roles';
import {
  listUsers, updateUser, fetchAudit, fetchStats,
  type AdminUser, type AuditEntry, type AdminStats,
} from '../utils/adminApi';
import { HttpError } from '../utils/apiClient';

type Tab = 'resumen' | 'usuarios' | 'bitacora';

/** Página de bitácora: 50 eventos por viaje, igual que el máximo del servidor. */
const AUDIT_PAGE = 50;

interface AdminViewProps {
  user: SafeUser;
}

const msg = (e: unknown, fallback: string): string =>
  e instanceof HttpError ? e.message : fallback;

/** ISO "2026-01-02T03:04:05Z" → "2026-01-02 03:04" (UTC), legible en la lista. */
const fmtDate = (iso: string | null): string =>
  iso ? iso.slice(0, 16).replace('T', ' ') : '—';

/**
 * Panel de administración. Cada pestaña pide su propio permiso: un admin ve
 * Resumen y Usuarios; un auditor ve Resumen y Bitácora; un usuario normal no
 * debería llegar (la entrada está oculta) y, si fuerza la URL, ve el aviso.
 *
 * La interfaz solo guía: cada acción la re-valida el servidor.
 */
export const AdminView: React.FC<AdminViewProps> = ({ user }) => {
  const canManage = canUser(user, 'users.manage');
  const canRead = canUser(user, 'audit.read');
  const canStats = canUser(user, 'stats.view');

  const tabs = useMemo<Tab[]>(() => {
    const list: Tab[] = [];
    if (canStats) list.push('resumen');
    if (canManage) list.push('usuarios');
    if (canRead) list.push('bitacora');
    return list;
  }, [canStats, canManage, canRead]);

  const [tab, setTab] = useState<Tab>(() => (canStats ? 'resumen' : canManage ? 'usuarios' : 'bitacora'));
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [auditOffset, setAuditOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Búsqueda con debounce: cada tecla no dispara un viaje al servidor.
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'resumen' && canStats) setStats(await fetchStats());
      if (tab === 'usuarios' && canManage) setUsers(await listUsers(debouncedSearch || undefined));
      if (tab === 'bitacora' && canRead) {
        setAudit(await fetchAudit(AUDIT_PAGE, 0));
        setAuditOffset(0);
      }
    } catch (e) {
      setError(msg(e, 'Sin conexión. Reintenta más tarde.'));
    } finally {
      setLoading(false);
    }
  }, [tab, debouncedSearch, canStats, canManage, canRead]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMoreAudit = useCallback(async () => {
    setLoadingMore(true);
    setError(null);
    try {
      const next = auditOffset + AUDIT_PAGE;
      const more = await fetchAudit(AUDIT_PAGE, next);
      setAudit((prev) => [...prev, ...more]);
      setAuditOffset(next);
    } catch (e) {
      setError(msg(e, 'Sin conexión. Reintenta más tarde.'));
    } finally {
      setLoadingMore(false);
    }
  }, [auditOffset]);

  const applyChange = useCallback(
    async (target: AdminUser, changes: { role?: Role; is_active?: boolean }) => {
      // Desactivar es destructivo e inmediato (cierra sesiones): se pide confirmación.
      if (changes.is_active === false) {
        const ok = window.confirm(`¿Desactivar la cuenta de ${target.name}? Se cerrarán todas sus sesiones.`);
        if (!ok) return;
      }
      setError(null);
      try {
        const updated = await updateUser(target.id, changes);
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
        setToast(`Cuenta de ${updated.name} actualizada`);
      } catch (e) {
        setError(msg(e, 'Sin conexión. La acción no se aplicó.'));
      }
    },
    []
  );

  const role = roleOf(user);

  if (!canManage && !canRead) {
    return (
      <div style={styles.wrap}>
        <BackButton to="/profile" label="Perfil" />
        <div style={styles.denied}>
          <ShieldAlert size={44} style={styles.deniedIcon} />
          <h2 style={styles.deniedTitle}>Acceso restringido</h2>
          <p style={styles.deniedText}>
            Tu rol ({ROLE_LABELS[role]}) no tiene permiso para ver este panel.
          </p>
        </div>
      </div>
    );
  }

  const auditHasMore = audit.length === auditOffset + AUDIT_PAGE;

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <BackButton to="/profile" label="Perfil" />
        <div style={styles.headerText}>
          <h2 style={styles.title}>Administración</h2>
          <span style={styles.roleBadge}>
            <ShieldCheck size={13} /> {ROLE_LABELS[role]}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          style={styles.refresh}
          title="Actualizar datos"
          aria-label="Actualizar datos"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      <div style={styles.tabBar} role="tablist">
        {tabs.includes('resumen') && (
          <TabBtn active={tab === 'resumen'} onClick={() => setTab('resumen')} icon={<BarChart3 size={15} />} label="Resumen" />
        )}
        {tabs.includes('usuarios') && (
          <TabBtn active={tab === 'usuarios'} onClick={() => setTab('usuarios')} icon={<Users size={15} />} label="Usuarios" />
        )}
        {tabs.includes('bitacora') && (
          <TabBtn active={tab === 'bitacora'} onClick={() => setTab('bitacora')} icon={<ScrollText size={15} />} label="Bitácora" />
        )}
      </div>

      {error && <p role="alert" style={styles.error}>{error}</p>}
      {loading && <p style={styles.hint}>Cargando…</p>}
      {!loading && !error && toast && <p role="status" style={styles.ok}>{toast}</p>}

      {tab === 'resumen' && canStats && <Resumen stats={stats} />}
      {tab === 'usuarios' && canManage && (
        <UsersPanel
          users={users}
          meId={user.id}
          onChange={applyChange}
          disabled={loading}
          search={search}
          onSearch={setSearch}
        />
      )}
      {tab === 'bitacora' && canRead && (
        <>
          <Bitacora entries={audit} />
          {auditHasMore && (
            <button
              type="button"
              style={styles.moreBtn}
              onClick={() => void loadMoreAudit()}
              disabled={loadingMore}
            >
              {loadingMore ? 'Cargando…' : 'Cargar más'}
            </button>
          )}
        </>
      )}
    </div>
  );
};

const TabBtn: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({
  active, onClick, icon, label,
}) => (
  <button
    type="button"
    role="tab"
    aria-selected={active}
    onClick={onClick}
    style={{ ...styles.tab, ...(active ? styles.tabActive : {}) }}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const Resumen: React.FC<{ stats: AdminStats | null }> = ({ stats }) => {
  if (!stats) return <p style={styles.hint}>Sin datos todavía.</p>;
  const cards: [string, number][] = [
    ['Cuentas totales', stats.users_total],
    ['Cuentas activas', stats.users_active],
    ['Administradores', stats.users_admin],
    ['Auditores', stats.users_auditor],
    ['Sesiones abiertas', stats.sessions_active],
    ['Chequeos totales', stats.assessments_total],
    ['Chequeos (30 días)', stats.assessments_30d],
    ['Contactos de crisis', stats.crisis_contacts],
    ['Publicaciones', stats.community_posts],
    ['Ánimo promedio', stats.mood_avg],
  ];
  return (
    <div style={styles.cardGrid}>
      {cards.map(([label, value]) => (
        <div key={label} style={styles.card}>
          <span style={styles.cardValue}>{value}</span>
          <span style={styles.cardLabel}>{label}</span>
        </div>
      ))}
    </div>
  );
};

const UsersPanel: React.FC<{
  users: AdminUser[];
  meId: string;
  onChange: (u: AdminUser, changes: { role?: Role; is_active?: boolean }) => void;
  disabled: boolean;
  search: string;
  onSearch: (q: string) => void;
}> = ({ users, meId, onChange, disabled, search, onSearch }) => (
  <>
    <label style={styles.searchBox}>
      <Search size={15} />
      <input
        type="search"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Buscar por usuario, correo o nombre…"
        style={styles.searchInput}
        aria-label="Buscar cuentas"
      />
    </label>
    <ul style={styles.list}>
      {users.map((u) => {
        const isMe = u.id === meId;
        return (
          <li key={u.id} style={styles.listItem}>
            <div style={styles.listMain}>
              <strong style={styles.listName}>{u.name}</strong>
              <span style={styles.listSub}>{u.username} · {u.email}</span>
              <span style={styles.listSub}>
                {u.is_active ? 'Activa' : 'Desactivada'} · último acceso: {fmtDate(u.last_access)}
              </span>
            </div>
            <div style={styles.listActions}>
              <label style={styles.fieldLabel}>
                Rol
                <select
                  value={u.role}
                  disabled={isMe || disabled}
                  onChange={(e) => onChange(u, { role: e.target.value as Role })}
                  style={styles.select}
                  title={isMe ? 'No puedes cambiar tu propio rol' : undefined}
                >
                  {ROLE_CODES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={isMe || disabled}
                onClick={() => onChange(u, { is_active: !u.is_active })}
                style={{
                  ...styles.toggle,
                  ...(u.is_active ? {} : styles.toggleOff),
                }}
                title={isMe ? 'No puedes desactivar tu propia cuenta' : undefined}
              >
                <Power size={14} />
                {u.is_active ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </li>
        );
      })}
      {users.length === 0 && (
        <li style={styles.hint}>
          {search ? `Sin resultados para «${search}».` : 'Sin cuentas registradas.'}
        </li>
      )}
    </ul>
  </>
);

const Bitacora: React.FC<{ entries: AuditEntry[] }> = ({ entries }) => (
  <ul style={styles.list}>
    {entries.map((e) => (
      <li key={e.id} style={styles.listItem}>
        <div style={styles.listMain}>
          <strong style={styles.listName}>{ACTION_LABELS[e.action] ?? e.action}</strong>
          <span style={styles.listSub}>{fmtDate(e.created_at)} UTC · {e.actor}</span>
          {Object.keys(e.detail ?? {}).length > 0 && (
            <span style={styles.listSub}>{JSON.stringify(e.detail)}</span>
          )}
        </div>
        <span style={styles.roleBadge}>{ROLE_LABELS[e.actor_role as Role] ?? e.actor_role}</span>
      </li>
    ))}
  </ul>
);

const ACTION_LABELS: Record<string, string> = {
  'user.role_change': 'Cambio de rol',
  'user.deactivate': 'Cambio de estado de cuenta',
};

const styles: { [key: string]: React.CSSProperties } = {
  wrap: { padding: '18px 16px 96px', maxWidth: 720, margin: '0 auto', width: '100%' },
  header: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 },
  headerText: { flex: 1 },
  title: { margin: 0, fontSize: 22, fontFamily: 'var(--font-title)' },
  refresh: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 36, height: 36, borderRadius: '50%', cursor: 'pointer',
    background: 'var(--bg-nav)', color: 'var(--text-muted)',
    border: '1px solid var(--border-color)',
  },
  roleBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase',
    color: 'var(--accent-gold)', background: 'rgba(var(--accent-gold-rgb), 0.1)',
    border: '1px solid rgba(var(--accent-gold-rgb), 0.25)',
    borderRadius: 999, padding: '3px 9px', marginTop: 4,
  },
  tabBar: {
    display: 'flex', gap: 8, marginBottom: 16,
    background: 'var(--bg-nav)', border: '1px solid var(--border-color)',
    borderRadius: 14, padding: 5,
  },
  tab: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '9px 4px', borderRadius: 10,
    color: 'var(--text-muted)', fontSize: 13, fontWeight: 500,
    fontFamily: 'var(--font-title)',
  },
  tabActive: {
    background: 'rgba(var(--accent-gold-rgb), 0.14)',
    color: 'var(--text-active)', fontWeight: 600,
  },
  searchBox: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'var(--bg-nav)', border: '1px solid var(--border-color)',
    borderRadius: 12, padding: '8px 12px', marginBottom: 12,
    color: 'var(--text-muted)',
  },
  searchInput: {
    flex: 1, background: 'none', border: 'none', outline: 'none',
    color: 'var(--text-active)', fontSize: 13, fontFamily: 'inherit',
  },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 },
  card: {
    background: 'var(--bg-nav)', border: '1px solid var(--border-color)',
    borderRadius: 16, padding: '14px 12px', textAlign: 'center',
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  cardValue: { fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-title)', color: 'var(--text-active)' },
  cardLabel: { fontSize: 12, color: 'var(--text-muted)' },
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 },
  listItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
    background: 'var(--bg-nav)', border: '1px solid var(--border-color)',
    borderRadius: 16, padding: '12px 14px', flexWrap: 'wrap',
  },
  listMain: { display: 'flex', flexDirection: 'column', gap: 3, minWidth: 200, flex: 1 },
  listName: { color: 'var(--text-active)', fontSize: 14 },
  listSub: { fontSize: 12, color: 'var(--text-muted)' },
  listActions: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  fieldLabel: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text-muted)' },
  select: {
    background: 'var(--bg-nav)', color: 'var(--text-active)',
    border: '1px solid var(--border-color)', borderRadius: 10,
    padding: '7px 9px', fontSize: 13, fontFamily: 'inherit',
  },
  toggle: {
    display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
    border: '1px solid var(--border-color)', borderRadius: 10,
    background: 'rgba(220, 60, 80, 0.12)', color: '#ff9aa8',
    padding: '8px 12px', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
  },
  toggleOff: { background: 'rgba(80, 200, 120, 0.12)', color: '#8fe6ae' },
  moreBtn: {
    display: 'block', margin: '14px auto 0', cursor: 'pointer',
    background: 'var(--bg-nav)', color: 'var(--text-muted)',
    border: '1px solid var(--border-color)', borderRadius: 12,
    padding: '9px 22px', fontSize: 13, fontFamily: 'inherit',
  },
  hint: { color: 'var(--text-muted)', fontSize: 13, padding: 12 },
  error: { color: '#ff9aa8', fontSize: 13, padding: '10px 12px', margin: 0 },
  ok: { color: '#8fe6ae', fontSize: 13, padding: '10px 12px', margin: 0 },
  denied: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    textAlign: 'center', padding: '48px 20px',
  },
  deniedIcon: { color: 'var(--text-muted)' },
  deniedTitle: { margin: 0, fontFamily: 'var(--font-title)', color: 'var(--text-active)' },
  deniedText: { margin: 0, color: 'var(--text-muted)', fontSize: 14 },
};

export default AdminView;
