'use client'
import { useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faMagnifyingGlass, faShoppingCart,
  faXmark, faCheckCircle, faMoneyBill, faCreditCard, faQrcode,
  faHandshake, faReceipt, faBoxOpen, faPencil,
  faClockRotateLeft, faPrint, faFileLines,
} from '@fortawesome/free-solid-svg-icons'
import { useToast } from '@/components/toast'
import { formatCurrency } from '@/lib/utils'

const NAVY   = '#2d3561'
const GREEN  = '#5ab952'
const PINK   = '#e8255a'
const ORANGE = '#e87320'
const BLUE   = '#3b82f6'

type Produto = {
  id: string
  nome: string
  precoVenda: number
  precoPromocional: number
  precoPdv: number
  unidade: string
  categoria: string | null
  ativo: boolean
  estoque: number
  estoqueVinculadoId: string | null
}

type Cliente = { id: string; nome: string }

type PedidoPendente = {
  id: string; numero: number; tipo: string; data: string
  clienteId: string | null; formaPagamento: string | null; status: string; totalValor: number
  cliente: { nome: string } | null
}

type CartItem = {
  itemId: string
  produtoId: string
  nome: string
  unidade: string
  quantidade: number
  valorUnit: number
  desconto: number
  total: number
}

type PaymentMethod = 'DINHEIRO' | 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'FIADO'

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: typeof faMoneyBill }[] = [
  { key: 'DINHEIRO',       label: 'Dinheiro',        icon: faMoneyBill },
  { key: 'PIX',            label: 'PIX',             icon: faQrcode },
  { key: 'CARTAO_CREDITO', label: 'Cartão Crédito',  icon: faCreditCard },
  { key: 'CARTAO_DEBITO',  label: 'Cartão Débito',   icon: faCreditCard },
  { key: 'FIADO',          label: 'Carteira',           icon: faHandshake },
]

const inp: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1.5px solid #e5e7eb',
  borderRadius: 8,
  fontSize: 13,
  color: NAVY,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  background: 'white',
}

export default function PdvClient({ produtos, clientes, pedidos }: { produtos: Produto[]; clientes: Cliente[]; pedidos: PedidoPendente[] }) {
  const toast = useToast()

  const [q, setQ] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [globalDiscount, setGlobalDiscount] = useState('')

  /* modal */
  const [modalOpen, setModalOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('DINHEIRO')
  const [clienteId, setClienteId] = useState('')
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteDropdown, setClienteDropdown] = useState(false)
  const [clienteError, setClienteError] = useState(false)
  const [cashReceived, setCashReceived] = useState('')
  const [dataCobranca, setDataCobranca] = useState('')
  const [pedidoData, setPedidoData] = useState(() => new Date().toISOString().slice(0, 10))
  const [submitting, setSubmitting] = useState(false)
  const [lastPedidoId, setLastPedidoId] = useState<string | null>(null)
  const [showHistorico, setShowHistorico] = useState(false)
  const [historicoSearch, setHistoricoSearch] = useState('')
  const [vendasPdv, setVendasPdv] = useState<PedidoPendente[]>(() =>
    pedidos.filter(p => p.tipo === 'PDV').sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
  )

  /* edição de preço inline no carrinho */
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null)
  const [editingPriceVal, setEditingPriceVal] = useState('')
  const [produtosLocal, setProdutosLocal] = useState(produtos)

  /* edição de nome no carrinho */
  const [editingNomeId, setEditingNomeId] = useState<string | null>(null)
  const [editingNomeVal, setEditingNomeVal] = useState('')

  /* produto avulso */
  const [showAvulso, setShowAvulso] = useState(false)
  const [avulsoNome, setAvulsoNome] = useState('')
  const [avulsoPreco, setAvulsoPreco] = useState('')
  const [avulsoQtd, setAvulsoQtd] = useState('1')
  const [avulsoUnidade, setAvulsoUnidade] = useState('UNIDADE')

  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  function saveCartPrice(itemId: string) {
    const novo = parseFloat(editingPriceVal)
    if (!isNaN(novo) && novo >= 0) {
      setCart(prev => prev.map(it =>
        it.itemId === itemId
          ? { ...it, valorUnit: novo, total: novo * it.quantidade - it.desconto }
          : it
      ))
    }
    setEditingPriceId(null)
  }

  const categories = Array.from(
    new Set(produtosLocal.filter(p => p.ativo && p.categoria).map(p => p.categoria as string))
  ).sort()

  const filtered = produtosLocal.filter(p => {
    if (!p.ativo) return false
    const matchQ = !q || p.nome.toLowerCase().includes(q.toLowerCase())
    const matchCat = !activeCategory || p.categoria === activeCategory
    return matchQ && matchCat
  })

  const subtotal = cart.reduce((s, it) => s + it.total, 0)
  const discount = parseFloat(globalDiscount) || 0
  const total = Math.max(0, subtotal - discount)
  const cashRec = parseFloat(cashReceived) || 0
  const troco = cashRec > total ? cashRec - total : 0

  const vendasPdvFiltradas = historicoSearch.trim()
    ? vendasPdv.filter(v => (v.cliente?.nome ?? '').toLowerCase().includes(historicoSearch.trim().toLowerCase()))
    : vendasPdv

  const saldoCarteira = clienteId
    ? pedidos
        .filter(p => p.clienteId === clienteId && p.formaPagamento === 'FIADO' && !['CANCELADO', 'PAGO'].includes(p.status))
        .reduce((s, p) => s + p.totalValor, 0)
    : 0

  const clientesFiltrados = clienteSearch.length >= 2
    ? clientes.filter(c => c.nome.toLowerCase().includes(clienteSearch.toLowerCase()))
    : []

  function addToCart(produto: Produto) {
    const price = produto.precoPromocional > 0 ? produto.precoPromocional : produto.precoPdv > 0 ? produto.precoPdv : produto.precoVenda
    setCart(prev => [...prev, {
      itemId: `${produto.id}-${Date.now()}`,
      produtoId: produto.id,
      nome: produto.nome,
      unidade: produto.unidade,
      quantidade: 0,
      valorUnit: price,
      desconto: 0,
      total: price,
    }])
  }

  function updateQty(itemId: string, qty: number) {
    if (qty < 0) { removeFromCart(itemId); return }
    setCart(prev => prev.map(it =>
      it.itemId === itemId
        ? { ...it, quantidade: qty, total: qty * it.valorUnit - it.desconto }
        : it
    ))
  }

  function removeFromCart(itemId: string) {
    setCart(prev => prev.filter(it => it.itemId !== itemId))
  }

  function updateNome(itemId: string, nome: string) {
    setCart(prev => prev.map(it => it.itemId === itemId ? { ...it, nome } : it))
    setEditingNomeId(null)
  }

  function addAvulso() {
    const preco = parseFloat(avulsoPreco.replace(',', '.')) || 0
    const qtd   = parseInt(avulsoQtd) || 1
    if (!avulsoNome.trim()) return
    const id = `avulso-${Date.now()}`
    setCart(prev => [...prev, {
      itemId: id, produtoId: id,
      nome: avulsoNome.trim(), unidade: avulsoUnidade,
      quantidade: qtd, valorUnit: preco, desconto: 0, total: preco * qtd,
    }])
    setAvulsoNome(''); setAvulsoPreco(''); setAvulsoQtd('1')
    setShowAvulso(false)
  }

  function clearCart() {
    setCart([])
    setGlobalDiscount('')
  }

  function closeModal() {
    if (submitting) return
    setModalOpen(false)
    setClienteError(false)
    setClienteSearch('')
  }

  async function handleFinalize() {
    if (cart.length === 0) return
    if (!clienteId) {
      setClienteError(true)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'PDV',
          clienteId,
          data: new Date(pedidoData + 'T12:00:00.000Z').toISOString(),
          formaPagamento: paymentMethod,
          dataCobranca: paymentMethod === 'FIADO' && dataCobranca ? dataCobranca : undefined,
          itens: cart.map(item => ({
            produtoId: item.produtoId.startsWith('avulso-') ? undefined : item.produtoId,
            produto: item.nome,
            unidade: item.unidade,
            quantidade: item.quantidade,
            valorUnit: item.valorUnit,
            desconto: item.desconto,
            total: item.total,
          })),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao registrar venda')
      }
      const saved = await res.json()
      setLastPedidoId(saved.id)
      setVendasPdv(prev => [{
        id: saved.id, numero: saved.numero, tipo: saved.tipo, data: saved.data,
        clienteId: saved.clienteId, formaPagamento: saved.formaPagamento, status: saved.status,
        totalValor: saved.totalValor, cliente: saved.cliente ? { nome: saved.cliente.nome } : null,
      }, ...prev])
      toast.success('Venda registrada!', `Total: ${formatCurrency(total)}`)

      // Baixa o estoque na tela imediatamente, sem esperar reload da página.
      // Produtos com estoqueVinculadoId compartilham o mesmo saldo (ex: "Morango Graudo" usa o estoque do "Morango"),
      // então a baixa precisa refletir em todos os produtos que apontam para a mesma base.
      setProdutosLocal(prev => {
        const baixaPorBase = new Map<string, number>()
        for (const item of cart) {
          if (item.produtoId.startsWith('avulso-')) continue
          const vendido = prev.find(p => p.id === item.produtoId)
          if (!vendido) continue
          const baseId = vendido.estoqueVinculadoId ?? vendido.id
          baixaPorBase.set(baseId, (baixaPorBase.get(baseId) ?? 0) + item.quantidade)
        }
        if (baixaPorBase.size === 0) return prev
        return prev.map(p => {
          const baseId = p.estoqueVinculadoId ?? p.id
          const baixa = baixaPorBase.get(baseId)
          return baixa ? { ...p, estoque: p.estoque - baixa } : p
        })
      })

      clearCart()
      setModalOpen(false)
      setClienteId('')
      setClienteSearch('')
      setClienteError(false)
      setCashReceived('')
      setDataCobranca('')
      setPaymentMethod('DINHEIRO')
      setPedidoData(new Date().toISOString().slice(0, 10))
    } catch (e: unknown) {
      toast.error('Erro ao finalizar', e instanceof Error ? e.message : 'Tente novamente')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* ═══════ BARRA DE BUSCA ═══════ */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', background: 'white', position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14, pointerEvents: 'none' }}
          />
          <input
            ref={searchRef}
            value={q}
            onChange={e => { setQ(e.target.value); setSearchOpen(true) }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
            placeholder="Buscar produto pelo nome e clique para adicionar..."
            style={{ ...inp, paddingLeft: 36, fontSize: 14 }}
          />
        </div>
        {/* Dropdown de resultados */}
        {searchOpen && q.length >= 1 && (
          <div style={{
            position: 'absolute', top: '100%', left: 16, right: 16, zIndex: 200,
            background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 10,
            boxShadow: '0 6px 24px rgba(0,0,0,0.12)', maxHeight: 280, overflowY: 'auto',
          }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '14px 16px', fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>Nenhum produto encontrado</div>
            ) : filtered.map(p => {
              const price = p.precoPromocional > 0 ? p.precoPromocional : p.precoPdv > 0 ? p.precoPdv : p.precoVenda
              return (
                <div
                  key={p.id}
                  onMouseDown={() => { addToCart(p); setQ(''); setSearchOpen(false) }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#f9fafb'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'white'}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{p.nome.toUpperCase()}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.unidade} · {p.estoque > 0 ? `Estoque: ${p.estoque}` : 'Estoque não registrado'}</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: GREEN, whiteSpace: 'nowrap', marginLeft: 12 }}>{formatCurrency(price)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ═══════ CARRINHO (ocupa o resto) ═══════ */}
      <div className="pdv-carrinho" style={{ flex: 1, minHeight: 0 }}>

        {/* Cabeçalho do carrinho */}
        <div style={{ padding: '16px 16px 10px', borderBottom: '1px solid #f3f4f6', background: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FontAwesomeIcon icon={faReceipt} style={{ fontSize: 16, color: NAVY }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>Carrinho</span>
              {cart.length > 0 && (
                <span style={{
                  background: NAVY, color: 'white', fontSize: 11, fontWeight: 700,
                  borderRadius: 10, padding: '1px 7px',
                }}>
                  {cart.reduce((s, it) => s + it.quantidade, 0)}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setShowHistorico(true)}
                title="Reimprimir vendas anteriores"
                style={{
                  background: 'none', border: '1px solid #e5e7eb', borderRadius: 7,
                  color: NAVY, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  padding: '3px 10px', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <FontAwesomeIcon icon={faClockRotateLeft} style={{ fontSize: 12 }} />
                Histórico
              </button>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  style={{
                    background: 'none', border: `1px solid ${PINK}`, borderRadius: 7,
                    color: PINK, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    padding: '3px 10px', fontFamily: 'inherit',
                  }}
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Itens do carrinho */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', scrollbarWidth: 'thin' }}>
          {cart.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, color: '#d1d5db' }}>
              <FontAwesomeIcon icon={faReceipt} style={{ fontSize: 36, marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>Carrinho vazio</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#d1d5db' }}>Clique nos produtos para adicionar</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cart.map(item => (
                <div
                  key={item.itemId}
                  style={{
                    background: 'white', borderRadius: 10, padding: '10px 12px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #f3f4f6',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    {editingNomeId === item.itemId ? (
                      <input
                        autoFocus
                        value={editingNomeVal}
                        onChange={e => setEditingNomeVal(e.target.value)}
                        onBlur={() => updateNome(item.itemId, editingNomeVal || item.nome)}
                        onKeyDown={e => { if (e.key === 'Enter') updateNome(item.itemId, editingNomeVal || item.nome); if (e.key === 'Escape') setEditingNomeId(null) }}
                        style={{ fontSize: 12, fontWeight: 700, color: NAVY, flex: 1, marginRight: 8, border: '1px solid #3b82f6', borderRadius: 5, padding: '2px 6px', outline: 'none', fontFamily: 'inherit' }}
                      />
                    ) : (
                      <span
                        title="Clique para editar o nome"
                        onClick={() => { setEditingNomeId(item.itemId); setEditingNomeVal(item.nome) }}
                        style={{ fontSize: 12, fontWeight: 700, color: NAVY, flex: 1, marginRight: 8, lineHeight: 1.3, cursor: 'text', borderBottom: '1px dashed #d1d5db' }}>
                        {item.nome}
                      </span>
                    )}
                    <button
                      onClick={() => removeFromCart(item.itemId)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: 0, display: 'flex', flexShrink: 0 }}
                    >
                      <FontAwesomeIcon icon={faXmark} style={{ fontSize: 13 }} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    {/* Quantidade manual */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>Qtde</span>
                      <input
                        type="number"
                        min="0"
                        value={item.quantidade === 0 ? '' : item.quantidade}
                        onChange={e => updateQty(item.itemId, parseInt(e.target.value) || 0)}
                        style={{
                          width: 54, textAlign: 'center', padding: '4px 6px',
                          border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 13,
                          fontWeight: 700, color: NAVY, fontFamily: 'inherit', outline: 'none',
                        }}
                      />
                    </div>
                    {/* Preço editável */}
                    <div style={{ textAlign: 'right' }}>
                      {editingPriceId === item.itemId ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: 11, color: '#9ca3af' }}>R$</span>
                          <input
                            autoFocus
                            type="number"
                            step="0.01"
                            min="0"
                            value={editingPriceVal}
                            onChange={e => setEditingPriceVal(e.target.value)}
                            onBlur={() => saveCartPrice(item.itemId)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveCartPrice(item.itemId)
                              if (e.key === 'Escape') setEditingPriceId(null)
                            }}
                            style={{
                              width: 64, padding: '2px 5px', border: `1.5px solid ${BLUE}`,
                              borderRadius: 6, fontSize: 12, fontWeight: 700, color: NAVY,
                              fontFamily: 'inherit', outline: 'none', textAlign: 'right',
                            }}
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingPriceId(item.itemId); setEditingPriceVal(String(item.valorUnit)) }}
                          title="Clique para editar o preço"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}
                        >
                          <span style={{ fontSize: 11, color: '#9ca3af' }}>{formatCurrency(item.valorUnit)} / un</span>
                          <FontAwesomeIcon icon={faPencil} style={{ fontSize: 9, color: BLUE }} />
                        </button>
                      )}
                      <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{formatCurrency(item.total)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumo + ações */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid #f3f4f6', background: 'white', display: 'flex', flexDirection: 'column', gap: 8 }}>

          <button onClick={() => setShowAvulso(true)} style={{ width: '100%', padding: '7px', background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: 8, color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            + Produto avulso
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280' }}>
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#6b7280', flexShrink: 0 }}>Desconto (R$)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={globalDiscount}
              onChange={e => setGlobalDiscount(e.target.value)}
              placeholder="0,00"
              style={{ ...inp, width: 90, padding: '5px 8px', textAlign: 'right' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 700, color: NAVY, paddingTop: 6, borderTop: '1px solid #f3f4f6' }}>
            <span>Total</span>
            <span style={{ color: GREEN }}>{formatCurrency(total)}</span>
          </div>

          {lastPedidoId && (
            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>✅ Venda registrada!</div>
                <div style={{ fontSize: 11, color: '#15803d', marginTop: 2 }}>Clique para imprimir o formulário</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button
                  onClick={() => { window.open(`/imprimir/venda-pdv/${lastPedidoId}`, '_blank'); setLastPedidoId(null) }}
                  style={{ padding: '7px 12px', background: '#166534', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  📄 Abrir Formulário
                </button>
                <button
                  onClick={() => setLastPedidoId(null)}
                  style={{ padding: '5px 12px', background: 'none', color: '#166534', border: '1px solid #86efac', borderRadius: 7, fontSize: 11, cursor: 'pointer' }}>
                  Ignorar
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => { if (cart.length > 0) { setLastPedidoId(null); setModalOpen(true) } }}
            disabled={cart.length === 0}
            style={{
              padding: '13px', background: cart.length === 0 ? '#d1d5db' : GREEN,
              color: 'white', border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 700, cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <FontAwesomeIcon icon={faReceipt} style={{ fontSize: 15 }} />
            Finalizar Venda
          </button>
        </div>
      </div>

      {/* ═══════ MODAL PRODUTO AVULSO ═══════ */}
      {showAvulso && (
        <>
          <div onClick={() => setShowAvulso(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1001, width: '100%', maxWidth: 380, padding: '0 16px' }}>
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>Produto avulso</span>
                <button onClick={() => setShowAvulso(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18 }}>✕</button>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Nome do produto *</label>
                  <input autoFocus placeholder="Ex: Tomate cereja" value={avulsoNome} onChange={e => setAvulsoNome(e.target.value)}
                    style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Preço (R$)</label>
                    <input placeholder="0,00" value={avulsoPreco} onChange={e => setAvulsoPreco(e.target.value)} type="number" min="0" step="0.01"
                      style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Qtd</label>
                    <input placeholder="1" value={avulsoQtd} onChange={e => setAvulsoQtd(e.target.value)} type="number" min="1"
                      style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Unidade</label>
                  <select value={avulsoUnidade} onChange={e => setAvulsoUnidade(e.target.value)}
                    style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#fff' }}>
                    {['UNIDADE','CAIXA','KG','LITRO','DUZIA','SACO'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ padding: '12px 20px 16px', display: 'flex', gap: 10 }}>
                <button onClick={() => setShowAvulso(false)} style={{ flex: 1, padding: '10px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancelar
                </button>
                <button onClick={addAvulso} disabled={!avulsoNome.trim()} style={{ flex: 2, padding: '10px', background: !avulsoNome.trim() ? '#d1d5db' : BLUE, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: !avulsoNome.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  Adicionar ao carrinho
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════ MODAL DE PAGAMENTO ═══════ */}
      {modalOpen && (
        <>
          <div
            onClick={closeModal}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000 }}
          />

          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            zIndex: 1001, width: '100%', maxWidth: 460, padding: '0 12px',
            maxHeight: '92vh', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              background: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '92vh',
            }}>
              {/* Cabeçalho do modal */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: `${GREEN}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FontAwesomeIcon icon={faReceipt} style={{ fontSize: 16, color: GREEN }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: 0 }}>Finalizar Venda</h2>
                    <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Confirme o cliente e a forma de pagamento</p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#6b7280', display: 'flex' }}
                >
                  <FontAwesomeIcon icon={faXmark} style={{ fontSize: 14 }} />
                </button>
              </div>

              {/* Corpo do modal */}
              <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1 }}>

                {/* Cliente (obrigatório) — autocomplete */}
                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: NAVY, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Cliente <span style={{ color: PINK }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <FontAwesomeIcon
                      icon={faMagnifyingGlass}
                      style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 12, pointerEvents: 'none' }}
                    />
                    <input
                      autoComplete="off"
                      value={clienteSearch}
                      onChange={e => {
                        setClienteSearch(e.target.value)
                        setClienteId('')
                        setClienteDropdown(true)
                      }}
                      onFocus={() => setClienteDropdown(true)}
                      onBlur={() => setTimeout(() => setClienteDropdown(false), 150)}
                      placeholder="Digite o nome do cliente..."
                      style={{ ...inp, paddingLeft: 30, fontSize: 13, borderColor: clienteError ? PINK : clienteId ? GREEN : '#e5e7eb' }}
                    />
                    {clienteId && (
                      <button
                        onClick={() => { setClienteId(''); setClienteSearch(''); setClienteDropdown(false) }}
                        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2 }}
                      >
                        <FontAwesomeIcon icon={faXmark} style={{ fontSize: 12 }} />
                      </button>
                    )}
                  </div>
                  {clienteDropdown && clienteSearch.length >= 1 && clienteSearch.length < 2 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                      Digite mais uma letra para buscar...
                    </div>
                  )}
                  {clienteDropdown && clientesFiltrados.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                      background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 8,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: 200, overflowY: 'auto',
                      marginTop: 2,
                    }}>
                      {clientesFiltrados.map(c => (
                        <div
                          key={c.id}
                          onMouseDown={() => {
                            setClienteId(c.id)
                            setClienteSearch(c.nome)
                            setClienteDropdown(false)
                            setClienteError(false)
                          }}
                          style={{
                            padding: '10px 14px', fontSize: 13, cursor: 'pointer', color: NAVY,
                            borderBottom: '1px solid #f3f4f6', fontWeight: clienteId === c.id ? 700 : 400,
                            background: clienteId === c.id ? '#eff6ff' : 'white',
                          }}
                          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#f9fafb'}
                          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = clienteId === c.id ? '#eff6ff' : 'white'}
                        >
                          {c.nome}
                        </div>
                      ))}
                    </div>
                  )}
                  {clienteError && (
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: PINK }}>Selecione um cliente para continuar.</p>
                  )}
                </div>

                {/* Aviso saldo Carteira */}
                {saldoCarteira > 0 && (
                  <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>⚠️</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: ORANGE }}>Cliente com saldo em aberto na Carteira</div>
                      <div style={{ fontSize: 12, color: '#92400e', marginTop: 2 }}>
                        Pendente: <strong>{formatCurrency(saldoCarteira)}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Resumo do pedido */}
                <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                    <span>{cart.reduce((s, it) => s + it.quantidade, 0)} item(s)</span>
                    <span>Subtotal: {formatCurrency(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: PINK }}>
                      <span>Desconto</span>
                      <span>- {formatCurrency(discount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: NAVY, paddingTop: 8, borderTop: '1px solid #e5e7eb', marginTop: 6 }}>
                    <span>Total</span>
                    <span style={{ color: GREEN }}>{formatCurrency(total)}</span>
                  </div>
                </div>

                {/* Data da venda */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: NAVY, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Data da Venda
                  </label>
                  <input
                    type="date"
                    value={pedidoData}
                    onChange={e => setPedidoData(e.target.value)}
                    style={inp}
                  />
                </div>

                {/* Forma de Pagamento */}
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: NAVY, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Forma de Pagamento
                  </p>
                  <div className="grid-2" style={{ gap: 8 }}>
                    {PAYMENT_METHODS.map(pm => (
                      <button
                        key={pm.key}
                        onClick={() => setPaymentMethod(pm.key)}
                        style={{
                          padding: '10px 12px',
                          border: `2px solid ${paymentMethod === pm.key ? BLUE : '#e5e7eb'}`,
                          borderRadius: 10,
                          background: paymentMethod === pm.key ? '#eff6ff' : 'white',
                          color: paymentMethod === pm.key ? BLUE : '#374151',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          transition: 'all 0.15s',
                        }}
                      >
                        <FontAwesomeIcon icon={pm.icon} style={{ fontSize: 13 }} />
                        {pm.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Valor recebido (somente DINHEIRO) */}
                {paymentMethod === 'DINHEIRO' && (
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: NAVY, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Valor Recebido (R$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cashReceived}
                      onChange={e => setCashReceived(e.target.value)}
                      placeholder={formatCurrency(total).replace('R$ ', '')}
                      style={inp}
                    />
                    {cashRec >= total && cashRec > 0 && (
                      <div style={{
                        marginTop: 8, padding: '8px 12px', background: `${GREEN}15`,
                        borderRadius: 8, display: 'flex', justifyContent: 'space-between',
                        fontSize: 13, fontWeight: 700, color: GREEN,
                      }}>
                        <span>Troco</span>
                        <span>{formatCurrency(troco)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Data de cobrança (somente FIADO) */}
                {paymentMethod === 'FIADO' && (
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: NAVY, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Data de Cobrança
                    </label>
                    <input
                      type="date"
                      value={dataCobranca}
                      onChange={e => setDataCobranca(e.target.value)}
                      style={inp}
                    />
                  </div>
                )}
              </div>

              {/* Rodapé do modal */}
              <div style={{ padding: '14px 22px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 10 }}>
                <button
                  onClick={closeModal}
                  disabled={submitting}
                  style={{
                    flex: 1, padding: '11px', border: '1.5px solid #e5e7eb', borderRadius: 10,
                    background: 'white', fontSize: 13, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer',
                    color: '#374151', fontFamily: 'inherit',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleFinalize}
                  disabled={submitting}
                  style={{
                    flex: 2, padding: '11px', border: 'none', borderRadius: 10,
                    background: submitting ? '#d1d5db' : GREEN, color: 'white',
                    fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {submitting ? (
                    <>
                      <span className="animate-spin" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: 14 }} />
                      Confirmar Venda
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════ HISTÓRICO DE VENDAS (reimpressão) ═══════ */}
      {showHistorico && (
        <>
          <div onClick={() => { setShowHistorico(false); setHistoricoSearch('') }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100 }} />
          <div style={{ position: 'fixed', inset: 0, zIndex: 1101, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: 'white', borderRadius: 14, width: '100%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${NAVY}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FontAwesomeIcon icon={faClockRotateLeft} style={{ fontSize: 14, color: NAVY }} />
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>Histórico de vendas</span>
                </div>
                <button
                  onClick={() => { setShowHistorico(false); setHistoricoSearch('') }}
                  style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#6b7280', display: 'flex' }}
                >
                  <FontAwesomeIcon icon={faXmark} style={{ fontSize: 14 }} />
                </button>
              </div>
              <div style={{ padding: '12px 20px 0' }}>
                <div style={{ position: 'relative' }}>
                  <FontAwesomeIcon
                    icon={faMagnifyingGlass}
                    style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 12, pointerEvents: 'none' }}
                  />
                  <input
                    value={historicoSearch}
                    onChange={e => setHistoricoSearch(e.target.value)}
                    placeholder="Buscar pelo nome do cliente..."
                    style={{ ...inp, paddingLeft: 30, fontSize: 13 }}
                  />
                </div>
              </div>
              <div style={{ overflowY: 'auto', flex: 1, padding: '10px 12px' }}>
                {vendasPdvFiltradas.length === 0 ? (
                  <div style={{ padding: '30px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                    {vendasPdv.length === 0 ? 'Nenhuma venda registrada ainda.' : 'Nenhuma venda encontrada para esse cliente.'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {vendasPdvFiltradas.map(v => (
                      <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f9fafb', borderRadius: 10 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>#{v.numero} · {v.cliente?.nome ?? 'Cliente avulso'}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                            {new Date(v.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} · {formatCurrency(v.totalValor)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          {v.clienteId && (
                            <button
                              onClick={() => window.open(`/imprimir/relatorio-cliente/${v.clienteId}`, '_blank')}
                              title="Relatório do cliente"
                              style={{ background: `${NAVY}15`, color: NAVY, border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                              <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 12 }} />
                              Relatório
                            </button>
                          )}
                          <button
                            onClick={() => window.open(`/imprimir/venda-pdv/${v.id}`, '_blank')}
                            title="Reimprimir comprovante"
                            style={{ background: NAVY, color: 'white', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                          >
                            <FontAwesomeIcon icon={faPrint} style={{ fontSize: 12 }} />
                            Imprimir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
