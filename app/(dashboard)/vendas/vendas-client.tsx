'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowTrendUp, faClock, faCircleCheck, faPlus, faFileLines, faAddressCard, faClipboardList, faMagnifyingGlass, faXmark } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { formatCurrency, formatDate } from '@/lib/utils'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const ORANGE = '#e87320'
const PINK = '#e8255a'
const PURPLE = '#8b5cf6'

type NFeRow = {
  id: string; dataEmissao: string; numero: string | null
  totalValor: number; statusFinanceiro: string; status: string
  cliente: { nome: string }; itensCount: number
}

type RomaneioRow = {
  id: string; numero: number; data: string; totalValor: number
  status: string; cliente: { nome: string }; itensCount: number
}

type Stats = {
  receitaNfe: number; aReceberNfe: number; recebidoNfe: number
  receitaRomaneios: number; receitaMes: number
  totalNfes: number; totalRomaneios: number
}

const nfeStatus: Record<string, { label: string; bg: string; color: string }> = {
  RASCUNHO:    { label: 'Rascunho',   bg: '#f3f4f6', color: '#6b7280' },
  AUTORIZADA:  { label: 'Autorizada', bg: '#f0faf0', color: GREEN },
  CANCELADA:   { label: 'Cancelada',  bg: '#fff0f3', color: PINK },
  REJEITADA:   { label: 'Rejeitada',  bg: '#fff7ed', color: ORANGE },
}

const finStatus: Record<string, { label: string; color: string }> = {
  A_RECEBER: { label: 'A Receber', color: ORANGE },
  RECEBIDO:  { label: 'Recebido',  color: GREEN },
}

export default function VendasClient({
  nfes, romaneios, stats,
}: { nfes: NFeRow[]; romaneios: RomaneioRow[]; stats: Stats }) {
  const [aba, setAba] = useState<'nfe' | 'romaneios'>('nfe')
  const [q, setQ] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('TODOS')

  const filtradosNfe = nfes.filter(n => {
    const matchQ = !q || n.cliente.nome.toLowerCase().includes(q.toLowerCase()) || (n.numero ?? '').includes(q)
    const matchS = statusFiltro === 'TODOS' || n.status === statusFiltro
    return matchQ && matchS
  })

  const filtradosRom = romaneios.filter(r =>
    !q || r.cliente.nome.toLowerCase().includes(q.toLowerCase()) || String(r.numero).includes(q)
  )

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex-header"
      >
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0 }}>Vendas</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Faturamento via NF-e e saídas via Romaneio</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <Link href="/clientes"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', border: '1.5px solid #e5e7eb', backgroundColor: 'white', color: NAVY, borderRadius: 10, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
              <FontAwesomeIcon icon={faAddressCard} style={{ fontSize: 14 }} /> Clientes
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link href="/nfe/nova"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', backgroundColor: GREEN, color: 'white', borderRadius: 10, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
              <FontAwesomeIcon icon={faPlus} style={{ fontSize: 15 }} /> Nova Venda
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Receita do Mês', value: stats.receitaMes, color: NAVY, icon: faArrowTrendUp as IconDefinition },
          { label: 'Receita NF-e', value: stats.receitaNfe, color: GREEN, icon: faFileLines as IconDefinition, sub: `${stats.totalNfes} NF-e` },
          { label: 'A Receber', value: stats.aReceberNfe, color: ORANGE, icon: faClock as IconDefinition },
          { label: 'Recebido', value: stats.recebidoNfe, color: GREEN, icon: faCircleCheck as IconDefinition },
          { label: 'Romaneios', value: stats.receitaRomaneios, color: PURPLE, icon: faClipboardList as IconDefinition, sub: `${stats.totalRomaneios} emitidos` },
        ].map(({ label, value, color, icon, sub }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.4, type: 'spring', stiffness: 200 }}
            style={{ backgroundColor: 'white', borderRadius: 14, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `4px solid ${color}` }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ color: '#6b7280', fontSize: 11, margin: 0, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{label}</p>
                <p className="kpi-val" style={{ color, fontSize: 20, fontWeight: 700, margin: '4px 0 0', wordBreak: 'break-word' }}>{formatCurrency(value)}</p>
                {sub && <p style={{ color: '#9ca3af', fontSize: 11, margin: '2px 0 0' }}>{sub}</p>}
              </div>
              <div style={{ backgroundColor: `${color}15`, borderRadius: 8, padding: 8, flexShrink: 0, marginLeft: 6 }}>
                <FontAwesomeIcon icon={icon} style={{ fontSize: 16, color }} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Abas + Filtros */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, backgroundColor: 'white', borderRadius: 10, padding: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', width: 'fit-content' }}>
          {(['nfe', 'romaneios'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setAba(tab)}
              style={{
                padding: '7px 18px', borderRadius: 8, border: 'none',
                backgroundColor: aba === tab ? NAVY : 'transparent',
                color: aba === tab ? 'white' : '#6b7280',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {tab === 'nfe' ? '📄 NF-e' : '🗒️ Romaneios'}
            </button>
          ))}
        </div>

        {/* Search + filtro */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {aba === 'nfe' && (
            <select
              value={statusFiltro}
              onChange={e => setStatusFiltro(e.target.value)}
              style={{ padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 13, color: NAVY, outline: 'none', fontFamily: 'inherit', backgroundColor: 'white' }}
            >
              <option value="TODOS">Todos os status</option>
              <option value="RASCUNHO">Rascunho</option>
              <option value="AUTORIZADA">Autorizada</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          )}
          <div style={{ position: 'relative' }}>
            <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: 13, position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="Buscar cliente ou nº..."
              style={{ padding: '8px 12px 8px 32px', border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 13, color: NAVY, outline: 'none', width: 220, fontFamily: 'inherit' }}
            />
            {q && (
              <button onClick={() => setQ('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                <FontAwesomeIcon icon={faXmark} style={{ fontSize: 12 }} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabela NF-e */}
      <AnimatePresence mode="wait">
        {aba === 'nfe' && (
          <motion.div
            key="nfe"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            style={{ backgroundColor: 'white', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}
          >
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: NAVY, fontSize: 15, fontWeight: 600 }}>Notas Fiscais</h3>
              <span style={{ backgroundColor: `${NAVY}10`, color: NAVY, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                {filtradosNfe.length} registros
              </span>
            </div>
            {filtradosNfe.length === 0 ? (
              <div style={{ padding: 64, textAlign: 'center', color: '#9ca3af' }}>
                <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 40, opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontWeight: 600, margin: '0 0 6px' }}>Nenhuma NF-e encontrada</p>
                <Link href="/nfe/nova" style={{ fontSize: 13, color: GREEN, textDecoration: 'none', fontWeight: 600 }}>+ Emitir Nova NF-e</Link>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    {['Número', 'Data', 'Cliente', 'Itens', 'Total', 'Status', 'Financeiro', ''].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtradosNfe.map((n, i) => {
                    const st = nfeStatus[n.status] ?? nfeStatus.RASCUNHO
                    const fin = finStatus[n.statusFinanceiro]
                    return (
                      <motion.tr
                        key={n.id}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        whileHover={{ backgroundColor: '#f8fffe' }}
                        style={{ borderBottom: '1px solid #f3f4f6' }}
                      >
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: NAVY }}>
                          {n.numero ? `#${n.numero}` : <span style={{ color: '#d1d5db' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: '#6b7280' }}>{formatDate(new Date(n.dataEmissao))}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 500, color: NAVY }}>{n.cliente.nome}</td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#9ca3af' }}>{n.itensCount} item{n.itensCount !== 1 ? 's' : ''}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: NAVY }}>{formatCurrency(n.totalValor)}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ backgroundColor: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{st.label}</span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {n.status === 'AUTORIZADA' && fin && (
                            <span style={{ color: fin.color, fontSize: 12, fontWeight: 600 }}>{fin.label}</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <Link href="/nfe" style={{ fontSize: 12, color: GREEN, textDecoration: 'none', fontWeight: 600 }}>Ver NF-e</Link>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </motion.div>
        )}

        {/* Tabela Romaneios */}
        {aba === 'romaneios' && (
          <motion.div
            key="romaneios"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            style={{ backgroundColor: 'white', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}
          >
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: NAVY, fontSize: 15, fontWeight: 600 }}>Romaneios Emitidos</h3>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ backgroundColor: `${NAVY}10`, color: NAVY, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  {filtradosRom.length} registros
                </span>
                <Link href="/romaneios"
                  style={{ fontSize: 12, color: PURPLE, textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  Módulo completo →
                </Link>
              </div>
            </div>
            {filtradosRom.length === 0 ? (
              <div style={{ padding: 64, textAlign: 'center', color: '#9ca3af' }}>
                <FontAwesomeIcon icon={faClipboardList} style={{ fontSize: 40, opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontWeight: 600, margin: '0 0 6px' }}>Nenhum romaneio encontrado</p>
                <Link href="/romaneios" style={{ fontSize: 13, color: PURPLE, textDecoration: 'none', fontWeight: 600 }}>Ir para Romaneios</Link>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    {['Número', 'Data', 'Cliente', 'Itens', 'Total', 'Status', ''].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtradosRom.map((r, i) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      whileHover={{ backgroundColor: '#f8fffe' }}
                      style={{ borderBottom: '1px solid #f3f4f6' }}
                    >
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: NAVY }}>#{r.numero}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#6b7280' }}>{formatDate(new Date(r.data))}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 500, color: NAVY }}>{r.cliente.nome}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#9ca3af' }}>{r.itensCount} item{r.itensCount !== 1 ? 's' : ''}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: NAVY }}>{formatCurrency(r.totalValor)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ backgroundColor: '#f0faf0', color: GREEN, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>Emitido</span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <Link href="/romaneios" style={{ fontSize: 12, color: PURPLE, textDecoration: 'none', fontWeight: 600 }}>Ver</Link>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
