/* ----------------------------------------------------
   ALIVIA - CLIENTE DEL PANEL DE ADMINISTRACIÓN

   A diferencia del resto de la API, estas llamadas NO se
   encolan offline: cambiar roles reproduciéndose horas
   después y sin conexión sería una acción administrativa
   fuera de control. Sin red, el panel muestra error y ya.
   ---------------------------------------------------- */

import { API_BASE } from './apiBase';
import { getAuthHeaders } from './auth';
import { HttpError, NetworkError } from './apiClient';
import type { Role } from './roles';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: Role;
  is_active: boolean;
  onboarding_done: boolean;
  created_at: string;
  last_access: string | null;
}

export interface AuditEntry {
  /** BIGSERIAL: PostgreSQL lo entrega como string; se respeta tal cual. */
  id: string;
  actor: string;
  actor_role: string;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: Record<string, unknown>;
  created_at: string;
}

export interface AdminStats {
  users_total: number;
  users_active: number;
  users_admin: number;
  users_auditor: number;
  sessions_active: number;
  assessments_total: number;
  assessments_30d: number;
  crisis_contacts: number;
  community_posts: number;
  mood_avg: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new NetworkError('Sin conexión');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new HttpError(res.status, body?.error || `Error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const listUsers = (q?: string): Promise<AdminUser[]> =>
  request<AdminUser[]>(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`);

export const updateUser = (
  userId: string,
  changes: { role?: Role; is_active?: boolean }
): Promise<AdminUser> =>
  request<AdminUser>('/api/admin/users', {
    method: 'PATCH',
    body: JSON.stringify({ userId, ...changes }),
  });

export const fetchAudit = (limit = 50, offset = 0): Promise<AuditEntry[]> =>
  request<AuditEntry[]>(`/api/admin/audit?limit=${limit}&offset=${offset}`);

export const fetchStats = (): Promise<AdminStats> =>
  request<AdminStats>('/api/admin/stats');
