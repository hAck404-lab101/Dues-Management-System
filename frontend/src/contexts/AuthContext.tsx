'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, getCurrentUser, isAuthenticated } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  hasPermission: (permissionKey: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (isAuthenticated()) {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      }
      setLoading(false);
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

