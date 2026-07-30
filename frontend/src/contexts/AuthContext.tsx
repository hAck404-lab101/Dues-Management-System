'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, getCurrentUser, isAuthenticated } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  hasPermission: (permissionKey: string) => boolean;
}

const AUTH_CACHE_KEY = 'auth_user_cache';
const AUTH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedUser(): User | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = sessionStorage.getItem(AUTH_CACHE_KEY);
    if (!raw) return null;
    const { user, ts } = JSON.parse(raw);
    if (Date.now() - ts > AUTH_CACHE_TTL) {
      sessionStorage.removeItem(AUTH_CACHE_KEY);
      return null;
    }
    return user as User;
  } catch {
    return null;
  }
}

function setCachedUser(user: User | null) {
  try {
    if (typeof window === 'undefined') return;
    if (user) {
      sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ user, ts: Date.now() }));
    } else {
      sessionStorage.removeItem(AUTH_CACHE_KEY);
    }
  } catch { /* ignore */ }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Start with null — will be hydrated from cache in the effect
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initRef = useRef(false);

  const setUser = (u: User | null) => {
    setUserState(u);
    setCachedUser(u);
  };

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const loadUser = async () => {
      // Try to get from cache first for instant render
      const cachedUser = getCachedUser();
      const hasToken = isAuthenticated();

      if (!hasToken) {
        // No token — clear cache and mark as not loading
        setCachedUser(null);
        setUserState(null);
        setLoading(false);
        return;
      }

      if (cachedUser) {
        // Serve from cache immediately — no loading delay
        setUserState(cachedUser);
        setLoading(false);

        // Background refresh to keep data fresh (don't await, fire-and-forget)
        getCurrentUser()
          .then((freshUser) => {
            if (freshUser) {
              setUser(freshUser);
            } else {
              // Token expired — clear cache and user
              setUser(null);
            }
          })
          .catch(() => {
            // Network error — keep cached user, don't break UX
          });
      } else {
        // No cache — must fetch before showing anything
        try {
          const freshUser = await getCurrentUser();
          setUser(freshUser);
        } catch {
          setUser(null);
        }
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const hasPermission = (permissionKey: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return !!user.permissions?.some(
      (p) => p === permissionKey || p === '*'
    );
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
