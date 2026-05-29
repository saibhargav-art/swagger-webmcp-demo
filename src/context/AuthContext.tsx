import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getProfile, getStoredSession, signIn, signOut, storeSession } from '../lib/supabaseApi';
import type { AppUser, AuthSession, UserRole } from '../lib/types';

interface AuthContextValue {
  session: AuthSession | null;
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession());
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!session?.access_token) {
      setUser(null);
      return;
    }
    setUser(await getProfile(session.access_token));
  };

  useEffect(() => {
    let active = true;
    async function hydrate() {
      try {
        if (session?.access_token) {
          const profile = await getProfile(session.access_token);
          if (active) setUser(profile);
        }
      } catch {
        storeSession(null);
        if (active) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    hydrate();
    return () => {
      active = false;
    };
  }, [session?.access_token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      loading,
      login: async (email, password) => {
        const nextSession = await signIn(email, password);
        try {
          const profile = await getProfile(nextSession.access_token);
          setUser(profile);
          setSession(nextSession);
        } catch (err) {
          storeSession(null);
          setUser(null);
          setSession(null);
          throw err;
        }
      },
      logout: async () => {
        if (session?.access_token) await signOut(session.access_token);
        setSession(null);
        setUser(null);
      },
      refreshProfile,
      hasRole: (roles) => Boolean(user && roles.includes(user.role)),
    }),
    [loading, session, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
