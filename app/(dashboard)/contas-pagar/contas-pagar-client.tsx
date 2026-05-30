'use client'
import { useState, useRef, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDollarSign, faCircleCheck, faCalendarXmark, faCalendarDay, faCalendarDays, faFilter, faMagnifyingGlass, faChartBar } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { formatCurrency, formatDate } from '@/lib/utils'

const GREEN  = '#5ab952'
const NAVY   = '#2d3561'
const PINK   = '#e8255a'
const ORANGE = '#e87320'
const BLUE   = '#3b82f6'

type Conta = {
  id: string
  tipo: string
  fornecedor: string
  roca: string | null
  valor: number
  vencimento: string
  status: string
  observacao: string | null
}

const statusCfg: Record<string, { label: string; bg: string; color: string }> = {
  PAGO:    { label: 'Pago',    bg: '#f0faf0', color: '#2d7d28' },
  A_PAGAR: { label: 'A Pagar', bg: '#fff7ed', color: '#b85c00' },
  VENCIDO: { label: 'Vencido', bg: '#fff0f3', color: '#c0113a' },
}

const categoriaLabel: Record<string, string> = {
  MATERIA_PRIMA:          'Matéria Prima',
  INSUMO:                 'Insumo',
  DESPESA_OPERACIONAL:    'Desp. Operacional',
  DESPESA_ADMINISTRATIVA: 'Desp. Administrativa',
  OUTROS:                 'Outros',
}

/* ── KPI card estilo TopERP ── */
function KpiCard({
  label, value, color, icon,
}: { label: string; value: string; color: string; icon: IconDefinition }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 12,
      padding: '20px 22px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      flex: 1,
      minWidth: 0,
    }}>
      {/* ícone em círculo colorido */}
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: `${color}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <FontAwesomeIcon icon={icon} style={{ fontSize: 18, color }} />
      </div>
      <p style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: 0, lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{label}</p>
    </div>
  )
}

/* ── botão outline ── */
function OutlineBtn({
  icon, label, onClick, active,
}: { icon: IconDefinition; label: string; onClick?: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        border: `1.5px solid ${active ? NAVY : '#e5e7eb'}`,
        borderRadius: 8, padding: '7px 14px',
        background: active ? `${NAVY}08` : 'white',
        fontSize: 13, color: NAVY, cursor: 'pointer',
        fontFamily: 'inherit', fontWeight: 500,
        whiteSpace: 'nowrap' as const,
      }}
    >
      <FontAwesomeIcon icon={icon} style={{ fontSize: 14, color: '#6b7280' }} />{label}
    </button>
  )
}

/* ═══════════════════════════════════════ */
export default function ContasPagarClient({
  contas, totalAPagar, totalPago, vencidas, vencendoHoje, vencendoMes,
}: {
  contas: Conta[]
  totalAPagar: number
  totalPago: number
  vencidas: number
  vencendoHoje: number
  vencendoMes: number
}) {
  const [q, setQ]                       = useState('')
  const [relOpen, setRelOpen]           = useState(false)
  const relRef                          = useRef<HTMLDivElement>(null)

  /* fechar dropdown ao clicar fora */
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (relRef.current && !relRef.current.contains(e.target as Node)) setRelOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const filtradas = contas.filter(c =>
    !q ||
    c.fornecedor.toLowerCase().includes(q.toLowerCase()) ||
    (c.observacao ?? '').toLowerCase().includes(q.toLowerCase()) ||
    (c.roca ?? '').toLowerCase().includes(q.toLowerCase()) ||
    categoriaLabel[c.tipo]?.toLowerCase().includes(q.toLowerCase()) ||
    c.id.slice(-6).toLowerCase().includes(q.toLowerCase())
  )

  const kpis = [
    { label: 'Total a Pagar',     value: formatCurrency(totalAPagar), color: ORANGE, icon: faDollarSign as IconDefinition     },
    { label: 'Total Pago',        value: formatCurrency(totalPago),   color: GREEN,  icon: faCircleCheck as IconDefinition    },
    { label: 'Vencidas',          value: String(vencidas),            color: PINK,   icon: faCalendarXmark as IconDefinition  },
    { label: 'Vencendo Hoje',     value: String(vencendoHoje),        color: ORANGE, icon: faCalendarDay as IconDefinition    },
    { label: 'Vencendo Este Mês', value: String(vencendoMes),         color: BLUE,   icon: faCalendarDays as IconDefinition   },
  ]

  return (
    <div>
      {/* ── Cabeçalho ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: 0 }}>
          Contas a Pagar
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
          Gerencie suas contas a pagar
        </p>
      </div>

      {/* ── KPI cards ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {kpis.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* ── Filtros ── */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <OutlineBtn icon={faFilter} label="Filtros" />

        <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
          <FontAwesomeIcon icon={faMagnifyingGlass} style={{
            fontSize: 14, position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none',
          }} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar por número da conta, descrição, fornecedor..."
            style={{
              width: '100%', padding: '8px 12px 8px 34px',
              border: '1.5px solid #e5e7eb', borderRadius: 8,
              fontSize: 13, color: NAVY, outline: 'none',
              background: 'white', boxSizing: 'border-box' as const,
            }}
          />
        </div>

        {/* Relatórios com dropdown */}
        <div ref={relRef} style={{ position: 'relative' }}>
          <OutlineBtn
            icon={faChartBar}
            label="Relatórios"
            active={relOpen}
            onClick={() => setRelOpen(v => !v)}
          />
          {relOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 6px)',
              background: 'white', borderRadius: 10,
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              border: '1px solid #e5e7eb',
              minWidth: 220, zIndex: 50, padding: '6px 0',
            }}>
              <p style={{
                fontSize: 11, fontWeight: 700, color: '#6b7280',
                textTransform: 'uppercase', letterSpacing: 0.5,
                padding: '8px 16px 4px', margin: 0,
              }}>Relatórios</p>
              <button
                onClick={() => setRelOpen(false)}
                style={{
                  width: '100%', textAlign: 'left', padding: '9px 16px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: '#374151', fontFamily: 'inherit',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                Relatório financeiro por fornecedor
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabela ── */}
      <div style={{
        background: 'white', borderRadius: 12,
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['ID', 'Tipo', 'Fornecedor', 'Roça', 'Valor', 'Valor Pago', 'Data Vencimento', 'Status'].map(h => (
                  <th key={h} style={{
                    padding: '11px 14px', textAlign: 'left',
                    fontSize: 12, color: '#6b7280', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: 0.5,
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '60px 16px', textAlign: 'center' }}>
                    <FontAwesomeIcon icon={faDollarSign} style={{ fontSize: 40, color: '#d1d5db', display: 'block', margin: '0 auto 12px' }} />
                    <span style={{ color: '#9ca3af', fontSize: 14 }}>
                      Não há contas a pagar no momento
                    </span>
                  </td>
                </tr>
              ) : filtradas.map(c => {
                const sc = statusCfg[c.status] ?? statusCfg.A_PAGAR
                return (
                  <tr
                    key={c.id}
                    style={{ borderTop: '1px solid #f3f4f6' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#f9fafb'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}
                  >
                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#6b7280' }}>
                      #{c.id.slice(-6).toUpperCase()}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: NAVY, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {categoriaLabel[c.tipo] ?? c.tipo}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: NAVY }}>
                      {c.fornecedor}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#6b7280' }}>
                      {c.roca ?? '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: NAVY, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {formatCurrency(c.valor)}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, whiteSpace: 'nowrap', color: c.status === 'PAGO' ? GREEN : '#9ca3af' }}>
                      {c.status === 'PAGO' ? formatCurrency(c.valor) : 'R$ 0,00'}
                    </td>
                    <td style={{
                      padding: '12px 14px', fontSize: 13, whiteSpace: 'nowrap',
                      color: c.status === 'VENCIDO' ? PINK : '#374151',
                    }}>
                      {formatDate(new Date(c.vencimento))}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        background: sc.bg, color: sc.color,
                        padding: '3px 10px', borderRadius: 20,
                        fontSize: 11, fontWeight: 600,
                      }}>
                        {sc.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
