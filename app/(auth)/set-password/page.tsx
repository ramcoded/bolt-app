'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Zap, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function SetPasswordForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const code         = searchParams.get('code')

  const [exchanging,  setExchanging]  = useState(true)
  const [exchangeErr, setExchangeErr] = useState<string | null>(null)
  const [email,       setEmail]       = useState<string | null>(null)
  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [success,     setSuccess]     = useState(false)

  useEffect(() => {
    const supabase = createClient()

    async function init() {
      // --- PKCE flow: ?code= query param ---
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setExchangeErr('This invite link has expired or has already been used. Ask your manager for a new invite.')
          setExchanging(false)
          return
        }
        const { data: { user } } = await supabase.auth.getUser()
        setEmail(user?.email ?? null)
        setExchanging(false)
        return
      }

      // --- Implicit flow: #access_token= hash fragment ---
      const hash        = window.location.hash.slice(1)
      const hashParams  = new URLSearchParams(hash)
      const accessToken  = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token') ?? ''

      if (accessToken) {
        const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        if (error || !data.user) {
          setExchangeErr('This invite link has expired or has already been used. Ask your manager for a new invite.')
          setExchanging(false)
          return
        }
        setEmail(data.user.email ?? null)
        setExchanging(false)
        return
      }

      // Nothing found
      setExchangeErr('No invite token found in this link. Please use the exact link from your invitation email.')
      setExchanging(false)
    }

    init()
  }, [code])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return }

    setError(null)
    setSubmitting(true)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }

    setSuccess(true)

    setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      router.push(profile?.role === 'manager' ? '/manager/dashboard' : '/')
    }, 2000)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #05050a 0%, #0a0a0f 50%, #0d0d14 100%)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(79,70,229,0.12) 0%, transparent 65%)' }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: 'rgba(79,70,229,0.2)',
              border:     '1px solid rgba(79,70,229,0.4)',
              boxShadow:  '0 0 28px rgba(79,70,229,0.3)',
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
            background:     'rgba(255,255,255,0.03)',
            border:         '1px solid rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {exchanging ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-white/40">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#6366f1' }} />
              Verifying invite link…
            </div>
          ) : exchangeErr ? (
            <div className="text-center py-4 space-y-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <p className="text-sm font-semibold text-white">Link expired or invalid</p>
              <p className="text-xs text-white/40 leading-relaxed">{exchangeErr}</p>
            </div>
          ) : success ? (
            <div className="text-center py-4 space-y-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
                style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}
              >
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-sm font-semibold text-white">Password set!</p>
              <p className="text-xs text-white/40">Redirecting you to your dashboard…</p>
            </div>
          ) : (
            <>
              <h2 className="text-base font-semibold text-white mb-1">Set your password</h2>
              {email && (
                <p className="text-xs text-white/35 mb-5">
                  You were invited as{' '}
                  <span className="text-white/60 font-medium">{email}</span>
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">New password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      minLength={8}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all duration-200"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(79,70,229,0.5)')}
                      onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Confirm password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      placeholder="Re-enter password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all duration-200"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(79,70,229,0.5)')}
                      onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
                    />
                  </div>
                </div>

                {error && (
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-red-400"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60"
                  style={{
                    background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                    boxShadow:  '0 0 20px rgba(79,70,229,0.35)',
                  }}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  {submitting ? 'Setting password…' : 'Set password & continue'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          Contact your manager if you need a new invite link
        </p>
      </div>
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordForm />
    </Suspense>
  )
}
