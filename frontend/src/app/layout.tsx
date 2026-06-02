import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { BrandingProvider } from '@/contexts/BrandingContext'

const inter = Inter({ subsets: ['latin'] })

const DEFAULT_TITLE = 'Dues Management System'
const DEFAULT_DESCRIPTION = 'A secure, transparent digital system for managing departmental dues'

const getApiBase = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || ''
  return apiUrl.replace(/\/api\/?$/, '')
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
        icons: { icon: '/favicon.png', shortcut: '/favicon.png', apple: '/favicon.png' }
      }
    }

    const response = await fetch(`${apiBase}/api/settings/public`, {
      cache: 'no-store'
    })

    if (!response.ok) throw new Error('Unable to load public branding')
    const result = await response.json()
    const settings = result?.data || {}

    const appName = settings.app_name?.trim() || DEFAULT_TITLE
    const description = settings.app_description?.trim() || DEFAULT_DESCRIPTION
    const favicon = makeAbsoluteUrl(settings.app_favicon || settings.app_logo || '/favicon.png') || '/favicon.png'
    const logo = makeAbsoluteUrl(settings.app_logo || settings.app_favicon || '/favicon.png') || favicon

    return {
      title: appName,
      description,
      icons: {
        icon: favicon,
        shortcut: favicon,
        apple: favicon
      },
      openGraph: {
        title: appName,
        description,
        images: [{ url: logo }]
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
      icons: { icon: '/favicon.png', shortcut: '/favicon.png', apple: '/favicon.png' }
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
