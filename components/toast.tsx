'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleCheck, faCircleXmark, faTriangleExclamation, faCircleInfo, faXmark } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'

/* ─────────────────────────────────────
   Types
───────────────────────────────────── */
type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextValue {
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

/* ─────────────────────────────────────
   Context
───────────────────────────────────── */
const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

/* ─────────────────────────────────────
   Config
───────────────────────────────────── */
const CONFIG: Record<ToastType, { bg: string; border: string; icon: IconDefinition; iconColor: string; titleColor: string }> = {
  success: { bg: '#f0fdf4', border: '#86efac', icon: faCircleCheck,          iconColor: '#16a34a', titleColor: '#15803d' },
  error:   { bg: '#fff1f2', border: '#fca5a5', icon: faCircleXmark,          iconColor: '#dc2626', titleColor: '#b91c1c' },
  warning: { bg: '#fffbeb', border: '#fcd34d', icon: faTriangleExclamation,   iconColor: '#d97706', titleColor: '#b45309' },
  info:    { bg: '#eff6ff', border: '#93c5fd', icon: faCircleInfo,            iconColor: '#2563eb', titleColor: '#1d4ed8' },
}

/* ─────────────────────────────────────
   Individual toast item
───────────────────────────────────── */
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const cfg = CONFIG[toast.type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.94 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.92 }}
      transition={{ type: 'spring', damping: 26, stiffness: 340 }}
      style={{
        background: cfg.bg,
        border: `1.5px solid ${cfg.border}`,
        borderRadius: 10,
        padding: '12px 14px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        maxWidth: 340,
        minWidth: 260,
        position: 'relative',
      }}
    >
      <FontAwesomeIcon icon={cfg.icon} style={{ fontSize: 18, color: cfg.iconColor, flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: cfg.titleColor, lineHeight: 1.3 }}>
          {toast.title}
        </p>
        {toast.message && (
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#374151', lineHeight: 1.4 }}>
            {toast.message}
          </p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#9ca3af', padding: 2, flexShrink: 0,
          display: 'flex', alignItems: 'center',
        }}
        aria-label="Fechar"
      >
        <FontAwesomeIcon icon={faXmark} style={{ fontSize: 13 }} />
      </button>
    </motion.div>
  )
}

/* ─────────────────────────────────────
   Provider + container
───────────────────────────────────── */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counterRef = useRef(0)

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const add = useCallback((type: ToastType, title: string, message?: string, duration = 4000) => {
    const id = `toast-${++counterRef.current}`
    setToasts(prev => [...prev.slice(-4), { id, type, title, message, duration }])
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration)
    }
  }, [dismiss])

  const ctx: ToastContextValue = {
    success: (t, m) => add('success', t, m),
    error:   (t, m) => add('error',   t, m),
    warning: (t, m) => add('warning', t, m),
    info:    (t, m) => add('info',    t, m),
  }

  return (
    <ToastContext.Provider value={ctx}>
      {children}

      {/* Toast container — top-right */}
      <div
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        <AnimatePresence mode="popLayout">
          {toasts.map(t => (
            <div key={t.id} style={{ pointerEvents: 'auto' }}>
              <ToastItem toast={t} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
