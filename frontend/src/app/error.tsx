'use client'

import { useEffect } from 'react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application runtime error:', error)
  }, [error])

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#000B33] via-[#001150] to-[#0020B2] text-white px-4 relative overflow-hidden">
      {/* Decorative ambient blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-rose-500/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#1A3DF5]/15 blur-[150px] pointer-events-none" />

      {/* Grid background overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="max-w-md w-full text-center relative z-10 space-y-8">
        {/* Animated Icon Container */}
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl relative group">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <svg
            className="w-12 h-12 text-rose-400 transform group-hover:scale-110 transition-transform duration-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Text content */}
        <div className="space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight text-white select-none">Something went wrong</h1>
          <p className="text-sm text-gray-300 max-w-sm mx-auto leading-relaxed">
            An unexpected error occurred while loading this page. Our team has been notified.
          </p>
          {error.message && (
            <div className="p-3 bg-black/20 rounded-xl border border-white/5 max-w-sm mx-auto text-xs font-mono text-rose-300 break-all select-all">
              {error.message}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center px-6 py-3.5 bg-[#DBEAFE] hover:bg-[#BFDBFE] text-[#001150] font-bold rounded-full shadow-xl shadow-black/10 transition-all hover:scale-105 active:scale-95 duration-200"
          >
            Try Again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-full transition-all hover:scale-105 active:scale-95 duration-200"
          >
            Go Back Home
          </a>
        </div>
      </div>
    </main>
  )
}
