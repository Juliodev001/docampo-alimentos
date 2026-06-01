'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBuilding, faFileLines, faCircleCheck, faCalendar, faChartBar, faFilter, faMagnifyingGlass, faArrowRight, faPlus, faPencil, faTrash, faXmark, faCheck } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { formatCurrency, formatDate } from '@/lib/utils'

const GREEN  = '#5ab952'
const NAVY   = '#2d3561'
const PINK   = '#e8255a'
const ORANGE = '#e87320'
const BLUE   = '#3b82f6'

type Compra = {
  id: string
  data: string
  vencimento: string
  status: string
  totalValor: number
  categoria: string
  observacao: string | null
  fornecedor: { nome: string }
  centroCusto: { nome: string } | null
  itens: { produto: string }[]
}

type CentroCusto = { id: string; nome: string }
type TipoCusto   = { id: string; nome: string }

const CATEGORIAS = [
  { value: 'MATERIA_PRIMA',          label: 'Matéria Prima' },
  { value: 'INSUMO',                 label: 'Insumo' },
  { value: 'DESPESA_OPERACIONAL',    label: 'Desp. Operacional' },
  { value: 'DESPESA_ADMINISTRATIVA', label: 'Desp. Administrativa' },
  { value: 'OUTROS',                 label: 'Outros' },
]

const categoriaLabel: Record<string, string> = Object.fromEntries(CATEGORIAS.map(c => [c.value, c.label]))

const statusCfg: Record<string, { label: string; bg: string; color: string }> = {
  PAGO:    { label: 'Pago',    bg: '#f0faf0', color: '#2d7d28' },
  A_PAGAR: { label: 'A Pagar', bg: '#fff7ed', color: '#b85c00' },
  VENCIDO: { label: 'Vencido', bg: '#fff0f3', color: '#c0113a' },
}

/* ── KPI card com borda esquerda colorida ── */
function KpiCard({
  label, value, color, icon,
}: { label: string; value: string | number; color: string; icon: IconDefinition }) {
  return (
    <div style={{
      borderLeft: `4px solid ${color}`,
      borderRadius: 8,
      background: 'white',
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
      padding: '18px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{label}</p>
        <p className="kpi-val" style={{ fontSize: 24, fontWeight: 700, color, margin: '6px 0 0', lineHeight: 1.1, wordBreak: 'break-word' }}>
          {value}
        </p>
      </div>
      <div style={{ background: `${color}18`, borderRadius: 8, padding: 8, flexShrink: 0, marginLeft: 6 }}>
        <FontAwesomeIcon icon={icon} style={{ fontSize: 16, color }} />
      </div>
    </div>
  )
}

/* ── aba ── */
function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 16px',
        border: 'none',
        borderBottom: active ? `2px solid ${NAVY}` : '2px solid transparent',
        background: 'none',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        color: active ? NAVY : '#6b7280',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'color 0.1s',
      }}
    >
      {label}
    </button>
  )
}

/* ── botão outline ── */
function OutlineBtn({ icon, label, onClick }: { icon: IconDefinition; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        border: '1.5px solid #e5e7eb', borderRadius: 8,
        padding: '7px 14px', background: 'white',
        fontSize: 13, color: NAVY, cursor: 'pointer',
        fontFamily: 'inherit', fontWeight: 500,
        whiteSpace: 'nowrap' as const,
      }}
    >
      <FontAwesomeIcon icon={icon} style={{ fontSize: 14, color: '#6b7280' }} />{label}
    </button>
  )
}

/* ── inline field label ── */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6, display: 'block' }}>
      {children}
    </label>
  )
}

/* ── shared input style ── */
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1.5px solid #e5e7eb',
  borderRadius: 8,
  fontSize: 14,
  color: '#374151',
  outline: 'none',
  background: 'white',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

/* ═══════════════════════════════════════ */
export default function ComprasClient({ centrosCusto }: { centrosCusto: CentroCusto[] }) {
  const router = useRouter()
  const [compras, setCompras]   = useState<Compra[]>([])
  const [loading, setLoading]   = useState(true)
  const [q, setQ]               = useState('')
  const [aba, setAba]           = useState<'geral' | 'tipos' | 'despesas'>('geral')

  /* ── tipos de custo state ── */
  const [tipos,        setTipos]        = useState<TipoCusto[]>([])
  const [tiposLoading, setTiposLoading] = useState(false)
  const [novoNome,     setNovoNome]     = useState('')
  const [novoErr,      setNovoErr]      = useState('')
  const [salvandoTipo, setSalvandoTipo] = useState(false)
  const [editId,       setEditId]       = useState<string | null>(null)
  const [editNome,     setEditNome]     = useState('')

  /* ── form state ── */
  const hoje = new Date().toISOString().slice(0, 10)
  const [fDescricao,    setFDescricao]    = useState('')
  const [fTipo,         setFTipo]         = useState('')
  const [fRoca,         setFRoca]         = useState('')
  const [fValor,        setFValor]        = useState('')
  const [fData,         setFData]         = useState(hoje)
  const [fObs,          setFObs]          = useState('')
  const [saving,        setSaving]        = useState(false)
  const [saveErr,       setSaveErr]       = useState('')
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchCompras()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (aba === 'tipos') fetchTipos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba])

  function fetchTipos() {
    setTiposLoading(true)
    fetch('/api/tipos-custo')
      .then(r => r.json())
      .then((data: TipoCusto[]) => setTipos(data))
      .finally(() => setTiposLoading(false))
  }

  async function handleNovoTipo(e: React.FormEvent) {
    e.preventDefault()
    setNovoErr('')
    if (!novoNome.trim()) { setNovoErr('Informe o nome.'); return }
    setSalvandoTipo(true)
    try {
      const res = await fetch('/api/tipos-custo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novoNome }),
      })
      if (!res.ok) {
        const err = await res.json()
        setNovoErr(err.error ?? 'Erro ao salvar.')
        return
      }
      setNovoNome('')
      fetchTipos()
    } catch { setNovoErr('Erro de rede.') }
    finally { setSalvandoTipo(false) }
  }

  async function handleDeleteTipo(id: string) {
    if (!confirm('Excluir este tipo de custo?')) return
    await fetch(`/api/tipos-custo/${id}`, { method: 'DELETE' })
    fetchTipos()
  }

  async function handleSaveTipo(id: string) {
    if (!editNome.trim()) return
    const res = await fetch(`/api/tipos-custo/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: editNome }),
    })
    if (res.ok) { setEditId(null); fetchTipos() }
  }

  function fetchCompras() {
    setLoading(true)
    fetch('/api/compras')
      .then(r => r.json())
      .then((data: Compra[]) => {
        const agora = new Date()
        setCompras(data.map(c => ({
          ...c,
          status: c.status === 'A_PAGAR' && new Date(c.vencimento) < agora ? 'VENCIDO' : c.status,
        })))
      })
      .finally(() => setLoading(false))
  }

  /* ── KPIs ── */
  const emAberto  = compras.filter(c => c.status !== 'PAGO').length
  const quitadas  = compras.filter(c => c.status === 'PAGO').length
  const valAberto = compras.filter(c => c.status !== 'PAGO').reduce((s, c) => s + c.totalValor, 0)
  const valPago   = compras.filter(c => c.status === 'PAGO').reduce((s, c) => s + c.totalValor, 0)

  /* ── filtro de busca ── */
  const filtradas = compras.filter(c =>
    !q ||
    c.fornecedor.nome.toLowerCase().includes(q.toLowerCase()) ||
    (c.observacao ?? '').toLowerCase().includes(q.toLowerCase()) ||
    (c.centroCusto?.nome ?? '').toLowerCase().includes(q.toLowerCase()) ||
    categoriaLabel[c.categoria]?.toLowerCase().includes(q.toLowerCase()) ||
    c.id.slice(-6).toLowerCase().includes(q.toLowerCase())
  )

  /* ── Tipos de custo: breakdown por categoria ── */
  const porCategoria = Object.entries(
    compras.reduce((acc, c) => {
      acc[c.categoria] = (acc[c.categoria] ?? 0) + c.totalValor
      return acc
    }, {} as Record<string, number>)
  )
    .map(([cat, total]) => ({ cat, label: categoriaLabel[cat] ?? cat, total }))
    .sort((a, b) => b.total - a.total)

  const totalGeral = compras.reduce((s, c) => s + c.totalValor, 0)

  /* ── salvar nova despesa ── */
  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setSaveErr('')
    if (!fDescricao.trim()) { setSaveErr('Informe a descrição.'); return }
    if (!fValor || Number(fValor) <= 0) { setSaveErr('Informe um valor válido.'); return }
    if (!fData) { setSaveErr('Informe a data.'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricao:    fDescricao.trim(),
          categoria:    fTipo || 'OUTROS',
          centroCustoId: fRoca || null,
          valor:        Number(fValor),
          data:         fData,
          observacao:   fObs.trim() || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setSaveErr(err.error ?? 'Erro ao salvar despesa.')
        return
      }
      /* reset form */
      setFDescricao('')
      setFTipo('')
      setFRoca('')
      setFValor('')
      setFData(hoje)
      setFObs('')
      firstInputRef.current?.focus()
      /* refresh list */
      fetchCompras()
      router.refresh()
    } catch {
      setSaveErr('Erro de rede. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* ── Cabeçalho ──────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: '#f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <FontAwesomeIcon icon={faBuilding} style={{ fontSize: 22, color: '#64748b' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: 0 }}>
            Centro de Despesa
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '3px 0 0' }}>
            Cadastro de tipos de custo e despesas por roça, sincronizado com o banco do seu tenant.
          </p>
          {loading && (
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>
              Carregando resumo e despesas...
            </p>
          )}
        </div>
      </div>

      {/* ── KPI cards ──────────────────────────── */}
      <div className="kpi-flex">
        <KpiCard label="Total de despesas em aberto"  value={emAberto}                  color={ORANGE} icon={faFileLines}    />
        <KpiCard label="Total de despesas quitadas"   value={quitadas}                  color={GREEN}  icon={faCircleCheck}  />
        <KpiCard label="Valor total em aberto"        value={formatCurrency(valAberto)} color={PINK}   icon={faCalendar}     />
        <KpiCard label="Valor pago"                   value={formatCurrency(valPago)}   color={BLUE}   icon={faChartBar}     />
      </div>

      {/* ── Tab bar ────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #e5e7eb',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex' }}>
          <Tab label="Visão geral"    active={aba === 'geral'}    onClick={() => setAba('geral')}    />
          <Tab label="Tipos de custo" active={aba === 'tipos'}    onClick={() => setAba('tipos')}    />
          <Tab label="Despesas"       active={aba === 'despesas'} onClick={() => setAba('despesas')} />
        </div>
        <Link
          href="/compras/nova"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            border: '1.5px solid #e5e7eb', borderRadius: 8,
            padding: '7px 14px', background: 'white',
            fontSize: 13, color: NAVY, textDecoration: 'none',
            fontWeight: 500, marginBottom: 4,
          }}
        >
          Ir para nova despesa <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: 13 }} />
        </Link>
      </div>

      {/* ─────────────────────────────────────────
          ABA: Tipos de custo
      ─────────────────────────────────────────── */}
      {aba === 'tipos' && (
        <div>
          {/* subtítulo + botão novo tipo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
              Tipos livres (gasolina, mudas...). Usados ao lançar despesas.
            </p>
            <button
              onClick={() => {
                setNovoNome('')
                setNovoErr('')
                const el = document.getElementById('novo-tipo-input')
                if (el) (el as HTMLInputElement).focus()
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: BLUE, color: 'white',
                border: 'none', borderRadius: 8,
                padding: '8px 16px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <FontAwesomeIcon icon={faPlus} style={{ fontSize: 14 }} /> Novo tipo
            </button>
          </div>

          {/* formulário inline de novo tipo */}
          <form
            onSubmit={handleNovoTipo}
            style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              marginBottom: 16, flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: 200 }}>
              <input
                id="novo-tipo-input"
                value={novoNome}
                onChange={e => { setNovoNome(e.target.value); setNovoErr('') }}
                placeholder="Nome do tipo (ex: Gasolina)"
                style={{ ...inputStyle, padding: '8px 14px' }}
              />
              {novoErr && (
                <p style={{ fontSize: 12, color: PINK, margin: '4px 0 0', fontWeight: 500 }}>{novoErr}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={salvandoTipo}
              style={{
                background: salvandoTipo ? '#94a3b8' : NAVY,
                color: 'white', border: 'none', borderRadius: 8,
                padding: '8px 18px', fontSize: 13, fontWeight: 600,
                cursor: salvandoTipo ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', whiteSpace: 'nowrap' as const,
              }}
            >
              {salvandoTipo ? 'Salvando...' : 'Adicionar'}
            </button>
          </form>

          {/* tabela de tipos */}
          <div style={{
            background: 'white', borderRadius: 12,
            boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden',
          }}>
            {tiposLoading ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                Carregando...
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{
                      padding: '11px 16px', textAlign: 'left',
                      fontSize: 12, color: '#6b7280', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>Nome</th>
                    <th style={{
                      padding: '11px 16px', textAlign: 'right',
                      fontSize: 12, color: '#6b7280', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {tipos.length === 0 ? (
                    <tr>
                      <td colSpan={2} style={{
                        padding: '40px 16px', textAlign: 'center',
                        color: '#9ca3af', fontSize: 14,
                      }}>
                        Nenhum tipo cadastrado.
                      </td>
                    </tr>
                  ) : tipos.map(t => (
                    <tr
                      key={t.id}
                      style={{ borderTop: '1px solid #f3f4f6' }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#f9fafb'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}
                    >
                      <td style={{ padding: '12px 16px', fontSize: 14, color: NAVY }}>
                        {editId === t.id ? (
                          <input
                            autoFocus
                            value={editNome}
                            onChange={e => setEditNome(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveTipo(t.id)
                              if (e.key === 'Escape') setEditId(null)
                            }}
                            style={{ ...inputStyle, padding: '5px 10px', fontSize: 13, maxWidth: 300 }}
                          />
                        ) : (
                          t.nome
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          {editId === t.id ? (
                            <>
                              <button
                                onClick={() => handleSaveTipo(t.id)}
                                style={{
                                  background: '#f0fdf4', border: '1px solid #86efac',
                                  borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', gap: 4,
                                  fontSize: 12, color: '#16a34a', fontFamily: 'inherit',
                                }}
                              >
                                <FontAwesomeIcon icon={faCheck} style={{ fontSize: 13 }} /> Salvar
                              </button>
                              <button
                                onClick={() => setEditId(null)}
                                style={{
                                  background: '#f9fafb', border: '1px solid #e5e7eb',
                                  borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', gap: 4,
                                  fontSize: 12, color: '#6b7280', fontFamily: 'inherit',
                                }}
                              >
                                <FontAwesomeIcon icon={faXmark} style={{ fontSize: 13 }} /> Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => { setEditId(t.id); setEditNome(t.nome) }}
                                style={{
                                  background: '#eff6ff', border: '1px solid #bfdbfe',
                                  borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', gap: 4,
                                  fontSize: 12, color: BLUE, fontFamily: 'inherit',
                                }}
                              >
                                <FontAwesomeIcon icon={faPencil} style={{ fontSize: 12 }} /> Editar
                              </button>
                              <button
                                onClick={() => handleDeleteTipo(t.id)}
                                style={{
                                  background: '#fff0f3', border: '1px solid #fecdd3',
                                  borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', gap: 4,
                                  fontSize: 12, color: PINK, fontFamily: 'inherit',
                                }}
                              >
                                <FontAwesomeIcon icon={faTrash} style={{ fontSize: 12 }} /> Excluir
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────
          ABA: Visão geral — filtros + tabela
      ─────────────────────────────────────────── */}
      {aba === 'geral' && (
        <>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            <OutlineBtn icon={faFilter} label="Filtros" />
            <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
              <FontAwesomeIcon icon={faMagnifyingGlass} style={{
                position: 'absolute', left: 12,
                top: '50%', transform: 'translateY(-50%)',
                color: '#9ca3af', pointerEvents: 'none', fontSize: 14,
              }} />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Buscar por descrição, tipo, roça, número (id)..."
                style={{ ...inputStyle, padding: '8px 12px 8px 34px' }}
              />
            </div>
            <OutlineBtn icon={faChartBar} label="Relatórios" />
          </div>
          <DespesasTable filtradas={filtradas} />
        </>
      )}

      {/* ─────────────────────────────────────────
          ABA: Despesas — form inline + tabela
      ─────────────────────────────────────────── */}
      {aba === 'despesas' && (
        <>
          {/* filtros */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <OutlineBtn icon={faFilter} label="Filtros" />
            <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
              <FontAwesomeIcon icon={faMagnifyingGlass} style={{
                position: 'absolute', left: 12,
                top: '50%', transform: 'translateY(-50%)',
                color: '#9ca3af', pointerEvents: 'none', fontSize: 14,
              }} />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Buscar por descrição, tipo, roça, número (id)..."
                style={{ ...inputStyle, padding: '8px 12px 8px 34px' }}
              />
            </div>
            <OutlineBtn icon={faChartBar} label="Relatórios" />
          </div>

          {/* ── Formulário Nova Despesa ── */}
          <div style={{
            background: 'white',
            borderRadius: 12,
            boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
            padding: '24px 28px',
            marginBottom: 20,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: NAVY, margin: '0 0 20px' }}>
              Nova despesa
            </h2>

            <form onSubmit={handleSalvar}>
              {/* Row 1: Descrição + Tipo de custo */}
              <div className="form-grid-2" style={{ marginBottom: 16 }}>
                <div>
                  <FieldLabel>Descrição</FieldLabel>
                  <input
                    ref={firstInputRef}
                    value={fDescricao}
                    onChange={e => setFDescricao(e.target.value)}
                    placeholder="Ex.: Abastecimento trator"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <FieldLabel>Tipo de custo</FieldLabel>
                  <select
                    value={fTipo}
                    onChange={e => setFTipo(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Buscar ou selecionar tipo...</option>
                    {CATEGORIAS.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Roça (full width) */}
              <div style={{ marginBottom: 16 }}>
                <FieldLabel>Roça (ativas)</FieldLabel>
                <select
                  value={fRoca}
                  onChange={e => setFRoca(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Buscar roça por nome...</option>
                  {centrosCusto.map(cc => (
                    <option key={cc.id} value={cc.id}>{cc.nome}</option>
                  ))}
                </select>
              </div>

              {/* Row 3: Valor + Data */}
              <div className="form-grid-2" style={{ marginBottom: 16 }}>
                <div>
                  <FieldLabel>Valor (R$)</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={fValor}
                    onChange={e => setFValor(e.target.value)}
                    placeholder="0.00"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <FieldLabel>Data (competência)</FieldLabel>
                  <input
                    type="date"
                    value={fData}
                    onChange={e => setFData(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Row 4: Observações */}
              <div style={{ marginBottom: 20 }}>
                <FieldLabel>Observações</FieldLabel>
                <textarea
                  value={fObs}
                  onChange={e => setFObs(e.target.value)}
                  placeholder="Opcional"
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              {saveErr && (
                <p style={{ fontSize: 13, color: PINK, margin: '-10px 0 14px', fontWeight: 500 }}>
                  {saveErr}
                </p>
              )}

              {/* Botão Salvar */}
              <button
                type="submit"
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: saving ? '#94a3b8' : BLUE,
                  color: 'white',
                  border: 'none', borderRadius: 8,
                  padding: '10px 20px',
                  fontSize: 14, fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background 0.15s',
                }}
              >
                <FontAwesomeIcon icon={faPlus} style={{ fontSize: 16 }} />
                {saving ? 'Salvando...' : 'Salvar despesa'}
              </button>
            </form>
          </div>

          {/* ── Lista de despesas ── */}
          <h2 style={{ fontSize: 15, fontWeight: 600, color: NAVY, margin: '0 0 12px' }}>
            Lista de despesas
          </h2>
          <DespesasTable filtradas={filtradas} />
        </>
      )}
    </div>
  )
}

/* ── tabela reutilizável ── */
function DespesasTable({ filtradas }: { filtradas: Compra[] }) {
  return (
    <div style={{
      background: 'white', borderRadius: 12,
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Descrição', 'Roça', 'Tipo', 'Valor', 'Data', 'Status', 'Pago', 'Data pagamento', 'Ações'].map(h => (
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
                <td colSpan={9} style={{ padding: '48px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                  Nenhuma despesa lançada.
                </td>
              </tr>
            ) : filtradas.map((c) => {
              const st = statusCfg[c.status] ?? statusCfg.A_PAGAR
              const descricao = c.observacao || c.itens[0]?.produto || c.fornecedor.nome
              return (
                <tr
                  key={c.id}
                  style={{ borderTop: '1px solid #f3f4f6' }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#f9fafb'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}
                >
                  <td style={{ padding: '12px 14px', fontSize: 13, color: NAVY, fontWeight: 500, maxWidth: 180 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {descricao}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#6b7280' }}>
                    {c.centroCusto?.nome ?? '—'}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {categoriaLabel[c.categoria] ?? c.categoria}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: NAVY, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {formatCurrency(c.totalValor)}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {formatDate(c.data)}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      background: st.bg, color: st.color,
                      padding: '3px 10px', borderRadius: 20,
                      fontSize: 11, fontWeight: 600,
                    }}>
                      {st.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: c.status === 'PAGO' ? GREEN : '#9ca3af', whiteSpace: 'nowrap' }}>
                    {c.status === 'PAGO' ? formatCurrency(c.totalValor) : 'R$ 0,00'}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {c.status === 'PAGO' ? formatDate(c.vencimento) : '—'}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <Link
                      href={`/compras/${c.id}`}
                      style={{
                        fontSize: 12, color: BLUE,
                        textDecoration: 'none', fontWeight: 500,
                        border: '1px solid #bfdbfe',
                        borderRadius: 6, padding: '3px 10px',
                        background: '#eff6ff',
                      }}
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
