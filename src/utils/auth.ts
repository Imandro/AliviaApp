/* ----------------------------------------------------
   ALIVIA - CLIENTE DE AUTENTICACIÓN
   Registro, inicio de sesión, perfil y sesión (token).
   Offline-first: el último usuario conocido queda en caché
   para poder abrir la app sin conexión; los cambios de
   perfil hechos sin red se sincronizan al reconectar.
   ---------------------------------------------------- */

import { API_BASE } from './apiBase';
import { apiMutate, HttpError, NetworkError, setAuthHeaderProvider } from './apiClient';

export interface SafeUser {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  name: string;
  problems: string[];
  situations: string[];
  strategies: string[];
  trusted_person: string | null;
  trusted_phone: string | null;
  wants_contact: boolean;
  changes: string[];
  goals_text: string | null;
  onboarding_done: boolean;
  created_at: string;
}

const TOKEN_KEY = 'alivia_token';
const USER_CACHE_KEY = 'alivia_user_cache';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const setToken = (token: string | null): void => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

const cacheUser = (user: SafeUser): void => {
  try {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  } catch {
    /* noop */
  }
};

const getCachedUser = (): SafeUser | null => {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as SafeUser) : null;
  } catch {
    return null;
  }
};

// Token actual disponible para la revalidación de cachés del apiClient
setAuthHeaderProvider((): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
});

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/auth${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers ?? {}),
      },
    });
  } catch {
    throw new NetworkError('Sin conexión');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new HttpError(res.status, body?.error || `Error ${res.status} en /api/auth${path}`);
  }
  return res.json() as Promise<T>;
}

export interface AuthResponse {
  token: string;
  user: SafeUser;
}

export const register = (data: {
  username: string;
  email: string;
  phone: string;
  name: string;
  password: string;
}): Promise<AuthResponse> =>
  request<AuthResponse>('/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }).then((r) => {
    cacheUser(r.user);
    return r;
  });

export const login = (identifier: string, password: string): Promise<AuthResponse> =>
  request<AuthResponse>('/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  }).then((r) => {
    cacheUser(r.user);
    return r;
  });

export const getMe = (): Promise<SafeUser> =>
  request<SafeUser>('/me').then((u) => {
    cacheUser(u);
    return u;
  }).catch((e) => {
    // Sin conexión: continuar con el último usuario conocido en vez de deslogear
    if (e instanceof HttpError) throw e;
    const cached = getCachedUser();
    if (cached && getToken()) return cached;
    throw e;
  });

export const updateProfile = (data: Partial<SafeUser>): Promise<SafeUser> =>
  request<SafeUser>('/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  }).then((u) => {
    cacheUser(u);
    return u;
  }).catch(async (e) => {
    if (e instanceof HttpError) throw e;
    // Sin red: aplicar cambios localmente y encolar para sincronizar
    const cached = getCachedUser();
    if (!cached) throw new NetworkError('Sin conexión');
    const merged = { ...cached, ...data } as SafeUser;
    cacheUser(merged);
    await apiMutate('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
    }).catch(() => {
      /* ya encolado o falla silenciosa */
    });
    return merged;
  });

export const logout = (): Promise<{ ok: boolean }> =>
  request<{ ok: boolean }>('/logout', { method: 'POST' }).catch(() => ({ ok: true }));

export const getAuthHeaders = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
