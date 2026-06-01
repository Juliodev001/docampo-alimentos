'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { formatDate } from '@/lib/utils'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'
const ORANGE = '#e87320'
const TEAL = '#3d6b6e'

type Props = {
  meses: { label: string; total: number; dono: number; parceiro: number }[]
  colheitasRecentes: { id: string; data: string; produto: string; total: number; dono: number; parceiro: number; responsavel: string }[]
  produtos: { id: string; nome: string }[]
}

type PeriodoStats = {
  stats: { totalColhido: number; totalDono: number; totalParceiro: number; totalReceita: number; totalVendido: number }
  porProduto: { nome: string; total: number }[]
  porMes: { label: string; colhido: number; vendido: number }[]
  porProdutor: { id: string; nome: string; colhido: number; dono: number; parceiro: number }[]
}

const PERIODOS = [
  { value: 'mes_atual', label: 'Este mês' },
  { value: 'mes_passado', label: 'Mês passado' },
  { value: 'ultimos_3_meses', label: '3 meses' },
  { value: 'ultimos_6_meses', label: '6 meses' },
  { value: 'ano_atual', label: 'Este ano' },
  { value: 'ano_passado', label: 'Ano passado' },
]

const FILTROS_TIMELINE = [
  { value: 'semana',   label: 'Semana' },
  { value: '3_meses',  label: '3 meses' },
  { value: '6_meses',  label: '6 meses' },
  { value: 'ano',      label: 'Ano' },
]

function MiniBarChart({ data, H = 80 }: { data: { label: string; colhido: number }[]; H?: number }) {
  const maxVal = Math.max(...data.map(d => d.colhido), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: data.length > 10 ? 2 : 5, height: H + 16 }}>
      {data.map((d, i) => {
        const h = Math.max((d.colhido / maxVal) * H, d.colhido > 0 ? 2 : 0)
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <motion.div
              initial={{ height: 0 }} animate={{ height: h }}
              transition={{ delay: i * 0.03, duration: 0.4, ease: 'easeOut' }}
              title={`${d.label}: ${d.colhido.toFixed(1)} cx`}
              style={{ width: '100%', minWidth: 6, background: `linear-gradient(180deg, ${GREEN}99, ${GREEN})`, borderRadius: '3px 3px 0 0' }}
            />
            <span style={{ fontSize: 8, color: '#9ca3af', whiteSpace: 'nowrap' }}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function GraficoPorProdutor({ data, periodo }: { data: PeriodoStats['porProdutor']; periodo: string }) {
  const periodoLabel = PERIODOS.find(p => p.value === periodo)?.label ?? periodo
  const totalGeral = data.reduce((s, p) => s + p.colhido, 0)

  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState<{ id: string; nome: string } | null>(null)
  const [filtroDetalhe, setFiltroDetalhe] = useState('semana')
  const [timelineDetalhe, setTimelineDetalhe] = useState<{ label: string; colhido: number }[]>([])

  useEffect(() => {
    if (!selecionado) return
    setTimelineDetalhe([])
    fetch(`/api/lavoura/timeline?filtro=${filtroDetalhe}&produtorId=${selecionado.id}`)
      .then(r => r.json())
      .then(d => setTimelineDetalhe(Array.isArray(d) ? d : []))
  }, [selecionado, filtroDetalhe])

  const filtrados = data.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()))

  if (data.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.46, duration: 0.4 }}
      whileHover={{ boxShadow: '0 6px 24px rgba(0,0,0,0.08)' }}
      style={{ backgroundColor: 'white', borderRadius: 14, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
    >
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: NAVY, margin: 0 }}>Produção por Produtor</h3>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{periodoLabel} · o que produziu e entregou</p>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          {[{ color: GREEN, label: 'Dono' }, { color: ORANGE, label: 'Parceiros' }].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
              <span style={{ fontSize: 11, color: '#6b7280' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Barra de busca */}
      <input
        type="text"
        placeholder="🔍 Pesquisar produtor..."
        value={busca}
        onChange={e => setBusca(e.target.value)}
        style={{
          width: '100%', padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8,
          fontSize: 13, color: NAVY, outline: 'none', boxSizing: 'border-box', marginBottom: 16,
          backgroundColor: '#f9fafb',
        }}
      />

      {/* Lista de produtores */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filtrados.length === 0 && (
          <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>Nenhum produtor encontrado</p>
        )}
        {filtrados.map((p, i) => {
          const pctTotal = totalGeral > 0 ? (p.colhido / totalGeral) * 100 : 0
          const pctDono = p.colhido > 0 ? (p.dono / p.colhido) * 100 : 0
          const pctParceiro = p.colhido > 0 ? (p.parceiro / p.colhido) * 100 : 0
          const ativo = selecionado?.id === p.id
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.48 + i * 0.06, duration: 0.35 }}
            >
              <div
                onClick={() => setSelecionado(ativo ? null : { id: p.id, nome: p.nome })}
                style={{
                  cursor: 'pointer', padding: '10px 12px', borderRadius: 10,
                  border: `1.5px solid ${ativo ? NAVY : '#f3f4f6'}`,
                  backgroundColor: ativo ? `${NAVY}08` : 'transparent',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>👨‍🌾 {p.nome}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'white', backgroundColor: ativo ? NAVY : '#6b7280', padding: '2px 8px', borderRadius: 20 }}>
                      {pctTotal.toFixed(0)}% do total
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{p.colhido.toFixed(1)} cx</span>
                    <span style={{ fontSize: 11, color: ativo ? NAVY : '#9ca3af' }}>{ativo ? '▲ fechar' : '▼ ver gráfico'}</span>
                  </div>
                </div>
                <div style={{ height: 12, backgroundColor: '#f3f4f6', borderRadius: 6, overflow: 'hidden', display: 'flex' }}>
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${pctDono}%` }}
                    transition={{ delay: 0.5 + i * 0.06, duration: 0.65, ease: 'easeOut' }}
                    title={`Dono: ${p.dono.toFixed(1)} cx`}
                    style={{ height: '100%', background: `linear-gradient(90deg, ${GREEN}cc, ${GREEN})` }}
                  />
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${pctParceiro}%` }}
                    transition={{ delay: 0.55 + i * 0.06, duration: 0.65, ease: 'easeOut' }}
                    title={`Parceiros: ${p.parceiro.toFixed(1)} cx`}
                    style={{ height: '100%', background: `linear-gradient(90deg, ${ORANGE}cc, ${ORANGE})` }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: GREEN, fontWeight: 600 }}>Dono: {p.dono.toFixed(1)} cx ({pctDono.toFixed(0)}%)</span>
                  {p.parceiro > 0 && <span style={{ fontSize: 11, color: ORANGE, fontWeight: 600 }}>Parceiros: {p.parceiro.toFixed(1)} cx ({pctParceiro.toFixed(0)}%)</span>}
                </div>
              </div>

              {/* Gráfico de detalhe do produtor */}
              {ativo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                  style={{ marginTop: 8, padding: '16px', backgroundColor: `${NAVY}05`, borderRadius: 10, border: `1px solid ${NAVY}15` }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: NAVY }}>Produção de {p.nome}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {FILTROS_TIMELINE.map(f => (
                        <button
                          key={f.value}
                          onClick={e => { e.stopPropagation(); setFiltroDetalhe(f.value) }}
                          style={{
                            padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                            border: `1.5px solid ${filtroDetalhe === f.value ? NAVY : '#e5e7eb'}`,
                            backgroundColor: filtroDetalhe === f.value ? NAVY : 'white',
                            color: filtroDetalhe === f.value ? 'white' : '#6b7280',
                            transition: 'all 0.15s',
                          }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {timelineDetalhe.length === 0
                    ? <p style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>Carregando...</p>
                    : timelineDetalhe.every(d => d.colhido === 0)
                      ? <p style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>Sem colheitas no período</p>
                      : <MiniBarChart data={timelineDetalhe} H={80} />
                  }
                </motion.div>
              )}
            </motion.div>
          )
        })}
      </div>

      {totalGeral > 0 && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            Total geral: <strong style={{ color: NAVY }}>{totalGeral.toFixed(1)} cx</strong>
          </span>
        </div>
      )}
    </motion.div>
  )
}

const CORES_PRODUTORES = [GREEN, ORANGE, '#8b5cf6', '#06b6d4', PINK, '#f59e0b', TEAL, '#ec4899']

function GraficoQuantidadeProdutores({ produtores }: { produtores: PeriodoStats['porProdutor'] }) {
  const [filtro, setFiltro] = useState('semana')
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [timelineMap, setTimelineMap] = useState<Record<string, { label: string; colhido: number }[]>>({})

  const produtoresComCor = produtores.map((p, i) => ({ ...p, cor: CORES_PRODUTORES[i % CORES_PRODUTORES.length] }))

  function fetchTimeline(id: string, f: string) {
    fetch(`/api/lavoura/timeline?filtro=${f}&produtorId=${id}`)
      .then(r => r.json())
      .then(data => setTimelineMap(prev => ({ ...prev, [id]: Array.isArray(data) ? data : [] })))
  }

  function toggleProdutor(id: string) {
    setSelecionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        setTimelineMap(m => { const n = { ...m }; delete n[id]; return n })
      } else {
        next.add(id)
        fetchTimeline(id, filtro)
      }
      return next
    })
  }

  useEffect(() => {
    selecionados.forEach(id => fetchTimeline(id, filtro))
  }, [filtro])

  const labels = Object.values(timelineMap)[0]?.map(d => d.label) ?? []
  const H = 150
  const nSel = selecionados.size
  const maxVal = Math.max(
    ...labels.map((_, i) =>
      produtoresComCor.filter(p => selecionados.has(p.id)).reduce((s, p) => Math.max(s, timelineMap[p.id]?.[i]?.colhido ?? 0), 0)
    ), 1
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.38, duration: 0.4 }}
      whileHover={{ boxShadow: '0 6px 24px rgba(0,0,0,0.08)' }}
      style={{ backgroundColor: 'white', borderRadius: 14, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
    >
      {/* Cabeçalho + filtro de período */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: NAVY, margin: 0 }}>Evolução por Produtor</h3>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>Selecione os produtores para comparar · caixas</p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {FILTROS_TIMELINE.map(f => (
            <button key={f.value} onClick={() => setFiltro(f.value)} style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              border: `1.5px solid ${filtro === f.value ? NAVY : '#e5e7eb'}`,
              backgroundColor: filtro === f.value ? NAVY : 'white',
              color: filtro === f.value ? 'white' : '#6b7280',
              transition: 'all 0.15s',
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Chips de seleção dos produtores */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {produtores.length === 0 && <span style={{ fontSize: 12, color: '#9ca3af' }}>Sem produtores no período selecionado</span>}
        {produtoresComCor.map(p => {
          const sel = selecionados.has(p.id)
          return (
            <button key={p.id} onClick={() => toggleProdutor(p.id)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 20,
              border: `2px solid ${p.cor}`,
              backgroundColor: sel ? p.cor : 'white',
              color: sel ? 'white' : p.cor,
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.15s',
              boxShadow: sel ? `0 4px 12px ${p.cor}44` : 'none',
            }}>
              👨‍🌾 {p.nome}
              <span style={{ fontSize: 10, opacity: 0.75 }}>· {p.colhido.toFixed(0)} cx</span>
            </button>
          )
        })}
      </div>

      {/* Gráfico */}
      {nSel === 0 ? (
        <div style={{ height: H + 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#9ca3af' }}>
          <span style={{ fontSize: 28 }}>📊</span>
          <span style={{ fontSize: 13 }}>Selecione um ou mais produtores acima para ver o gráfico</span>
        </div>
      ) : labels.length === 0 ? (
        <div style={{ height: H + 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
          Carregando...
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: labels.length > 10 ? 3 : 6, height: H + 20 }}>
            {labels.map((label, bi) => {
              const bars = produtoresComCor.filter(p => selecionados.has(p.id))
              return (
                <div key={bi} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: H }}>
                    {bars.map((p, vi) => {
                      const val = timelineMap[p.id]?.[bi]?.colhido ?? 0
                      const h = Math.max((val / maxVal) * H, val > 0 ? 3 : 0)
                      return (
                        <motion.div
                          key={p.id}
                          initial={{ height: 0 }} animate={{ height: h }}
                          transition={{ delay: bi * 0.03 + vi * 0.02, duration: 0.5, ease: 'easeOut' }}
                          title={`${p.nome}: ${val.toFixed(1)} cx`}
                          style={{
                            width: nSel > 3 ? 8 : 13,
                            background: `linear-gradient(180deg, ${p.cor}99, ${p.cor})`,
                            borderRadius: '3px 3px 0 0',
                            cursor: 'default',
                          }}
                        />
                      )
                    })}
                  </div>
                  <span style={{ fontSize: labels.length > 8 ? 8 : 10, color: '#9ca3af', whiteSpace: 'nowrap' }}>{label}</span>
                </div>
              )
            })}
          </div>

          {/* Legenda */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12 }}>
            {produtoresComCor.filter(p => selecionados.has(p.id)).map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: p.cor }} />
                <span style={{ fontSize: 11, color: '#6b7280' }}>{p.nome}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>Passe o mouse nas barras para ver os valores</p>
        </>
      )}
    </motion.div>
  )
}

function GraficoProducao({ data, periodo }: { data: PeriodoStats['porMes']; periodo: string }) {
  const periodoLabel = PERIODOS.find(p => p.value === periodo)?.label ?? periodo
  const maxVal = Math.max(...data.flatMap(d => [d.colhido, d.vendido]), 1)
  const H = 140

  if (data.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.44, duration: 0.4 }}
      whileHover={{ boxShadow: '0 6px 24px rgba(0,0,0,0.08)' }}
      style={{ backgroundColor: 'white', borderRadius: 14, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: NAVY, margin: 0 }}>Colhido vs Vendido</h3>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{periodoLabel} · caixas</p>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          {[{ color: GREEN, label: 'Colhido' }, { color: TEAL, label: 'Vendido' }].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
              <span style={{ fontSize: 11, color: '#6b7280' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: data.length > 8 ? 4 : 10, height: H + 20, paddingTop: 4 }}>
        {data.map((m, i) => {
          const hC = Math.max((m.colhido / maxVal) * H, m.colhido > 0 ? 3 : 0)
          const hV = Math.max((m.vendido / maxVal) * H, m.vendido > 0 ? 3 : 0)
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: H }}>
                <motion.div
                  initial={{ height: 0 }} animate={{ height: hC }}
                  transition={{ delay: i * 0.05, duration: 0.5, ease: 'easeOut' }}
                  title={`Colhido: ${m.colhido.toFixed(1)} cx`}
                  style={{ width: 13, background: `linear-gradient(180deg, ${GREEN}bb, ${GREEN})`, borderRadius: '4px 4px 0 0', cursor: 'default' }}
                />
                <motion.div
                  initial={{ height: 0 }} animate={{ height: hV }}
                  transition={{ delay: i * 0.05 + 0.04, duration: 0.5, ease: 'easeOut' }}
                  title={`Vendido: ${m.vendido.toFixed(1)} cx`}
                  style={{ width: 13, background: `linear-gradient(180deg, ${TEAL}bb, ${TEAL})`, borderRadius: '4px 4px 0 0', cursor: 'default' }}
                />
              </div>
              <span style={{ fontSize: 9, color: '#9ca3af', textAlign: 'center', whiteSpace: 'nowrap' }}>{m.label}</span>
            </div>
          )
        })}
      </div>
      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>Passe o mouse nas barras para ver os valores</p>
    </motion.div>
  )
}

function PeriodoSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {PERIODOS.map(p => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          style={{
            padding: '6px 14px',
            borderRadius: 20,
            border: `1.5px solid ${value === p.value ? NAVY : '#e5e7eb'}`,
            backgroundColor: value === p.value ? NAVY : 'white',
            color: value === p.value ? 'white' : '#6b7280',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

function BarChart({ data, maxVal }: { data: { label: string; total: number; dono: number; parceiro: number }[]; maxVal: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140, paddingTop: 8 }}>
      {data.map((m, i) => {
        const hDono = maxVal > 0 ? (m.dono / maxVal) * 120 : 0
        const hParceiro = maxVal > 0 ? (m.parceiro / maxVal) * 120 : 0
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120 }}>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: hDono }}
                transition={{ delay: i * 0.07, duration: 0.5, ease: 'easeOut' }}
                style={{ width: 12, backgroundColor: GREEN, borderRadius: '3px 3px 0 0' }}
                title={`Dono: ${m.dono.toFixed(1)}`}
              />
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: hParceiro }}
                transition={{ delay: i * 0.07 + 0.05, duration: 0.5, ease: 'easeOut' }}
                style={{ width: 12, backgroundColor: ORANGE, borderRadius: '3px 3px 0 0' }}
                title={`Parceiro: ${m.parceiro.toFixed(1)}`}
              />
            </div>
            <span style={{ fontSize: 10, color: '#6b7280', textAlign: 'center' }}>{m.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function DonutChart({ dono, parceiro }: { dono: number; parceiro: number }) {
  const total = dono + parceiro
  if (total === 0) return <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 24 }}>Sem dados</div>
  const percDono = (dono / total) * 100
  const percParceiro = (parceiro / total) * 100
  const r = 50; const c = 2 * Math.PI * r
  const dashDono = (percDono / 100) * c
  const dashParceiro = (percParceiro / 100) * c
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width={120} height={120} viewBox="0 0 120 120">
        <circle cx={60} cy={60} r={r} fill="none" stroke="#f3f4f6" strokeWidth={18} />
        <circle cx={60} cy={60} r={r} fill="none" stroke={GREEN} strokeWidth={18}
          strokeDasharray={`${dashDono} ${c - dashDono}`} strokeDashoffset={c / 4} strokeLinecap="round" />
        <circle cx={60} cy={60} r={r} fill="none" stroke={ORANGE} strokeWidth={18}
          strokeDasharray={`${dashParceiro} ${c - dashParceiro}`}
          strokeDashoffset={c / 4 - dashDono} strokeLinecap="round" />
        <text x={60} y={56} textAnchor="middle" fontSize={11} fill={NAVY} fontWeight={700}>{total.toFixed(0)}</text>
        <text x={60} y={69} textAnchor="middle" fontSize={9} fill="#6b7280">caixas</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: GREEN }} />
          <div>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Dono</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: 0 }}>{dono.toFixed(1)} cx</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: ORANGE }} />
          <div>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Parceiros</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: 0 }}>{parceiro.toFixed(1)} cx</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LavouraClient({ meses, colheitasRecentes, produtos }: Props) {
  const maxMes = Math.max(...meses.map((m) => m.total), 1)

  const [periodo, setPeriodo] = useState('mes_atual')
  const [periodoStats, setPeriodoStats] = useState<PeriodoStats>({
    stats: { totalColhido: 0, totalDono: 0, totalParceiro: 0, totalReceita: 0, totalVendido: 0 },
    porProduto: [],
    porMes: [],
    porProdutor: [],
  })

  useEffect(() => {
    fetch(`/api/lavoura/stats?periodo=${periodo}`)
      .then(r => r.json())
      .then(d => setPeriodoStats({ ...d, porMes: d.porMes ?? [], porProdutor: d.porProdutor ?? [] }))
  }, [periodo])

  const { stats, porProduto } = periodoStats

  const cards = [
    { label: 'Total colhido', value: `${stats.totalColhido.toFixed(0)} cx`, color: GREEN, sub: 'caixas colhidas no período' },
    { label: 'Parte do dono', value: `${stats.totalDono.toFixed(0)} cx`, color: TEAL, sub: 'da produção total' },
    { label: 'Parte dos parceiros', value: `${stats.totalParceiro.toFixed(0)} cx`, color: ORANGE, sub: 'da produção total' },
    { label: 'Receita de saídas', value: `R$ ${stats.totalReceita.toFixed(2).replace('.', ',')}`, color: PINK, sub: `${stats.totalVendido.toFixed(0)} cx vendidas` },
  ]

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}
      >
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0 }}>Dashboard da Lavoura 🍓</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Controle de produção e divisão da colheita</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link href="/lavoura/colheita/nova" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', backgroundColor: GREEN, color: 'white', borderRadius: 10, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
              <FontAwesomeIcon icon={faPlus} style={{ fontSize: 15 }} /> Registrar Colheita
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link href="/lavoura/saida/nova" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', backgroundColor: NAVY, color: 'white', borderRadius: 10, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
              <FontAwesomeIcon icon={faPlus} style={{ fontSize: 15 }} /> Registrar Saída
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Seletor de período */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.3 }}
        style={{ marginBottom: 20 }}
      >
        <PeriodoSelector value={periodo} onChange={setPeriodo} />
      </motion.div>

      {/* KPI Cards */}
      <div className="kpi-grid-4">
        {cards.map(({ label, value, color, sub }, i) => (
          <motion.div key={label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4, type: 'spring', stiffness: 180 }}
            whileHover={{ y: -4, boxShadow: '0 10px 32px rgba(0,0,0,0.1)' }}
            style={{ backgroundColor: 'white', borderRadius: 14, padding: '22px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `4px solid ${color}` }}>
            <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>{label}</p>
            <p className="kpi-val" style={{ color, fontSize: 26, fontWeight: 700, margin: '6px 0 3px', wordBreak: 'break-word' }}>{value}</p>
            <p style={{ color: '#9ca3af', fontSize: 11, margin: 0 }}>{sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Bar chart - evolução mensal */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36, duration: 0.4 }}
          whileHover={{ boxShadow: '0 6px 24px rgba(0,0,0,0.08)' }}
          style={{ backgroundColor: 'white', borderRadius: 14, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 600, color: NAVY, margin: '0 0 4px' }}>Evolução da Produção</h3>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 16px' }}>Últimos 6 meses · caixas colhidas</p>
          <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, backgroundColor: GREEN, borderRadius: 2 }} />
              <span style={{ fontSize: 11, color: '#6b7280' }}>Dono</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, backgroundColor: ORANGE, borderRadius: 2 }} />
              <span style={{ fontSize: 11, color: '#6b7280' }}>Parceiro</span>
            </div>
          </div>
          {meses.every((m) => m.total === 0)
            ? <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>Nenhum registro ainda</div>
            : <BarChart data={meses} maxVal={maxMes} />}
        </motion.div>

        {/* Donut - divisão */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42, duration: 0.4 }}
          whileHover={{ boxShadow: '0 6px 24px rgba(0,0,0,0.08)' }}
          style={{ backgroundColor: 'white', borderRadius: 14, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 600, color: NAVY, margin: '0 0 4px' }}>Divisão da Produção</h3>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 20px' }}>Período selecionado</p>
          <DonutChart dono={stats.totalDono} parceiro={stats.totalParceiro} />
        </motion.div>
      </div>

      {/* Gráfico de evolução por produtor com filtro próprio */}
      <div style={{ marginBottom: 20 }}>
        <GraficoQuantidadeProdutores produtores={periodoStats.porProdutor} />
      </div>

      {/* Gráficos do período selecionado */}
      {(periodoStats.porMes.length > 0 || periodoStats.porProdutor.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: periodoStats.porProdutor.length > 0 && periodoStats.porMes.length > 0 ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 20 }}>
          {periodoStats.porMes.length > 0 && (
            <GraficoProducao data={periodoStats.porMes} periodo={periodo} />
          )}
          {periodoStats.porProdutor.length > 0 && (
            <GraficoPorProdutor data={periodoStats.porProdutor} periodo={periodo} />
          )}
        </div>
      )}

      {/* Por produto + colheitas recentes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
        {/* Por produto */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48, duration: 0.4 }}
          style={{ backgroundColor: 'white', borderRadius: 14, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 600, color: NAVY, margin: '0 0 16px' }}>Por produto</h3>
          {porProduto.length === 0
            ? <p style={{ color: '#9ca3af', fontSize: 13 }}>Sem colheitas no período</p>
            : porProduto.map((p) => {
              const maxP = Math.max(...porProduto.map((x) => x.total), 1)
              const pct = (p.total / maxP) * 100
              return (
                <div key={p.nome} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: NAVY, fontWeight: 500 }}>{p.nome}</span>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{p.total.toFixed(0)} cx</span>
                  </div>
                  <div style={{ height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      style={{ height: '100%', backgroundColor: GREEN, borderRadius: 3 }} />
                  </div>
                </div>
              )
            })}
        </motion.div>

        {/* Colheitas recentes */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52, duration: 0.4 }}
          style={{ backgroundColor: 'white', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: NAVY }}>Colheitas recentes</h3>
            <Link href="/lavoura/colheita" style={{ fontSize: 12, color: GREEN, textDecoration: 'none' }}>Ver todas →</Link>
          </div>
          {colheitasRecentes.length === 0
            ? <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af' }}>Nenhuma colheita registrada</div>
            : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    {['Data', 'Produto', 'Total', 'Dono', 'Parceiros', 'Responsável'].map((h) => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {colheitasRecentes.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: NAVY }}>{formatDate(new Date(c.data))}</td>
                      <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: NAVY }}>🍓 {c.produto}</td>
                      <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: NAVY }}>{c.total.toFixed(1)} cx</td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ backgroundColor: '#f0faf0', color: GREEN, padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{c.dono.toFixed(1)} cx</span>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ backgroundColor: '#fff7ed', color: ORANGE, padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{c.parceiro.toFixed(1)} cx</span>
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 12, color: '#6b7280' }}>{c.responsavel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </motion.div>
      </div>
    </div>
  )
}
