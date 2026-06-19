import type { Metadata } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { BrandingProvider } from '@/contexts/BrandingContext'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap'
})

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap'
})

const DEFAULT_TITLE = process.env.NEXT_PUBLIC_DEFAULT_APP_NAME || 'DuesPay'
const DEFAULT_DESCRIPTION = process.env.NEXT_PUBLIC_DEFAULT_APP_DESCRIPTION || 'A secure student portal for dues, payments, receipts, and clearance records.'

const cleanBrandText = (value?: string | null, fallback = '') => {
  const text = (value || fallback || '').trim()
  if (!text) return fallback
  return text
    .replace(/University of Cape Coast/gi, 'DuesPay')
    .replace(/\bUCC\b/gi, 'DuesPay')
    .replace(/Ho Technical University/gi, 'DuesPay')
    .replace(/\bHTU\b/gi, 'DuesPay')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

const getApiBase = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || ''
  return apiUrl.replace(/\/api\/?$/, '')
}

const makeAbsoluteUrl = (value?: string | null) => {
  if (!value) return undefined
  if (value.startsWith('http')) return value
  const apiBase = getApiBase()
  return apiBase ? `${apiBase}${value.startsWith('/') ? value : `/${value}`}` : value
}

const fallbackMetadata = (): Metadata => {
  const appTitle = cleanBrandText(DEFAULT_TITLE, 'DuesPay')
  const appDescription = cleanBrandText(DEFAULT_DESCRIPTION, 'A secure student portal for dues, payments, receipts, and clearance records.')

  return {
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
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const apiBase = getApiBase()
    if (!apiBase) return fallbackMetadata()

    const response = await fetch(`${apiBase}/api/settings/public`, {
      cache: 'no-store',
      next: { revalidate: 0 },
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
    })

    if (!response.ok) return fallbackMetadata()

    const result = await response.json()
    const settings = result?.data || {}
    const appTitle = cleanBrandText(settings.app_name, DEFAULT_TITLE)
    const appDescription = cleanBrandText(settings.app_description, DEFAULT_DESCRIPTION)
    const imageUrl = makeAbsoluteUrl(settings.app_logo || settings.app_favicon)
    const faviconUrl = makeAbsoluteUrl(settings.app_favicon || settings.app_logo) || '/favicon.png'

    return {
      title: appTitle,
      description: appDescription,
      icons: {
        icon: faviconUrl,
        shortcut: faviconUrl,
        apple: faviconUrl
      },
      openGraph: {
        title: appTitle,
        description: appDescription,
        type: 'website',
        siteName: appTitle,
        images: imageUrl ? [{ url: imageUrl, alt: appTitle }] : undefined
      },
      twitter: {
        card: imageUrl ? 'summary_large_image' : 'summary',
        title: appTitle,
        description: appDescription,
        images: imageUrl ? [imageUrl] : undefined
      }
    }
  } catch {
    return fallbackMetadata()
  }
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${plusJakartaSans.variable} font-sans`}>
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
