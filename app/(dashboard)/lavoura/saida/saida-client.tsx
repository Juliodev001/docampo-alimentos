'use client'
import { motion } from 'motion/react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBox, faDollarSign, faArrowTrendUp, faPlus, faChevronLeft } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { formatDate, formatCurrency } from '@/lib/utils'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'

type Saida = {
  id: string; data: Date; quantidade: number; valorUnit: number; totalValor: number
  observacao: string | null; produto: { nome: string }; responsavel: { name: string | null }
}

export default function SaidaClient({ saidas, totalQtd, totalValor, ticketMedio }: {
  saidas: Saida[]; totalQtd: number; totalValor: number; ticketMedio: number
}) {
  const cards = [
    { label: 'Qtd total saída', value: `${totalQtd.toFixed(0)} caixas`, color: NAVY, icon: faBox as IconDefinition },
    { label: 'Receita total', value: formatCurrency(totalValor), color: GREEN, icon: faDollarSign as IconDefinition },
    { label: 'Ticket médio por saída', value: formatCurrency(ticketMedio), color: PINK, icon: faArrowTrendUp as IconDefinition },
  ]

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}
      >
        <div>
          <Link href="/lavoura" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#6b7280', fontSize: 13, textDecoration: 'none', marginBottom: 8 }}>
            <FontAwesomeIcon icon={faChevronLeft} style={{ fontSize: 14 }} /> Lavoura
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0 }}>Saída de Produção</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Movimentações financeiras da saída da lavoura</p>
        </div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Link href="/lavoura/saida/nova" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', backgroundColor: GREEN, color: 'white', borderRadius: 10, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            <FontAwesomeIcon icon={faPlus} style={{ fontSize: 15 }} /> Registrar Saída
          </Link>
        </motion.div>
      </motion.div>

      <div className="kpi-grid-3">
        {cards.map(({ label, value, color, icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4, type: 'spring', stiffness: 180 }}
            whileHover={{ y: -3, boxShadow: '0 8px 28px rgba(0,0,0,0.1)' }}
            style={{ backgroundColor: 'white', borderRadius: 14, padding: '22px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `4px solid ${color}` }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>{label}</p>
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 + 0.2 }}
                  style={{ color, fontSize: 24, fontWeight: 700, margin: '6px 0 0' }}
                >{value}</motion.p>
              </div>
              <div style={{ backgroundColor: `${color}15`, borderRadius: 10, padding: 10 }}>
                <FontAwesomeIcon icon={icon} style={{ fontSize: 20, color }} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.4 }}
        style={{ backgroundColor: 'white', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}
      >
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: NAVY }}>Registros de Saída</h3>
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: 'spring', stiffness: 400 }}
            style={{ backgroundColor: `${NAVY}12`, color: NAVY, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            {saidas.length}
          </motion.span>
        </div>
        {saidas.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            style={{ padding: 64, textAlign: 'center', color: '#9ca3af' }}>
            <FontAwesomeIcon icon={faBox} style={{ fontSize: 40, opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontWeight: 600, margin: '0 0 6px' }}>Nenhuma saída registrada ainda</p>
            <Link href="/lavoura/saida/nova" style={{ color: GREEN, fontSize: 13 }}>Registrar primeira saída →</Link>
          </motion.div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                {['Data', 'Produto', 'Quantidade', 'Valor Unit.', 'Total', 'Responsável', 'Obs'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {saidas.map((s, i) => (
                <motion.tr
                  key={s.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.38 + i * 0.04 }}
                  whileHover={{ backgroundColor: '#f8fffe' }}
                  style={{ borderBottom: '1px solid #f3f4f6' }}
                >
                  <td style={{ padding: '12px 16px', fontSize: 13, color: NAVY }}>{formatDate(s.data)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: NAVY }}>🍓 {s.produto.nome}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: NAVY }}>{s.quantidade.toFixed(1)} cx</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{formatCurrency(s.valorUnit)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: GREEN }}>{formatCurrency(s.totalValor)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#6b7280' }}>{s.responsavel.name}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#9ca3af' }}>{s.observacao ?? '—'}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>
    </div>
  )
}
