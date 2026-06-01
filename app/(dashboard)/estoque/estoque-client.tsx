'use client'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleDown, faCircleUp, faGears, faRotateLeft, faTriangleExclamation, faArrowsLeftRight, faScaleBalanced, faMagnifyingGlass, faFilter, faArrowsUpDown, faFileLines, faPlus, faXmark, faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import type { MovimentoItem, KpisMovimento, ProdutoCadastrado } from './page'
import { useToast } from '@/components/toast'

const GREEN  = '#5ab952'
const NAVY   = '#2d3561'
const PINK   = '#e8255a'
const BLUE   = '#3b82f6'
const ORANGE = '#e87320'
const PURPLE = '#8b5cf6'

/* ── KPI card config ── */
const TIPOS_CONFIG = [
  { key: 'balanco',       label: 'Balanço',       sub: 'Saldo líquido', icon: faScaleBalanced,      bg: '#eff6ff', color: BLUE,   sign: '+' },
  { key: 'entrada',       label: 'Entrada',        sub: null,           icon: faCircleDown,          bg: '#f0fdf4', color: GREEN,  sign: '+' },
  { key: 'saida',         label: 'Saída',          sub: null,           icon: faCircleUp,            bg: '#fff0f3', color: PINK,   sign: '-' },
  { key: 'ajuste',        label: 'Ajuste',         sub: null,           icon: faGears,               bg: '#eff6ff', color: BLUE,   sign: '+' },
  { key: 'devolucao',     label: 'Devolução',      sub: null,           icon: faRotateLeft,          bg: '#eff6ff', color: BLUE,   sign: '+' },
  { key: 'perda',         label: 'Perda',          sub: null,           icon: faTriangleExclamation, bg: '#fff7ed', color: ORANGE, sign: '-' },
  { key: 'transferencia', label: 'Transferência',  sub: null,           icon: faArrowsLeftRight,     bg: '#f5f3ff', color: PURPLE, sign: '-' },
] as const

/* ── Tipo badge ── */
function TipoBadge({ tipo }: { tipo: string }) {
  const cfg = TIPOS_CONFIG.find(t => t.label === tipo) ?? TIPOS_CONFIG[1]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 12px', borderRadius: 20,
      border: `1.5px solid ${cfg.color}20`,
      background: cfg.bg,
      color: cfg.color,
      fontSize: 12, fontWeight: 700,
    }}>
      {tipo}
    </span>
  )
}

const TIPO_FILTER_OPTIONS = ['Todos', 'Entrada', 'Saída', 'Ajuste', 'Devolução', 'Perda', 'Transferência']

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb',
  borderRadius: 10, fontSize: 14, color: NAVY, outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit', background: 'white',
}
const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: NAVY, display: 'block', marginBottom: 5 }

/* ══════════════════════════════════════ */
export default function EstoqueClient({
  movimentos: inicial,
  kpis,
  produtosCadastrados,
}: {
  movimentos: MovimentoItem[]
  kpis: KpisMovimento
  produtosCadastrados: ProdutoCadastrado[]
}) {
  const toast = useToast()
  const [movimentos, setMovimentos] = useState(inicial)

  /* filters */
  const [q, setQ] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('Todos')
  const [sortDesc, setSortDesc] = useState(true)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  /* nova entrada modal */
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({
    produtoId: '', quantidade: '', valorUnit: '',
    data: new Date().toISOString().slice(0, 10), observacao: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /* ── computed kpis (recalc locally when entries added) ── */
  const kpisLocal = useMemo(() => {
    const entrada = movimentos.filter(m => m.tipo === 'Entrada').reduce((s, m) => s + m.qtd, 0)
    return { ...kpis, entrada, balanco: entrada }
  }, [movimentos, kpis])

  /* ── filtered list ── */
  const filtrados = useMemo(() => {
    let list = movimentos
    if (tipoFiltro !== 'Todos') list = list.filter(m => m.tipo === tipoFiltro)
    if (q) list = list.filter(m =>
      m.produto.toLowerCase().includes(q.toLowerCase()) ||
      (m.sku ?? '').toLowerCase().includes(q.toLowerCase())
    )
    if (dataInicio) list = list.filter(m => m.dataHora >= new Date(dataInicio).toISOString())
    if (dataFim) list = list.filter(m => m.dataHora <= new Date(dataFim + 'T23:59:59').toISOString())
    return sortDesc
      ? [...list].sort((a, b) => b.dataHora.localeCompare(a.dataHora))
      : [...list].sort((a, b) => a.dataHora.localeCompare(b.dataHora))
  }, [movimentos, tipoFiltro, q, dataInicio, dataFim, sortDesc])

  /* ── nova entrada ── */
  async function handleCriarEntrada() {
    if (!form.produtoId || !form.quantidade) { setError('Produto e quantidade são obrigatórios'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/estoque', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Erro ao criar')
      const nova = await res.json()
      const prod = produtosCadastrados.find(p => p.id === form.produtoId)
      setMovimentos(prev => [{
        id: nova.id, tipo: 'Entrada',
        sku: prod?.sku ?? null,
        produto: prod?.nome ?? '',
        produtoId: form.produtoId,
        qtd: nova.quantidade,
        dataHora: nova.data,
        motivo: nova.observacao,
      }, ...prev])
      toast.success('Entrada registrada com sucesso')
      setModal(false)
      setForm({ produtoId: '', quantidade: '', valorUnit: '', data: new Date().toISOString().slice(0, 10), observacao: '' })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro inesperado')
    } finally { setLoading(false) }
  }

  function fmtDt(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  /* ══════════════════════ RENDER ══════════════════════ */
  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex-header">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0 }}>Movimentações</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Registro de entradas e saídas de estoque</p>
        </div>
        <motion.button
          onClick={() => setModal(true)}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', backgroundColor: BLUE, color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <FontAwesomeIcon icon={faPlus} style={{ fontSize: 15 }} /> Nova Entrada
        </motion.button>
      </motion.div>

      {/* ── KPI Cards ── */}
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
        style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', margin: '0 0 12px' }}>
        Movimentações por tipo
      </motion.p>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="kpi-grid-7">
        {TIPOS_CONFIG.map((cfg, i) => {
          const val = kpisLocal[cfg.key as keyof KpisMovimento]
          return (
            <motion.div key={cfg.key}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
              whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(0,0,0,0.09)' }}
              style={{ backgroundColor: 'white', borderRadius: 14, padding: '16px 14px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', cursor: 'default', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div className="kpi-val" style={{ fontSize: 20, fontWeight: 800, color: cfg.sign === '+' ? (val > 0 ? cfg.color : NAVY) : PINK, lineHeight: 1, wordBreak: 'break-word' }}>
                    {cfg.sign}{val.toFixed(0)}
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#9ca3af', marginLeft: 3 }}>un</span>
                  </div>
                  {cfg.sub && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{cfg.sub}</div>}
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FontAwesomeIcon icon={cfg.icon as IconDefinition} style={{ fontSize: 15, color: cfg.color }} />
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>{cfg.label}</div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* ── Filter bar ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
        style={{ backgroundColor: 'white', borderRadius: 12, padding: '14px 16px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <FontAwesomeIcon icon={faMagnifyingGlass} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14 }} />
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder="Buscar por produto ou SKU..."
              style={{ ...inp, paddingLeft: 36, paddingTop: 9, paddingBottom: 9, fontSize: 13 }} />
          </div>
          {/* Tipo filter */}
          <div style={{ position: 'relative', minWidth: 140 }}>
            <FontAwesomeIcon icon={faFilter} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none', fontSize: 13 }} />
            <select value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)}
              style={{ ...inp, paddingLeft: 32, paddingTop: 9, paddingBottom: 9, fontSize: 13, width: 'auto', appearance: 'none', WebkitAppearance: 'none', paddingRight: 24, cursor: 'pointer' }}>
              {TIPO_FILTER_OPTIONS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          {/* Sort */}
          <motion.button onClick={() => setSortDesc(p => !p)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', backgroundColor: 'white', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 13, fontWeight: 600, color: NAVY, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            <FontAwesomeIcon icon={faArrowsUpDown} style={{ fontSize: 13 }} /> {sortDesc ? 'Mais recentes primeiro' : 'Mais antigos primeiro'}
          </motion.button>
          {/* Report button */}
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', backgroundColor: 'white', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 13, fontWeight: 600, color: NAVY, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 13 }} /> Relatório de acompanhamento
          </motion.button>
        </div>

        {/* Date range */}
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', margin: '0 0 8px' }}>Período do relatório</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
              style={{ ...inp, width: 'auto', paddingTop: 8, paddingBottom: 8, fontSize: 13 }} />
            <span style={{ color: '#9ca3af', fontSize: 13 }}>até</span>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
              style={{ ...inp, width: 'auto', paddingTop: 8, paddingBottom: 8, fontSize: 13 }} />
            {(dataInicio || dataFim) && (
              <button onClick={() => { setDataInicio(''); setDataFim('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 4 }}>
                <FontAwesomeIcon icon={faXmark} style={{ fontSize: 14 }} />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Info banner ── */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
        style={{ display: 'flex', alignItems: 'flex-start', gap: 10, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
        <FontAwesomeIcon icon={faCircleInfo} style={{ fontSize: 15, color: BLUE, flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 13, color: '#1d4ed8', margin: 0, lineHeight: 1.5 }}>
          As movimentações são geradas automaticamente ao criar pedidos de compra ou venda e ao cadastrar produto com estoque inicial.
        </p>
      </motion.div>

      {/* ── Table ── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        style={{ backgroundColor: 'white', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {filtrados.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center', color: '#9ca3af' }}>
            <FontAwesomeIcon icon={faCircleDown} style={{ fontSize: 40, opacity: 0.2, margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontWeight: 600, margin: '0 0 6px' }}>Nenhuma movimentação encontrada</p>
            <p style={{ fontSize: 13, margin: 0 }}>
              {q || tipoFiltro !== 'Todos' ? 'Tente alterar os filtros' : 'Clique em "Nova Entrada" para registrar'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                {['Tipo', 'SKU', 'Produto', 'Qtd', 'Data/Hora', 'Motivo'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((m, i) => {
                const cfg = TIPOS_CONFIG.find(t => t.label === m.tipo) ?? TIPOS_CONFIG[1]
                const isNeg = cfg.sign === '-'
                return (
                  <motion.tr key={m.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.02 + i * 0.02 }}
                    style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '13px 16px' }}>
                      <TipoBadge tipo={m.tipo} />
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      {m.sku
                        ? <span style={{ fontSize: 12, fontWeight: 600, color: BLUE, background: '#eff6ff', padding: '3px 8px', borderRadius: 6 }}>{m.sku}</span>
                        : <span style={{ color: '#d1d5db' }}>—</span>}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 600, color: NAVY }}>
                      {m.produto.toUpperCase()}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 14, fontWeight: 800, color: isNeg ? PINK : GREEN }}>
                      {isNeg ? '-' : '+'}{m.qtd}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 13, color: '#6b7280' }}>
                      {fmtDt(m.dataHora)}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 13, color: '#9ca3af' }}>
                      {m.motivo ?? <span style={{ color: '#d1d5db' }}>—</span>}
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        )}
      </motion.div>

      {/* ══════════ NOVA ENTRADA MODAL ══════════ */}
      <AnimatePresence>
        {modal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setModal(false)}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1000 }} />
            <div className="modal-wrapper">
              <motion.div
                initial={{ opacity: 0, scale: 0.93, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                style={{ backgroundColor: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FontAwesomeIcon icon={faCircleDown} style={{ fontSize: 16, color: GREEN }} />
                    </div>
                    <h2 style={{ fontSize: 17, fontWeight: 700, color: NAVY, margin: 0 }}>Nova Entrada de Estoque</h2>
                  </div>
                  <button onClick={() => setModal(false)}
                    style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#6b7280', display: 'flex' }}>
                    <FontAwesomeIcon icon={faXmark} style={{ fontSize: 15 }} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={lbl}>Produto <span style={{ color: PINK }}>*</span></label>
                    <select value={form.produtoId} onChange={e => setForm(p => ({ ...p, produtoId: e.target.value }))} style={inp}>
                      <option value="">Selecione um produto</option>
                      {produtosCadastrados.map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={lbl}>Quantidade <span style={{ color: PINK }}>*</span></label>
                      <input type="number" min={0.01} step="any" value={form.quantidade}
                        onChange={e => setForm(p => ({ ...p, quantidade: e.target.value }))}
                        placeholder="0" style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Valor Unitário (R$)</label>
                      <input type="number" min={0} step="any" value={form.valorUnit}
                        onChange={e => setForm(p => ({ ...p, valorUnit: e.target.value }))}
                        placeholder="0,00" style={inp} />
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Data</label>
                    <input type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Motivo / Observação</label>
                    <input value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))}
                      placeholder="Ex: Compra de fornecedor, Estoque inicial..." style={inp} />
                  </div>
                </div>

                {error && (
                  <p style={{ color: PINK, fontSize: 13, margin: '12px 0 0', padding: '8px 12px', backgroundColor: `${PINK}10`, borderRadius: 8 }}>{error}</p>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
                  <button onClick={() => setModal(false)}
                    style={{ padding: '10px 18px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: 'white', fontSize: 14, color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancelar
                  </button>
                  <motion.button onClick={handleCriarEntrada} disabled={loading}
                    whileHover={!loading ? { scale: 1.03 } : {}} whileTap={!loading ? { scale: 0.97 } : {}}
                    style={{ padding: '10px 22px', backgroundColor: BLUE, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}>
                    {loading ? 'Salvando...' : 'Registrar Entrada'}
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
