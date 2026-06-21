import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { clearStoredAuth, fetchMe, getStoredAuth, login, signup, setStoredAuth, type AuthResponse, type AuthUser } from '../lib/api';

type AuthContextState = {
  loading: boolean;
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  // eslint-disable-next-line no-unused-vars
  signIn: (...args: [string, string]) => Promise<AuthUser>;
  // eslint-disable-next-line no-unused-vars
  signUp: (...args: [string, string, string?]) => Promise<AuthUser>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      const stored = getStoredAuth();
      if (!stored?.token) {
        setLoading(false);
        return;
      }

      setToken(stored.token);
      try {
        const profile = await fetchMe();
        const currentUser = profile.user;
        setUser(currentUser);
        setStoredAuth(stored.token, currentUser);
      } catch {
        clearStoredAuth();
        setToken(null);
        setUser(null);
      }

      setLoading(false);
    };

    void bootstrap();
  }, []);

  const signIn = async (email: string, password: string) => {
    const response = await login({ email, password }) as AuthResponse;
    setStoredAuth(response.token, response.user);
    setToken(response.token);
    setUser(response.user);
    return response.user;
  };

  const signUp = async (email: string, password: string, fullname?: string) => {
    const response = await signup({ email, password, fullname }) as AuthResponse;
    setStoredAuth(response.token, response.user);
    setToken(response.token);
    setUser(response.user);
    return response.user;
  };

  const signOut = () => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      loading,
      user,
      token,
      isAuthenticated: Boolean(user && token),
      signIn,
      signUp,
      signOut
    }),
    [loading, user, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
