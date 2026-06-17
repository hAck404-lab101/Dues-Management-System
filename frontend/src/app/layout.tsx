import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { BrandingProvider } from '@/contexts/BrandingContext'

const inter = Inter({ subsets: ['latin'] })

const DEFAULT_TITLE = process.env.NEXT_PUBLIC_DEFAULT_APP_NAME || 'Dues Management System'
const DEFAULT_DESCRIPTION = process.env.NEXT_PUBLIC_DEFAULT_APP_DESCRIPTION || 'A secure student portal for dues, payments, receipts, and clearance records.'

const cleanBrandText = (value?: string | null, fallback = '') => {
  const text = (value || fallback || '').trim()
  if (!text) return fallback
  return text
    .replace(/University of Cape Coast/gi, 'Dues Management System')
    .replace(/\bUCC\b/gi, 'DMS')
    .replace(/Ho Technical University/gi, 'Dues Management System')
    .replace(/\bHTU\b/gi, 'DMS')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

const appTitle = cleanBrandText(DEFAULT_TITLE, 'Dues Management System')
const appDescription = cleanBrandText(DEFAULT_DESCRIPTION, 'A secure student portal for dues, payments, receipts, and clearance records.')

export const metadata: Metadata = {
  title: appTitle,
  description: appDescription,
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png'
  },
  openGraph: {
    title: appTitle,
    description: appDescription,
    type: 'website',
    siteName: appTitle
  },
  twitter: {
    card: 'summary',
    title: appTitle,
    description: appDescription
  }
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <BrandingProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </BrandingProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
