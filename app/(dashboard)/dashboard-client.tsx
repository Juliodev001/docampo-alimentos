'use client'
import { useState, useEffect, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCartShopping, faArrowTrendUp, faChartBar, faCalendar, faSliders } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { formatCurrency } from '@/lib/utils'

const GREEN = '#5ab952'
const NAVY  = '#2d3561'
const PINK  = '#e8255a'
const BLUE  = '#3b82f6'

type DashData = {
  competencia: { comprasMes: number; vendasMes: number }
  caixa:       { comprasPaga: number; vendasRecebida: number }
  totais:      { totalPago: number; totalRecebido: number }
  dre: { vendas: number; compras: number; fornecedores: { nome: string; valor: number }[] }
}
type CentroCusto = { id: string; nome: string }

const EMPTY: DashData = {
  competencia: { comprasMes: 0, vendasMes: 0 },
  caixa:       { comprasPaga: 0, vendasRecebida: 0 },
  totais:      { totalPago: 0, totalRecebido: 0 },
  dre:         { vendas: 0, compras: 0, fornecedores: [] },
}

/* ── gera últimos 12 meses como opções de select ── */
function buildMonthOptions() {
  const opts: { value: string; label: string }[] = [
    { value: '', label: 'Todos os meses' },
  ]
  const hoje = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const l = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    opts.push({ value: v, label: l.charAt(0).toUpperCase() + l.slice(1) })
  }
  return opts
}

/* ─────────────────────────────────────────────
   Metric card — colored left border, all-round
───────────────────────────────────────────── */
function MetricCard({
  label, value, color, icon,
}: {
  label: string; value: number; color: string; icon: IconDefinition
}) {
  return (
    <div style={{
      position: 'relative',
      borderLeft: `4px solid ${color}`,
      borderRadius: 8,
      background: 'white',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      padding: '18px 18px 18px 18px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      overflow: 'hidden',
    }}>
      <div>
        <p style={{ fontSize: 12, color: '#6b7280', margin: 0, fontWeight: 400 }}>{label}</p>
        <p style={{
          fontSize: 24, fontWeight: 700, color,
          margin: '8px 0 0', lineHeight: 1.1,
        }}>
          {formatCurrency(value)}
        </p>
      </div>
      <div style={{
        background: `${color}18`, borderRadius: 8,
        padding: 9, flexShrink: 0, marginLeft: 12,
      }}>
        <FontAwesomeIcon icon={icon} style={{ fontSize: 18, color }} />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Filter controls — select dropdowns
───────────────────────────────────────────── */
function Filters({
  mes, setMes, rocaId, setRocaId, centrosCusto,
}: {
  mes: string; setMes: (v: string) => void
  rocaId: string; setRocaId: (v: string) => void
  centrosCusto: CentroCusto[]
}) {
  const monthOptions = useMemo(buildMonthOptions, [])

  const box: React.CSSProperties = {
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '8px 12px',
    background: 'white',
    minWidth: 175,
  }
  const lbl: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 5,
    fontSize: 11, color: '#9ca3af', fontWeight: 500,
    marginBottom: 5,
  }
  const sel: React.CSSProperties = {
    border: 'none', outline: 'none', width: '100%',
    fontSize: 13, color: NAVY, fontFamily: 'inherit',
    background: 'transparent', cursor: 'pointer',
    appearance: 'none' as const,
  }

  return (
    <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
      <div style={box}>
        <div style={lbl}>
          <FontAwesomeIcon icon={faCalendar} style={{ fontSize: 11, color: '#9ca3af' }} />
          Mês de referência
        </div>
        <select value={mes} onChange={e => setMes(e.target.value)} style={sel}>
          {monthOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div style={box}>
        <div style={lbl}>
          <FontAwesomeIcon icon={faSliders} style={{ fontSize: 11, color: '#9ca3af' }} />
          Roça
        </div>
        <select value={rocaId} onChange={e => setRocaId(e.target.value)} style={sel}>
          <option value="">Todas as roças</option>
          {centrosCusto.map(c => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Sub-section header: ① BADGE  Título
───────────────────────────────────────────── */
function SubHeader({
  n, badge, title, right,
}: {
  n: number; badge: string; title: string; right?: React.ReactNode
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: 12,
      flexWrap: 'wrap', rowGap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* número */}
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          border: '1.5px solid #d1d5db',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 600, color: '#6b7280', flexShrink: 0,
        }}>{n}</div>
        {/* badge */}
        <span style={{
          background: '#eff6ff', color: '#2563eb',
          padding: '3px 10px', borderRadius: 100,
          fontSize: 11, fontWeight: 700, letterSpacing: '0.5px',
          textTransform: 'uppercase' as const,
        }}>{badge}</span>
        {/* título */}
        <span style={{ fontSize: 16, fontWeight: 600, color: NAVY }}>{title}</span>
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  )
}

/* linha divisória full-width */
function Hr() {
  return <div style={{ height: 1, background: '#f0f2f5', margin: '24px -28px' }} />
}

/* ─────────────────────────────────────────────
   Main
───────────────────────────────────────────── */
export default function DashboardClient({ centrosCusto }: { centrosCusto: CentroCusto[] }) {
  const hoje = new Date()
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`

  const [mes,    setMes]    = useState(mesAtual)
  const [rocaId, setRocaId] = useState('')
  const [data,   setData]   = useState<DashData>(EMPTY)

  useEffect(() => {
    const p = new URLSearchParams()
    if (mes)    p.set('mes',    mes)
    if (rocaId) p.set('rocaId', rocaId)
    fetch(`/api/dashboard/financeiro?${p}`)
      .then(r => r.json())
      .then(d => setData(d))
  }, [mes, rocaId])

  const { competencia, caixa, totais, dre } = data
  const saldoMes     = competencia.vendasMes   - competencia.comprasMes
  const saldoCaixa   = caixa.vendasRecebida    - caixa.comprasPaga
  const saldoTotal   = totais.totalRecebido    - totais.totalPago
  const dreResultado = dre.vendas              - dre.compras
  const drePct       = dre.vendas > 0 ? (dre.compras  / dre.vendas) * 100 : 0
  const dreResPct    = dre.vendas > 0 ? (dreResultado / dre.vendas) * 100 : 0

  const sharedFilters = (
    <Filters
      mes={mes} setMes={setMes}
      rocaId={rocaId} setRocaId={setRocaId}
      centrosCusto={centrosCusto}
    />
  )

  return (
    <div>
      {/* ── Cabeçalho da página ─────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title" style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0 }}>Dashboard</h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Visão geral do seu negócio</p>
      </div>

      {/* ── Card financeiro principal ───────────── */}
      <div style={{
        background: 'white', borderRadius: 12,
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
        padding: '24px 28px', marginBottom: 16,
      }}>
        {/* cabeçalho do card */}
        <div style={{ marginBottom: 0 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: '#2563eb',
            letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 6px',
          }}>FINANCEIRO</p>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: NAVY, margin: '0 0 6px' }}>
            Dashboard de acompanhamento financeiro
          </h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
            Lançamentos no mês (competência), movimentação de caixa no período e totais —
            alinhado ao endpoint da página Financeiro.
          </p>
        </div>

        <Hr />

        {/* ① COMPETÊNCIA */}
        <SubHeader
          n={1} badge="COMPETÊNCIA" title="Lançamentos no mês"
          right={sharedFilters}
        />
        <p style={{ fontSize: 13, color: '#6b7280', margin: '8px 0 16px' }}>
          Recorte por data de emissão da conta no período (competência contábil).
        </p>
        <div className="kpi-grid-3" style={{ marginBottom: 0 }}>
          <MetricCard label="compras do mês"  value={competencia.comprasMes}  color={PINK}  icon={faCartShopping}  />
          <MetricCard label="venda do mês"    value={competencia.vendasMes}   color={GREEN} icon={faArrowTrendUp}  />
          <MetricCard label="saldo do mês"    value={saldoMes}                color={BLUE}  icon={faChartBar}      />
        </div>

        <Hr />

        {/* ② CAIXA */}
        <SubHeader n={2} badge="CAIXA" title="Pago / recebido no período" />
        <p style={{ fontSize: 13, color: '#6b7280', margin: '8px 0 16px' }}>
          Efetivação financeira conforme datas de pagamento e recebimentos.
        </p>
        <div className="kpi-grid-3" style={{ marginBottom: 0 }}>
          <MetricCard label="compras paga"      value={caixa.comprasPaga}      color={PINK}  icon={faCartShopping}  />
          <MetricCard label="vendas recebida"   value={caixa.vendasRecebida}   color={GREEN} icon={faArrowTrendUp}  />
          <MetricCard label="saldo"             value={saldoCaixa}             color={BLUE}  icon={faChartBar}      />
        </div>

        <Hr />

        {/* ③ TOTAIS */}
        <SubHeader
          n={3} badge="TOTAIS" title="Totais gerais"
          right={
            <div style={{
              border: '1px solid #e5e7eb', borderRadius: 8,
              padding: '8px 14px', background: 'white',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <FontAwesomeIcon icon={faSliders} style={{ fontSize: 13, color: '#6b7280' }} />
              <span style={{ fontSize: 13, color: NAVY }}>Valores pagos e recebidos (caixa)</span>
            </div>
          }
        />
        <p style={{ fontSize: 13, color: '#6b7280', margin: '8px 0 16px' }}>
          Caixa acumulado: pagamentos em contas a pagar, recebimentos de vendas e despesas pagas
          (centro de custo).
        </p>
        <div className="kpi-grid-3">
          <MetricCard label="Total pago"              value={totais.totalPago}      color={PINK}  icon={faCartShopping}  />
          <MetricCard label="Total recebido"          value={totais.totalRecebido}  color={GREEN} icon={faArrowTrendUp}  />
          <MetricCard label="Saldo (caixa acumulado)" value={saldoTotal}            color={BLUE}  icon={faChartBar}      />
        </div>
      </div>

      {/* ── DRE card ─────────────────────────────── */}
      <div style={{
        background: 'white', borderRadius: 12,
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
        padding: '24px 28px',
      }}>
        {/* cabeçalho DRE */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', gap: 16,
          flexWrap: 'wrap', rowGap: 12, marginBottom: 8,
        }}>
          <div>
            <p style={{
              fontSize: 11, fontWeight: 700, color: '#2563eb',
              letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 6px',
            }}>FINANCEIRO</p>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: NAVY, margin: 0 }}>
              DRE – Demonstrativo de Resultados no Exercício
            </h2>
          </div>
          {sharedFilters}
        </div>

        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px', lineHeight: 1.6 }}>
          Fornecedores por tipo de centro de despesa recompõem as{' '}
          <strong style={{ color: NAVY }}>compras do mês</strong> (competência).
          Os totais à direita seguem{' '}
          <strong style={{ color: '#2563eb' }}>vendas – compras</strong>,
          como no saldo da 1.ª faixa.
        </p>

        {/* conteúdo DRE: tabela + painel */}
        <div className="dre-grid">
          {/* tabela */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  {['Conta', 'Valor', 'Percentual'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left',
                      fontSize: 13, fontWeight: 600, color: '#374151',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '13px 14px', fontSize: 14, color: NAVY }}>Vendas</td>
                  <td style={{ padding: '13px 14px', fontSize: 14, color: NAVY, fontWeight: 600 }}>
                    {formatCurrency(dre.vendas)}
                  </td>
                  <td style={{ padding: '13px 14px', fontSize: 14, color: '#6b7280' }}>100%</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '13px 14px', fontSize: 14, color: NAVY }}>Fornecedores</td>
                  <td style={{ padding: '13px 14px', fontSize: 14, color: NAVY, fontWeight: 600 }}>
                    {formatCurrency(dre.compras)}
                  </td>
                  <td style={{ padding: '13px 14px', fontSize: 14, color: '#6b7280' }}>
                    {drePct.toFixed(0)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* painel de totais */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Total de Vendas Efetivas',   value: dre.vendas,     color: GREEN },
              { label: 'Total de Despesas Efetivas',  value: dre.compras,   color: PINK  },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: '#f9fafb', borderRadius: 8, padding: '14px 16px',
              }}>
                <p style={{
                  fontSize: 11, fontWeight: 700, color: '#374151',
                  textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px',
                }}>{label}</p>
                <p style={{ fontSize: 18, fontWeight: 700, color, margin: 0 }}>
                  {formatCurrency(value)}
                </p>
              </div>
            ))}
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: '14px 16px' }}>
              <p style={{
                fontSize: 11, fontWeight: 700, color: '#374151',
                textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px',
              }}>RESULTADO EFETIVO MÊS</p>
              <p style={{
                fontSize: 18, fontWeight: 700,
                color: dreResultado >= 0 ? GREEN : PINK,
                margin: '0 0 4px',
              }}>
                {formatCurrency(dreResultado)}
              </p>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                {dreResPct.toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
