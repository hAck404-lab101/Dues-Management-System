'use client';

import Navbar from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function Layout({ children, title }: LayoutProps) {
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

