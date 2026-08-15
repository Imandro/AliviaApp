/* ----------------------------------------------------
   ALIVIA - CLIENTE DE AUTENTICACIÓN
   Registro, inicio de sesión, perfil y sesión (token)
   ---------------------------------------------------- */

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

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const setToken = (token: string | null): void => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api/auth${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Error ${res.status} en /api/auth${path}`);
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
}): Promise<AuthResponse> => request<AuthResponse>('/register', {
  method: 'POST',
  body: JSON.stringify(data),
});

export const login = (identifier: string, password: string): Promise<AuthResponse> =>
  request<AuthResponse>('/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });

export const getMe = (): Promise<SafeUser> => request<SafeUser>('/me');

export const updateProfile = (data: Partial<SafeUser>): Promise<SafeUser> =>
  request<SafeUser>('/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const logout = (): Promise<{ ok: boolean }> =>
  request<{ ok: boolean }>('/logout', { method: 'POST' });

export const getAuthHeaders = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};