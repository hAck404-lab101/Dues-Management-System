<<<<<<< HEAD
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { BrandingProvider } from '@/contexts/BrandingContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Dues Management System',
  description: 'A secure, transparent digital system for managing departmental dues',
  icons: {
    icon: '/favicon.png',
  },
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
=======
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { BrandingProvider } from '@/contexts/BrandingContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Dues Management System',
  description: 'A secure, transparent digital system for managing departmental dues',
  icons: {
    icon: '/favicon.png',
  },
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
>>>>>>> 27716d86217526bcba288e356ca18fe65b35b5aa
