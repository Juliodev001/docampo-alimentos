'use client'
import { useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faMagnifyingGlass, faShoppingCart, faTrash, faPlus, faMinus,
  faXmark, faCheckCircle, faMoneyBill, faCreditCard, faQrcode,
  faHandshake, faReceipt, faBoxOpen,
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
  const [cashReceived, setCashReceived] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const searchRef = useRef<HTMLInputElement>(null)

  /* Focus search on mount */
  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  /* Derived categories */
  const categories = Array.from(
    new Set(produtos.filter(p => p.ativo && p.categoria).map(p => p.categoria as string))
  ).sort()

  /* Filtered products */
  const filtered = produtos.filter(p => {
    if (!p.ativo) return false
    const matchQ = !q || p.nome.toLowerCase().includes(q.toLowerCase())
    const matchCat = !activeCategory || p.categoria === activeCategory
    return matchQ && matchCat
  })

  /* Cart calculations */
  const subtotal = cart.reduce((s, it) => s + it.total, 0)
  const discount = parseFloat(globalDiscount) || 0
  const total = Math.max(0, subtotal - discount)
  const cashRec = parseFloat(cashReceived) || 0
  const troco = cashRec > total ? cashRec - total : 0

  /* Add to cart */
  function addToCart(produto: Produto) {
    const price = produto.precoPromocional > 0 ? produto.precoPromocional : produto.precoVenda
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
    if (qty <= 0) {
      removeFromCart(produtoId)
      return
    }
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

  async function handleFinalize() {
    if (cart.length === 0) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'PDV',
          clienteId: clienteId || null,
          data: new Date().toISOString(),
          formaPagamento: paymentMethod,
          itens: cart.map(item => ({
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
      toast.success('Venda registrada!', `Total: ${formatCurrency(total)}`)
      clearCart()
      setModalOpen(false)
      setClienteId('')
      setCashReceived('')
      setPaymentMethod('DINHEIRO')
    } catch (e: unknown) {
      toast.error('Erro ao finalizar', e instanceof Error ? e.message : 'Tente novamente')
    } finally {
      setSubmitting(false)
    }
  }

  /* ──────────────────────────────────── RENDER ──────────────────────────────────── */
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 140px)', minHeight: 540, overflow: 'hidden' }}>

      {/* ═══════ LEFT COLUMN — products ═══════ */}
      <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', borderRight: '1px solid #f3f4f6', overflow: 'hidden' }}>

        {/* Search */}
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

        {/* Category tabs */}
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

        {/* Product grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 16px', scrollbarWidth: 'thin' }}>
          {filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: '#9ca3af' }}>
              <FontAwesomeIcon icon={faBoxOpen} style={{ fontSize: 40, opacity: 0.3, marginBottom: 10 }} />
              <p style={{ margin: 0, fontWeight: 600 }}>Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="grid-3" style={{ gap: 10 }}>
              {filtered.map(p => {
                const price = p.precoPromocional > 0 ? p.precoPromocional : p.precoVenda
                const lowStock = p.estoque === 0
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    style={{
                      background: 'white',
                      border: '1.5px solid #e5e7eb',
                      borderRadius: 12,
                      padding: '12px 10px',
                      cursor: 'pointer',
                      opacity: 1,
                      textAlign: 'left',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                      transition: 'box-shadow 0.15s, border-color 0.15s',
                      fontFamily: 'inherit',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = BLUE
                      ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 10px rgba(59,130,246,0.15)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb'
                      ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.07)'
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: NAVY, lineHeight: 1.3 }}>
                      {p.nome.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: GREEN }}>
                      {formatCurrency(price)}
                    </span>
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
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══════ RIGHT COLUMN — cart ═══════ */}
      <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#fafafa' }}>

        {/* Cart header */}
        <div style={{ padding: '16px 16px 10px', borderBottom: '1px solid #f3f4f6', background: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FontAwesomeIcon icon={faShoppingCart} style={{ fontSize: 16, color: NAVY }} />
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

        {/* Cart items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', scrollbarWidth: 'thin' }}>
          {cart.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, color: '#d1d5db' }}>
              <FontAwesomeIcon icon={faShoppingCart} style={{ fontSize: 36, marginBottom: 8 }} />
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
                    {/* Qty controls */}
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

        {/* Summary + actions */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid #f3f4f6', background: 'white', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Subtotal */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280' }}>
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>

          {/* Discount */}
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

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 700, color: NAVY, paddingTop: 6, borderTop: '1px solid #f3f4f6' }}>
            <span>Total</span>
            <span style={{ color: GREEN }}>{formatCurrency(total)}</span>
          </div>

          {/* Buttons */}
          <button
            onClick={() => { if (cart.length > 0) setModalOpen(true) }}
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

      {/* ═══════ PAYMENT MODAL ═══════ */}
      {modalOpen && (
        <>
          {/* Overlay */}
          <div
            onClick={() => !submitting && setModalOpen(false)}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000 }}
          />

          {/* Modal */}
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            zIndex: 1001, width: '100%', maxWidth: 460, padding: '0 12px',
          }}>
            <div style={{
              background: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}>
              {/* Modal header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: `${GREEN}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FontAwesomeIcon icon={faReceipt} style={{ fontSize: 16, color: GREEN }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: 0 }}>Finalizar Venda</h2>
                    <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Confirme a forma de pagamento</p>
                  </div>
                </div>
                <button
                  onClick={() => !submitting && setModalOpen(false)}
                  style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#6b7280', display: 'flex' }}
                >
                  <FontAwesomeIcon icon={faXmark} style={{ fontSize: 14 }} />
                </button>
              </div>

              {/* Modal body */}
              <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Order summary */}
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

                {/* Payment method */}
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

                {/* Cash received (only if DINHEIRO) */}
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
                      placeholder={formatCurrency(total).replace('R$ ', '')}
                      style={inp}
                      autoFocus
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

                {/* Client select (optional) */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: NAVY, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Cliente <span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af', textTransform: 'none' }}>(opcional)</span>
                  </label>
                  <select
                    value={clienteId}
                    onChange={e => setClienteId(e.target.value)}
                    style={inp}
                  >
                    <option value="">Sem cliente / Consumidor final</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Modal footer */}
              <div style={{ padding: '14px 22px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 10 }}>
                <button
                  onClick={() => !submitting && setModalOpen(false)}
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
