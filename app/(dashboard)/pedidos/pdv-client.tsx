'use client'
import { useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faMagnifyingGlass, faShoppingCart, faPlus, faMinus,
  faXmark, faCheckCircle, faMoneyBill, faCreditCard, faQrcode,
  faHandshake, faReceipt, faBoxOpen, faPencil, faCheck,
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
}

type Cliente = { id: string; nome: string }

type CartItem = {
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
  { key: 'FIADO',          label: 'Fiado',           icon: faHandshake },
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

export default function PdvClient({ produtos, clientes }: { produtos: Produto[]; clientes: Cliente[] }) {
  const toast = useToast()

  const [q, setQ] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [globalDiscount, setGlobalDiscount] = useState('')

  /* modal */
  const [modalOpen, setModalOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('DINHEIRO')
  const [clienteId, setClienteId] = useState('')
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteError, setClienteError] = useState(false)
  const [cashReceived, setCashReceived] = useState('')
  const [dataCobranca, setDataCobranca] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastPedidoId, setLastPedidoId] = useState<string | null>(null)

  /* edição de preço inline no card */
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null)
  const [editingPriceVal, setEditingPriceVal] = useState('')
  const [produtosLocal, setProdutosLocal] = useState(produtos)

  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  async function savePrice(id: string) {
    const novo = parseFloat(editingPriceVal)
    if (isNaN(novo) || novo < 0) { setEditingPriceId(null); return }
    await fetch(`/api/produtos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ precoPdv: novo }),
    })
    setProdutosLocal(prev => prev.map(p => p.id === id ? { ...p, precoPdv: novo } : p))
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

  const clientesFiltrados = clientes.filter(c =>
    !clienteSearch || c.nome.toLowerCase().includes(clienteSearch.toLowerCase())
  )

  function addToCart(produto: Produto) {
    const price = produto.precoPromocional > 0 ? produto.precoPromocional : produto.precoPdv > 0 ? produto.precoPdv : produto.precoVenda
    setCart(prev => {
      const existing = prev.find(it => it.produtoId === produto.id)
      if (existing) {
        return prev.map(it =>
          it.produtoId === produto.id
            ? { ...it, quantidade: it.quantidade + 1, total: (it.quantidade + 1) * it.valorUnit - it.desconto }
            : it
        )
      }
      return [...prev, {
        produtoId: produto.id,
        nome: produto.nome,
        unidade: produto.unidade,
        quantidade: 1,
        valorUnit: price,
        desconto: 0,
        total: price,
      }]
    })
  }

  function updateQty(produtoId: string, qty: number) {
    if (qty <= 0) { removeFromCart(produtoId); return }
    setCart(prev => prev.map(it =>
      it.produtoId === produtoId
        ? { ...it, quantidade: qty, total: qty * it.valorUnit - it.desconto }
        : it
    ))
  }

  function removeFromCart(produtoId: string) {
    setCart(prev => prev.filter(it => it.produtoId !== produtoId))
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
          data: new Date().toISOString(),
          formaPagamento: paymentMethod,
          dataCobranca: paymentMethod === 'FIADO' && dataCobranca ? dataCobranca : undefined,
          itens: cart.map(item => ({
            produtoId: item.produtoId,
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
      toast.success('Venda registrada!', `Total: ${formatCurrency(total)}`)
      clearCart()
      setModalOpen(false)
      setClienteId('')
      setClienteSearch('')
      setClienteError(false)
      setCashReceived('')
      setDataCobranca('')
      setPaymentMethod('DINHEIRO')
    } catch (e: unknown) {
      toast.error('Erro ao finalizar', e instanceof Error ? e.message : 'Tente novamente')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="pdv-layout">

      {/* ═══════ COLUNA ESQUERDA — produtos ═══════ */}
      <div className="pdv-produtos">

        {/* Busca */}
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ position: 'relative' }}>
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14, pointerEvents: 'none' }}
            />
            <input
              ref={searchRef}
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar produto..."
              style={{ ...inp, paddingLeft: 36, fontSize: 14 }}
            />
          </div>
        </div>

        {/* Abas de categoria */}
        <div style={{ display: 'flex', gap: 6, padding: '10px 16px', overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
          <button
            onClick={() => setActiveCategory(null)}
            style={{
              padding: '5px 14px', borderRadius: 20, border: 'none',
              background: !activeCategory ? NAVY : '#f3f4f6',
              color: !activeCategory ? 'white' : '#374151',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              style={{
                padding: '5px 14px', borderRadius: 20, border: 'none',
                background: activeCategory === cat ? NAVY : '#f3f4f6',
                color: activeCategory === cat ? 'white' : '#374151',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grade de produtos */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 16px', scrollbarWidth: 'thin' }}>
          {filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: '#9ca3af' }}>
              <FontAwesomeIcon icon={faBoxOpen} style={{ fontSize: 40, opacity: 0.3, marginBottom: 10 }} />
              <p style={{ margin: 0, fontWeight: 600 }}>Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="grid-3" style={{ gap: 10 }}>
              {filtered.map(p => {
                const price = p.precoPromocional > 0 ? p.precoPromocional : p.precoPdv > 0 ? p.precoPdv : p.precoVenda
                const lowStock = p.estoque === 0
                const editingThis = editingPriceId === p.id
                return (
                  <div
                    key={p.id}
                    onClick={() => { if (!editingThis) addToCart(p) }}
                    onMouseEnter={e => {
                      if (!editingThis) {
                        (e.currentTarget as HTMLDivElement).style.borderColor = BLUE
                        ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 10px rgba(59,130,246,0.15)'
                      }
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#e5e7eb'
                      ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.07)'
                    }}
                    style={{
                      background: 'white',
                      border: '1.5px solid #e5e7eb',
                      borderRadius: 12,
                      padding: '12px 10px',
                      cursor: editingThis ? 'default' : 'pointer',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                      transition: 'box-shadow 0.15s, border-color 0.15s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: NAVY, lineHeight: 1.3 }}>
                      {p.nome.toUpperCase()}
                    </span>

                    {/* Preço com edição inline */}
                    {editingThis ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>R$</span>
                        <input
                          autoFocus
                          type="number"
                          step="0.01"
                          min="0"
                          value={editingPriceVal}
                          onChange={e => setEditingPriceVal(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') savePrice(p.id)
                            if (e.key === 'Escape') setEditingPriceId(null)
                          }}
                          style={{
                            width: 60, padding: '2px 4px', border: `1.5px solid ${BLUE}`,
                            borderRadius: 5, fontSize: 12, fontWeight: 700, color: NAVY,
                            fontFamily: 'inherit', outline: 'none',
                          }}
                        />
                        <button
                          onClick={e => { e.stopPropagation(); savePrice(p.id) }}
                          style={{ background: GREEN, border: 'none', borderRadius: 5, padding: '2px 5px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          <FontAwesomeIcon icon={faCheck} style={{ fontSize: 10, color: 'white' }} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: GREEN }}>
                          {formatCurrency(price)}
                        </span>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            setEditingPriceId(p.id)
                            setEditingPriceVal(String(p.precoPdv > 0 ? p.precoPdv : price))
                          }}
                          title="Editar preço PDV"
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '1px 3px', color: '#d1d5db', display: 'flex', alignItems: 'center',
                          }}
                        >
                          <FontAwesomeIcon icon={faPencil} style={{ fontSize: 9 }} />
                        </button>
                      </div>
                    )}

                    <span style={{ fontSize: 11, color: '#9ca3af' }}>{p.unidade}</span>
                    <span style={{
                      display: 'inline-block',
                      marginTop: 2,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 10,
                      background: lowStock ? '#f3f4f6' : p.estoque < 10 ? `${ORANGE}20` : `${GREEN}20`,
                      color: lowStock ? '#9ca3af' : p.estoque < 10 ? ORANGE : GREEN,
                    }}>
                      {lowStock ? 'Estoque não registrado' : `Estoque: ${p.estoque}`}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══════ COLUNA DIREITA — carrinho ═══════ */}
      <div className="pdv-carrinho">

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
                  key={item.produtoId}
                  style={{
                    background: 'white', borderRadius: 10, padding: '10px 12px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #f3f4f6',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: NAVY, flex: 1, marginRight: 8, lineHeight: 1.3 }}>
                      {item.nome}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.produtoId)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: 0, display: 'flex', flexShrink: 0 }}
                    >
                      <FontAwesomeIcon icon={faXmark} style={{ fontSize: 13 }} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        onClick={() => updateQty(item.produtoId, item.quantidade - 1)}
                        style={{
                          width: 24, height: 24, borderRadius: 6, border: '1px solid #e5e7eb',
                          background: 'white', cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', color: NAVY,
                        }}
                      >
                        <FontAwesomeIcon icon={faMinus} style={{ fontSize: 10 }} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantidade}
                        onChange={e => updateQty(item.produtoId, parseInt(e.target.value) || 1)}
                        style={{
                          width: 44, textAlign: 'center', padding: '2px 4px',
                          border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13,
                          fontWeight: 600, color: NAVY, fontFamily: 'inherit', outline: 'none',
                        }}
                      />
                      <button
                        onClick={() => updateQty(item.produtoId, item.quantidade + 1)}
                        style={{
                          width: 24, height: 24, borderRadius: 6, border: '1px solid #e5e7eb',
                          background: 'white', cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', color: NAVY,
                        }}
                      >
                        <FontAwesomeIcon icon={faPlus} style={{ fontSize: 10 }} />
                      </button>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{formatCurrency(item.valorUnit)} / un</div>
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

                {/* Cliente (obrigatório) */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: NAVY, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Cliente <span style={{ color: PINK }}>*</span>
                  </label>
                  <div style={{ position: 'relative', marginBottom: 6 }}>
                    <FontAwesomeIcon
                      icon={faMagnifyingGlass}
                      style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 12, pointerEvents: 'none' }}
                    />
                    <input
                      value={clienteSearch}
                      onChange={e => setClienteSearch(e.target.value)}
                      placeholder="Buscar cliente pelo nome..."
                      style={{ ...inp, paddingLeft: 30, fontSize: 13 }}
                    />
                  </div>
                  <select
                    value={clienteId}
                    onChange={e => { setClienteId(e.target.value); if (e.target.value) setClienteError(false) }}
                    style={{ ...inp, borderColor: clienteError ? PINK : '#e5e7eb' }}
                  >
                    <option value="">Selecione um cliente...</option>
                    {clientesFiltrados.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                  {clienteError && (
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: PINK }}>Selecione um cliente para continuar.</p>
                  )}
                </div>

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
    </div>
  )
}
