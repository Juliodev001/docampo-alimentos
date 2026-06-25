'use client'
import { useState, useEffect, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowTrendUp, faArrowTrendDown, faCaretUp, faCaretDown,
  faChevronLeft, faChevronRight, faCartShopping, faReceipt, faPercent, faTags, faBoxesStacked,
} from '@fortawesome/free-solid-svg-icons'
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

const GREEN  = '#5ab952'
const NAVY   = '#2d3561'
const PINK   = '#e8255a'
const BLUE   = '#3b82f6'
const ORANGE = '#e87320'
const PURPLE = '#8b5cf6'

type Periodo = 'dia' | 'semana' | 'mes' | 'ano'

type SeriePonto = { label: string; vendas: number; compras: number; lucro: number }
type Resumo = {
  periodo: Periodo
  range: { inicio: string; fim: string }
  atual: {
    totalVendas: number; totalCompras: number; lucro: number
    canais: { nome: string; valor: number }[]
    fornecedores: { nome: string; valor: number }[]
    topMeeiros: { nome: string; caixas: number }[]
    series: SeriePonto[]
    nVendas: number; nCompras: number; carteiraPendente: number; caixasLavoura: number
  }
  comparacao: { vendas: number; compras: number; lucro: number }
}

const EMPTY: Resumo = {
  periodo: 'mes',
  range: { inicio: '', fim: '' },
  atual: { totalVendas: 0, totalCompras: 0, lucro: 0, canais: [], fornecedores: [], topMeeiros: [], series: [], nVendas: 0, nCompras: 0, carteiraPendente: 0, caixasLavoura: 0 },
  comparacao: { vendas: 0, compras: 0, lucro: 0 },
}

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: 'dia',    label: 'Dia' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes',    label: 'Mês' },
  { key: 'ano',    label: 'Ano' },
]

const CANAL_COLORS: Record<string, string> = { 'Nota Fiscal': BLUE, 'PDV': GREEN, 'Lavoura': PURPLE }

function fmtRangeLabel(periodo: Periodo, ref: Date) {
  if (periodo === 'dia') return ref.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  if (periodo === 'ano') return `${ref.getFullYear()}`
  if (periodo === 'mes') {
    const l = ref.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    return l.charAt(0).toUpperCase() + l.slice(1)
  }
  // semana
  const seg = new Date(ref)
  const diff = (seg.getDay() + 6) % 7
  seg.setDate(seg.getDate() - diff)
  const dom = new Date(seg)
  dom.setDate(dom.getDate() + 6)
  const f = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${f(seg)} – ${f(dom)}`
}

function shiftRef(periodo: Periodo, ref: Date, dir: 1 | -1) {
  const novo = new Date(ref)
  if (periodo === 'dia') novo.setDate(novo.getDate() + dir)
  else if (periodo === 'semana') novo.setDate(novo.getDate() + dir * 7)
  else if (periodo === 'mes') novo.setMonth(novo.getMonth() + dir)
  else novo.setFullYear(novo.getFullYear() + dir)
  return novo
}

function VariacaoBadge({ pct, invertido }: { pct: number; invertido?: boolean }) {
  const positivo = invertido ? pct <= 0 : pct >= 0
  const color = positivo ? GREEN : PINK
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 12, fontWeight: 700, color,
      background: `${color}15`, borderRadius: 20, padding: '2px 8px',
    }}>
      <FontAwesomeIcon icon={positivo ? faCaretUp : faCaretDown} style={{ fontSize: 11 }} />
      {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

function KpiCard({
  label, value, color, icon, variacao, sub,
}: {
  label: string; value: string; color: string; icon: typeof faArrowTrendUp
  variacao?: number; sub?: string
}) {
  return (
    <div style={{
      background: 'white', borderRadius: 12, padding: '18px 20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `4px solid ${color}`,
      display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ fontSize: 12, color: '#6b7280', margin: 0, fontWeight: 500 }}>{label}</p>
        <div style={{ background: `${color}18`, borderRadius: 8, padding: 7 }}>
          <FontAwesomeIcon icon={icon} style={{ fontSize: 14, color }} />
        </div>
      </div>
      <p style={{ fontSize: 23, fontWeight: 700, color: NAVY, margin: 0, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {value}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {variacao !== undefined && <VariacaoBadge pct={variacao} invertido={color === PINK} />}
        {sub && <span style={{ fontSize: 12, color: '#9ca3af' }}>{sub}</span>}
      </div>
    </div>
  )
}

export default function VisaoGeralClient() {
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [ref, setRef] = useState(() => new Date())
  const [data, setData] = useState<Resumo>(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const p = new URLSearchParams({ periodo, ref: ref.toISOString() })
    fetch(`/api/dashboard/resumo?${p}`)
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }, [periodo, ref])

  function selecionarPeriodo(p: Periodo) { setLoading(true); setPeriodo(p) }
  function navegar(dir: 1 | -1) { setLoading(true); setRef(r => shiftRef(periodo, r, dir)) }
  function irParaHoje() { setLoading(true); setRef(new Date()) }

  const { atual, comparacao } = data
  const margem = atual.totalVendas > 0 ? (atual.lucro / atual.totalVendas) * 100 : 0
  const ticketMedio = atual.nVendas > 0 ? atual.totalVendas / atual.nVendas : 0

  const canaisComCor = useMemo(
    () => atual.canais.filter(c => c.valor > 0).map(c => ({ ...c, color: CANAL_COLORS[c.nome] ?? '#9ca3af' })),
    [atual.canais],
  )

  const topFornecedores = atual.fornecedores.slice(0, 6)
  const topMeeiros = (atual.topMeeiros ?? []).slice(0, 6)

  return (
    <div style={{
      background: 'white', borderRadius: 12,
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
      padding: '24px 28px', marginBottom: 16,
    }}>
      {/* cabeçalho + filtros */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 4 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', letterSpacing: '1.5px', textTransform: 'uppercase', margin: '0 0 6px' }}>
            VISÃO GERAL
          </p>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: NAVY, margin: 0 }}>Compras, vendas e lucros</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* tabs período */}
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 9, padding: 3 }}>
            {PERIODOS.map(p => (
              <button key={p.key} onClick={() => selecionarPeriodo(p.key)} style={{
                padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                background: periodo === p.key ? 'white' : 'transparent',
                color: periodo === p.key ? NAVY : '#6b7280',
                boxShadow: periodo === p.key ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                transition: 'all 0.15s',
              }}>
                {p.label}
              </button>
            ))}
          </div>

          {/* navegação de período */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, border: '1px solid #e5e7eb', borderRadius: 9, padding: '4px 6px' }}>
            <button onClick={() => navegar(-1)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 6, color: '#6b7280' }}>
              <FontAwesomeIcon icon={faChevronLeft} style={{ fontSize: 12 }} />
            </button>
            <span style={{ fontSize: 13, color: NAVY, fontWeight: 600, minWidth: 130, textAlign: 'center' }}>
              {fmtRangeLabel(periodo, ref)}
            </span>
            <button onClick={() => navegar(1)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 6, color: '#6b7280' }}>
              <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: 12 }} />
            </button>
            <button onClick={irParaHoje} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: BLUE, fontWeight: 600, padding: '6px 8px' }}>
              Hoje
            </button>
          </div>
        </div>
      </div>

      <div style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.15s' }}>
        {/* KPIs */}
        <div className="kpi-grid-5" style={{ margin: '20px 0' }}>
          <KpiCard label="Total vendido" value={formatCurrency(atual.totalVendas)} color={GREEN} icon={faArrowTrendUp} variacao={comparacao.vendas} sub={`${atual.nVendas} venda(s)`} />
          <KpiCard label="Total comprado" value={formatCurrency(atual.totalCompras)} color={PINK} icon={faCartShopping} variacao={comparacao.compras} sub={`${atual.nCompras} compra(s)`} />
          <KpiCard label="Caixas compradas" value={atual.caixasLavoura.toLocaleString('pt-BR')} color="#8b5cf6" icon={faBoxesStacked} sub="Produtores e meeiros" />
          <KpiCard label="Lucro" value={formatCurrency(atual.lucro)} color={atual.lucro >= 0 ? BLUE : PINK} icon={atual.lucro >= 0 ? faArrowTrendUp : faArrowTrendDown} variacao={comparacao.lucro} />
          <KpiCard label="Margem de lucro" value={`${margem.toFixed(1)}%`} color={ORANGE} icon={faPercent} sub={`Ticket médio: ${formatCurrency(ticketMedio)}`} />
        </div>

        {/* gráfico principal: vendas vs compras + lucro */}
        <div style={{ background: '#fbfcfe', border: '1px solid #f0f2f5', borderRadius: 10, padding: '16px 12px 6px', marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: NAVY, margin: '0 0 6px 10px' }}>Vendas vs. Compras no período</p>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={atual.series} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrency(v)} width={70} />
              <Tooltip formatter={(v: number | string | readonly (number | string)[] | undefined) => formatCurrency(Number(v))} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="vendas" name="Vendas" stroke={GREEN} fill={GREEN} fillOpacity={0.12} strokeWidth={2.5} />
              <Area type="monotone" dataKey="compras" name="Compras" stroke={PINK} fill={PINK} fillOpacity={0.1} strokeWidth={2.5} />
              <Line type="monotone" dataKey="lucro" name="Lucro" stroke={BLUE} strokeWidth={2} dot={false} strokeDasharray="4 3" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* linha inferior: lucro por bucket, canais, fornecedores */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 14 }}>
          <div style={{ background: '#fbfcfe', border: '1px solid #f0f2f5', borderRadius: 10, padding: '16px 12px 6px' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: NAVY, margin: '0 0 6px 10px' }}>Lucro por período</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={atual.series} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrency(v)} width={70} />
                <Tooltip formatter={(v: number | string | readonly (number | string)[] | undefined) => formatCurrency(Number(v))} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Bar dataKey="lucro" name="Lucro" radius={[4, 4, 0, 0]}>
                  {atual.series.map((s, i) => (
                    <Cell key={i} fill={s.lucro >= 0 ? GREEN : PINK} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: '#fbfcfe', border: '1px solid #f0f2f5', borderRadius: 10, padding: '16px 12px' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: NAVY, margin: '0 0 6px 10px' }}>Vendas por canal</p>
            {canaisComCor.length === 0 ? (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>Sem vendas no período</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={canaisComCor} dataKey="valor" nameKey="nome" innerRadius={42} outerRadius={64} paddingAngle={2}>
                      {canaisComCor.map((c, i) => <Cell key={i} fill={c.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number | string | readonly (number | string)[] | undefined) => formatCurrency(Number(v))} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
                  {canaisComCor.map((c, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#374151' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
                        {c.nome}
                      </span>
                      <span style={{ fontWeight: 600, color: NAVY }}>{formatCurrency(c.valor)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div style={{ background: '#fbfcfe', border: '1px solid #f0f2f5', borderRadius: 10, padding: '16px 12px' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: NAVY, margin: '0 0 10px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FontAwesomeIcon icon={faBoxesStacked} style={{ fontSize: 12, color: PURPLE }} /> Maiores parceiros (caixas)
            </p>
            {topMeeiros.length === 0 ? (
              <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>Sem lançamentos no período</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {topMeeiros.map((m, i) => {
                  const max = topMeeiros[0].caixas || 1
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                        <span style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>{m.nome}</span>
                        <span style={{ fontWeight: 600, color: NAVY }}>{m.caixas.toLocaleString('pt-BR')} cx</span>
                      </div>
                      <div style={{ height: 6, background: '#f0f2f5', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(m.caixas / max) * 100}%`, background: PURPLE, borderRadius: 4 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {atual.carteiraPendente > 0 && (
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#9ca3af' }}>
            <FontAwesomeIcon icon={faReceipt} />
            Carteira (fiado) pendente neste período: <strong style={{ color: ORANGE }}>{formatCurrency(atual.carteiraPendente)}</strong>
          </div>
        )}
      </div>
    </div>
  )
}
