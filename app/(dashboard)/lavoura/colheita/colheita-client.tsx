'use client'
import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBox, faLeaf, faUsers, faPlus, faChevronLeft } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { formatDate } from '@/lib/utils'
import PageSkeleton from '@/components/page-skeleton'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const ORANGE = '#e87320'

type Colheita = {
  id: string; data: string; quantidadeTotal: number; quantidadeDono: number; quantidadeParceiro: number
  observacao: string | null; produto: { nome: string }; responsavel: { name: string | null; role: string }
}

export default function ColheitaClient() {
  const [colheitas, setColheitas] = useState<Colheita[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/colheita')
      .then((r) => r.json())
      .then(setColheitas)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageSkeleton cards={3} rows={6} />

  const total = colheitas.reduce((s, c) => s + c.quantidadeTotal, 0)
  const totalDono = colheitas.reduce((s, c) => s + c.quantidadeDono, 0)
  const totalParceiro = colheitas.reduce((s, c) => s + c.quantidadeParceiro, 0)

  const cards = [
    { label: 'Total colhido', value: `${total.toFixed(0)} caixas`, color: NAVY, icon: faBox as IconDefinition },
    { label: 'Parte do dono', value: `${totalDono.toFixed(0)} caixas`, color: GREEN, icon: faLeaf as IconDefinition },
    { label: 'Parte dos parceiros', value: `${totalParceiro.toFixed(0)} caixas`, color: ORANGE, icon: faUsers as IconDefinition },
  ]

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex-header"
      >
        <div>
          <Link href="/lavoura" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#6b7280', fontSize: 13, textDecoration: 'none', marginBottom: 8 }}>
            <FontAwesomeIcon icon={faChevronLeft} style={{ fontSize: 14 }} /> Lavoura
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0 }}>Colheitas Diárias</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Histórico completo com divisão por produtor</p>
        </div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Link href="/lavoura/colheita/nova" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', backgroundColor: GREEN, color: 'white', borderRadius: 10, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            <FontAwesomeIcon icon={faPlus} style={{ fontSize: 15 }} /> Registrar Colheita
          </Link>
        </motion.div>
      </motion.div>

      <div className="stats-grid-3" style={{ marginBottom: 24 }}>
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
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: NAVY }}>Registros de Colheita</h3>
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: 'spring', stiffness: 400 }}
            style={{ backgroundColor: `${GREEN}15`, color: GREEN, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
            {colheitas.length}
          </motion.span>
        </div>
        {colheitas.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            style={{ padding: 64, textAlign: 'center', color: '#9ca3af' }}>
            <FontAwesomeIcon icon={faLeaf} style={{ fontSize: 40, opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontWeight: 600, margin: '0 0 6px' }}>Nenhuma colheita registrada ainda</p>
            <Link href="/lavoura/colheita/nova" style={{ color: GREEN, fontSize: 13 }}>Registrar primeira colheita →</Link>
          </motion.div>
        ) : (
          <div className="table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  {['Data', 'Produto', 'Qtd Total', 'Dono', 'Parceiros', 'Responsável', 'Obs'].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {colheitas.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.38 + i * 0.04 }}
                    whileHover={{ backgroundColor: '#f8fffe' }}
                    style={{ borderBottom: '1px solid #f3f4f6' }}
                  >
                    <td style={{ padding: '12px 16px', fontSize: 13, color: NAVY, whiteSpace: 'nowrap' }}>{formatDate(c.data)}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: NAVY, whiteSpace: 'nowrap' }}>🍓 {c.produto.nome}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: NAVY, whiteSpace: 'nowrap' }}>{c.quantidadeTotal.toFixed(1)} cx</td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ backgroundColor: '#f0faf0', color: GREEN, padding: '4px 10px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                        {c.quantidadeDono.toFixed(1)} cx
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ backgroundColor: '#fff7ed', color: ORANGE, padding: '4px 10px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                        {c.quantidadeParceiro.toFixed(1)} cx
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' }}>{c.responsavel.name}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#9ca3af' }}>{c.observacao ?? '—'}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}
