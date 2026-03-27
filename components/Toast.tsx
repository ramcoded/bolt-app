'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { MessageCircle, ClipboardList, X } from 'lucide-react'

type ToastType = 'message' | 'task'
type Toast    = { id: string; title: string; description?: string; type: ToastType }

type ToastContextType = {
  addToast: (title: string, description?: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType>({ addToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  useEffect(() => {
    const t = setTimeout(onRemove, 4000)
    return () => clearTimeout(t)
  }, [onRemove])

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-2xl animate-slide-up"
      style={{
        background:    'rgba(10,10,20,0.96)',
        border:        '1px solid rgba(99,102,241,0.28)',
        boxShadow:     '0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(99,102,241,0.08)',
        backdropFilter:'blur(24px)',
        minWidth:      '260px',
        maxWidth:      '340px',
      }}
    >
      <div className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center"
        style={{ background: 'rgba(99,102,241,0.15)' }}>
        {toast.type === 'message'
          ? <MessageCircle className="w-3.5 h-3.5 text-indigo-400" />
          : <ClipboardList className="w-3.5 h-3.5 text-indigo-400" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white leading-tight">{toast.title}</p>
        {toast.description && (
          <p className="text-[11px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {toast.description}
          </p>
        )}
      </div>
      <button
        onClick={onRemove}
        className="flex-shrink-0 p-0.5 rounded transition-colors"
        style={{ color: 'rgba(255,255,255,0.25)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)' }}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((title: string, description?: string, type: ToastType = 'message') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, title, description, type }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-5 right-5 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={() => removeToast(toast.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
