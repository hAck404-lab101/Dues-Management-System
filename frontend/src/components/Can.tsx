import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface CanProps {
  perform: string | string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export default function Can({ perform, fallback = null, children }: CanProps) {
  const { hasPermission } = useAuth();
  
  const permissions = Array.isArray(perform) ? perform : [perform];
  const authorized = permissions.some(p => hasPermission(p));
  
  if (authorized) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}
