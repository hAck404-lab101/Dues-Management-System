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

const getSiteUrl = () => {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined
}

const cleanBrandText = (value?: string | null, fallback = '') => {
  const text = (value || fallback || '').trim()
  if (!text) return fallback
  return text
    .replace(/University of Cape Coast/gi, 'Dues Management System')
    .replace(/\bUCC\b/gi, 'DMS')
    .replace(/Ho Technical University/gi, 'Dues Management System')
    .replace(/\bHTU\b/gi, 'DMS')
}

const makeAbsoluteUrl = (value?: string | null) => {
  if (!value) return null
  if (value.startsWith('http')) return value
  const base = getApiBase()
  return base ? `${base}${value.startsWith('/') ? value : `/${value}`}` : value
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const apiBase = getApiBase()
    if (!apiBase) {
      return {
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        icons: { icon: '/favicon.png', shortcut: '/favicon.png', apple: '/favicon.png' },
        openGraph: { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, type: 'website' },
        twitter: { card: 'summary_large_image', title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION }
      }
    }

    const response = await fetch(`${apiBase}/api/settings/public`, {
      cache: 'no-store',
      next: { revalidate: 0 },
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
      metadataBase: getSiteUrl() ? new URL(getSiteUrl() as string) : undefined,
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
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      icons: { icon: '/favicon.png', shortcut: '/favicon.png', apple: '/favicon.png' },
      openGraph: { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, type: 'website', siteName: DEFAULT_TITLE },
      twitter: { card: 'summary_large_image', title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION }
    }
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
