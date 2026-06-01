'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCreditCard, faDollarSign, faCalendarXmark, faCalendarDay, faCalendarDays, faFilter, faMagnifyingGlass, faChartBar, faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { formatCurrency, formatDate } from '@/lib/utils'

const GREEN  = '#5ab952'
const NAVY   = '#2d3561'
const PINK   = '#e8255a'
const ORANGE = '#e87320'
const BLUE   = '#3b82f6'

type Titulo = {
  id: string
  cliente: string
  descricao: string
  valor: number
  valorPago: number
  dataVenc: string
  dataPagamento: string | null
  status: string
}

const statusCfg: Record<string, { label: string; bg: string; color: string }> = {
  RECEBIDO:  { label: 'Recebido',  bg: '#f0faf0', color: '#2d7d28' },
  A_RECEBER: { label: 'A Receber', bg: '#fff7ed', color: '#b85c00' },
  VENCIDO:   { label: 'Vencido',   bg: '#fff0f3', color: '#c0113a' },
}

/* ── KPI card estilo TopERP ── */
function KpiCard({
  label, value, color, icon, info,
}: { label: string; value: string; color: string; icon: IconDefinition; info?: boolean }) {
  return (
    <div style={{
      background: 'white', borderRadius: 12,
      padding: '20px 22px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
      display: 'flex', flexDirection: 'column', gap: 10,
      flex: 1, minWidth: 0, position: 'relative',
    }}>
      {info && (
        <div style={{ position: 'absolute', top: 14, right: 14, color: '#9ca3af' }}>
          <FontAwesomeIcon icon={faCircleInfo} style={{ fontSize: 14 }} />
        </div>
      )}
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: `${color}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <FontAwesomeIcon icon={icon} style={{ fontSize: 16, color }} />
      </div>
      <p className="kpi-val" style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: 0, lineHeight: 1, wordBreak: 'break-word' }}>
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
export default function ContasReceberClient({
  titulos: inicial,
  totalAReceber, valorRecebido, vencidas, vencendoHoje, vencendoMes,
}: {
  titulos: Titulo[]
  totalAReceber: number
  valorRecebido: number
  vencidas: number
  vencendoHoje: number
  vencendoMes: number
}) {
  const router  = useRouter()
  const [q, setQ]           = useState('')
  const [titulos, setTitulos] = useState(inicial)
  const [relOpen, setRelOpen] = useState(false)
  const relRef              = useRef<HTMLDivElement>(null)

  /* fechar dropdown ao clicar fora */
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (relRef.current && !relRef.current.contains(e.target as Node)) setRelOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const filtrados = titulos.filter(t =>
    !q ||
    t.cliente.toLowerCase().includes(q.toLowerCase()) ||
    t.descricao.toLowerCase().includes(q.toLowerCase()) ||
    t.id.slice(-6).toLowerCase().includes(q.toLowerCase())
  )

  async function marcarRecebido(id: string) {
    await fetch(`/api/titulos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'RECEBIDO' }),
    })
    setTitulos(prev =>
      prev.map(t => t.id === id
        ? { ...t, status: 'RECEBIDO', valorPago: t.valor, dataPagamento: new Date().toISOString() }
        : t
      )
    )
    router.refresh()
  }

  const kpis = [
    { label: 'Total a Receber',   value: formatCurrency(totalAReceber), color: BLUE,   icon: faCreditCard,    info: true  },
    { label: 'Valor Recebido',    value: formatCurrency(valorRecebido), color: GREEN,  icon: faDollarSign,    info: false },
    { label: 'Vencidas',          value: String(vencidas),              color: PINK,   icon: faCalendarXmark, info: false },
    { label: 'Vencendo Hoje',     value: String(vencendoHoje),          color: ORANGE, icon: faCalendarDay,   info: false },
    { label: 'Vencendo Este Mês', value: String(vencendoMes),           color: BLUE,   icon: faCalendarDays,  info: false },
  ]

  return (
    <div>
      {/* ── Cabeçalho ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: 0 }}>
          Contas a Receber
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
          Gerencie recebimentos por cliente e parcela
        </p>
      </div>

      {/* ── KPI cards ── */}
      <div className="kpi-flex">
        {kpis.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* ── Filtros ── */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <OutlineBtn icon={faFilter} label="Filtros" />

        <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
          <FontAwesomeIcon icon={faMagnifyingGlass} style={{
            position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none', fontSize: 14,
          }} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar por número do pedido, cliente..."
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
              minWidth: 240, zIndex: 50, padding: '6px 0',
            }}>
              <p style={{
                fontSize: 11, fontWeight: 700, color: '#6b7280',
                textTransform: 'uppercase', letterSpacing: 0.5,
                padding: '8px 16px 4px', margin: 0,
              }}>Relatórios</p>
              {[
                'Relatório em aberto',
                'Relatório financeiro por cliente',
                'Relatório de produtos por cliente',
              ].map(item => (
                <button
                  key={item}
                  onClick={() => setRelOpen(false)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '9px 16px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, color: '#374151', fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  {item}
                </button>
              ))}
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
                {['ID', 'Cliente', 'Roça', 'Valor', 'Valor Pago', 'Data Vencimento', 'Status', ''].map(h => (
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
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '60px 16px', textAlign: 'center' }}>
                    <FontAwesomeIcon icon={faDollarSign} style={{ fontSize: 40, color: '#d1d5db', display: 'block', margin: '0 auto 12px' }} />
                    <span style={{ color: '#9ca3af', fontSize: 14 }}>
                      Não há contas a receber no momento
                    </span>
                  </td>
                </tr>
              ) : filtrados.map(t => {
                const sc = statusCfg[t.status] ?? statusCfg.A_RECEBER
                return (
                  <tr
                    key={t.id}
                    style={{ borderTop: '1px solid #f3f4f6' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#f9fafb'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}
                  >
                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#6b7280' }}>
                      #{t.id.slice(-6).toUpperCase()}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: NAVY, fontWeight: 500 }}>
                      {t.cliente}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#6b7280' }}>
                      —
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: NAVY, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {formatCurrency(t.valor)}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, whiteSpace: 'nowrap', color: t.status === 'RECEBIDO' ? GREEN : '#9ca3af' }}>
                      {t.valorPago > 0 ? formatCurrency(t.valorPago) : 'R$ 0,00'}
                    </td>
                    <td style={{
                      padding: '12px 14px', fontSize: 13, whiteSpace: 'nowrap',
                      color: t.status === 'VENCIDO' ? PINK : '#374151',
                    }}>
                      {formatDate(new Date(t.dataVenc))}
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
                    <td style={{ padding: '12px 14px' }}>
                      {t.status !== 'RECEBIDO' && (
                        <button
                          onClick={() => marcarRecebido(t.id)}
                          style={{
                            padding: '4px 12px',
                            border: `1.5px solid ${GREEN}`,
                            borderRadius: 6, background: 'white',
                            color: GREEN, fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'inherit',
                            whiteSpace: 'nowrap' as const,
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#f0faf0')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                        >
                          ✓ Recebido
                        </button>
                      )}
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
