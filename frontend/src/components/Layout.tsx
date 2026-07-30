'use client';

import { useEffect } from 'react';
import Navbar from './Navbar';
import { useBranding } from '@/contexts/BrandingContext';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function Layout({ children, title }: LayoutProps) {
  const { appName } = useBranding();

  // Keep document title in sync: "Page Title | App Name" or just "App Name"
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = title ? `${title} | ${appName}` : appName;
  }, [title, appName]);

  return (
    <div className="min-h-screen bg-neutral">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {title && <h1 className="text-3xl font-bold text-primary mb-6">{title}</h1>}
        {children}
      </div>
    </div>
  );
}
