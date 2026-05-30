'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCartShopping, faFileLines, faBox, faCircleCheck, faCircleXmark, faPlus, faXmark, faFilter, faMagnifyingGlass, faDownload, faTrash, faChevronDown } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { formatCurrency, formatDate } from '@/lib/utils'

const GREEN  = '#5ab952'
const NAVY   = '#2d3561'
const PINK   = '#e8255a'
const ORANGE = '#e87320'
const BLUE   = '#3b82f6'
const PURPLE = '#8b5cf6'

type ItemPedido = {
  id?: string; produto: string; unidade: string
  quantidade: number; valorUnit: number; desconto: number; total: number
}
type Pedido = {
  id: string; numero: number; tipo: string; data: string
  status: string; totalValor: number; frete: number; outrasTaxas: number
  formaPagamento: string | null; observacao: string | null
  obsInternas: string | null; obsCliente: string | null
  cliente: { id: string; nome: string } | null
  fornecedor: { id: string; nome: string } | null
  transportadora: { id: string; nome: string } | null
  itens: ItemPedido[]
}
type Cliente    = { id: string; nome: string }
type Fornecedor = { id: string; nome: string }
type Produto    = { id: string; nome: string; unidade: string }

const FORMAS_PAGAMENTO = ['Dinheiro', 'PIX', 'Boleto', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência', 'Cheque']
const UNIDADES         = ['CAIXA', 'KG', 'UNIDADE', 'SACO', 'LITRO', 'DUZIA', 'FARDO']

const statusCfg: Record<string, { label: string; bg: string; color: string }> = {
  ABERTO:     { label: 'Em Andamento', bg: '#f5f3ff', color: PURPLE  },
  CONFIRMADO: { label: 'Confirmado',   bg: '#f0faf0', color: GREEN   },
  ENTREGUE:   { label: 'Concluído',    bg: '#f0f9ff', color: BLUE    },
  CANCELADO:  { label: 'Cancelado',    bg: '#fff0f3', color: PINK    },
}

const emptyItem: ItemPedido = { produto: '', unidade: 'CAIXA', quantidade: 0, valorUnit: 0, desconto: 0, total: 0 }

/* ── botão outline ── */
function OutlineBtn({ icon, label, onClick }: { icon: IconDefinition; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      border: '1.5px solid #e5e7eb', borderRadius: 8,
      padding: '7px 14px', background: 'white',
      fontSize: 13, color: NAVY, cursor: 'pointer',
      fontFamily: 'inherit', fontWeight: 500, whiteSpace: 'nowrap' as const,
    }}>
      <FontAwesomeIcon icon={icon} style={{ fontSize: 14, color: '#6b7280' }} />{label}
    </button>
  )
}

/* ── section card (Vendas / Compras / Operacional) ── */
function SectionKpiCard({
  title, value, count, description, icon, iconColor,
}: { title: string; value?: string; count?: number; description: string; icon: IconDefinition; iconColor: string }) {
  return (
    <div style={{
      background: 'white', borderRadius: 12,
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
      padding: '20px 22px', flex: 1, minWidth: 0,
      display: 'flex', flexDirection: 'column', gap: 6,
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: 18, right: 18,
        width: 36, height: 36, borderRadius: '50%',
        background: `${iconColor}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <FontAwesomeIcon icon={icon} style={{ fontSize: 16, color: iconColor }} />
      </div>
      <p style={{ fontSize: value ? 22 : 28, fontWeight: 700, color: NAVY, margin: 0, lineHeight: 1 }}>
        {value ?? count}
      </p>
      <p style={{ fontSize: 14, fontWeight: 600, color: NAVY, margin: 0 }}>{title}</p>
      <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
        {typeof count !== 'undefined' && value ? `${count} pedidos` : null}
        {typeof count !== 'undefined' && !value ? `${count} pedidos` : null}
      </p>
      <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{description}</p>
    </div>
  )
}

/* ── form field label ── */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6, display: 'block' }}>
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  border: '1.5px solid #e5e7eb', borderRadius: 8,
  fontSize: 14, color: '#374151', outline: 'none',
  background: 'white', boxSizing: 'border-box', fontFamily: 'inherit',
}

/* ── modal section card ── */
function ModalSection({ title, icon, children, collapsible, extra }: {
  title: string; icon: IconDefinition; children: React.ReactNode
  collapsible?: boolean; extra?: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{
      border: '1px solid #e5e7eb', borderRadius: 10,
      overflow: 'hidden', marginBottom: 16,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', background: 'white',
        cursor: collapsible ? 'pointer' : 'default',
        borderBottom: open ? '1px solid #e5e7eb' : 'none',
      }} onClick={() => collapsible && setOpen(v => !v)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FontAwesomeIcon icon={icon} style={{ fontSize: 16, color: NAVY }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: NAVY }}>{title}</span>
          {collapsible && <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: 14, color: '#6b7280', transform: open ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />}
        </div>
        {extra && <div onClick={e => e.stopPropagation()}>{extra}</div>}
      </div>
      {open && (
        <div style={{ padding: '18px 18px 16px', background: 'white' }}>
          {children}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════ */
export default function PedidosClient({ pedidos: inicial, clientes, fornecedores, produtos }: {
  pedidos: Pedido[]
  clientes: Cliente[]
  fornecedores: Fornecedor[]
  produtos: Produto[]
}) {
  const router  = useRouter()
  const [pedidos, setPedidos] = useState(inicial)
  const [q, setQ]             = useState('')
  const [modal, setModal]     = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  /* ── form state ── */
  const hoje = new Date().toISOString().slice(0, 10)
  const [tipo,           setTipo]           = useState<'VENDA' | 'COMPRA'>('VENDA')
  const [clienteId,      setClienteId]      = useState('')
  const [fornecedorId,   setFornecedorId]   = useState('')
  const [dataPedido,     setDataPedido]     = useState(hoje)
  const [formaPagamento, setFormaPagamento] = useState('')
  const [frete,          setFrete]          = useState('0')
  const [outrasTaxas,    setOutrasTaxas]    = useState('0')
  const [obsInternas,    setObsInternas]    = useState('')
  const [obsCliente,     setObsCliente]     = useState('')
  const [itens, setItens] = useState<ItemPedido[]>([{ ...emptyItem }])

  function resetForm() {
    setTipo('VENDA'); setClienteId(''); setFornecedorId('')
    setDataPedido(hoje); setFormaPagamento(''); setFrete('0'); setOutrasTaxas('0')
    setObsInternas(''); setObsCliente(''); setItens([{ ...emptyItem }])
    setError('')
  }

  function updateItem(idx: number, field: keyof ItemPedido, val: string | number) {
    setItens(prev => prev.map((it, i) => {
      if (i !== idx) return it
      const upd = { ...it, [field]: val }
      const qty  = Number(upd.quantidade)
      const unit = Number(upd.valorUnit)
      const disc = Number(upd.desconto)
      upd.total = Math.max(0, qty * unit - disc)
      return upd
    }))
  }

  const subtotal   = itens.reduce((s, it) => s + it.total, 0)
  const freteN     = parseFloat(frete) || 0
  const outrasTN   = parseFloat(outrasTaxas) || 0
  const totalFinal = subtotal + freteN + outrasTN

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (tipo === 'VENDA' && !clienteId)    { setError('Selecione um cliente.'); return }
    if (tipo === 'COMPRA' && !fornecedorId){ setError('Selecione um fornecedor.'); return }
    if (!itens.some(it => it.produto.trim())){ setError('Adicione pelo menos um produto.'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          clienteId:    tipo === 'VENDA' ? clienteId    : null,
          fornecedorId: tipo === 'COMPRA' ? fornecedorId : null,
          data:         dataPedido,
          formaPagamento: formaPagamento || null,
          frete:        freteN,
          outrasTaxas:  outrasTN,
          obsInternas:  obsInternas || null,
          obsCliente:   obsCliente  || null,
          itens:        itens.filter(it => it.produto.trim()),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error ?? 'Erro ao criar pedido.')
        return
      }
      const novo = await res.json()
      setPedidos(prev => [novo, ...prev])
      setModal(false)
      resetForm()
      router.refresh()
    } catch {
      setError('Erro de rede. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  /* ── KPIs ── */
  const vendaConf   = pedidos.filter(p => p.tipo === 'VENDA' && (p.status === 'CONFIRMADO' || p.status === 'ENTREGUE'))
  const vendaAberto = pedidos.filter(p => p.tipo === 'VENDA' && p.status === 'ABERTO')
  const compraConf  = pedidos.filter(p => p.tipo === 'COMPRA' && (p.status === 'CONFIRMADO' || p.status === 'ENTREGUE'))
  const compraAberto= pedidos.filter(p => p.tipo === 'COMPRA' && p.status === 'ABERTO')
  const emAndamento = pedidos.filter(p => p.status === 'ABERTO').length
  const concluidos  = pedidos.filter(p => p.status === 'ENTREGUE').length
  const cancelados  = pedidos.filter(p => p.status === 'CANCELADO').length

  const sum = (arr: Pedido[]) => arr.reduce((s, p) => s + p.totalValor, 0)

  const filtrados = pedidos.filter(p =>
    !q ||
    String(p.numero).includes(q) ||
    (p.cliente?.nome  ?? '').toLowerCase().includes(q.toLowerCase()) ||
    (p.fornecedor?.nome ?? '').toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: 0 }}>Pedidos</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Gestão completa de vendas e compras</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <OutlineBtn icon={faDownload} label="Baixar Relatório PDF" />
          <button
            onClick={() => { resetForm(); setModal(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: NAVY, color: 'white',
              border: 'none', borderRadius: 8,
              padding: '8px 18px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <FontAwesomeIcon icon={faPlus} style={{ fontSize: 14 }} /> Novo Pedido
          </button>
        </div>
      </div>

      {/* ── Vendas ── */}
      <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 10px' }}>Vendas</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <SectionKpiCard
          title="Faturamento Confirmado (Vendas)"
          value={formatCurrency(sum(vendaConf))}
          count={vendaConf.length}
          description="Pedidos de venda pagos e faturados"
          icon={faFileLines as IconDefinition} iconColor={GREEN}
        />
        <SectionKpiCard
          title="Valor em Aberto (Vendas)"
          value={formatCurrency(sum(vendaAberto))}
          count={vendaAberto.length}
          description="Pedidos de venda aguardando pagamento ou faturamento"
          icon={faFileLines as IconDefinition} iconColor={BLUE}
        />
      </div>

      {/* ── Compras ── */}
      <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 10px' }}>Compras</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <SectionKpiCard
          title="Compras Confirmadas"
          value={formatCurrency(sum(compraConf))}
          count={compraConf.length}
          description="Pedidos de compra finalizados e pagos"
          icon={faCartShopping as IconDefinition} iconColor={ORANGE}
        />
        <SectionKpiCard
          title="Compras em Aberto"
          value={formatCurrency(sum(compraAberto))}
          count={compraAberto.length}
          description="Pedidos de compra aguardando pagamento ou finalização"
          icon={faFileLines as IconDefinition} iconColor={ORANGE}
        />
      </div>

      {/* ── Operacional ── */}
      <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: BLUE }}>◆</span> Operacional (quantidade)
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        <SectionKpiCard
          title="Pedidos em Andamento"
          count={emAndamento}
          description="Pedidos criados, mas não finalizados"
          icon={faBox as IconDefinition} iconColor={PURPLE}
        />
        <SectionKpiCard
          title="Pedidos Concluídos"
          count={concluidos}
          description="Pedidos finalizados com sucesso"
          icon={faCircleCheck as IconDefinition} iconColor={GREEN}
        />
        <SectionKpiCard
          title="Pedidos Cancelados"
          count={cancelados}
          description="Pedidos cancelados antes da conclusão"
          icon={faCircleXmark as IconDefinition} iconColor={PINK}
        />
      </div>

      {/* ── Relatório Margem ── */}
      <div style={{
        background: 'white', borderRadius: 12,
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
        padding: '18px 22px', marginBottom: 20,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 20, color: NAVY, marginTop: 2, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: NAVY, margin: '0 0 4px' }}>
              Relatório de Margem de Contribuição
            </p>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
              Receita, custo e margem por produto (vendas do período, exceto canceladas). Clique em Gerar relatório para escolher o período e baixar ou imprimir.
            </p>
          </div>
        </div>
        <button style={{
          display: 'flex', alignItems: 'center', gap: 6,
          border: '1.5px solid #e5e7eb', borderRadius: 8,
          padding: '7px 14px', background: 'white',
          fontSize: 13, color: NAVY, cursor: 'pointer',
          fontFamily: 'inherit', fontWeight: 500, whiteSpace: 'nowrap' as const, flexShrink: 0,
        }}>
          <FontAwesomeIcon icon={faDownload} style={{ fontSize: 14, color: '#6b7280' }} /> Gerar relatório
        </button>
      </div>

      {/* ── Filtros ── */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <OutlineBtn icon={faFilter} label="Filtros" />
        <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
          <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: 14, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar por número, cliente ou fornecedor..."
            style={{ ...inputStyle, padding: '8px 12px 8px 34px' }}
          />
        </div>
      </div>

      {/* ── Tabela ── */}
      <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Nº', 'Tipo', 'Cliente / Fornecedor', 'Data', 'Total', 'Status'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '60px 16px', textAlign: 'center' }}>
                    <FontAwesomeIcon icon={faCartShopping} style={{ fontSize: 40, color: '#d1d5db', display: 'block', margin: '0 auto 12px' }} />
                    <span style={{ color: '#9ca3af', fontSize: 14 }}>Nenhum pedido encontrado</span>
                  </td>
                </tr>
              ) : filtrados.map(p => {
                const sc = statusCfg[p.status] ?? statusCfg.ABERTO
                const nome = p.cliente?.nome ?? p.fornecedor?.nome ?? '—'
                return (
                  <tr key={p.id} style={{ borderTop: '1px solid #f3f4f6' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#f9fafb'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: NAVY, fontWeight: 600 }}>#{p.numero}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: p.tipo === 'VENDA' ? '#f0faf0' : '#fff7ed', color: p.tipo === 'VENDA' ? GREEN : ORANGE }}>
                        {p.tipo}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: NAVY, fontWeight: 500 }}>{nome}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' }}>{formatDate(new Date(p.data))}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: NAVY, fontWeight: 600, whiteSpace: 'nowrap' }}>{formatCurrency(p.totalValor)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
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

      {/* ── Modal Novo Pedido ── */}
      {modal && (
        <>
          <div
            onClick={() => setModal(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }}
          />
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1001,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: '40px 16px', overflowY: 'auto',
          }}>
            <div style={{
              background: 'white', borderRadius: 16,
              width: '100%', maxWidth: 700,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              padding: '28px 32px',
            }}>
              {/* modal header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: 0 }}>Novo Pedido</h2>
                  <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Preencha os dados para criar um novo pedido</p>
                </div>
                <button onClick={() => setModal(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#6b7280' }}>
                  <FontAwesomeIcon icon={faXmark} style={{ fontSize: 16 }} />
                </button>
              </div>

              <form onSubmit={handleCreate}>
                {/* ── Informações Básicas ── */}
                <ModalSection title="Informações Básicas" icon={faCartShopping}>
                  {/* Tipo de Pedido */}
                  <div style={{ marginBottom: 16 }}>
                    <FieldLabel>Tipo de Pedido</FieldLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {(['VENDA', 'COMPRA'] as const).map(t => (
                        <button
                          key={t} type="button"
                          onClick={() => setTipo(t)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '14px 18px',
                            border: `2px solid ${tipo === t ? BLUE : '#e5e7eb'}`,
                            borderRadius: 10,
                            background: tipo === t ? '#eff6ff' : 'white',
                            cursor: 'pointer', fontFamily: 'inherit',
                            fontWeight: 600, fontSize: 14, color: tipo === t ? BLUE : '#374151',
                            transition: 'all 0.15s',
                          }}
                        >
                          {t === 'VENDA' ? <FontAwesomeIcon icon={faCartShopping} style={{ fontSize: 16, color: tipo === t ? BLUE : '#6b7280' }} /> : <FontAwesomeIcon icon={faBox} style={{ fontSize: 16, color: tipo === t ? BLUE : '#6b7280' }} />}
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cliente / Fornecedor */}
                  <div style={{ marginBottom: 16 }}>
                    <FieldLabel>{tipo === 'VENDA' ? 'Cliente' : 'Fornecedor'}</FieldLabel>
                    {tipo === 'VENDA' ? (
                      <>
                        <select value={clienteId} onChange={e => setClienteId(e.target.value)} style={inputStyle}>
                          <option value="">Selecione um cliente</option>
                          {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                        {clientes.length === 0 && (
                          <div style={{ marginTop: 8, padding: '10px 14px', background: '#fff0f3', border: '1px solid #fecdd3', borderRadius: 8, fontSize: 13, color: '#c0113a' }}>
                            Para criar um pedido de <strong>VENDA</strong>, é necessário cadastrar um cliente.
                          </div>
                        )}
                      </>
                    ) : (
                      <select value={fornecedorId} onChange={e => setFornecedorId(e.target.value)} style={inputStyle}>
                        <option value="">Selecione um fornecedor</option>
                        {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                      </select>
                    )}
                  </div>

                  {/* Data do Pedido */}
                  <div>
                    <FieldLabel>Data do Pedido</FieldLabel>
                    <input type="date" value={dataPedido} onChange={e => setDataPedido(e.target.value)} style={inputStyle} />
                  </div>
                </ModalSection>

                {/* ── Itens do Pedido ── */}
                <ModalSection
                  title="Itens do Pedido"
                  icon={faBox}
                  collapsible
                  extra={
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setItens(p => [...p, { ...emptyItem }]) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        border: '1.5px solid #e5e7eb', borderRadius: 7,
                        padding: '5px 12px', background: 'white',
                        fontSize: 12, color: NAVY, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      <FontAwesomeIcon icon={faPlus} style={{ fontSize: 13 }} /> Adicionar Item
                    </button>
                  }
                >
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f9fafb' }}>
                          {['Produto', 'Quantidade', 'Preço Unitário', 'Desconto', 'Subtotal', ''].map(h => (
                            <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {itens.map((it, i) => (
                          <tr key={i} style={{ borderTop: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '8px 6px', minWidth: 160 }}>
                              <select
                                value={it.produto}
                                onChange={e => {
                                  const prod = produtos.find(p => p.nome === e.target.value)
                                  updateItem(i, 'produto', e.target.value)
                                  if (prod) updateItem(i, 'unidade', prod.unidade)
                                }}
                                style={{ ...inputStyle, padding: '7px 10px', fontSize: 12 }}
                              >
                                <option value="">Selecione um produto</option>
                                {produtos.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                              </select>
                            </td>
                            <td style={{ padding: '8px 6px', minWidth: 90 }}>
                              <input type="number" min={0} step="any" value={it.quantidade || ''}
                                onChange={e => updateItem(i, 'quantidade', parseFloat(e.target.value) || 0)}
                                style={{ ...inputStyle, padding: '7px 10px', fontSize: 12 }} />
                            </td>
                            <td style={{ padding: '8px 6px', minWidth: 110 }}>
                              <input type="number" min={0} step="any" value={it.valorUnit || ''}
                                onChange={e => updateItem(i, 'valorUnit', parseFloat(e.target.value) || 0)}
                                style={{ ...inputStyle, padding: '7px 10px', fontSize: 12 }} />
                            </td>
                            <td style={{ padding: '8px 6px', minWidth: 90 }}>
                              <input type="number" min={0} step="any" value={it.desconto || ''}
                                onChange={e => updateItem(i, 'desconto', parseFloat(e.target.value) || 0)}
                                style={{ ...inputStyle, padding: '7px 10px', fontSize: 12 }} />
                            </td>
                            <td style={{ padding: '8px 6px', fontSize: 13, color: NAVY, fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {formatCurrency(it.total)}
                            </td>
                            <td style={{ padding: '8px 6px' }}>
                              {itens.length > 1 && (
                                <button type="button" onClick={() => setItens(p => p.filter((_, idx) => idx !== i))}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: PINK, padding: 4 }}>
                                  <FontAwesomeIcon icon={faTrash} style={{ fontSize: 14 }} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ModalSection>

                {/* ── Pagamento e Entrega ── */}
                <ModalSection title="Pagamento e Entrega" icon={faFileLines}>
                  <FieldLabel>Forma de Pagamento *</FieldLabel>
                  <select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)} style={inputStyle}>
                    <option value="">Selecione a forma de pagamento</option>
                    {FORMAS_PAGAMENTO.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </ModalSection>

                {/* ── Resumo Financeiro ── */}
                <ModalSection title="Resumo Financeiro" icon={faFileLines}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 4px' }}>Subtotal</p>
                      <p style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: 0 }}>{formatCurrency(subtotal)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 4px' }}>Frete</p>
                      <input type="number" min={0} step="any" value={frete}
                        onChange={e => setFrete(e.target.value)}
                        style={{ ...inputStyle, padding: '6px 10px', fontSize: 14 }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 4px' }}>Outras Taxas</p>
                    <input type="number" min={0} step="any" value={outrasTaxas}
                      onChange={e => setOutrasTaxas(e.target.value)}
                      style={{ ...inputStyle, padding: '6px 10px', fontSize: 14, maxWidth: 200 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: NAVY }}>Total</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: NAVY }}>{formatCurrency(totalFinal)}</span>
                  </div>
                </ModalSection>

                {/* ── Observações ── */}
                <ModalSection title="Observações" icon={faFileLines}>
                  <div style={{ marginBottom: 14 }}>
                    <FieldLabel>Observações Internas</FieldLabel>
                    <textarea value={obsInternas} onChange={e => setObsInternas(e.target.value)}
                      rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                  </div>
                  <div>
                    <FieldLabel>Observações do Cliente</FieldLabel>
                    <textarea value={obsCliente} onChange={e => setObsCliente(e.target.value)}
                      rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                  </div>
                </ModalSection>

                {/* ── Resumo dos itens ── */}
                <div style={{
                  border: '1px solid #e5e7eb', borderRadius: 10,
                  padding: '18px 18px 16px', marginBottom: 16, background: 'white',
                }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: NAVY, margin: '0 0 12px' }}>
                    Resumo dos itens
                  </p>
                  {itens.filter(it => it.produto.trim()).length === 0 ? (
                    <p style={{ fontSize: 13, color: BLUE, margin: '0 0 12px' }}>
                      Nenhum produto adicionado.
                    </p>
                  ) : (
                    <div style={{ marginBottom: 12 }}>
                      {itens.filter(it => it.produto.trim()).map((it, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                          <span style={{ color: NAVY, fontWeight: 500 }}>{it.produto} × {it.quantidade}</span>
                          <span style={{ color: NAVY, fontWeight: 600 }}>{formatCurrency(it.total)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setItens(p => [...p, { ...emptyItem }])}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      border: '1.5px solid #e5e7eb', borderRadius: 8,
                      padding: '7px 14px', background: 'white',
                      fontSize: 13, color: NAVY, cursor: 'pointer',
                      fontFamily: 'inherit', fontWeight: 500,
                    }}
                  >
                    <FontAwesomeIcon icon={faPlus} style={{ fontSize: 13 }} /> Adicionar mais produtos
                  </button>
                </div>

                {error && (
                  <div style={{ padding: '10px 14px', background: '#fff0f3', border: '1px solid #fecdd3', borderRadius: 8, fontSize: 13, color: '#c0113a', marginBottom: 16 }}>
                    {error}
                  </div>
                )}

                {/* ── Botão Criar Pedido — largura total ── */}
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    width: '100%', padding: '14px',
                    background: saving ? '#94a3b8' : BLUE,
                    color: 'white', border: 'none', borderRadius: 10,
                    fontSize: 15, fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    transition: 'background 0.15s',
                  }}
                >
                  {saving ? 'Criando...' : 'Criar Pedido'}
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

