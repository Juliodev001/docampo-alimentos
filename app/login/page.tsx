'use client'
import { useActionState } from 'react'
import { motion } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { login } from '@/app/actions/auth'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined)

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${NAVY} 0%, #1e2548 50%, #3d4a7a 100%)`,
        padding: 16,
      }}
    >
      {/* Animated background blobs */}
      <motion.div
        animate={{ scale: [1, 1.12, 1], opacity: [0.14, 0.22, 0.14] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'fixed', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: `${GREEN}30`, pointerEvents: 'none' }}
      />
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.12, 0.2, 0.12] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        style={{ position: 'fixed', bottom: -60, left: -60, width: 260, height: 260, borderRadius: '50%', background: `${PINK}25`, pointerEvents: 'none' }}
      />
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.08, 0.14, 0.08] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2.5 }}
        style={{ position: 'fixed', top: '40%', left: '10%', width: 180, height: 180, borderRadius: '50%', background: `${GREEN}20`, pointerEvents: 'none' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        style={{
          backgroundColor: 'white',
          borderRadius: 20,
          padding: '48px 40px',
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 30px 60px rgba(0,0,0,0.35)',
          position: 'relative',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${GREEN}, #4aa344)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
              🍓
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: 13, fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>
                <span style={{ color: '#e8255a', fontWeight: 700 }}>do campo</span>
                <span style={{ color: GREEN, fontWeight: 700 }}> Alimentos</span>
              </p>
              <p style={{ margin: 0, fontSize: 10, color: '#9ca3af', letterSpacing: 1 }}>GESTÃO INTELIGENTE</p>
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: '#6b7280', fontSize: 14, marginBottom: 28 }}>
          Acesse sua conta
        </p>

        <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: NAVY, display: 'block', marginBottom: 6 }}>
              E-mail
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="seu@email.com"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1.5px solid #e5e7eb',
                borderRadius: 10,
                fontSize: 14,
                outline: 'none',
                transition: 'border-color 0.2s',
                color: NAVY,
              }}
              onFocus={(e) => (e.target.style.borderColor = GREEN)}
              onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: NAVY, display: 'block', marginBottom: 6 }}>
              Senha
            </label>
            <input
              name="password"
              type="password"
              required
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1.5px solid #e5e7eb',
                borderRadius: 10,
                fontSize: 14,
                outline: 'none',
                transition: 'border-color 0.2s',
                color: NAVY,
              }}
              onFocus={(e) => (e.target.style.borderColor = GREEN)}
              onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
            />
          </div>

          {state?.error && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                color: PINK,
                fontSize: 13,
                backgroundColor: '#fff0f3',
                padding: '10px 14px',
                borderRadius: 8,
                border: `1px solid ${PINK}40`,
              }}
            >
              {state.error}
            </motion.p>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            whileHover={{ backgroundColor: '#4aa344' }}
            type="submit"
            disabled={pending}
            style={{
              backgroundColor: GREEN,
              color: 'white',
              border: 'none',
              borderRadius: 10,
              padding: '12px',
              fontSize: 15,
              fontWeight: 600,
              cursor: pending ? 'not-allowed' : 'pointer',
              opacity: pending ? 0.75 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 6,
              transition: 'background-color 0.2s',
            }}
          >
            {pending && <FontAwesomeIcon icon={faSpinner} style={{ fontSize: 16 }} className="animate-spin" />}
            {pending ? 'Entrando...' : 'Entrar'}
          </motion.button>
        </form>

        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 24, marginBottom: 0 }}>
          Ao acessar, você concorda com nossa{' '}
          <a href="/politica-de-privacidade" target="_blank" style={{ color: GREEN, textDecoration: 'none', fontWeight: 500 }}>
            Política de Privacidade
          </a>
          {' '}(LGPD)
        </p>
      </motion.div>
    </div>
  )
}
