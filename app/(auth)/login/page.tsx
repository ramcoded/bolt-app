'use client'

import { useState } from 'react'
import { Zap, Mail, Lock, AlertCircle } from 'lucide-react'
import { login } from './actions'

export default function LoginPage() {
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
          <p className="text-sm text-white/35 mt-1">Team time tracking & collaboration</p>
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
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          Contact your manager to create an account
        </p>
      </div>
    </div>
  )
}
