'use client'
import { motion } from 'motion/react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUsers, faPlus, faCrown, faHandshake, faBriefcase } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { formatDate } from '@/lib/utils'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'
const TEAL = '#3d6b6e'

const roleLabel: Record<string, string> = { DONO: 'Dono da Lavoura', PARCEIRO: 'Parceiro', GERENTE: 'Gerente' }
const roleColor: Record<string, string> = { DONO: NAVY, PARCEIRO: GREEN, GERENTE: TEAL }
const roleIcon: Record<string, IconDefinition> = { DONO: faCrown, PARCEIRO: faHandshake, GERENTE: faBriefcase }

type Usuario = { id: string; name: string | null; email: string; role: string; ativo: boolean; createdAt: Date }

export default function UsuariosClient({ usuarios }: { usuarios: Usuario[] }) {
  const donos = usuarios.filter(u => u.role === 'DONO').length
  const parceiros = usuarios.filter(u => u.role === 'PARCEIRO').length
  const gerentes = usuarios.filter(u => u.role === 'GERENTE').length

  const cards = [
    { label: 'Total', value: usuarios.length, color: NAVY, icon: faUsers as IconDefinition },
    { label: 'Donos', value: donos, color: NAVY, icon: faCrown as IconDefinition },
    { label: 'Parceiros', value: parceiros, color: GREEN, icon: faHandshake as IconDefinition },
    { label: 'Gerentes', value: gerentes, color: TEAL, icon: faBriefcase as IconDefinition },
  ]

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}
      >
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0 }}>Usuários do Sistema</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Gerencie o acesso e perfis de cada usuário</p>
        </div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Link href="/usuarios/novo" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', backgroundColor: GREEN, color: 'white', borderRadius: 10, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            <FontAwesomeIcon icon={faPlus} style={{ fontSize: 15 }} /> Novo Usuário
          </Link>
        </motion.div>
      </motion.div>

      <div className="kpi-grid-4">
        {cards.map(({ label, value, color, icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4, type: 'spring', stiffness: 180 }}
            whileHover={{ y: -3, boxShadow: '0 8px 28px rgba(0,0,0,0.1)' }}
            style={{ backgroundColor: 'white', borderRadius: 14, padding: '20px 22px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `4px solid ${color}` }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>{label}</p>
                <motion.p
                  initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.08 + 0.15, type: 'spring', stiffness: 280 }}
                  style={{ color, fontSize: 30, fontWeight: 700, margin: '4px 0 0' }}
                >{value}</motion.p>
              </div>
              <div style={{ backgroundColor: `${color}15`, borderRadius: 10, padding: 9 }}>
                <FontAwesomeIcon icon={icon} style={{ fontSize: 18, color }} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {usuarios.map((u, i) => {
          const color = roleColor[u.role] ?? NAVY
          const roleIconDef = roleIcon[u.role] ?? faUsers
          const initials = (u.name ?? u.email).split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
          return (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.32 + i * 0.07, duration: 0.4, type: 'spring', stiffness: 200 }}
              whileHover={{ y: -4, boxShadow: '0 10px 32px rgba(0,0,0,0.1)' }}
              style={{ backgroundColor: 'white', borderRadius: 16, padding: 22, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${color}` }}
            >
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color, fontWeight: 800, fontSize: 15 }}>{initials}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, color: NAVY, fontSize: 15, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name ?? '—'}</p>
                  <p style={{ color: '#6b7280', fontSize: 12, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: `${color}15`, color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                    <FontAwesomeIcon icon={roleIconDef} style={{ fontSize: 10 }} /> {roleLabel[u.role] ?? u.role}
                  </span>
                  <span style={{ backgroundColor: u.ativo ? '#f0faf0' : '#fef2f2', color: u.ativo ? GREEN : PINK, padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600 }}>
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
              <div style={{ height: 1, backgroundColor: '#f3f4f6', margin: '14px 0' }} />
              <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Membro desde {formatDate(u.createdAt)}</p>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
