import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { BrandingProvider } from '@/contexts/BrandingContext'

const inter = Inter({ subsets: ['latin'] })

const DEFAULT_TITLE = process.env.NEXT_PUBLIC_DEFAULT_APP_NAME || 'Dues Management System'
const DEFAULT_DESCRIPTION = 'A secure student portal for dues, payments, receipts, and clearance records.'

const getApiBase = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || ''
  return apiUrl.replace(/\/api\/?$/, '')
}

const normalizeUrl = (value?: string | null) => {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
}

const getSiteUrl = () => {
  return normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL)
}

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

const makeAbsoluteUrl = (value?: string | null) => {
  if (!value) return null
  if (value.startsWith('http')) return value
  const base = getApiBase() || getSiteUrl()
  return base ? `${base}${value.startsWith('/') ? value : `/${value}`}` : value
}

const fallbackMetadata = (): Metadata => {
  const siteUrl = getSiteUrl()
  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    metadataBase: siteUrl ? new URL(siteUrl) : undefined,
    icons: { icon: '/favicon.png', shortcut: '/favicon.png', apple: '/favicon.png' },
    openGraph: {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      type: 'website',
      siteName: DEFAULT_TITLE
    },
    twitter: {
      card: 'summary_large_image',
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION
    }
  }
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const apiBase = getApiBase()
    const siteUrl = getSiteUrl()

    if (!apiBase) return fallbackMetadata()

    const response = await fetch(`${apiBase}/api/settings/public`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
    })

    if (!response.ok) throw new Error('Unable to load public branding')
    const result = await response.json()
    const settings = result?.data || {}

    const appName = cleanBrandText(settings.app_name, DEFAULT_TITLE)
    const description = cleanBrandText(settings.app_description, DEFAULT_DESCRIPTION)
    const favicon = makeAbsoluteUrl(settings.app_favicon || settings.app_logo || '/favicon.png') || '/favicon.png'
    const logo = makeAbsoluteUrl(settings.app_logo || settings.app_favicon || '/favicon.png') || favicon

    return {
      title: appName,
      description,
      metadataBase: siteUrl ? new URL(siteUrl) : undefined,
      icons: {
        icon: favicon,
        shortcut: favicon,
        apple: favicon
      },
      openGraph: {
        title: appName,
        description,
        type: 'website',
        siteName: appName,
        images: [{ url: logo, alt: appName }]
      },
      twitter: {
        card: 'summary_large_image',
        title: appName,
        description,
        images: [logo]
      }
    }
  } catch {
    return fallbackMetadata()
  }
}

export default function RootLayout({
  children,
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
