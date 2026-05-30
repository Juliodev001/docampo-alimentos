'use client'
import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faReceipt, faPlus, faCircleCheck, faClock } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import PageSkeleton from '@/components/page-skeleton'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'
const ORANGE = '#e87320'

type Produtor = { id: string; nome: string; cpf: string | null }
type Fechamento = {
  id: string
  produtorId: string
  produtor: Produtor
  dataInicio: string
  dataFim: string
  dataPagamento: string
  valesEmbalagem: number
  valesDinheiro: number
  creditos: number
  debitosAnteriores: number
  status: string
  createdAt: string
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('pt-BR')
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function PagamentoClient() {
  const [fechamentos, setFechamentos] = useState<Fechamento[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('TODOS')

  useEffect(() => {
    const params = new URLSearchParams()
    if (filtroStatus !== 'TODOS') params.set('status', filtroStatus)
    fetch(`/api/fechamento?${params}`).then(r => r.json()).then(setFechamentos).finally(() => setLoading(false))
  }, [filtroStatus])

  if (loading) return <PageSkeleton cards={2} rows={5} />

  const pendentes = fechamentos.filter(f => f.status === 'PENDENTE').length
  const pagos = fechamentos.filter(f => f.status === 'PAGO').length

  const cards = [
    { label: 'Pendentes', value: pendentes, color: ORANGE, icon: faClock as IconDefinition },
    { label: 'Pagos', value: pagos, color: GREEN, icon: faCircleCheck as IconDefinition },
  ]

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}
      >
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0 }}>Pagamento de Produtores</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Fechamentos e demonstrativos de pagamento</p>
        </div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Link href="/lavoura/pagamento/novo" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', backgroundColor: GREEN, color: 'white', borderRadius: 10, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            <FontAwesomeIcon icon={faPlus} style={{ fontSize: 15 }} /> Novo Fechamento
          </Link>
        </motion.div>
      </motion.div>

      <div className="stats-grid-2" style={{ marginBottom: 24 }}>
        {cards.map(({ label, value, color, icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.09, duration: 0.4, type: 'spring', stiffness: 180 }}
            whileHover={{ y: -3, boxShadow: '0 8px 28px rgba(0,0,0,0.1)' }}
            style={{ backgroundColor: 'white', borderRadius: 14, padding: '22px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `4px solid ${color}` }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>{label}</p>
                <p style={{ color, fontSize: 32, fontWeight: 700, margin: '6px 0 0' }}>{value}</p>
              </div>
              <div style={{ backgroundColor: `${color}15`, borderRadius: 10, padding: 10 }}>
                <FontAwesomeIcon icon={icon} style={{ fontSize: 20, color }} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filtro */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['TODOS', 'PENDENTE', 'PAGO'].map(s => (
          <motion.button key={s} onClick={() => setFiltroStatus(s)}
            whileHover={{ scale: 1.06, boxShadow: '0 4px 14px rgba(0,0,0,0.12)' }}
            whileTap={{ scale: 0.93 }}
            transition={{ type: 'spring', stiffness: 450, damping: 18 }}
            style={{
              padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
              backgroundColor: filtroStatus === s ? NAVY : '#f3f4f6',
              color: filtroStatus === s ? 'white' : '#6b7280',
            }}>
            {s === 'TODOS' ? 'Todos' : s === 'PENDENTE' ? 'Pendentes' : 'Pagos'}
          </motion.button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.4 }}
        style={{ backgroundColor: 'white', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}
      >
        {fechamentos.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center', color: '#9ca3af' }}>
            <FontAwesomeIcon icon={faReceipt} style={{ fontSize: 40, opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontWeight: 600, margin: '0 0 6px' }}>Nenhum fechamento encontrado</p>
            <Link href="/lavoura/pagamento/novo" style={{ color: GREEN, fontSize: 13 }}>Criar fechamento →</Link>
          </div>
        ) : (
          <div className="table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  {['Produtor', 'Período', 'Pagamento', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fechamentos.map((f, i) => {
                  return (
                    <motion.tr
                      key={f.id}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.04, duration: 0.3 }}
                      whileHover={{ backgroundColor: '#f8fffe' }}
                      style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                    >
                      <td style={{ padding: '13px 16px', fontSize: 14, fontWeight: 600, color: NAVY, whiteSpace: 'nowrap' }}>
                        {f.produtor.nome}
                        <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 400 }}>{f.produtor.cpf}</div>
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {fmt(f.dataInicio)} – {fmt(f.dataFim)}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {fmt(f.dataPagamento)}
                      </td>
                      <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          backgroundColor: f.status === 'PAGO' ? '#f0faf0' : '#fff7ed',
                          color: f.status === 'PAGO' ? GREEN : ORANGE,
                          padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        }}>
                          {f.status === 'PAGO' ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <Link href={`/lavoura/pagamento/${f.id}`}
                          style={{ color: GREEN, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                          Ver →
                        </Link>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}
