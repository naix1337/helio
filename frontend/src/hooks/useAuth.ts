// helio-app/frontend/src/hooks/useAuth.ts
import { create } from 'zustand';
import type { UserRole } from '../types.ts';

const TOKEN_KEY = 'helio-jwt';

interface CurrentUser {
  userId: number;
  email: string;
  name?: string;
  role: UserRole;
}

interface JwtPayload {
  userId: number;
  email: string;
  name?: string;
  role: UserRole;
  exp: number;
}

interface AuthStore {
  isAuthenticated: boolean;
  currentUser: CurrentUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
}

function decodeToken(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    ) as JwtPayload;
    return payload;
  } catch {
    return null;
  }
}

function isTokenValid(payload: JwtPayload): boolean {
  return Date.now() / 1000 < payload.exp;
}

function loadInitialState(): { isAuthenticated: boolean; currentUser: CurrentUser | null; token: string | null } {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    return { isAuthenticated: false, currentUser: null, token: null };
  }

  const payload = decodeToken(token);
  if (!payload || !isTokenValid(payload)) {
    localStorage.removeItem(TOKEN_KEY);
    return { isAuthenticated: false, currentUser: null, token: null };
  }

  return {
    isAuthenticated: true,
    currentUser: {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    },
    token,
  };
}

const initial = loadInitialState();

export const useAuth = create<AuthStore>((set, get) => ({
  isAuthenticated: initial.isAuthenticated,
  currentUser: initial.currentUser,
  token: initial.token,

  login: async (email: string, password: string): Promise<void> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      let message = 'Login failed';
      try {
        const body = (await res.json()) as { message?: string; error?: string };
        message = body.message ?? body.error ?? message;
      } catch {
        // keep default message
      }
      throw new Error(message);
    }

    const body = (await res.json()) as { token: string };
    const token = body.token;
    const payload = decodeToken(token);

    if (!payload || !isTokenValid(payload)) {
      throw new Error('Received invalid or expired token');
    }

    localStorage.setItem(TOKEN_KEY, token);

    set({
      isAuthenticated: true,
      token,
      currentUser: {
        userId: payload.userId,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      },
    });
  },

  logout: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    set({ isAuthenticated: false, currentUser: null, token: null });
  },

  authFetch: async (url: string, opts?: RequestInit): Promise<Response> => {
    const { token, logout } = get();

    const headers = new Headers(opts?.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetch(url, { ...opts, headers });

    if (res.status === 401) {
      logout();
      window.location.href = '/login';
    }

    return res;
  },
}));
