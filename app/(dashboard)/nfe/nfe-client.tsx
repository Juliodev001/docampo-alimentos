'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFileLines, faPlus, faMagnifyingGlass, faWifi } from '@fortawesome/free-solid-svg-icons'
import { formatCurrency, formatDate } from '@/lib/utils'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'

const statusColors: Record<string, { bg: string; color: string }> = {
  RASCUNHO: { bg: '#f3f4f6', color: '#6b7280' },
  AUTORIZADA: { bg: '#f0faf0', color: GREEN },
  CANCELADA: { bg: '#fff0f3', color: PINK },
  REJEITADA: { bg: '#fff7ed', color: '#e87320' },
}

type NFe = { id: string; dataEmissao: Date; numero: string | null; totalValor: number; status: string; ambiente: string; cliente: { nome: string } }

export default function NfeClient({ rascunhos, emitidas }: { rascunhos: NFe[]; emitidas: NFe[] }) {
  const [aba, setAba] = useState<'rascunhos' | 'emitidas'>('rascunhos')
  const [q, setQ] = useState('')

  const lista = aba === 'rascunhos' ? rascunhos : emitidas
  const filtrada = lista.filter(n => !q || n.cliente.nome.toLowerCase().includes(q.toLowerCase()) || (n.numero ?? '').includes(q))

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}
      >
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0 }}>Notas Fiscais Eletrônicas</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Emissão de NF-e modelo 55 — Produtor Rural</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <motion.button
            whileHover={{ scale: 1.02, backgroundColor: '#f9fafb' }} whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: 'white', cursor: 'pointer', fontSize: 13, color: NAVY, fontWeight: 500 }}
          >
            <FontAwesomeIcon icon={faWifi} style={{ fontSize: 14 }} /> Verificar Conexão
          </motion.button>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link href="/nfe/nova" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', backgroundColor: GREEN, color: 'white', borderRadius: 10, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
              <FontAwesomeIcon icon={faPlus} style={{ fontSize: 15 }} /> Nova NF-e
            </Link>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.4 }}
        style={{ backgroundColor: 'white', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}
      >
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', position: 'relative' }}>
          {(['rascunhos', 'emitidas'] as const).map((t) => (
            <motion.button
              key={t}
              onClick={() => setAba(t)}
              whileHover={{ backgroundColor: '#f9fafb' }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              style={{
                padding: '14px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                color: aba === t ? NAVY : '#6b7280', border: 'none', background: 'transparent',
                borderBottom: `2px solid ${aba === t ? GREEN : 'transparent'}`,
                transition: 'color 0.2s, border-color 0.2s',
              }}
            >
              {t === 'rascunhos' ? `Rascunhos (${rascunhos.length})` : `Emitidas (${emitidas.length})`}
            </motion.button>
          ))}
        </div>

        {/* Search */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ position: 'relative' }}>
            <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: 14, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="Buscar por cliente ou número..."
              style={{ width: '100%', paddingLeft: 36, paddingRight: 14, paddingTop: 9, paddingBottom: 9, border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {filtrada.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ padding: 64, textAlign: 'center', color: '#9ca3af' }}>
              <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 40, opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontWeight: 600, margin: '0 0 6px' }}>Nenhum{aba === 'rascunhos' ? ' rascunho' : 'a NF-e emitida'}</p>
              <p style={{ fontSize: 13, margin: 0 }}>Comece criando sua primeira NF-e</p>
            </motion.div>
          ) : (
            <motion.table key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  {['Data', 'NF', 'Cliente', 'Valor', 'Ambiente', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrada.map((n, i) => {
                  const st = statusColors[n.status] ?? statusColors.RASCUNHO
                  return (
                    <motion.tr
                      key={n.id}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      whileHover={{ backgroundColor: '#f9fafb' }}
                      style={{ borderBottom: '1px solid #f3f4f6' }}
                    >
                      <td style={{ padding: '13px 16px', fontSize: 13, color: NAVY }}>{formatDate(n.dataEmissao)}</td>
                      <td style={{ padding: '13px 16px', fontSize: 13, color: '#6b7280' }}>{n.numero ?? '-'}</td>
                      <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 500, color: NAVY }}>{n.cliente.nome}</td>
                      <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 700, color: NAVY }}>{formatCurrency(n.totalValor)}</td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ backgroundColor: n.ambiente === 'PRODUCAO' ? `${GREEN}20` : '#e0f2fe', color: n.ambiente === 'PRODUCAO' ? GREEN : '#0369a1', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                          {n.ambiente === 'PRODUCAO' ? 'Produção' : 'Homologação'}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ backgroundColor: st.bg, color: st.color, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                          {n.status.charAt(0) + n.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </motion.table>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
