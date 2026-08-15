'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCartShopping, faFileLines, faBox, faCircleXmark,
  faPlus, faXmark, faMagnifyingGlass, faTrash, faChevronDown,
  faSlidersH, faEye, faPencil, faArrowUp, faChevronDown as faChevDown,
  faCircleInfo, faUser, faMoneyBillWave, faDownload, faPrint,
} from '@fortawesome/free-solid-svg-icons'
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
type Endereco = { cep: string | null; logradouro: string | null; numero: string | null; complemento: string | null; bairro: string | null; cidade: string | null; estado: string | null; referencia: string | null } | null
type Parte = { id: string; nome: string; cnpjCpf: string | null; telefone: string | null; email: string | null; endereco: Endereco } | null
type Pedido = {
  id: string; numero: number; tipo: string; data: string
  status: string; totalValor: number; frete: number; outrasTaxas: number
  formaPagamento: string | null; dataCobranca: string | null; observacao: string | null
  obsInternas: string | null; obsCliente: string | null
  cliente: Parte
  fornecedor: Parte
  transportadora: { id: string; nome: string } | null
  itens: ItemPedido[]
}
type Cliente    = { id: string; nome: string }
type Fornecedor = { id: string; nome: string }
type Produto    = { id: string; nome: string; unidade: string }

const FORMAS_PAGAMENTO = ['Dinheiro', 'PIX', 'Boleto', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência', 'Cheque', 'Carteira']

const FORMA_LABEL: Record<string, string> = {
  DINHEIRO:       'Dinheiro',
  PIX:            'PIX',
  CARTAO_CREDITO: 'Cartão de Crédito',
  CARTAO_DEBITO:  'Cartão de Débito',
  FIADO:          'Carteira',
}
function fmtFormaPag(v: string | null) {
  if (!v) return '—'
  return FORMA_LABEL[v] ?? v
}

const statusCfg: Record<string, { label: string; bg: string; color: string }> = {
  ABERTO:     { label: 'Pendente',   bg: '#fef9c3', color: '#854d0e' },
  CONFIRMADO: { label: 'Confirmado', bg: '#dcfce7', color: '#166534' },
  ENTREGUE:   { label: 'Concluído',  bg: '#dbeafe', color: '#1e40af' },
  PAGO:       { label: 'Pago',       bg: '#dcfce7', color: '#166534' },
  CANCELADO:  { label: 'Cancelado',  bg: '#fee2e2', color: '#991b1b' },
}

function fmtPagamento(p: Pedido): { label: string; color: string } {
  if (p.status === 'PAGO') return { label: 'Pago', color: '#166534' }
  if (p.formaPagamento === 'FIADO') {
    if (!p.dataCobranca) return { label: 'A vencer', color: '#854d0e' }
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const venc = new Date(p.dataCobranca); venc.setHours(0, 0, 0, 0)
    return venc.getTime() < hoje.getTime()
      ? { label: `Vencido em ${formatDate(venc)}`, color: '#991b1b' }
      : { label: `A vencer em ${formatDate(venc)}`, color: '#854d0e' }
  }
  return { label: (statusCfg[p.status] ?? statusCfg.ABERTO).label, color: '#6b7280' }
}

const STATUS_OPTS = [
  { v: 'ABERTO', l: 'Pendente' },
  { v: 'CONFIRMADO', l: 'Confirmado' },
  { v: 'ENTREGUE', l: 'Concluído' },
  { v: 'PAGO', l: 'Pago' },
  { v: 'CANCELADO', l: 'Cancelado' },
]

const emptyItem: ItemPedido = { produto: '', unidade: 'CAIXA', quantidade: 0, valorUnit: 0, desconto: 0, total: 0 }

function fmtNumero(tipo: string, numero: number, data: string) {
  const ano = new Date(data).getFullYear()
  const pfx = tipo === 'VENDA' ? 'VEND' : tipo === 'PDV' ? 'PDV' : 'COMP'
  return `${pfx}-${ano}-${String(numero).padStart(5, '0')}`
}

const isVendaTipo = (p: Pedido) => p.tipo === 'VENDA' || p.tipo === 'PDV'
function abrirComprovanteVenda(p: Pedido) {
  window.open(`/imprimir/venda-pdv/${p.id}`, '_blank')
}

const v = (x: string | null | undefined) => x && x.trim() ? x : 'Não informado'

/* ── Gera o HTML do Relatório de Pedido e abre p/ imprimir/salvar PDF ── */
function gerarRelatorioHTML(p: Pedido) {
  const isVenda = p.tipo === 'VENDA' || p.tipo === 'PDV'
  const parte   = isVenda ? p.cliente : p.fornecedor
  const num     = fmtNumero(p.tipo, p.numero, p.data)
  const end     = parte?.endereco
  const tituloParte = isVenda ? 'CLIENTE' : 'FORNECEDOR'
  const tituloEnd   = isVenda ? 'ENDEREÇO DO CLIENTE' : 'ENDEREÇO DO FORNECEDOR'
  const stLabel = (statusCfg[p.status] ?? statusCfg.ABERTO).label
  const condicao = (p.outrasTaxas === 0 && p.frete === 0) ? 'À vista' : '—'

  const itensRows = p.itens.map(it => `
    <tr>
      <td>${it.produto}</td>
      <td style="text-align:center">${it.unidade}</td>
      <td style="text-align:center">${it.quantidade}</td>
      <td style="text-align:right">${formatCurrency(it.valorUnit)}</td>
      <td style="text-align:right">${formatCurrency(it.total)}</td>
    </tr>`).join('')

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
  <title>Relatório ${num}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #1f2937; background: #fff; padding: 24px; }
    .header { background: #1e3a5f; color: #fff; border-radius: 10px; padding: 28px 32px; display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .header .sub { font-size: 11px; letter-spacing: 1px; opacity: .8; }
    .header h1 { font-size: 28px; font-weight: 800; margin-top: 4px; }
    .header .badge { display: inline-block; margin-top: 10px; background: rgba(255,255,255,.18); border-radius: 6px; padding: 4px 14px; font-size: 12px; font-weight: 600; }
    .header .num { font-size: 24px; font-weight: 800; text-align: right; }
    .header .gen { font-size: 12px; opacity: .8; text-align: right; margin-top: 4px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .card { border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
    .card-h { background: #f8fafc; padding: 12px 18px; font-size: 12px; font-weight: 700; color: #1e3a5f; letter-spacing: .5px; border-bottom: 1px solid #eef2f7; }
    .card-b { padding: 16px 18px; }
    .field { margin-bottom: 14px; }
    .field:last-child { margin-bottom: 0; }
    .field .lbl { font-size: 11px; color: #9ca3af; margin-bottom: 2px; }
    .field .val { font-size: 14px; font-weight: 700; color: #1f2937; }
    .full { margin-bottom: 16px; }
    h3.sec { font-size: 15px; font-weight: 700; color: #1e3a5f; margin: 22px 0 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead tr { background: #1e3a5f; color: #fff; }
    th { padding: 10px 14px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }
    td { padding: 10px 14px; border-bottom: 1px solid #f0f2f5; }
    .totais { margin-top: 16px; margin-left: auto; width: 280px; }
    .totais .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
    .totais .tot { border-top: 2px solid #1e3a5f; margin-top: 6px; padding-top: 10px; font-size: 18px; font-weight: 800; color: #1e3a5f; }
    @media print { body { padding: 0; } .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; } thead tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style></head><body>
    <div class="header">
      <div>
        <div class="sub">SISTEMA ERP</div>
        <h1>Relatório de Pedido</h1>
        <span class="badge">${isVenda ? 'Venda' : 'Compra'}</span>
      </div>
      <div>
        <div class="num">${num}</div>
        <div class="gen">Gerado em ${formatDate(new Date())}</div>
      </div>
    </div>

    <div class="grid2">
      <div class="card">
        <div class="card-h">${tituloParte}</div>
        <div class="card-b">
          <div class="field"><div class="lbl">Nome</div><div class="val">${v(parte?.nome)}</div></div>
          <div class="field"><div class="lbl">CPF / CNPJ</div><div class="val">${v(parte?.cnpjCpf)}</div></div>
          <div class="field"><div class="lbl">Tipo do pedido</div><div class="val">${isVenda ? 'Venda' : 'Compra'}</div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-h">DETALHES DO PEDIDO</div>
        <div class="card-b">
          <div class="field"><div class="lbl">Data do pedido</div><div class="val">${formatDate(new Date(p.data))}</div></div>
          <div class="field"><div class="lbl">Situação</div><div class="val">${stLabel}</div></div>
          <div class="field"><div class="lbl">Forma de pagamento</div><div class="val">${fmtFormaPag(p.formaPagamento)}</div></div>
          <div class="field"><div class="lbl">Condição</div><div class="val">${condicao}</div></div>
        </div>
      </div>
    </div>

    <div class="card full">
      <div class="card-h">${tituloEnd}</div>
      <div class="card-b">
        <div class="grid2" style="margin-bottom:0">
          <div class="field"><div class="lbl">CEP</div><div class="val">${v(end?.cep)}</div></div>
          <div class="field"><div class="lbl">Cidade</div><div class="val">${v(end?.cidade)}</div></div>
          <div class="field"><div class="lbl">Logradouro</div><div class="val">${v(end?.logradouro)}</div></div>
          <div class="field"><div class="lbl">Estado (UF)</div><div class="val">${v(end?.estado)}</div></div>
          <div class="field"><div class="lbl">Número</div><div class="val">${v(end?.numero)}</div></div>
          <div class="field"><div class="lbl">Referência</div><div class="val">${v(end?.referencia)}</div></div>
          <div class="field"><div class="lbl">Complemento</div><div class="val">${v(end?.complemento)}</div></div>
          <div class="field"><div class="lbl">Bairro</div><div class="val">${v(end?.bairro)}</div></div>
          <div class="field"><div class="lbl">Telefone</div><div class="val">${v(parte?.telefone)}</div></div>
          <div class="field"><div class="lbl">E-mail</div><div class="val">${v(parte?.email)}</div></div>
        </div>
      </div>
    </div>

    <h3 class="sec">Itens do pedido</h3>
    <table>
      <thead><tr><th>Produto</th><th style="text-align:center">Unid.</th><th style="text-align:center">Qtd.</th><th style="text-align:right">V. unit.</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${itensRows || '<tr><td colspan="5" style="text-align:center;color:#9ca3af">Sem itens</td></tr>'}</tbody>
    </table>

    <div class="totais">
      <div class="row"><span>Subtotal</span><span>${formatCurrency(p.totalValor - p.frete - p.outrasTaxas)}</span></div>
      <div class="row"><span>Frete</span><span>${formatCurrency(p.frete)}</span></div>
      <div class="row"><span>Outras taxas</span><span>${formatCurrency(p.outrasTaxas)}</span></div>
      <div class="row tot"><span>Total</span><span>${formatCurrency(p.totalValor)}</span></div>
    </div>
  </body></html>`
}

function abrirRelatorio(p: Pedido, autoPrint: boolean) {
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) { alert('Permita pop-ups para gerar o relatório.'); return }
  win.document.write(gerarRelatorioHTML(p))
  win.document.close()
  if (autoPrint) {
    win.onload = () => { win.focus(); win.print() }
    setTimeout(() => { try { win.focus(); win.print() } catch {} }, 400)
  }
}

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

function ModalSection({ title, icon, children, collapsible, extra }: {
  title: string; icon: IconDefinition; children: React.ReactNode
  collapsible?: boolean; extra?: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'white', cursor: collapsible ? 'pointer' : 'default', borderBottom: open ? '1px solid #e5e7eb' : 'none' }}
        onClick={() => collapsible && setOpen(v => !v)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FontAwesomeIcon icon={icon} style={{ fontSize: 16, color: NAVY }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: NAVY }}>{title}</span>
          {collapsible && <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: 14, color: '#6b7280', transform: open ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />}
        </div>
        {extra && <div onClick={e => e.stopPropagation()}>{extra}</div>}
      </div>
      {open && <div style={{ padding: '18px 18px 16px', background: 'white' }}>{children}</div>}
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
  const router = useRouter()
  const [pedidos, setPedidos] = useState(inicial)
  useEffect(() => { setPedidos(inicial) }, [inicial])
  const [q, setQ]             = useState('')
  const [aba, setAba]         = useState<'todos' | 'vendas' | 'compras'>('todos')
  const [filtrosOpen, setFiltrosOpen] = useState(false)
  const [statusFiltro, setStatusFiltro] = useState('TODOS')
  const [modal, setModal]     = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [pedidoView, setPedidoView] = useState<Pedido | null>(null)
  const [editando, setEditando]     = useState(false)
  const [editItens, setEditItens]   = useState<ItemPedido[]>([])
  const [editFrete, setEditFrete]   = useState('0')
  const [editOutrasTaxas, setEditOutrasTaxas] = useState('0')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError]   = useState('')

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
      upd.total = Math.max(0, Number(upd.quantidade) * Number(upd.valorUnit) - Number(upd.desconto))
      return upd
    }))
  }

  const subtotal   = itens.reduce((s, it) => s + it.total, 0)
  const freteN     = parseFloat(frete) || 0
  const outrasTN   = parseFloat(outrasTaxas) || 0
  const totalFinal = subtotal + freteN + outrasTN

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (tipo === 'VENDA'  && !clienteId)    { setError('Selecione um cliente.'); return }
    if (tipo === 'COMPRA' && !fornecedorId) { setError('Selecione um fornecedor.'); return }
    if (!itens.some(it => it.produto.trim())) { setError('Adicione pelo menos um produto.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/pedidos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, clienteId: tipo === 'VENDA' ? clienteId : null, fornecedorId: tipo === 'COMPRA' ? fornecedorId : null, data: dataPedido, formaPagamento: formaPagamento || null, frete: freteN, outrasTaxas: outrasTN, obsInternas: obsInternas || null, obsCliente: obsCliente || null, itens: itens.filter(it => it.produto.trim()) }),
      })
      if (!res.ok) { const err = await res.json(); setError(err.error ?? 'Erro ao criar pedido.'); return }
      const novo = await res.json()
      setPedidos(prev => [novo, ...prev])
      setModal(false); resetForm(); router.refresh()
    } catch { setError('Erro de rede. Tente novamente.') }
    finally { setSaving(false) }
  }

  /* ── status inline ── */
  async function handleStatusChange(id: string, novoStatus: string) {
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, status: novoStatus } : p))
    await fetch(`/api/pedidos/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus }),
    })
  }

  /* ── editar itens/valores ── */
  function abrirEdicao(p: Pedido) {
    setPedidoView(p)
    setEditando(true)
    setEditError('')
    setEditItens(p.itens.map(it => ({ ...it })))
    setEditFrete(String(p.frete))
    setEditOutrasTaxas(String(p.outrasTaxas))
  }
  function abrirVisualizacao(p: Pedido) {
    setPedidoView(p)
    setEditando(false)
  }
  function updateEditItem(idx: number, field: keyof ItemPedido, val: string | number) {
    setEditItens(prev => prev.map((it, i) => {
      if (i !== idx) return it
      const upd = { ...it, [field]: val }
      upd.total = Math.max(0, Number(upd.quantidade) * Number(upd.valorUnit) - Number(upd.desconto))
      return upd
    }))
  }
  const editSubtotal = editItens.reduce((s, it) => s + it.total, 0)
  const editFreteN   = parseFloat(editFrete) || 0
  const editOutrasN  = parseFloat(editOutrasTaxas) || 0
  const editTotal    = editSubtotal + editFreteN + editOutrasN

  async function handleSalvarEdicao() {
    if (!pedidoView) return
    setEditError('')
    if (!editItens.some(it => it.produto.trim())) { setEditError('Adicione pelo menos um produto.'); return }
    setEditSaving(true)
    try {
      const res = await fetch(`/api/pedidos/${pedidoView.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itens: editItens.filter(it => it.produto.trim()),
          frete: editFreteN, outrasTaxas: editOutrasN,
        }),
      })
      if (!res.ok) { const err = await res.json(); setEditError(err.error ?? 'Erro ao salvar pedido.'); return }
      const atualizado = await res.json()
      const mapeado: Pedido = {
        ...pedidoView,
        frete: editFreteN, outrasTaxas: editOutrasN, totalValor: editTotal,
        itens: atualizado.itens.map((it: ItemPedido) => ({ ...it, valorUnit: Number(it.valorUnit), desconto: Number(it.desconto), total: Number(it.total) })),
      }
      setPedidos(prev => prev.map(p => p.id === mapeado.id ? mapeado : p))
      setPedidoView(mapeado)
      setEditando(false)
      router.refresh()
    } catch { setEditError('Erro de rede. Tente novamente.') }
    finally { setEditSaving(false) }
  }

  /* ── delete ── */
  async function handleDelete(id: string) {
    if (!confirm('Excluir este pedido? Esta ação não pode ser desfeita.')) return
    setPedidos(prev => prev.filter(p => p.id !== id))
    await fetch(`/api/pedidos/${id}`, { method: 'DELETE' })
  }

  /* ── conjunto da aba (KPIs e tabela respeitam a aba selecionada) ── */
  const porAba = aba === 'todos' ? pedidos : aba === 'vendas' ? pedidos.filter(p => p.tipo === 'VENDA' || p.tipo === 'PDV') : pedidos.filter(p => p.tipo === 'COMPRA')

  /* ── KPIs (filtrados pela aba) ── */
  const sum = (arr: Pedido[]) => arr.reduce((s, p) => s + p.totalValor, 0)
  const ehVenda     = (p: Pedido) => p.tipo === 'VENDA' || p.tipo === 'PDV'
  const confirmado  = (p: Pedido) => p.status === 'CONFIRMADO' || p.status === 'ENTREGUE' || p.status === 'PAGO'
  const fatBase     = aba === 'compras' ? porAba.filter(confirmado) : porAba.filter(p => ehVenda(p) && confirmado(p))
  const emAberto    = porAba.filter(p => p.status === 'ABERTO')
  const emAndamento = porAba.filter(p => p.status === 'ABERTO').length
  const cancelados  = porAba.filter(p => p.status === 'CANCELADO').length
  const plural = (n: number) => `${n} pedido${n !== 1 ? 's' : ''}`

  const kpis = [
    { label: `${aba === 'compras' ? 'Total em Compras' : 'Faturamento (Vendas)'} · ${plural(fatBase.length)}`, valor: formatCurrency(sum(fatBase)), icon: faCartShopping as IconDefinition, color: GREEN },
    { label: `Valor em Aberto · ${plural(emAberto.length)}`, valor: formatCurrency(sum(emAberto)), icon: faFileLines as IconDefinition, color: BLUE },
    { label: `Pedidos em Andamento · ${plural(emAndamento)}`, valor: String(emAndamento), icon: faBox as IconDefinition, color: PURPLE },
    { label: `Pedidos Cancelados · ${plural(cancelados)}`, valor: String(cancelados), icon: faCircleXmark as IconDefinition, color: PINK },
  ]

  /* ── filtros ── */
  const filtrados = porAba.filter(p => {
    const matchQ = !q || String(p.numero).includes(q) || (p.cliente?.nome ?? '').toLowerCase().includes(q.toLowerCase()) || (p.fornecedor?.nome ?? '').toLowerCase().includes(q.toLowerCase())
    const matchStatus = statusFiltro === 'TODOS' || p.status === statusFiltro
    return matchQ && matchStatus
  })
  const tabCount = (t: typeof aba) => t === 'todos' ? pedidos.length : t === 'vendas' ? pedidos.filter(p => p.tipo === 'VENDA' || p.tipo === 'PDV').length : pedidos.filter(p => p.tipo === 'COMPRA').length

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FontAwesomeIcon icon={faCartShopping} style={{ fontSize: 20, color: '#4f46e5' }} />
          </div>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: NAVY, margin: 0, lineHeight: 1.2 }}>Pedidos</h2>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '3px 0 0' }}>Gestão completa de vendas e compras, com visão financeira e operacional.</p>
          </div>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: 8 }}>
          <Link href="/relatorios" style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', background: 'white', fontSize: 13, color: NAVY, textDecoration: 'none', fontWeight: 500 }}>
            <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 13, color: '#6b7280' }} /> Relatórios
          </Link>
          <button onClick={() => { resetForm(); setModal(true) }} style={{ display: 'flex', alignItems: 'center', gap: 7, background: NAVY, color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <FontAwesomeIcon icon={faPlus} style={{ fontSize: 13 }} /> Novo Pedido
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
        {(['todos', 'vendas', 'compras'] as const).map(t => (
          <button key={t} onClick={() => setAba(t)} style={{
            padding: '7px 18px', borderRadius: 20,
            border: `1.5px solid ${aba === t ? NAVY : '#e5e7eb'}`,
            background: aba === t ? NAVY : 'white',
            color: aba === t ? 'white' : '#6b7280',
            fontSize: 13, fontWeight: aba === t ? 600 : 400,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
          }}>
            {t === 'todos' ? 'Todos' : t === 'vendas' ? 'Vendas' : 'Compras'}
            <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.75 }}>({tabCount(t)})</span>
          </button>
        ))}
      </div>

      {/* ── 4 KPI cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        {kpis.map(({ label, valor, icon, color }) => (
          <div key={label} style={{ background: 'white', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '20px 20px 18px', borderLeft: `4px solid ${color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0, paddingRight: 8 }}>
                <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 10px', fontWeight: 400, lineHeight: 1.4 }}>{label}</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: NAVY, margin: 0, lineHeight: 1 }}>{valor}</p>
              </div>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FontAwesomeIcon icon={icon} style={{ fontSize: 16, color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search + Filtros ── */}
      <div style={{ background: 'white', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '12px 14px', marginBottom: filtrosOpen ? 8 : 16, display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: 14, position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por número, cliente ou fornecedor..." style={{ ...inputStyle, paddingLeft: 34, border: 'none', outline: 'none', background: 'transparent' }} />
        </div>
        {/* Mesmo relatório do PDV, no mesmo lugar de sempre: junto da busca. */}
        <Link href="/relatorios" style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 14px', background: 'white', fontSize: 13, color: NAVY, textDecoration: 'none', fontFamily: 'inherit', fontWeight: 500, whiteSpace: 'nowrap' as const }}>
          <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 13, color: '#6b7280' }} /> Ver Relatório
        </Link>
        <button onClick={() => setFiltrosOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1.5px solid ${filtrosOpen ? NAVY : '#e5e7eb'}`, borderRadius: 8, padding: '8px 14px', background: 'white', fontSize: 13, color: filtrosOpen ? NAVY : '#374151', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, transition: 'all 0.1s', whiteSpace: 'nowrap' as const }}>
          <FontAwesomeIcon icon={faSlidersH} style={{ fontSize: 13, color: '#6b7280' }} /> Filtros
          {statusFiltro !== 'TODOS' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, display: 'inline-block' }} />}
        </button>
      </div>

      {/* ── Painel de Filtros ── */}
      {filtrosOpen && (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' as const }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', margin: '0 0 5px', textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Status</p>
            <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 160, padding: '7px 12px' }}>
              <option value="TODOS">Todos os status</option>
              <option value="ABERTO">Em Andamento</option>
              <option value="CONFIRMADO">Confirmado</option>
              <option value="ENTREGUE">Concluído</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>
          {statusFiltro !== 'TODOS' && (
            <button onClick={() => setStatusFiltro('TODOS')} style={{ display: 'flex', alignItems: 'center', gap: 5, border: '1px solid #e5e7eb', borderRadius: 7, padding: '7px 12px', background: 'white', fontSize: 12, color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit' }}>
              <FontAwesomeIcon icon={faXmark} style={{ fontSize: 11 }} /> Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* ── Tabela ── */}
      <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #f0f0f0' }}>
                {['Número', 'Tipo', 'Cliente / Fornecedor', 'Status', 'Pagamento', 'Total', 'Data', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5, whiteSpace: 'nowrap' as const }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '60px 16px', textAlign: 'center' }}>
                    <FontAwesomeIcon icon={faCartShopping} style={{ fontSize: 36, color: '#d1d5db', display: 'block', margin: '0 auto 12px' }} />
                    <p style={{ color: '#9ca3af', fontSize: 14, margin: '0 0 4px', fontWeight: 600 }}>Nenhum pedido encontrado</p>
                    <p style={{ color: '#c0c4cc', fontSize: 13, margin: 0 }}>
                      {pedidos.length === 0 ? 'Crie o primeiro pedido clicando em "+ Novo Pedido".' : 'Tente ajustar os filtros.'}
                    </p>
                  </td>
                </tr>
              ) : filtrados.map(p => {
                const sc   = statusCfg[p.status] ?? statusCfg.ABERTO
                const nome = p.cliente?.nome ?? p.fornecedor?.nome ?? '—'
                const num  = fmtNumero(p.tipo, p.numero, p.data)
                const isVenda = p.tipo === 'VENDA' || p.tipo === 'PDV'
                const isPdv = p.tipo === 'PDV'
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#fafafa'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}>

                    {/* Número */}
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: NAVY }}>{num}</span>
                    </td>

                    {/* Tipo */}
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: isPdv ? '#fdf4ff' : isVenda ? '#f0fdf4' : '#eff6ff', color: isPdv ? '#7e22ce' : isVenda ? '#15803d' : '#1d4ed8' }}>
                        <FontAwesomeIcon icon={isVenda ? faArrowUp : faCartShopping} style={{ fontSize: 10 }} />
                        {isPdv ? 'PDV' : isVenda ? 'Venda' : 'Compra'}
                      </span>
                    </td>

                    {/* Cliente/Fornecedor */}
                    <td style={{ padding: '13px 16px', fontSize: 13, color: NAVY, fontWeight: 500 }}>{nome}</td>

                    {/* Status — dropdown interativo */}
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <select
                          value={p.status}
                          onChange={e => handleStatusChange(p.id, e.target.value)}
                          style={{
                            appearance: 'none', WebkitAppearance: 'none',
                            background: sc.bg, color: sc.color,
                            border: `1.5px solid ${sc.color}40`,
                            borderRadius: 20, padding: '4px 28px 4px 12px',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            fontFamily: 'inherit', outline: 'none',
                          }}
                        >
                          {STATUS_OPTS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                        </select>
                        <FontAwesomeIcon icon={faChevDown} style={{ fontSize: 9, color: sc.color, position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      </div>
                    </td>

                    {/* Pagamento */}
                    <td style={{ padding: '13px 16px' }}>
                      {(() => { const pg = fmtPagamento(p); return (
                        <span style={{ fontSize: 12, fontWeight: 600, color: pg.color, whiteSpace: 'nowrap' as const }}>{pg.label}</span>
                      ) })()}
                    </td>

                    {/* Total */}
                    <td style={{ padding: '13px 16px', fontSize: 13, color: NAVY, fontWeight: 600, whiteSpace: 'nowrap' as const }}>{formatCurrency(p.totalValor)}</td>

                    {/* Data */}
                    <td style={{ padding: '13px 16px', fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' as const }}>{formatDate(new Date(p.data))}</td>

                    {/* Ações */}
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {/* Ver */}
                        <button title="Visualizar" onClick={() => abrirVisualizacao(p)} style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #e5e7eb', background: 'white', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FontAwesomeIcon icon={faEye} style={{ fontSize: 13 }} />
                        </button>
                        {/* Relatório */}
                        <button
                          title={p.cliente ? 'Relatório do cliente' : 'Relatório do pedido'}
                          onClick={() => p.cliente ? window.open(`/imprimir/relatorio-cliente/${p.cliente.id}`, '_blank') : (isVendaTipo(p) ? abrirComprovanteVenda(p) : abrirRelatorio(p, false))}
                          style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #e5e7eb', background: 'white', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 13 }} />
                        </button>
                        {/* Editar */}
                        <button title="Editar" onClick={() => abrirEdicao(p)} style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #e5e7eb', background: 'white', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FontAwesomeIcon icon={faPencil} style={{ fontSize: 13 }} />
                        </button>
                        {/* Excluir */}
                        <button title="Excluir" onClick={() => handleDelete(p.id)} style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #fecaca', background: '#fff5f5', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FontAwesomeIcon icon={faTrash} style={{ fontSize: 13 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtrados.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid #f0f0f0', fontSize: 12, color: '#9ca3af' }}>
            {filtrados.length} pedido(s) exibido(s)
          </div>
        )}
      </div>

      {/* ── Modal Visualização Detalhada ── */}
      {pedidoView && (() => {
        const p = pedidoView
        const isVenda = p.tipo === 'VENDA' || p.tipo === 'PDV'
        const parte = isVenda ? p.cliente : p.fornecedor
        const sc = statusCfg[p.status] ?? statusCfg.ABERTO
        const num = fmtNumero(p.tipo, p.numero, p.data)
        const InfoField = ({ lbl, val }: { lbl: string; val: React.ReactNode }) => (
          <div><p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 3px' }}>{lbl}</p><div style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>{val}</div></div>
        )
        const SecView = ({ title, sub, icon, iconBg, iconColor, children }: { title: string; sub: string; icon: IconDefinition; iconBg: string; iconColor: string; children: React.ReactNode }) => (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FontAwesomeIcon icon={icon} style={{ fontSize: 15, color: iconColor }} />
              </div>
              <div><p style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: 0 }}>{title}</p><p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{sub}</p></div>
            </div>
            {children}
          </div>
        )
        return (
          <>
            <div onClick={() => { setPedidoView(null); setEditando(false) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }} />
            <div style={{ position: 'fixed', inset: 0, zIndex: 1001, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}>
              <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 720, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: '28px 32px' }}>
                {/* header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FontAwesomeIcon icon={faCartShopping} style={{ fontSize: 17, color: '#4f46e5' }} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: 0 }}>Pedido {num}</h2>
                      <p style={{ fontSize: 13, color: '#6b7280', margin: '3px 0 0' }}>Visualização detalhada do pedido</p>
                    </div>
                  </div>
                  <button onClick={() => { setPedidoView(null); setEditando(false) }} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#6b7280' }}>
                    <FontAwesomeIcon icon={faXmark} style={{ fontSize: 16 }} />
                  </button>
                </div>

                {/* actions */}
                {!editando && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    <button onClick={() => isVendaTipo(p) ? abrirComprovanteVenda(p) : abrirRelatorio(p, false)} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', background: 'white', fontSize: 13, color: NAVY, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                      <FontAwesomeIcon icon={faDownload} style={{ fontSize: 13, color: '#6b7280' }} /> Baixar PDF
                    </button>
                    <button onClick={() => isVendaTipo(p) ? abrirComprovanteVenda(p) : abrirRelatorio(p, true)} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', background: 'white', fontSize: 13, color: NAVY, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                      <FontAwesomeIcon icon={faPrint} style={{ fontSize: 13, color: '#6b7280' }} /> Imprimir
                    </button>
                    {p.cliente && (
                      <button onClick={() => window.open(`/imprimir/relatorio-cliente/${p.cliente!.id}`, '_blank')} style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1.5px solid ${NAVY}`, borderRadius: 8, padding: '8px 16px', background: NAVY, fontSize: 13, color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                        <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 13 }} /> Relatório do Cliente
                      </button>
                    )}
                    <button onClick={() => abrirEdicao(p)} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', background: 'white', fontSize: 13, color: NAVY, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, marginLeft: 'auto' }}>
                      <FontAwesomeIcon icon={faPencil} style={{ fontSize: 13, color: '#6b7280' }} /> Editar Itens
                    </button>
                  </div>
                )}

                {!editando && (
                  <>
                    {/* Informações Básicas */}
                    <SecView title="Informações Básicas" sub="Dados principais do pedido" icon={faCircleInfo} iconBg="#eff6ff" iconColor={BLUE}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                        <InfoField lbl="Número do Pedido" val={<span style={{ fontFamily: 'monospace' }}>{num}</span>} />
                        <InfoField lbl="Tipo" val={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: isVenda ? '#f0fdf4' : '#eff6ff', color: isVenda ? '#15803d' : '#1d4ed8' }}><FontAwesomeIcon icon={isVenda ? faArrowUp : faCartShopping} style={{ fontSize: 10 }} />{isVenda ? 'Venda' : 'Compra'}</span>} />
                        <InfoField lbl="Status" val={<span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color }}>{sc.label}</span>} />
                        <InfoField lbl="Data do Pedido" val={formatDate(new Date(p.data))} />
                      </div>
                    </SecView>

                    {/* Cliente / Fornecedor */}
                    <SecView title={isVenda ? 'Cliente' : 'Fornecedor'} sub={isVenda ? 'Informações do cliente' : 'Informações do fornecedor'} icon={faUser} iconBg="#f0fdf4" iconColor={GREEN}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                        <InfoField lbl="Nome" val={v(parte?.nome)} />
                        <InfoField lbl="CPF / CNPJ" val={v(parte?.cnpjCpf)} />
                        {parte?.telefone && <InfoField lbl="Telefone" val={parte.telefone} />}
                        {parte?.email && <InfoField lbl="E-mail" val={parte.email} />}
                      </div>
                    </SecView>

                    {/* Pagamento */}
                    <SecView title="Pagamento" sub="Informações de pagamento" icon={faMoneyBillWave} iconBg="#fef9c3" iconColor="#ca8a04">
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                        <InfoField lbl="Forma de Pagamento" val={fmtFormaPag(p.formaPagamento)} />
                        <InfoField lbl="Condição de Pagamento" val={(p.frete === 0 && p.outrasTaxas === 0) ? 'À vista' : '—'} />
                      </div>
                    </SecView>
                  </>
                )}

                {/* Itens */}
                {!editando ? (
                  <SecView title="Itens do Pedido" sub={`${p.itens.length} item(ns)`} icon={faBox} iconBg="#f5f3ff" iconColor={PURPLE}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: '#f9fafb' }}>
                            {['Produto', 'Qtd', 'V. Unit.', 'Total'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Produto' ? 'left' : 'right', fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' as const }}>{h}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {p.itens.length === 0 ? (
                            <tr><td colSpan={4} style={{ padding: 16, textAlign: 'center', color: '#9ca3af' }}>Sem itens</td></tr>
                          ) : p.itens.map((it, i) => (
                            <tr key={i} style={{ borderTop: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '10px 12px', color: NAVY, fontWeight: 500 }}>{it.produto}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', color: '#6b7280' }}>{it.quantidade}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', color: '#6b7280' }}>{formatCurrency(it.valorUnit)}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', color: NAVY, fontWeight: 600 }}>{formatCurrency(it.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ marginTop: 14, marginLeft: 'auto', width: 240 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: '#6b7280' }}><span>Subtotal</span><span>{formatCurrency(p.totalValor - p.frete - p.outrasTaxas)}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: '#6b7280' }}><span>Frete</span><span>{formatCurrency(p.frete)}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: '#6b7280' }}><span>Outras taxas</span><span>{formatCurrency(p.outrasTaxas)}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', marginTop: 4, borderTop: `2px solid ${NAVY}`, fontSize: 16, fontWeight: 700, color: NAVY }}><span>Total</span><span>{formatCurrency(p.totalValor)}</span></div>
                    </div>
                  </SecView>
                ) : (
                  <SecView title="Editar Itens do Pedido" sub="Altere produtos, quantidades e valores" icon={faBox} iconBg="#f5f3ff" iconColor={PURPLE}>
                    <div style={{ overflowX: 'auto', marginBottom: 12 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: '#f9fafb' }}>
                            {['Produto', 'Quantidade', 'Preço Unitário', 'Desconto', 'Subtotal', ''].map(h => (
                              <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {editItens.map((it, i) => (
                            <tr key={i} style={{ borderTop: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '8px 6px', minWidth: 160 }}>
                                <select value={it.produto} onChange={e => { const prod = produtos.find(pr => pr.nome === e.target.value); updateEditItem(i, 'produto', e.target.value); if (prod) updateEditItem(i, 'unidade', prod.unidade) }} style={{ ...inputStyle, padding: '7px 10px', fontSize: 12 }}>
                                  <option value="">Selecione um produto</option>
                                  {produtos.map(pr => <option key={pr.id} value={pr.nome}>{pr.nome}</option>)}
                                </select>
                              </td>
                              <td style={{ padding: '8px 6px', minWidth: 90 }}>
                                <input type="number" min={0} step="any" value={it.quantidade || ''} onChange={e => updateEditItem(i, 'quantidade', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, padding: '7px 10px', fontSize: 12 }} />
                              </td>
                              <td style={{ padding: '8px 6px', minWidth: 110 }}>
                                <input type="number" min={0} step="any" value={it.valorUnit || ''} onChange={e => updateEditItem(i, 'valorUnit', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, padding: '7px 10px', fontSize: 12 }} />
                              </td>
                              <td style={{ padding: '8px 6px', minWidth: 90 }}>
                                <input type="number" min={0} step="any" value={it.desconto || ''} onChange={e => updateEditItem(i, 'desconto', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, padding: '7px 10px', fontSize: 12 }} />
                              </td>
                              <td style={{ padding: '8px 6px', fontSize: 13, color: NAVY, fontWeight: 600, whiteSpace: 'nowrap' as const }}>{formatCurrency(it.total)}</td>
                              <td style={{ padding: '8px 6px' }}>
                                {editItens.length > 1 && <button type="button" onClick={() => setEditItens(prev => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: PINK, padding: 4 }}><FontAwesomeIcon icon={faTrash} style={{ fontSize: 14 }} /></button>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <button type="button" onClick={() => setEditItens(prev => [...prev, { ...emptyItem }])} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #e5e7eb', borderRadius: 7, padding: '6px 12px', background: 'white', fontSize: 12, color: NAVY, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16 }}>
                      <FontAwesomeIcon icon={faPlus} style={{ fontSize: 12 }} /> Adicionar Item
                    </button>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
                      <div>
                        <FieldLabel>Frete</FieldLabel>
                        <input type="number" min={0} step="any" value={editFrete} onChange={e => setEditFrete(e.target.value)} style={{ ...inputStyle, padding: '7px 10px', fontSize: 13 }} />
                      </div>
                      <div>
                        <FieldLabel>Outras Taxas</FieldLabel>
                        <input type="number" min={0} step="any" value={editOutrasTaxas} onChange={e => setEditOutrasTaxas(e.target.value)} style={{ ...inputStyle, padding: '7px 10px', fontSize: 13 }} />
                      </div>
                    </div>

                    <div style={{ marginLeft: 'auto', width: 240, marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: '#6b7280' }}><span>Subtotal</span><span>{formatCurrency(editSubtotal)}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', marginTop: 4, borderTop: `2px solid ${NAVY}`, fontSize: 16, fontWeight: 700, color: NAVY }}><span>Total</span><span>{formatCurrency(editTotal)}</span></div>
                    </div>

                    {editError && <div style={{ padding: '10px 14px', background: '#fff0f3', border: '1px solid #fecdd3', borderRadius: 8, fontSize: 13, color: '#c0113a', marginBottom: 12 }}>{editError}</div>}

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" disabled={editSaving} onClick={handleSalvarEdicao} style={{ flex: 1, padding: '12px', background: editSaving ? '#94a3b8' : BLUE, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: editSaving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                        {editSaving ? 'Salvando...' : 'Salvar Alterações'}
                      </button>
                      <button type="button" onClick={() => setEditando(false)} style={{ padding: '12px 18px', background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Cancelar
                      </button>
                    </div>
                  </SecView>
                )}

                {!editando && (p.obsInternas || p.obsCliente || p.observacao) && (
                  <SecView title="Observações" sub="Notas do pedido" icon={faFileLines} iconBg="#f3f4f6" iconColor="#6b7280">
                    {p.observacao && <p style={{ fontSize: 13, color: '#374151', margin: '0 0 8px' }}>{p.observacao}</p>}
                    {p.obsInternas && <div style={{ marginBottom: 8 }}><p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 2px' }}>Internas</p><p style={{ fontSize: 13, color: '#374151', margin: 0 }}>{p.obsInternas}</p></div>}
                    {p.obsCliente && <div><p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 2px' }}>Cliente</p><p style={{ fontSize: 13, color: '#374151', margin: 0 }}>{p.obsCliente}</p></div>}
                  </SecView>
                )}
              </div>
            </div>
          </>
        )
      })()}

      {/* ── Modal Novo Pedido ── */}
      {modal && (
        <>
          <div onClick={() => setModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }} />
          <div style={{ position: 'fixed', inset: 0, zIndex: 1001, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}>
            <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 700, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: '28px 32px' }}>
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
                <ModalSection title="Informações Básicas" icon={faCartShopping}>
                  <div style={{ marginBottom: 16 }}>
                    <FieldLabel>Tipo de Pedido</FieldLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {(['VENDA', 'COMPRA'] as const).map(t => (
                        <button key={t} type="button" onClick={() => setTipo(t)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', border: `2px solid ${tipo === t ? BLUE : '#e5e7eb'}`, borderRadius: 10, background: tipo === t ? '#eff6ff' : 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 14, color: tipo === t ? BLUE : '#374151', transition: 'all 0.15s' }}>
                          <FontAwesomeIcon icon={t === 'VENDA' ? faArrowUp : faCartShopping} style={{ fontSize: 16, color: tipo === t ? BLUE : '#6b7280' }} />
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <FieldLabel>{tipo === 'VENDA' ? 'Cliente' : 'Fornecedor'}</FieldLabel>
                    {tipo === 'VENDA' ? (
                      <>
                        <select value={clienteId} onChange={e => setClienteId(e.target.value)} style={inputStyle}>
                          <option value="">Selecione um cliente</option>
                          {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                        {clientes.length === 0 && <div style={{ marginTop: 8, padding: '10px 14px', background: '#fff0f3', border: '1px solid #fecdd3', borderRadius: 8, fontSize: 13, color: '#c0113a' }}>Para criar uma <strong>VENDA</strong>, é necessário cadastrar um cliente.</div>}
                      </>
                    ) : (
                      <select value={fornecedorId} onChange={e => setFornecedorId(e.target.value)} style={inputStyle}>
                        <option value="">Selecione um fornecedor</option>
                        {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                      </select>
                    )}
                  </div>
                  <div>
                    <FieldLabel>Data do Pedido</FieldLabel>
                    <input type="date" value={dataPedido} onChange={e => setDataPedido(e.target.value)} style={inputStyle} />
                  </div>
                </ModalSection>

                <ModalSection title="Itens do Pedido" icon={faBox} collapsible extra={
                  <button type="button" onClick={e => { e.stopPropagation(); setItens(p => [...p, { ...emptyItem }]) }} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #e5e7eb', borderRadius: 7, padding: '5px 12px', background: 'white', fontSize: 12, color: NAVY, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <FontAwesomeIcon icon={faPlus} style={{ fontSize: 13 }} /> Adicionar Item
                  </button>
                }>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f9fafb' }}>
                          {['Produto', 'Quantidade', 'Preço Unitário', 'Desconto', 'Subtotal', ''].map(h => (
                            <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {itens.map((it, i) => (
                          <tr key={i} style={{ borderTop: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '8px 6px', minWidth: 160 }}>
                              <select value={it.produto} onChange={e => { const prod = produtos.find(p => p.nome === e.target.value); updateItem(i, 'produto', e.target.value); if (prod) updateItem(i, 'unidade', prod.unidade) }} style={{ ...inputStyle, padding: '7px 10px', fontSize: 12 }}>
                                <option value="">Selecione um produto</option>
                                {produtos.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                              </select>
                            </td>
                            <td style={{ padding: '8px 6px', minWidth: 90 }}>
                              <input type="number" min={0} step="any" value={it.quantidade || ''} onChange={e => updateItem(i, 'quantidade', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, padding: '7px 10px', fontSize: 12 }} />
                            </td>
                            <td style={{ padding: '8px 6px', minWidth: 110 }}>
                              <input type="number" min={0} step="any" value={it.valorUnit || ''} onChange={e => updateItem(i, 'valorUnit', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, padding: '7px 10px', fontSize: 12 }} />
                            </td>
                            <td style={{ padding: '8px 6px', minWidth: 90 }}>
                              <input type="number" min={0} step="any" value={it.desconto || ''} onChange={e => updateItem(i, 'desconto', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, padding: '7px 10px', fontSize: 12 }} />
                            </td>
                            <td style={{ padding: '8px 6px', fontSize: 13, color: NAVY, fontWeight: 600, whiteSpace: 'nowrap' as const }}>{formatCurrency(it.total)}</td>
                            <td style={{ padding: '8px 6px' }}>
                              {itens.length > 1 && <button type="button" onClick={() => setItens(p => p.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: PINK, padding: 4 }}><FontAwesomeIcon icon={faTrash} style={{ fontSize: 14 }} /></button>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ModalSection>

                <ModalSection title="Pagamento e Entrega" icon={faFileLines}>
                  <FieldLabel>Forma de Pagamento</FieldLabel>
                  <select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)} style={inputStyle}>
                    <option value="">Selecione a forma de pagamento</option>
                    {FORMAS_PAGAMENTO.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </ModalSection>

                <ModalSection title="Resumo Financeiro" icon={faFileLines}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 4px' }}>Subtotal</p>
                      <p style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: 0 }}>{formatCurrency(subtotal)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 4px' }}>Frete</p>
                      <input type="number" min={0} step="any" value={frete} onChange={e => setFrete(e.target.value)} style={{ ...inputStyle, padding: '6px 10px', fontSize: 14 }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 4px' }}>Outras Taxas</p>
                    <input type="number" min={0} step="any" value={outrasTaxas} onChange={e => setOutrasTaxas(e.target.value)} style={{ ...inputStyle, padding: '6px 10px', fontSize: 14, maxWidth: 200 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: NAVY }}>Total</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: NAVY }}>{formatCurrency(totalFinal)}</span>
                  </div>
                </ModalSection>

                <ModalSection title="Observações" icon={faFileLines}>
                  <div style={{ marginBottom: 14 }}>
                    <FieldLabel>Observações Internas</FieldLabel>
                    <textarea value={obsInternas} onChange={e => setObsInternas(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                  </div>
                  <div>
                    <FieldLabel>Observações do Cliente</FieldLabel>
                    <textarea value={obsCliente} onChange={e => setObsCliente(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                  </div>
                </ModalSection>

                <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '18px 18px 16px', marginBottom: 16, background: 'white' }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: NAVY, margin: '0 0 12px' }}>Resumo dos itens</p>
                  {itens.filter(it => it.produto.trim()).length === 0
                    ? <p style={{ fontSize: 13, color: BLUE, margin: '0 0 12px' }}>Nenhum produto adicionado.</p>
                    : <div style={{ marginBottom: 12 }}>{itens.filter(it => it.produto.trim()).map((it, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                        <span style={{ color: NAVY, fontWeight: 500 }}>{it.produto} × {it.quantidade}</span>
                        <span style={{ color: NAVY, fontWeight: 600 }}>{formatCurrency(it.total)}</span>
                      </div>
                    ))}</div>
                  }
                  <button type="button" onClick={() => setItens(p => [...p, { ...emptyItem }])} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '7px 14px', background: 'white', fontSize: 13, color: NAVY, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                    <FontAwesomeIcon icon={faPlus} style={{ fontSize: 13 }} /> Adicionar mais produtos
                  </button>
                </div>

                {error && <div style={{ padding: '10px 14px', background: '#fff0f3', border: '1px solid #fecdd3', borderRadius: 8, fontSize: 13, color: '#c0113a', marginBottom: 16 }}>{error}</div>}

                <button type="submit" disabled={saving} style={{ width: '100%', padding: '14px', background: saving ? '#94a3b8' : BLUE, color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}>
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
