'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#000B33] via-[#001150] to-[#0020B2] text-white px-4 relative overflow-hidden">
      {/* Decorative ambient blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#93C5FD]/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#1A3DF5]/15 blur-[150px] pointer-events-none" />

      {/* Grid background overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="max-w-md w-full text-center relative z-10 space-y-8">
        {/* Animated Icon Container */}
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl relative group">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-[#93C5FD]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <svg
            className="w-12 h-12 text-[#93C5FD] transform group-hover:scale-110 transition-transform duration-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Text content */}
        <div className="space-y-3">
          <h1 className="text-8xl font-black tracking-tighter text-[#93C5FD] select-none">404</h1>
          <h2 className="text-2xl font-bold tracking-tight text-white">Oops! Page not found</h2>
          <p className="text-sm text-gray-300 max-w-sm mx-auto leading-relaxed">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-8 py-4 bg-[#DBEAFE] hover:bg-[#BFDBFE] text-[#001150] font-bold rounded-full shadow-xl shadow-black/10 transition-all hover:scale-105 active:scale-95 duration-200"
          >
            Go Back Home
          </Link>
        </div>
      </div>
    </main>
  )
}
