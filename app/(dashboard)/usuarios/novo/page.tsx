'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'motion/react'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'
const TEAL = '#3d6b6e'

const ROLES = [
  { value: 'DONO', label: 'Dono da Lavoura', desc: 'Acesso total ao sistema', color: NAVY },
  { value: 'PARCEIRO', label: 'Parceiro', desc: 'Responsável pela plantação e manejo', color: GREEN },
  { value: 'GERENTE', label: 'Gerente', desc: 'Acesso operacional administrativo', color: TEAL },
]

export default function NovoUsuario() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('GERENTE')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setError('Senha deve ter pelo menos 6 caracteres'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    })
    if (res.ok) { router.push('/usuarios'); router.refresh() }
    else { const d = await res.json().catch(() => ({})); setError(d.error || 'Erro ao cadastrar'); setLoading(false) }
  }

  const inp = { width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, color: NAVY, outline: 'none', boxSizing: 'border-box' as const }
  const lbl = { fontSize: 13, fontWeight: 500, color: NAVY, display: 'block', marginBottom: 6 } as React.CSSProperties

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Link href="/usuarios" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none', display: 'inline-block', marginBottom: 6 }}>← Usuários</Link>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: NAVY, margin: 0 }}>Novo Usuário</h1>
        <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>Cadastre um novo usuário com nível de acesso</p>
      </div>

      <div className="form-grid-2" style={{ gap: 20 }}>
        <div style={{ backgroundColor: 'white', borderRadius: 14, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: NAVY, margin: '0 0 20px' }}>Dados do usuário</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={lbl}>Nome completo *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: João da Silva" required style={inp} />
            </div>
            <div>
              <label style={lbl}>E-mail *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="joao@exemplo.com" required style={inp} />
            </div>
            <div>
              <label style={lbl}>Senha *</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required style={inp} />
            </div>
            {error && <p style={{ color: PINK, fontSize: 13, margin: 0 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 4 }}>
              <Link href="/usuarios" style={{ padding: '10px 20px', border: '1.5px solid #e5e7eb', borderRadius: 10, textDecoration: 'none', fontSize: 14, color: NAVY }}>
                Cancelar
              </Link>
              <motion.button type="submit" disabled={loading}
                whileHover={!loading ? { scale: 1.04, backgroundColor: '#4aa344', boxShadow: '0 8px 25px rgba(90,185,82,0.45)' } : {}}
                whileTap={!loading ? { scale: 0.95 } : {}}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                style={{ padding: '10px 24px', backgroundColor: GREEN, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Cadastrando...' : 'Criar Usuário'}
              </motion.button>
            </div>
          </form>
        </div>

        {/* Seleção de perfil */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: NAVY, marginBottom: 12 }}>Perfil de acesso *</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ROLES.map((r) => (
              <div key={r.value} onClick={() => setRole(r.value)}
                style={{ backgroundColor: 'white', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer', border: role === r.value ? `2px solid ${r.color}` : '2px solid transparent', transition: 'border-color 0.15s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 600, color: NAVY, fontSize: 14, margin: 0 }}>{r.label}</p>
                    <p style={{ color: '#6b7280', fontSize: 12, margin: '3px 0 0' }}>{r.desc}</p>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${role === r.value ? r.color : '#e5e7eb'}`, backgroundColor: role === r.value ? r.color : 'transparent', transition: 'all 0.15s', flexShrink: 0 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
