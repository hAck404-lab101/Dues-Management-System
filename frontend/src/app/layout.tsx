import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { BrandingProvider } from '@/contexts/BrandingContext'

const inter = Inter({ subsets: ['latin'] })

const DEFAULT_TITLE = process.env.NEXT_PUBLIC_DEFAULT_APP_NAME || 'Dues Management System'
const DEFAULT_DESCRIPTION = process.env.NEXT_PUBLIC_DEFAULT_APP_DESCRIPTION || 'A secure student portal for dues, payments, receipts, and clearance records.'

const normalizeUrl = (value?: string | null) => {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return undefined
  return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
}

const toUrl = (value?: string | null) => {
  const normalized = normalizeUrl(value)
  if (!normalized) return undefined
  try {
    return new URL(normalized)
  } catch {
    return undefined
  }
}

const SITE_URL = normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL)
const METADATA_BASE = toUrl(SITE_URL)

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
  metadataBase: METADATA_BASE,
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png'
  },
  openGraph: {
    title: appTitle,
    description: appDescription,
    type: 'website',
    siteName: appTitle,
    images: [{ url: '/favicon.png', alt: appTitle }]
  },
  twitter: {
    card: 'summary_large_image',
    title: appTitle,
    description: appDescription,
    images: ['/favicon.png']
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
