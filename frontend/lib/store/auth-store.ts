import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'EMPLOYEE';
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  setAuth: (token: string, user: User, refreshToken?: string) => void;
  setTokens: (token: string, refreshToken: string) => void;
  logout: () => void;
}

function setAuthCookie(loggedIn: boolean) {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  if (loggedIn) {
    document.cookie = `auth-logged-in=true; path=/; max-age=604800; SameSite=Lax${secure}`;
  } else {
    document.cookie = 'auth-logged-in=; path=/; max-age=0';
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      setAuth: (token: string, user: User, refreshToken?: string) => {
        setAuthCookie(true);
        set({ token, user, refreshToken: refreshToken || null });
      },
      setTokens: (token: string, refreshToken: string) => {
        setAuthCookie(true);
        set({ token, refreshToken });
      },
      logout: () => {
        setAuthCookie(false);
        set({ token: null, refreshToken: null, user: null });
      },
    }),
    {
      name: 'auth-storage',
    },
  ),
);
