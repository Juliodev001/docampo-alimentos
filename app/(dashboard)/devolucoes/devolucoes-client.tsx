'use client'
import { motion } from 'motion/react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRotateLeft, faDollarSign, faClock, faCircleCheck, faPlus, faFileLines } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { formatCurrency, formatDate } from '@/lib/utils'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'
const ORANGE = '#e87320'

type Devolucao = {
  id: string; data: Date; nfReferencia: string | null; totalValor: number
  status: string; formaAcerto: string; cliente: { nome: string }; itens: { id: string }[]
}

const formaLabel: Record<string, string> = { ABATIMENTO: 'Abatimento', DEVOLUCAO_DINHEIRO: 'Devolução $', CREDITO: 'Crédito' }

export default function DevolucoesClient({ devolucoes, total, totalValor, pendentes, acertadas }: {
  devolucoes: Devolucao[]; total: number; totalValor: number; pendentes: number; acertadas: number
}) {
  const cards = [
    { label: 'Total de devoluções', value: total, display: String(total), color: NAVY, icon: faRotateLeft as IconDefinition },
    { label: 'Valor total devolvido', value: totalValor, display: formatCurrency(totalValor), color: PINK, icon: faDollarSign as IconDefinition },
    { label: 'Pendentes de acerto', value: pendentes, display: String(pendentes), color: ORANGE, icon: faClock as IconDefinition },
    { label: 'Já acertadas', value: acertadas, display: String(acertadas), color: GREEN, icon: faCircleCheck as IconDefinition },
  ]

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex-header"
      >
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0 }}>Devoluções Recebidas</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Notas de devolução recebidas de clientes</p>
        </div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Link href="/devolucoes/nova" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', backgroundColor: GREEN, color: 'white', borderRadius: 10, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            <FontAwesomeIcon icon={faPlus} style={{ fontSize: 15 }} /> Registrar Devolução
          </Link>
        </motion.div>
      </motion.div>

      <div className="kpi-grid-4">
        {cards.map(({ label, display, color, icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4, type: 'spring', stiffness: 180 }}
            whileHover={{ y: -3, boxShadow: '0 8px 28px rgba(0,0,0,0.1)' }}
            style={{ backgroundColor: 'white', borderRadius: 14, padding: '20px 22px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `4px solid ${color}` }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>{label}</p>
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.08 + 0.2 }}
                  className="kpi-val" style={{ color, fontSize: 22, fontWeight: 700, margin: '6px 0 0', wordBreak: 'break-word' }}
                >{display}</motion.p>
              </div>
              <div style={{ backgroundColor: `${color}15`, borderRadius: 10, padding: 8, flexShrink: 0, marginLeft: 6 }}>
                <FontAwesomeIcon icon={icon} style={{ fontSize: 16, color }} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36, duration: 0.4 }}
        style={{ backgroundColor: 'white', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}
      >
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FontAwesomeIcon icon={faRotateLeft} style={{ fontSize: 16, color: PINK }} />
            <h3 style={{ margin: 0, color: NAVY, fontSize: 15, fontWeight: 600 }}>Notas de devolução</h3>
          </div>
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: 'spring', stiffness: 400 }}
            style={{ backgroundColor: `${NAVY}12`, color: NAVY, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            {total} registros
          </motion.span>
        </div>
        {devolucoes.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            style={{ padding: 64, textAlign: 'center', color: '#9ca3af' }}>
            <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 40, opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontWeight: 600, margin: 0 }}>Nenhuma devolução encontrada</p>
          </motion.div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                {['Data', 'NF Ref.', 'Cliente', 'Valor Total', 'Forma de Acerto', 'Status'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {devolucoes.map((d, i) => (
                <motion.tr
                  key={d.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.04 }}
                  whileHover={{ backgroundColor: '#fff8f8' }}
                  style={{ borderBottom: '1px solid #f3f4f6' }}
                >
                  <td style={{ padding: '13px 16px', fontSize: 13, color: NAVY }}>{formatDate(d.data)}</td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: '#6b7280' }}>{d.nfReferencia ?? '-'}</td>
                  <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 500, color: NAVY }}>{d.cliente.nome}</td>
                  <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 700, color: PINK }}>{formatCurrency(d.totalValor)}</td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: '#6b7280' }}>{formaLabel[d.formaAcerto] ?? d.formaAcerto}</td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ backgroundColor: d.status === 'ACERTADA' ? '#f0faf0' : '#fff7ed', color: d.status === 'ACERTADA' ? GREEN : ORANGE, padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                      {d.status === 'ACERTADA' ? 'Acertada' : 'Pendente'}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>
    </div>
  )
}
