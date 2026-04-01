'use client'

import { useEffect, useState } from 'react'
import { Zap, Mail, Lock, AlertCircle } from 'lucide-react'
import { login } from './actions'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [mounted,  setMounted] = useState(false)
  const [error,    setError]   = useState<string | null>(null)
  const [loading,  setLoading] = useState(false)

  // Prevent Dark Reader hydration mismatch by rendering only on the client
  useEffect(() => {
    setMounted(true)
    // Show error from OAuth callback redirect (e.g. ?error=auth)
    const params = new URLSearchParams(window.location.search)
    if (params.get('error') === 'missing_code' || params.get('error') === 'auth') {
      setError('Google sign-in failed. Please try again.')
    }
  }, [])
  if (!mounted) return null

  async function handleGoogleSignIn() {
    const supabase = createClient()
    const { data } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?role=manager`,
        skipBrowserRedirect: true,
      },
    })

    if (!data?.url) return

    const width  = 500
    const height = 620
    const left   = Math.round(window.screenX + (window.outerWidth  - width)  / 2)
    const top    = Math.round(window.screenY + (window.outerHeight - height) / 2)

    const popup = window.open(
      data.url,
      'google-signin',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    )

    if (!popup) {
      // Popups blocked — fall back to full redirect
      window.location.href = data.url
      return
    }

    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        clearTimeout(timeout)
        window.removeEventListener('message', handler)
        popup.close()
        window.location.href = event.data.redirectTo ?? '/'
      }
    }
    window.addEventListener('message', handler)

    // Detect if popup was closed without completing auth
    const timeout = setTimeout(() => {
      if (!popup.closed) return
      window.removeEventListener('message', handler)
      setError('Google sign-in was cancelled or failed. Please try again.')
    }, 180_000)

    const pollClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollClosed)
        clearTimeout(timeout)
        // Give the message handler a moment to fire first
        setTimeout(() => {
          window.removeEventListener('message', handler)
        }, 500)
      }
    }, 500)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #05050a 0%, #0a0a0f 50%, #0d0d14 100%)' }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, rgba(79,70,229,0.12) 0%, transparent 65%)',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: 'rgba(79,70,229,0.2)',
              border: '1px solid rgba(79,70,229,0.4)',
              boxShadow: '0 0 28px rgba(79,70,229,0.3)',
            }}
          >
            <Zap className="w-7 h-7" style={{ color: '#6366f1' }} fill="currentColor" />
          </div>
          <h1 className="text-3xl font-bold tracking-widest text-white">
            B<span style={{ color: '#6366f1' }}>O</span>LT
          </h1>
          <p className="text-sm text-white/35 mt-1">Team time tracking &amp; collaboration</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <h2 className="text-base font-semibold text-white mb-1">Sign in</h2>
          <p className="text-xs text-white/35 mb-6">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="you@bolt.team"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(79,70,229,0.5)')}
                  onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(79,70,229,0.5)')}
                  onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-red-400"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                boxShadow: '0 0 20px rgba(79,70,229,0.35)',
              }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
            <span className="text-[10px] text-white/20 uppercase tracking-wider">or</span>
            <div className="flex-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Google sign-in */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          Contact your manager to create an account
        </p>
      </div>
    </div>
  )
}
