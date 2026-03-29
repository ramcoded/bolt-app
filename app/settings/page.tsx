'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [current,    setCurrent]    = useState('')
  const [password,   setPassword]   = useState('')
  const [confirm,    setConfirm]    = useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [success,    setSuccess]    = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (password !== confirm) { setError('New passwords do not match.'); return }
    if (password.length < 8)  { setError('New password must be at least 8 characters.'); return }
    if (current === password)  { setError('New password must be different from your current password.'); return }

    setError(null)
    setSuccess(false)
    setSubmitting(true)

    try {
      const supabase = createClient()

      // Get current user email for re-authentication
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) { setError('Could not retrieve your account. Please refresh and try again.'); return }

      // Verify current password by re-authenticating
      const { error: authError } = await supabase.auth.signInWithPassword({
        email:    user.email,
        password: current,
      })
      if (authError) { setError('Current password is incorrect.'); return }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) { setError(updateError.message); return }

      setSuccess(true)
      setCurrent('')
      setPassword('')
      setConfirm('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to dashboard
      </Link>

      <div>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm text-white/35 mt-0.5">Manage your account preferences</p>
      </div>

      <div
        className="rounded-2xl p-6 space-y-5"
        style={{
          background:     'rgba(255,255,255,0.03)',
          border:         '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div>
          <h2 className="text-sm font-semibold text-white">Change Password</h2>
          <p className="text-xs text-white/35 mt-0.5">Update the password for your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current password */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Current password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <input
                type={showPass ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
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

          {/* New password */}
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
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(79,70,229,0.5)')}
                onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
              />
            </div>
          </div>

          {/* Confirm new password */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Confirm new password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <input
                type={showPass ? 'text' : 'password'}
                required
                placeholder="Re-enter new password"
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
          {success && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-green-400"
              style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}
            >
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              Password updated successfully.
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              boxShadow:  '0 0 16px rgba(79,70,229,0.35)',
            }}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {submitting ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
