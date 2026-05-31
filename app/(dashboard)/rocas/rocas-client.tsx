'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faXmark, faPenToSquare, faTrash, faChevronRight, faLeaf, faCalendarDays, faClipboardList, faBox, faCircleCheck, faChartBar, faUsers, faArrowTrendUp, faDollarSign, faFileLines, faArrowRight, faArrowUpRightFromSquare, faChevronDown, faMagnifyingGlass, faFilter, faEllipsisH } from '@fortawesome/free-solid-svg-icons'
import { useToast } from '@/components/toast'

const GREEN  = '#5ab952'
const NAVY   = '#2d3561'
const PINK   = '#e8255a'
const ORANGE = '#e87320'
const BLUE   = '#3b82f6'
const TEAL   = '#14b8a6'
const PURPLE = '#a855f7'
const BG     = '#f4f6f9'

type Registro = { id: string; data: string; tipo: string; descricao: string; custo: number }

type Roca = {
  id: string; codigo: string | null; nome: string; area: number | null
  localizacao: string | null; mudasPlantadas: number | null
  cultura: string | null; status: string
  dataPlantio: string | null; dataColheita: string | null
  observacao: string | null; createdAt: string
  produtor: { id: string; nome: string; codigo: string | null } | null
  registros: Registro[]
}

type ParceiroEmbed = {
  id: string; codigo: string | null; nome: string; nomeFantasia: string | null
  cpf: string | null; chavePix: string | null; percentual: number; valorEmba: number
  endereco: string | null; telefone: string | null
}

type Produtor = {
  id: string; codigo: string | null; nome: string; tipo: string
  cpf: string | null; cnpj: string | null; inscricaoEstadual: string | null
  telefone: string | null; endereco: string | null
  parceiros: ParceiroEmbed[]
}

type Colheita = {
  id: string; data: string
  rocaId: string | null; rocaNome: string | null; rocaCodigo: string | null
  produtoId: string; produtoNome: string
  produtorId: string | null; produtorNome: string | null
  parceiroId: string | null; parceiroNome: string | null; parceiroCodigo: string | null
  quantidadeTotal: number; preco: number; percParceiro: number
  qualidade: string | null; nrDoc: string | null
}

type ParceiroProp = {
  id: string; codigo: string | null; nome: string; nomeFantasia: string | null
  cpf: string | null; chavePix: string | null; percentual: number; valorEmba: number
  endereco: string | null; telefone: string | null
  produtorId: string; produtorNome: string; produtorCodigo: string | null
}

type Produto = {
  id: string; nome: string; sku: string | null; unidade: string
  preco: number; precoVenda: number; estoqueMinimo: number; estoqueMaximo: number
}

const TIPO_LABELS: Record<string, string> = { PLANTIO: 'Plantio', ADUBACAO: 'Adubação', IRRIGACAO: 'Irrigação', DEFENSIVO: 'Defensivo', COLHEITA: 'Colheita', OUTRO: 'Outro' }
const TIPO_COLORS: Record<string, string> = { PLANTIO: GREEN, ADUBACAO: '#7c9a5e', IRRIGACAO: BLUE, DEFENSIVO: ORANGE, COLHEITA: NAVY, OUTRO: '#8b9dc3' }
const TABS = [
  { id: 'dashboard',          label: 'Dashboard' },
  { id: 'produtores',         label: 'Produtores' },
  { id: 'rocas',              label: 'Roças' },
  { id: 'meeiros',            label: 'Meeiros' },
  { id: 'produtos',           label: 'Produtos' },
  { id: 'lancamentos',        label: 'Lançamentos' },
  { id: 'pagamento',          label: 'Pagamento Meeiros' },
  { id: 'pagamento-produtor', label: 'Pagamento Produtor' },
  { id: 'notas',              label: 'Notas de lançamento' },
]
const CHART_COLORS = [NAVY, PINK, BLUE, ORANGE, GREEN, TEAL, PURPLE]
const UNIDADES = ['CAIXA', 'KG', 'UNIDADE', 'SACO', 'LITRO', 'DUZIA', 'FARDO']

const fmtDate     = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('pt-BR') : '—'
const fmtCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtNum      = (v: number, dec = 1) => v.toLocaleString('pt-BR', { maximumFractionDigits: dec })

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8,
  padding: '9px 12px', fontSize: 14, color: '#111827',
  outline: 'none', boxSizing: 'border-box', background: '#fff',
}
const emptyForm         = { nome: '', codigo: '', area: '', localizacao: '', mudasPlantadas: '', cultura: '', produtorId: '', status: 'ATIVA', dataPlantio: '', dataColheita: '', observacao: '' }
const emptyRegistro     = { data: new Date().toISOString().split('T')[0], tipo: 'PLANTIO', descricao: '', custo: '' }
const emptyProdutorForm = { codigo: '', nome: '', tipo: 'FISICA', cpf: '', cnpj: '', inscricaoEstadual: '', telefone: '', endereco: '' }
const emptyMeeiroForm   = { codigo: '', produtorId: '', nome: '', nomeFantasia: '', cpf: '', chavePix: '', percentual: '40', valorEmba: '1.2', endereco: '', telefone: '' }
const emptyProdutoForm  = { nome: '', sku: '', unidade: 'CAIXA', preco: '', estoqueMinimo: '', ondeCadastrar: 'catalogo', produtorId: '' }
const emptyLancForm     = { produtorId: '', data: new Date().toISOString().split('T')[0], rocaId: '', meeiroIds: [] as string[], produtoId: '', quantidade: '', preco: '', combustivel: '0', bandejaEmbalagem: '0', valesDinheiro: '0', creditos: '0', debitosAnteriores: '0' }
const emptyFechForm     = { produtorId: '', dataInicio: '', dataFim: '', dataPagamento: new Date().toISOString().slice(0,10), bandejaEmbalagem: '0', valesDinheiro: '0', creditos: '0', debitosAnteriores: '0' }

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

type ChartRow = Record<string, string | number>

function BarChart({ data, keys, colors }: { data: ChartRow[]; keys: string[]; colors: string[] }) {
  if (data.length === 0 || keys.length === 0) {
    return <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>Sem dados para exibir</div>
  }
  const W = 760, H = 260, ml = 52, mr = 20, mt = 12, mb = 40
  const cW = W - ml - mr, cH = H - mt - mb
  const maxVal = Math.max(...data.flatMap(d => keys.map(k => Number(d[k]) || 0)), 1)
  const rMax = Math.ceil(maxVal / 5) * 5 || 10
  const gW = cW / data.length
  const bW = Math.min((gW * 0.75) / Math.max(keys.length, 1), 30)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 260 }}>
      {Array.from({ length: 6 }, (_, i) => {
        const val = (rMax / 5) * (5 - i); const y = mt + (cH / 5) * i
        return (
          <g key={i}>
            <line x1={ml} y1={y} x2={W - mr} y2={y} stroke="#f0f0f0" strokeWidth={1} />
            <text x={ml - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#9ca3af">{val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0)}</text>
          </g>
        )
      })}
      {data.map((d, gi) => {
        const totalBarW = keys.length * (bW + 2) - 2
        const gx = ml + gi * gW + gW / 2 - totalBarW / 2
        return (
          <g key={gi}>
            {keys.map((k, ki) => {
              const val = Number(d[k]) || 0; const bh = (val / rMax) * cH
              const x = gx + ki * (bW + 2); const y = mt + cH - bh
              if (bh < 1) return null
              return (
                <g key={ki}>
                  <rect x={x} y={y} width={bW} height={bh} fill={colors[ki % colors.length]} rx={3} />
                  {bh > 16 && <text x={x + bW / 2} y={y + bh - 5} textAnchor="middle" fontSize={9} fill="#fff" fontWeight="700">{val.toFixed(0)}</text>}
                </g>
              )
            })}
            <text x={ml + gi * gW + gW / 2} y={mt + cH + 20} textAnchor="middle" fontSize={10} fill="#6b7280">{d.label}</text>
          </g>
        )
      })}
      <line x1={ml} y1={mt + cH} x2={W - mr} y2={mt + cH} stroke="#e5e7eb" strokeWidth={1.5} />
      <line x1={ml} y1={mt} x2={ml} y2={mt + cH} stroke="#e5e7eb" strokeWidth={1.5} />
    </svg>
  )
}

type PagamentoMeeiroRecord = {
  id: string; parceiroId: string; valor: number; formaPag: string
  conta: string | null; dataPag: string; observacao: string | null; status: string; createdAt: string
}

type FechamentoRecord = {
  id: string; produtorId: string; produtorNome: string
  dataInicio: string; dataFim: string; dataPagamento: string
  bandejaEmbalagem: number; valesDinheiro: number; creditos: number; debitosAnteriores: number
  status: string; createdAt: string
}

type LancamentoCustoRecord = {
  id: string; produtorId: string | null; rocaId: string | null; data: string
  combustivel: number; bandejaEmbalagem: number
  valesDinheiro: number; creditos: number; debitosAnteriores: number
  observacao: string | null; createdAt: string
}

export default function RocasClient({
  rocas: initialRocas, produtores, colheitas: initialColheitas, parceiros, produtos, pagamentosMeeiro: initialPagamentos, fechamentos: initialFechamentos, custos: initialCustos,
}: {
  rocas: Roca[]; produtores: Produtor[]; colheitas: Colheita[]; parceiros: ParceiroProp[]; produtos: Produto[]
  pagamentosMeeiro: PagamentoMeeiroRecord[]; fechamentos: FechamentoRecord[]; custos: LancamentoCustoRecord[]
}) {
  const toast = useToast()
  const [rocas, setRocas]                       = useState<Roca[]>(initialRocas)
  const [colheitas, setColheitas]               = useState<Colheita[]>(initialColheitas)
  const [produtoresState, setProdutoresState]   = useState<Produtor[]>(produtores)
  const [pagamentosState, setPagamentosState]   = useState<PagamentoMeeiroRecord[]>(initialPagamentos)
  const [parceirosState, setParceirosState]     = useState<ParceiroProp[]>(parceiros)
  const [produtosState, setProdutosState]       = useState<Produto[]>(produtos)
  const [custosState, setCustosState]           = useState<LancamentoCustoRecord[]>(initialCustos)
  const [activeTab, setActiveTab]               = useState('dashboard')
  const [filterRoca, setFilterRoca]             = useState('todas')

  const [search, setSearch]                     = useState('')
  const [showModal, setShowModal]               = useState(false)
  const [editing, setEditing]                   = useState<Roca | null>(null)
  const [form, setForm]                         = useState(emptyForm)
  const [saving, setSaving]                     = useState(false)
  const [formError, setFormError]               = useState('')
  const [selected, setSelected]                 = useState<Roca | null>(null)
  const [regForm, setRegForm]                   = useState(emptyRegistro)
  const [savingReg, setSavingReg]               = useState(false)
  const [regError, setRegError]                 = useState('')
  const [deleteTarget, setDeleteTarget]         = useState<Roca | null>(null)
  const [deleting, setDeleting]                 = useState(false)

  const [searchProdutor, setSearchProdutor]               = useState('')
  const [showProdutorModal, setShowProdutorModal]         = useState(false)
  const [editingProdutor, setEditingProdutor]             = useState<Produtor | null>(null)
  const [produtorForm, setProdutorForm]                   = useState(emptyProdutorForm)
  const [savingProdutor, setSavingProdutor]               = useState(false)
  const [produtorFormError, setProdutorFormError]         = useState('')
  const [deleteProdutorTarget, setDeleteProdutorTarget]   = useState<Produtor | null>(null)
  const [deletingProdutor, setDeletingProdutor]           = useState(false)

  const [searchMeeiro, setSearchMeeiro]                   = useState('')
  const [showMeeiroModal, setShowMeeiroModal]             = useState(false)
  const [editingMeeiro, setEditingMeeiro]                 = useState<ParceiroProp | null>(null)
  const [meeiroForm, setMeeiroForm]                       = useState(emptyMeeiroForm)
  const [savingMeeiro, setSavingMeeiro]                   = useState(false)
  const [meeiroFormError, setMeeiroFormError]             = useState('')
  const [deleteMeeiroTarget, setDeleteMeeiroTarget]       = useState<ParceiroProp | null>(null)

  const [searchProduto, setSearchProduto]                 = useState('')
  const [showProdutoModal, setShowProdutoModal]           = useState(false)
  const [editingProduto, setEditingProduto]               = useState<Produto | null>(null)
  const [produtoForm, setProdutoForm]                     = useState(emptyProdutoForm)
  const [savingProduto, setSavingProduto]                 = useState(false)
  const [produtoFormError, setProdutoFormError]           = useState('')
  const [deleteProdutoTarget, setDeleteProdutoTarget]     = useState<Produto | null>(null)

  const [searchLanc, setSearchLanc]                       = useState('')
  const [showLancModal, setShowLancModal]                 = useState(false)
  const [lancForm, setLancForm]                           = useState(emptyLancForm)
  const [savingLanc, setSavingLanc]                       = useState(false)
  const [lancError, setLancError]                         = useState('')
  type LancItem = { produtoId: string; produtoNome: string; quantidade: number; preco: number }
  const [lancItems, setLancItems]                         = useState<LancItem[]>([])
  const [lancMenuId, setLancMenuId]                       = useState<string | null>(null)
  const [lancMenuPos, setLancMenuPos]                     = useState({ top: 0, right: 0 })
  const [lancViewId, setLancViewId]                       = useState<string | null>(null)
  const [lancEditId, setLancEditId]                       = useState<string | null>(null)
  const [lancEditForm, setLancEditForm]                   = useState({ data: '', quantidade: '', preco: '', observacao: '' })
  const [savingLancEdit, setSavingLancEdit]               = useState(false)

  const [pagamentoStatus, setPagamentoStatus]             = useState<'aberto' | 'quitado'>('aberto')

  const [notasProdId, setNotasProdId]         = useState('')
  const [notasRocaId, setNotasRocaId]         = useState('')
  const [notasProdutoId, setNotasProdutoId]   = useState('')
  const [notasDateI, setNotasDateI]           = useState('')
  const [notasDateF, setNotasDateF]           = useState('')
  const [meeiroRelId, setMeeiroRelId]         = useState('')
  const [meeiroRelDateI, setMeeiroRelDateI]   = useState('')
  const [meeiroRelDateF, setMeeiroRelDateF]   = useState('')
  const [repParcId, setRepParcId]             = useState('')
  const [repDateI, setRepDateI]               = useState('')
  const [repDateF, setRepDateF]               = useState('')
  const [repRocaId, setRepRocaId]             = useState('')
  const [empDateI, setEmpDateI]               = useState('')
  const [empDateF, setEmpDateF]               = useState('')
  const [empRocaId, setEmpRocaId]             = useState('')

  type PagItem = { id: string; nome: string; chavePix: string | null; valorReceber: number; emprestimo: number; descEmprestimo: number; valorFinal: number }
  const [pagarMenuId, setPagarMenuId]         = useState<string | null>(null)
  const [pagarModal, setPagarModal]           = useState<PagItem | null>(null)
  const [pagarFormaPag, setPagarFormaPag]     = useState('PIX')
  const [pagarConta, setPagarConta]           = useState('')
  const [pagarData, setPagarData]             = useState(new Date().toISOString().slice(0, 10))
  const [pagarObs, setPagarObs]               = useState('')
  const [pagarMenuPos, setPagarMenuPos]       = useState({ top: 0, right: 0 })

  const [fechamentosState, setFechamentosState]       = useState<FechamentoRecord[]>(initialFechamentos ?? [])
  const [showFechModal, setShowFechModal]             = useState(false)
  const [fechForm, setFechForm]                       = useState(emptyFechForm)
  const [savingFech, setSavingFech]                   = useState(false)
  const [fechError, setFechError]                     = useState('')
  const [deleteFechTarget, setDeleteFechTarget]       = useState<FechamentoRecord | null>(null)
  const [deletingFech, setDeletingFech]               = useState(false)
  const [fechProdutorFilter, setFechProdutorFilter]   = useState('')
  const [fechStatusFilter, setFechStatusFilter]       = useState<'TODOS' | 'PENDENTE' | 'PAGO'>('TODOS')

  const produtoresAtivos = produtoresState.length
  const rocasAtivas      = rocas.filter(r => r.status === 'ATIVA').length
  const totalMeeiros     = parceirosState.length

  const filteredColheitas = useMemo(() => {
    if (filterRoca === 'todas') return colheitas
    return colheitas.filter(c => c.rocaId === filterRoca)
  }, [colheitas, filterRoca])

  const lancamentosFiltrados = filteredColheitas.length
  const valorTotalFiltrado   = filteredColheitas.reduce((s, c) => s + c.quantidadeTotal * c.preco, 0)
  const qtdTotalCaixas       = filteredColheitas.reduce((s, c) => s + c.quantidadeTotal, 0)
  const valorMedioCaixa      = qtdTotalCaixas > 0 ? valorTotalFiltrado / qtdTotalCaixas : 0

  const nowDate = new Date()
  const curMonthColheitas = filteredColheitas.filter(c => { const d = new Date(c.data); return d.getFullYear() === nowDate.getFullYear() && d.getMonth() === nowDate.getMonth() })
  const producaoMesQtd     = curMonthColheitas.reduce((s, c) => s + c.quantidadeTotal, 0)
  const producaoMesValor   = curMonthColheitas.reduce((s, c) => s + c.quantidadeTotal * c.preco, 0)
  const valorMedioCaixaMes = producaoMesQtd > 0 ? producaoMesValor / producaoMesQtd : 0
  const mediaDiaria        = nowDate.getDate() > 0 ? producaoMesQtd / nowDate.getDate() : 0

  const { chartData, rocaNames } = useMemo(() => {
    const months: { key: string; label: string }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1)
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('. ', '/').replace('.', '')
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label })
    }
    const names = rocas.map(r => r.nome)
    const data: ChartRow[] = months.map(m => {
      const row: ChartRow = { label: m.label }
      rocas.forEach(roca => {
        row[roca.nome] = colheitas
          .filter(c => { const d = new Date(c.data); return `${d.getFullYear()}-${d.getMonth()}` === m.key && c.rocaId === roca.id })
          .reduce((s, c) => s + c.quantidadeTotal, 0)
      })
      return row
    })
    return { chartData: data, rocaNames: names }
  }, [colheitas, rocas]) // eslint-disable-line react-hooks/exhaustive-deps

  const resumoRocas = useMemo(() => rocas.map(roca => {
    const rc = colheitas.filter(c => c.rocaId === roca.id)
    return {
      codigo: roca.codigo ?? '—', nome: roca.nome, produtor: roca.produtor?.nome ?? '—',
      lancamentos: rc.length, quantidade: rc.reduce((s, c) => s + c.quantidadeTotal, 0),
      valor: rc.reduce((s, c) => s + c.quantidadeTotal * c.preco, 0),
      ultimoLancamento: rc[0]?.data ?? null,
    }
  }), [colheitas, rocas])

  function openCreate() { setEditing(null); setForm(emptyForm); setFormError(''); setShowModal(true) }
  function openEdit(r: Roca) {
    setEditing(r)
    setForm({
      codigo: r.codigo ?? '', nome: r.nome, area: r.area != null ? String(r.area) : '',
      localizacao: r.localizacao ?? '', mudasPlantadas: r.mudasPlantadas != null ? String(r.mudasPlantadas) : '',
      cultura: r.cultura ?? '', produtorId: r.produtor?.id ?? '', status: r.status,
      dataPlantio: r.dataPlantio ? r.dataPlantio.split('T')[0] : '',
      dataColheita: r.dataColheita ? r.dataColheita.split('T')[0] : '',
      observacao: r.observacao ?? '',
    })
    setFormError(''); setShowModal(true)
  }
  async function handleSave() {
    if (!form.nome.trim()) { setFormError('Nome é obrigatório'); return }
    if (!form.produtorId) { setFormError('Produtor é obrigatório'); return }
    setSaving(true); setFormError('')
    try {
      const payload = {
        codigo: form.codigo.trim() || undefined, nome: form.nome.trim(),
        area: form.area || null, localizacao: form.localizacao || null,
        mudasPlantadas: form.mudasPlantadas || null, cultura: form.cultura || null,
        produtorId: form.produtorId || null, status: form.status,
        dataPlantio: form.dataPlantio || null, dataColheita: form.dataColheita || null,
        observacao: form.observacao || null,
      }
      const url = editing ? `/api/rocas/${editing.id}` : '/api/rocas'
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error()
      const saved: Roca = await res.json()
      const prod = produtoresState.find(p => p.id === (saved.produtor?.id || form.produtorId))
      const normalized: Roca = { ...saved, produtor: prod ? { id: prod.id, nome: prod.nome, codigo: prod.codigo } : null }
      if (editing) {
        setRocas(prev => prev.map(r => r.id === normalized.id ? normalized : r))
        toast.success('Roça atualizada', normalized.nome)
      } else {
        setRocas(prev => [normalized, ...prev])
        toast.success('Roça criada', normalized.nome)
      }
      setShowModal(false)
    } catch { setFormError('Erro ao salvar'); toast.error('Erro') }
    finally { setSaving(false) }
  }
  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch(`/api/rocas/${deleteTarget.id}`, { method: 'DELETE' })
      setRocas(prev => prev.filter(r => r.id !== deleteTarget.id))
      if (selected?.id === deleteTarget.id) setSelected(null)
      toast.success('Roça excluída', deleteTarget.nome)
      setDeleteTarget(null)
    } catch { toast.error('Erro') } finally { setDeleting(false) }
  }
  async function handleAddRegistro() {
    if (!selected) return
    if (!regForm.descricao.trim()) { setRegError('Descrição é obrigatória'); return }
    setSavingReg(true); setRegError('')
    try {
      const res = await fetch(`/api/rocas/${selected.id}/registros`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: regForm.data, tipo: regForm.tipo, descricao: regForm.descricao.trim(), custo: regForm.custo || '0' }),
      })
      if (!res.ok) throw new Error()
      const novoReg: Registro = await res.json()
      const upd = { ...selected, registros: [novoReg, ...selected.registros] }
      setSelected(upd); setRocas(prev => prev.map(r => r.id === selected.id ? upd : r)); setRegForm(emptyRegistro)
    } catch { setRegError('Erro') } finally { setSavingReg(false) }
  }
  async function handleDeleteRegistro(registroId: string) {
    if (!selected) return
    try {
      await fetch(`/api/rocas/${selected.id}/registros`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registroId }) })
      const upd = { ...selected, registros: selected.registros.filter(r => r.id !== registroId) }
      setSelected(upd); setRocas(prev => prev.map(r => r.id === selected.id ? upd : r))
    } catch { /* ignore */ }
  }

  function openCreateProdutor() { setEditingProdutor(null); setProdutorForm(emptyProdutorForm); setProdutorFormError(''); setShowProdutorModal(true) }
  function openEditProdutor(p: Produtor) {
    setEditingProdutor(p)
    setProdutorForm({ codigo: p.codigo ?? '', nome: p.nome, tipo: p.tipo, cpf: p.cpf ?? '', cnpj: p.cnpj ?? '', inscricaoEstadual: p.inscricaoEstadual ?? '', telefone: p.telefone ?? '', endereco: p.endereco ?? '' })
    setProdutorFormError(''); setShowProdutorModal(true)
  }
  async function handleSaveProdutor() {
    if (!produtorForm.nome.trim()) { setProdutorFormError('Nome é obrigatório'); return }
    setSavingProdutor(true); setProdutorFormError('')
    try {
      const payload = {
        codigo: produtorForm.codigo.trim() || undefined, nome: produtorForm.nome.trim(), tipo: produtorForm.tipo,
        cpf: produtorForm.cpf.trim() || undefined, cnpj: produtorForm.cnpj.trim() || undefined,
        inscricaoEstadual: produtorForm.inscricaoEstadual.trim() || undefined,
        telefone: produtorForm.telefone.trim() || undefined, endereco: produtorForm.endereco.trim() || undefined,
      }
      const url = editingProdutor ? `/api/produtores/${editingProdutor.id}` : '/api/produtores'
      const res = await fetch(url, { method: editingProdutor ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { setProdutorFormError(data.error ?? 'Erro'); return }
      const norm = { ...data, parceiros: data.parceiros ?? [] }
      if (editingProdutor) {
        setProdutoresState(prev => prev.map(p => p.id === data.id ? norm : p))
        toast.success('Produtor atualizado', data.nome)
      } else {
        setProdutoresState(prev => [...prev, norm])
        toast.success('Produtor cadastrado', data.nome)
      }
      setShowProdutorModal(false)
    } catch { setProdutorFormError('Erro') } finally { setSavingProdutor(false) }
  }
  async function handleDeleteProdutor() {
    if (!deleteProdutorTarget) return
    setDeletingProdutor(true)
    try {
      await fetch(`/api/produtores/${deleteProdutorTarget.id}`, { method: 'DELETE' })
      setProdutoresState(prev => prev.filter(p => p.id !== deleteProdutorTarget.id))
      toast.success('Produtor excluído', deleteProdutorTarget.nome); setDeleteProdutorTarget(null)
    } catch { toast.error('Erro') } finally { setDeletingProdutor(false) }
  }

  function openCreateMeeiro() { setEditingMeeiro(null); setMeeiroForm(emptyMeeiroForm); setMeeiroFormError(''); setShowMeeiroModal(true) }
  function openEditMeeiro(m: ParceiroProp) {
    setEditingMeeiro(m)
    setMeeiroForm({ codigo: m.codigo ?? '', produtorId: m.produtorId, nome: m.nome, nomeFantasia: m.nomeFantasia ?? '', cpf: m.cpf ?? '', chavePix: m.chavePix ?? '', percentual: String(m.percentual), valorEmba: String(m.valorEmba ?? 0), endereco: m.endereco ?? '', telefone: m.telefone ?? '' })
    setMeeiroFormError(''); setShowMeeiroModal(true)
  }
  async function handleSaveMeeiro() {
    if (!meeiroForm.nome.trim()) { setMeeiroFormError('Nome é obrigatório'); return }
    if (!meeiroForm.produtorId) { setMeeiroFormError('Produtor é obrigatório'); return }
    setSavingMeeiro(true); setMeeiroFormError('')
    try {
      const payload = {
        codigo: meeiroForm.codigo.trim() || undefined, produtorId: meeiroForm.produtorId,
        nome: meeiroForm.nome.trim(), nomeFantasia: meeiroForm.nomeFantasia.trim() || undefined,
        cpf: meeiroForm.cpf.trim() || undefined, chavePix: meeiroForm.chavePix.trim() || undefined,
        percentual: parseFloat(meeiroForm.percentual) || 0,
        valorEmba: parseFloat(meeiroForm.valorEmba) || 0,
        endereco: meeiroForm.endereco.trim() || undefined, telefone: meeiroForm.telefone.trim() || undefined,
      }
      const url = editingMeeiro ? `/api/parceiros/${editingMeeiro.id}` : '/api/parceiros'
      const res = await fetch(url, { method: editingMeeiro ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { setMeeiroFormError(data.error ?? 'Erro'); return }
      const prod = produtoresState.find(p => p.id === payload.produtorId)
      const norm: ParceiroProp = {
        id: data.id, codigo: data.codigo, nome: data.nome, nomeFantasia: data.nomeFantasia,
        cpf: data.cpf, chavePix: data.chavePix, percentual: data.percentual, valorEmba: data.valorEmba ?? 0,
        endereco: data.endereco, telefone: data.telefone,
        produtorId: data.produtorId, produtorNome: prod?.nome ?? '', produtorCodigo: prod?.codigo ?? null,
      }
      if (editingMeeiro) {
        setParceirosState(prev => prev.map(p => p.id === norm.id ? norm : p))
        toast.success('Meeiro atualizado', norm.nome)
      } else {
        setParceirosState(prev => [...prev, norm])
        toast.success('Meeiro cadastrado', norm.nome)
      }
      setShowMeeiroModal(false)
    } catch { setMeeiroFormError('Erro') } finally { setSavingMeeiro(false) }
  }
  async function handleDeleteMeeiro() {
    if (!deleteMeeiroTarget) return
    try {
      await fetch(`/api/parceiros/${deleteMeeiroTarget.id}`, { method: 'DELETE' })
      setParceirosState(prev => prev.filter(p => p.id !== deleteMeeiroTarget.id))
      toast.success('Meeiro excluído', deleteMeeiroTarget.nome); setDeleteMeeiroTarget(null)
    } catch { toast.error('Erro') }
  }

  function openCreateProduto() { setEditingProduto(null); setProdutoForm(emptyProdutoForm); setProdutoFormError(''); setShowProdutoModal(true) }
  function openEditProduto(p: Produto) {
    setEditingProduto(p)
    setProdutoForm({ nome: p.nome, sku: p.sku ?? '', unidade: p.unidade, preco: String(p.preco), estoqueMinimo: String(p.estoqueMinimo), ondeCadastrar: 'catalogo', produtorId: '' })
    setProdutoFormError(''); setShowProdutoModal(true)
  }
  async function handleSaveProduto() {
    if (!produtoForm.nome.trim()) { setProdutoFormError('Nome é obrigatório'); return }
    setSavingProduto(true); setProdutoFormError('')
    try {
      const payload = {
        nome: produtoForm.nome.trim(), sku: produtoForm.sku.trim() || undefined,
        unidade: produtoForm.unidade, preco: parseFloat(produtoForm.preco) || 0,
        estoqueMinimo: parseFloat(produtoForm.estoqueMinimo) || 0,
      }
      const url = editingProduto ? `/api/produtos/${editingProduto.id}` : '/api/produtos'
      const res = await fetch(url, { method: editingProduto ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { setProdutoFormError(data.error ?? 'Erro'); return }
      if (editingProduto) {
        setProdutosState(prev => prev.map(p => p.id === data.id ? data : p))
        toast.success('Produto atualizado', data.nome)
      } else {
        setProdutosState(prev => [...prev, data])
        toast.success('Produto cadastrado', data.nome)
      }
      setShowProdutoModal(false)
    } catch { setProdutoFormError('Erro') } finally { setSavingProduto(false) }
  }
  async function handleDeleteProduto() {
    if (!deleteProdutoTarget) return
    try {
      await fetch(`/api/produtos/${deleteProdutoTarget.id}`, { method: 'DELETE' })
      setProdutosState(prev => prev.filter(p => p.id !== deleteProdutoTarget.id))
      toast.success('Produto excluído', deleteProdutoTarget.nome); setDeleteProdutoTarget(null)
    } catch { toast.error('Erro') }
  }

  function openCreateLanc(produtoIdPre?: string) {
    setLancForm({ ...emptyLancForm, produtoId: produtoIdPre ?? '' })
    setLancItems([]); setLancError(''); setShowLancModal(true)
  }
  function addLancItem() {
    if (!lancForm.produtoId || !lancForm.quantidade) return
    const prod = produtosState.find(p => p.id === lancForm.produtoId); if (!prod) return
    setLancItems(prev => [...prev, { produtoId: lancForm.produtoId, produtoNome: prod.nome, quantidade: parseFloat(lancForm.quantidade) || 0, preco: parseFloat(lancForm.preco) || 0 }])
    setLancForm(f => ({ ...f, produtoId: '', quantidade: '', preco: '' }))
  }
  function removeLancItem(idx: number) { setLancItems(prev => prev.filter((_, i) => i !== idx)) }
  function toggleMeeiro(id: string) {
    setLancForm(f => ({ ...f, meeiroIds: f.meeiroIds.includes(id) ? f.meeiroIds.filter(x => x !== id) : [...f.meeiroIds, id] }))
  }
  async function handleSaveLanc() {
    if (!lancForm.produtorId) { setLancError('Selecione o produtor'); return }
    if (!lancForm.rocaId) { setLancError('Selecione a roça'); return }
    if (lancItems.length === 0) { setLancError('Adicione ao menos um produto'); return }
    setSavingLanc(true); setLancError('')
    try {
      const meeirosSelecionados = lancForm.meeiroIds.length > 0 ? parceirosState.filter(p => lancForm.meeiroIds.includes(p.id)) : [null]
      const novos: Colheita[] = []
      for (const meeiro of meeirosSelecionados) {
        for (const item of lancItems) {
          const percParceiro = meeiro?.percentual ?? 0
          const res = await fetch('/api/colheita', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: lancForm.data, rocaId: lancForm.rocaId, produtoId: item.produtoId,
              produtorId: lancForm.produtorId, parceiroId: meeiro?.id ?? null,
              quantidadeTotal: item.quantidade, preco: item.preco,
              percParceiro, percDono: 100 - percParceiro,
            }),
          })
          if (!res.ok) throw new Error()
          const c = await res.json()
          const roca = rocas.find(r => r.id === lancForm.rocaId)
          novos.push({
            id: c.id, data: c.data, rocaId: c.rocaId,
            rocaNome: roca?.nome ?? null, rocaCodigo: roca?.codigo ?? null,
            produtoId: c.produtoId, produtoNome: item.produtoNome,
            produtorId: c.produtorId,
            produtorNome: produtoresState.find(p => p.id === c.produtorId)?.nome ?? null,
            parceiroId: c.parceiroId,
            parceiroNome: meeiro?.nome ?? null, parceiroCodigo: meeiro?.codigo ?? null,
            quantidadeTotal: c.quantidadeTotal, preco: c.preco,
            percParceiro: c.percParceiro, qualidade: c.qualidade, nrDoc: c.nrDoc,
          })
        }
      }
      setColheitas(prev => [...novos, ...prev])
      // Entrada de estoque: uma por produto (não por meeiro)
      for (const item of lancItems) {
        await fetch('/api/estoque', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ produtoId: item.produtoId, quantidade: item.quantidade, valorUnit: item.preco, data: lancForm.data, observacao: `Lançamento roça — ${item.produtoNome}` }),
        })
      }
      const custoPayload = {
        data: lancForm.data, produtorId: lancForm.produtorId || null, rocaId: lancForm.rocaId || null,
        combustivel: parseFloat(lancForm.combustivel) || 0,
        bandejaEmbalagem: parseFloat(lancForm.bandejaEmbalagem) || 0,
        valesDinheiro: parseFloat(lancForm.valesDinheiro) || 0,
        creditos: parseFloat(lancForm.creditos) || 0,
        debitosAnteriores: parseFloat(lancForm.debitosAnteriores) || 0,
      }
      const custoRes = await fetch('/api/lancamento-custo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(custoPayload) })
      if (custoRes.ok) { const c = await custoRes.json(); setCustosState(prev => [c, ...prev]) }
      toast.success('Lançamentos registrados', `${novos.length} item(ns)`)
      setShowLancModal(false)
    } catch { setLancError('Erro'); toast.error('Erro') } finally { setSavingLanc(false) }
  }

  async function handleDeleteLanc(id: string) {
    try {
      await fetch(`/api/colheita/${id}`, { method: 'DELETE' })
      setColheitas(prev => prev.filter(c => c.id !== id))
      toast.success('Lançamento excluído')
    } catch { toast.error('Erro ao excluir') }
    setLancMenuId(null)
  }

  const pagamentosConfirmados = useMemo(
    () => new Set(pagamentosState.filter(p => p.status === 'CONFIRMADO').map(p => p.parceiroId)),
    [pagamentosState]
  )

  const pagamentosMeeiros = useMemo(() => parceirosState.map(m => {
    const cs = colheitas.filter(c => c.parceiroId === m.id)
    const valorTotal = cs.reduce((s, c) => s + c.quantidadeTotal * c.preco * (c.percParceiro / 100), 0)
    const quitado = pagamentosConfirmados.has(m.id)
    return { id: m.id, nome: m.nome, chavePix: m.chavePix, valorReceber: quitado ? 0 : valorTotal, emprestimo: 0, descEmprestimo: 0, valorFinal: quitado ? 0 : valorTotal }
  }), [colheitas, parceirosState, pagamentosConfirmados])

  const custosPorProdutor = useMemo(() => {
    const map: Record<string, { combustivel: number; bandejaEmbalagem: number; valesDinheiro: number; creditos: number; debitosAnteriores: number; lancamentos: { data: string; rocaId: string | null; combustivel: number; bandejaEmbalagem: number; valesDinheiro: number; creditos: number; debitosAnteriores: number }[] }> = {}
    for (const c of custosState) {
      if (!c.produtorId) continue
      if (!map[c.produtorId]) map[c.produtorId] = { combustivel: 0, bandejaEmbalagem: 0, valesDinheiro: 0, creditos: 0, debitosAnteriores: 0, lancamentos: [] }
      map[c.produtorId].combustivel        += c.combustivel
      map[c.produtorId].bandejaEmbalagem   += c.bandejaEmbalagem
      map[c.produtorId].valesDinheiro      += c.valesDinheiro
      map[c.produtorId].creditos           += c.creditos
      map[c.produtorId].debitosAnteriores  += c.debitosAnteriores
      map[c.produtorId].lancamentos.push({ data: c.data, rocaId: c.rocaId, combustivel: c.combustivel, bandejaEmbalagem: c.bandejaEmbalagem, valesDinheiro: c.valesDinheiro, creditos: c.creditos, debitosAnteriores: c.debitosAnteriores })
    }
    return map
  }, [custosState])

  const filteredRocas = useMemo(() => rocas.filter(r =>
    r.nome.toLowerCase().includes(search.toLowerCase()) ||
    (r.localizacao ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r.produtor?.nome ?? '').toLowerCase().includes(search.toLowerCase())
  ), [rocas, search])
  const filteredProdutores = useMemo(() => produtoresState.filter(p =>
    p.nome.toLowerCase().includes(searchProdutor.toLowerCase()) ||
    (p.codigo ?? '').toLowerCase().includes(searchProdutor.toLowerCase()) ||
    (p.cpf ?? '').includes(searchProdutor) || (p.cnpj ?? '').includes(searchProdutor)
  ), [produtoresState, searchProdutor])
  const filteredMeeiros = useMemo(() => parceirosState.filter(p =>
    p.nome.toLowerCase().includes(searchMeeiro.toLowerCase()) ||
    (p.codigo ?? '').toLowerCase().includes(searchMeeiro.toLowerCase()) ||
    (p.cpf ?? '').includes(searchMeeiro)
  ), [parceirosState, searchMeeiro])
  const filteredProdutos = useMemo(() => produtosState.filter(p =>
    p.nome.toLowerCase().includes(searchProduto.toLowerCase()) ||
    (p.sku ?? '').toLowerCase().includes(searchProduto.toLowerCase())
  ), [produtosState, searchProduto])
  const filteredLanc = useMemo(() => colheitas.filter(c =>
    (c.rocaNome ?? '').toLowerCase().includes(searchLanc.toLowerCase()) ||
    (c.parceiroNome ?? '').toLowerCase().includes(searchLanc.toLowerCase()) ||
    c.produtoNome.toLowerCase().includes(searchLanc.toLowerCase())
  ), [colheitas, searchLanc])

  const meeirosDoProdutor = useMemo(() => parceirosState.filter(p => p.produtorId === lancForm.produtorId), [parceirosState, lancForm.produtorId])
  const rocasDoProdutor = useMemo(() => rocas.filter(r => r.produtor?.id === lancForm.produtorId), [rocas, lancForm.produtorId])

  function abrirJanela(html: string) {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    setTimeout(() => w.print(), 400)
  }

  const estiloRel = `<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:24px;color:#111827}h1{font-size:18px;color:#2d3561;margin-bottom:4px}.sub{font-size:12px;color:#6b7280;margin-bottom:20px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f3f4f6;padding:8px 10px;text-align:left;font-weight:700;color:#374151}td{padding:8px 10px;border-bottom:1px solid #f3f4f6}.bold{font-weight:700}@media print{body{padding:0}}</style>`

  function filtrarNotasColheitas() {
    return colheitas.filter(c => {
      if (notasProdId && c.produtorId !== notasProdId) return false
      if (notasRocaId && c.rocaId !== notasRocaId) return false
      if (notasProdutoId && c.produtoId !== notasProdutoId) return false
      if (notasDateI && c.data < notasDateI) return false
      if (notasDateF && c.data > notasDateF + 'T23:59:59') return false
      return true
    })
  }

  function gerarNotasLancamento() {
    const dados = filtrarNotasColheitas()
    const total = dados.reduce((s, c) => s + c.quantidadeTotal * c.preco, 0)
    const rows = dados.length === 0
      ? `<tr><td colspan="6" style="text-align:center;padding:24px;color:#9ca3af">Nenhum lançamento encontrado</td></tr>`
      : dados.map(c => `<tr><td>${fmtDate(c.data)}</td><td>${c.rocaNome ?? '—'}</td><td>${c.produtoNome}</td><td>${fmtNum(c.quantidadeTotal, 0)}</td><td>${fmtCurrency(c.preco)}</td><td class="bold">${fmtCurrency(c.quantidadeTotal * c.preco)}</td></tr>`).join('')
    abrirJanela(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Notas de Lançamento</title>${estiloRel}</head><body><h1>Notas de Lançamento</h1><p class="sub">Gerado em ${new Date().toLocaleString('pt-BR')}</p><table><thead><tr><th>Data</th><th>Roça</th><th>Produto</th><th>Qtde</th><th>Valor Unit.</th><th>Total</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="5" class="bold" style="padding:10px">Total</td><td class="bold" style="padding:10px">${fmtCurrency(total)}</td></tr></tfoot></table></body></html>`)
  }

  function gerarRelatorioGeral() {
    const dados = filtrarNotasColheitas()
    const total = dados.reduce((s, c) => s + c.quantidadeTotal * c.preco, 0)
    const rows = dados.length === 0
      ? `<tr><td colspan="9" style="text-align:center;padding:24px;color:#9ca3af">Nenhum lançamento encontrado</td></tr>`
      : dados.map(c => { const vm = c.quantidadeTotal * c.preco * (c.percParceiro / 100); return `<tr><td>${fmtDate(c.data)}</td><td>${c.rocaNome ?? '—'}</td><td>${c.produtoNome}</td><td>${fmtNum(c.quantidadeTotal, 0)}</td><td>${fmtCurrency(c.preco)}</td><td>${c.parceiroNome ?? '—'}</td><td>${c.percParceiro}%</td><td>${fmtCurrency(vm)}</td><td class="bold">${fmtCurrency(c.quantidadeTotal * c.preco)}</td></tr>` }).join('')
    abrirJanela(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório Geral de Lançamentos</title>${estiloRel}</head><body><h1>Relatório Geral de Lançamentos</h1><p class="sub">Gerado em ${new Date().toLocaleString('pt-BR')}</p><table><thead><tr><th>Data</th><th>Roça</th><th>Produto</th><th>Qtde</th><th>Valor Unit.</th><th>Meeiro</th><th>%</th><th>Valor Meeiro</th><th>Total</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="8" class="bold" style="padding:10px">Total</td><td class="bold" style="padding:10px">${fmtCurrency(total)}</td></tr></tfoot></table></body></html>`)
  }

  function gerarRelatorioMeeiro(forceMeeiroId?: string, forceMeeiroNome?: string) {
    const id = forceMeeiroId ?? meeiroRelId
    const dados = colheitas.filter(c => {
      if (id && c.parceiroId !== id) return false
      if (meeiroRelDateI && c.data < meeiroRelDateI) return false
      if (meeiroRelDateF && c.data > meeiroRelDateF + 'T23:59:59') return false
      return true
    })
    const meeiro = forceMeeiroNome ?? parceirosState.find(p => p.id === id)?.nome
    const totalMeeiro = dados.reduce((s, c) => s + c.quantidadeTotal * c.preco * (c.percParceiro / 100), 0)
    const rows = dados.length === 0
      ? `<tr><td colspan="7" style="text-align:center;padding:24px;color:#9ca3af">Nenhum lançamento encontrado</td></tr>`
      : dados.map(c => `<tr><td>${fmtDate(c.data)}</td><td>${c.rocaNome ?? '—'}</td><td>${c.produtoNome}</td><td>${fmtNum(c.quantidadeTotal, 0)}</td><td>${fmtCurrency(c.preco)}</td><td>${c.percParceiro}%</td><td class="bold">${fmtCurrency(c.quantidadeTotal * c.preco * (c.percParceiro / 100))}</td></tr>`).join('')
    abrirJanela(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Lançamentos de Meeiro${meeiro ? ' - ' + meeiro : ''}</title>${estiloRel}</head><body><h1>Lançamentos de Meeiro${meeiro ? ': ' + meeiro : ''}</h1><p class="sub">Gerado em ${new Date().toLocaleString('pt-BR')}</p><table><thead><tr><th>Data</th><th>Roça</th><th>Produto</th><th>Qtde</th><th>Valor Unit.</th><th>%</th><th>Valor Meeiro</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="6" class="bold" style="padding:10px">Total a receber</td><td class="bold" style="padding:10px">${fmtCurrency(totalMeeiro)}</td></tr></tfoot></table></body></html>`)
  }

  function gerarComprovante(p: NonNullable<typeof pagarModal>) {
    const dados = colheitas.filter(c => c.parceiroId === p.id)
    const rows = dados.map(c => `<tr><td>${fmtDate(c.data)}</td><td>${c.rocaNome ?? '—'}</td><td>${c.produtoNome}</td><td>${fmtNum(c.quantidadeTotal, 0)}</td><td>${fmtCurrency(c.preco)}</td><td>${c.percParceiro}%</td><td class="bold">${fmtCurrency(c.quantidadeTotal * c.preco * (c.percParceiro / 100))}</td></tr>`).join('')
    abrirJanela(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comprovante de Pagamento - ${p.nome}</title>${estiloRel}</head><body><h1>Comprovante de Pagamento</h1><p class="sub">Meeiro: ${p.nome} | Data: ${fmtDate(pagarData)} | Forma: ${pagarFormaPag}${pagarConta ? ' — ' + pagarConta : ''}${pagarObs ? ' | Obs: ' + pagarObs : ''}</p><table><thead><tr><th>Data</th><th>Roça</th><th>Produto</th><th>Qtde</th><th>Valor Unit.</th><th>%</th><th>Valor Meeiro</th></tr></thead><tbody>${rows || '<tr><td colspan="7" style="text-align:center;padding:24px;color:#9ca3af">Nenhum lançamento</td></tr>'}</tbody><tfoot><tr><td colspan="3" class="bold" style="padding:10px">PIX: ${p.chavePix ?? '—'}</td><td colspan="3" class="bold" style="padding:10px">Emprést. desc.: ${fmtCurrency(p.descEmprestimo)}</td><td class="bold" style="padding:10px">Líquido: ${fmtCurrency(p.valorFinal)}</td></tr></tfoot></table></body></html>`)
  }

  function gerarRelatorioRepasse() {
    const dados = colheitas.filter(c => {
      if (repParcId && c.parceiroId !== repParcId) return false
      if (repDateI && c.data < repDateI) return false
      if (repDateF && c.data > repDateF + 'T23:59:59') return false
      if (repRocaId && c.rocaId !== repRocaId) return false
      return true
    })
    const parc = parceirosState.find(p => p.id === repParcId)
    const totalRep = dados.reduce((s, c) => s + c.quantidadeTotal * c.preco * (c.percParceiro / 100), 0)
    const rows = dados.length === 0
      ? `<tr><td colspan="7" style="text-align:center;padding:24px;color:#9ca3af">Nenhum registro encontrado</td></tr>`
      : dados.map(c => `<tr><td>${c.parceiroNome ?? '—'}</td><td>${fmtDate(c.data)}</td><td>${c.rocaNome ?? '—'}</td><td>${c.produtoNome}</td><td>${fmtNum(c.quantidadeTotal, 0)}</td><td>${c.percParceiro}%</td><td class="bold">${fmtCurrency(c.quantidadeTotal * c.preco * (c.percParceiro / 100))}</td></tr>`).join('')
    abrirJanela(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Repasse ao Parceiro${parc ? ' - ' + parc.nome : ''}</title>${estiloRel}</head><body><h1>Relatório de Repasse ao Parceiro${parc ? ': ' + parc.nome : ''}</h1><p class="sub">Gerado em ${new Date().toLocaleString('pt-BR')}</p><table><thead><tr><th>Meeiro</th><th>Data</th><th>Roça</th><th>Produto</th><th>Qtde</th><th>%</th><th>Valor Repasse</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="6" class="bold" style="padding:10px">Total</td><td class="bold" style="padding:10px">${fmtCurrency(totalRep)}</td></tr></tfoot></table></body></html>`)
  }

  function gerarRelatorioEmprestimos() {
    const dadosFiltrados = pagamentosMeeiros.filter(m => {
      if (empRocaId) return colheitas.some(c => c.parceiroId === m.id && c.rocaId === empRocaId)
      return true
    })
    const rows = dadosFiltrados.length === 0
      ? `<tr><td colspan="5" style="text-align:center;padding:24px;color:#9ca3af">Nenhum empréstimo registrado</td></tr>`
      : dadosFiltrados.map(m => `<tr><td>${m.nome}</td><td>${m.chavePix ?? '—'}</td><td class="bold">${fmtCurrency(m.emprestimo)}</td><td>${fmtCurrency(m.descEmprestimo)}</td><td class="bold">${fmtCurrency(m.valorFinal)}</td></tr>`).join('')
    abrirJanela(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Empréstimos de Meeiros</title>${estiloRel}</head><body><h1>Relatório de Empréstimos de Meeiros</h1><p class="sub">Gerado em ${new Date().toLocaleString('pt-BR')}</p><table><thead><tr><th>Meeiro</th><th>Chave PIX</th><th>Empréstimo</th><th>Desc. Empréstimo</th><th>Valor Final</th></tr></thead><tbody>${rows}</tbody></table></body></html>`)
  }

  return (
    <div style={{ padding: '28px 32px', background: BG, minHeight: '100vh' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 26 }}>🌾</span> Controle de Roça
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4, marginBottom: 0 }}>
          Cadastros de produtor, roça, meeiro, produtos e lançamento da produção
        </p>
      </div>

      <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: 28, overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? NAVY : '#6b7280',
              borderBottom: activeTab === tab.id ? `3px solid ${NAVY}` : '3px solid transparent',
              marginBottom: -2, whiteSpace: 'nowrap',
            }}>{tab.label}</button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <div style={{ position: 'relative' }}>
              <select value={filterRoca} onChange={e => setFilterRoca(e.target.value)}
                style={{ appearance: 'none', background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 34px 8px 14px', fontSize: 13, color: NAVY, cursor: 'pointer', fontWeight: 500, outline: 'none' }}>
                <option value="todas">Todas as roças</option>
                {rocas.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
              <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: 14, position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Produtores ativos',     value: produtoresAtivos,               icon: <FontAwesomeIcon icon={faUsers} style={{ fontSize: 20 }} />,      color: BLUE },
              { label: 'Roças ativas',          value: rocasAtivas,                    icon: <FontAwesomeIcon icon={faLeaf} style={{ fontSize: 20 }} />,       color: GREEN },
              { label: 'Lançamentos filtrados', value: lancamentosFiltrados,           icon: <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 20 }} />,   color: ORANGE },
              { label: 'Valor total filtrado',  value: fmtCurrency(valorTotalFiltrado),icon: <FontAwesomeIcon icon={faDollarSign} style={{ fontSize: 20 }} />, color: TEAL },
            ].map((kpi, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6, fontWeight: 500 }}>{kpi.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: NAVY }}>{kpi.value}</div>
                </div>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: kpi.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: kpi.color }}>{kpi.icon}</span>
                </div>
              </motion.div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 20 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: 0 }}>Visão geral da produção</h3>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>Resumo rápido para acompanhar o status operacional da roça.</p>
                </div>
                <button onClick={() => setActiveTab('lancamentos')} style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px 14px', fontSize: 12, color: '#374151', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  Ver lançamentos
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  { label: 'Quantidade total de caixa', value: fmtNum(qtdTotalCaixas, 0) },
                  { label: 'Valor médio por caixa',     value: fmtCurrency(valorMedioCaixa) },
                  { label: 'Meeiros cadastrados',       value: totalMeeiros },
                ].map((item, i) => (
                  <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', border: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{item.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: NAVY }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: 0 }}>Plantio, colheita e produtividade</h3>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>Datas de plantio e início da colheita, mudas plantadas, quantidade colhida e colheita por pé (mesmo filtro de roça do topo).</p>
                </div>
                <button onClick={() => setActiveTab('rocas')} style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px 14px', fontSize: 12, color: '#374151', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  Editar roças
                </button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #e5e7eb' }}>
                    {['Roça', 'Data do plantio', 'Início da colheita', 'Mudas plantadas', 'Qtd. colhida', 'Colheita por pé'].map(h => (
                      <th key={h} style={{ padding: '8px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rocas.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '16px 0', color: '#9ca3af' }}>Nenhuma roça cadastrada</td></tr>}
                  {rocas.filter(r => filterRoca === 'todas' || r.id === filterRoca).map(r => {
                    const qtd = colheitas.filter(c => c.rocaId === r.id).reduce((s, c) => s + c.quantidadeTotal, 0)
                    const colhidaPe = r.mudasPlantadas && r.mudasPlantadas > 0 ? qtd / r.mudasPlantadas : 0
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px 8px', fontWeight: 600, color: BLUE, fontSize: 13 }}>{r.codigo ? `${r.codigo} – ${r.nome}` : r.nome}</td>
                        <td style={{ padding: '12px 8px', color: '#374151', fontSize: 13 }}>{fmtDate(r.dataPlantio)}</td>
                        <td style={{ padding: '12px 8px', color: '#374151', fontSize: 13 }}>{fmtDate(r.dataColheita)}</td>
                        <td style={{ padding: '12px 8px', color: '#374151', fontSize: 13 }}>{r.mudasPlantadas != null ? fmtNum(r.mudasPlantadas, 0) : '—'}</td>
                        <td style={{ padding: '12px 8px', color: '#374151', fontSize: 13 }}>{fmtNum(qtd, 0)}</td>
                        <td style={{ padding: '12px 8px', color: '#374151', fontSize: 13 }}>{colhidaPe > 0 ? fmtNum(colhidaPe, 3) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '12px 0 0', fontStyle: 'italic' }}>
                Colheita por pé: média (total colhido ÷ pés nos lançamentos, ou ÷ mudas se não houver pés informados).
              </p>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: 0 }}>Produção por período</h3>
                <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>
                  Últimos 6 meses: quantidade de caixas (soma das quantidades dos lançamentos) por roça. Mesmos filtros de roça do topo e o resumo das roças abaixo.
                </p>
              </div>
              <div style={{ position: 'relative' }}>
                <select style={{ appearance: 'none', background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px 30px 6px 12px', fontSize: 12, color: '#374151', cursor: 'pointer', fontWeight: 500, outline: 'none' }}>
                  <option>Todos os meses</option>
                </select>
                <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: 12, position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }} />
              </div>
            </div>
            <BarChart data={chartData} keys={rocaNames} colors={CHART_COLORS} />
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12, justifyContent: 'center' }}>
              {rocaNames.map((name, i) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{name}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {(() => {
              const diasComProducao = new Set(filteredColheitas.map(c => c.data.split('T')[0])).size
              return [
                { label: 'Produção do mês (quantidade)', value: fmtNum(producaoMesQtd, 0),       sub: 'Referência: Todos os meses' },
                { label: 'Produção do mês (valor)',      value: fmtCurrency(producaoMesValor),    sub: 'Referência: Todos os meses' },
                { label: 'Valor médio por caixa',        value: fmtCurrency(valorMedioCaixaMes),  sub: '' },
                { label: 'Média diária (só dias com lançamento)', value: diasComProducao > 0 ? fmtNum(qtdTotalCaixas / diasComProducao, 0) : '0', sub: `${fmtNum(qtdTotalCaixas, 0)} caixas ÷ ${diasComProducao} dia(s) com produção registrada · referência: Todos os meses` },
              ].map((kpi, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{kpi.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: NAVY }}>{kpi.value}</div>
                  {kpi.sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>{kpi.sub}</div>}
                </div>
              ))
            })()}
          </div>

          <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: 0 }}>Resumo das roças</h3>
              <button onClick={() => setActiveTab('rocas')} style={{ background: 'none', border: 'none', fontSize: 12, color: BLUE, cursor: 'pointer', fontWeight: 500 }}>
                Ver cadastro de roças
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  {['Código', 'Roça', 'Produtor', 'Lançamentos', 'Quantidade', 'Valor', 'Último lançamento'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resumoRocas.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af' }}>Nenhuma roça cadastrada</td></tr>}
                {resumoRocas.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151' }}>{r.codigo}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: BLUE, fontSize: 13 }}>{r.nome}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151' }}>{r.produtor}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151' }}>{r.lancamentos}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151' }}>{fmtNum(r.quantidade, 0)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151' }}>{fmtCurrency(r.valor)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151' }}>{fmtDate(r.ultimoLancamento)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'produtores' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: 16, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
              <input value={searchProdutor} onChange={e => setSearchProdutor(e.target.value)} placeholder="Buscar por nome, código ou CPF/CNPJ..."
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '10px 14px 10px 36px', fontSize: 14, color: NAVY, outline: 'none', boxSizing: 'border-box', background: '#fff' }} />
            </div>
            <button onClick={openCreateProdutor} style={{ display: 'flex', alignItems: 'center', gap: 8, background: BLUE, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              <FontAwesomeIcon icon={faPlus} style={{ fontSize: 16 }} /> Novo Produtor
            </button>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
                  {['Código', 'Nome / Razão social', 'CPF/CNPJ', 'Telefone', 'Endereço', 'Ações'].map(h => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: BLUE, borderBottom: '2px solid #e5e7eb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProdutores.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af' }}>Nenhum produtor encontrado</td></tr>
                ) : filteredProdutores.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: NAVY }}>{p.codigo ?? '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: BLUE, fontWeight: 500, textTransform: 'uppercase' }}>{p.nome}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>{(p.tipo === 'JURIDICA' ? p.cnpj : p.cpf) ?? '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>{p.telefone ?? '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.endereco ?? '—'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEditProdutor(p)} style={{ background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', display: 'flex' }}><FontAwesomeIcon icon={faPenToSquare} style={{ fontSize: 14 }} /></button>
                        <button onClick={() => setDeleteProdutorTarget(p)} style={{ background: '#fee2e2', color: PINK, border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', display: 'flex' }}><FontAwesomeIcon icon={faTrash} style={{ fontSize: 14 }} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'rocas' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: 16, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, localização ou produtor..."
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '10px 14px 10px 36px', fontSize: 14, color: NAVY, outline: 'none', boxSizing: 'border-box', background: '#fff' }} />
            </div>
            <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 8, background: BLUE, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              <FontAwesomeIcon icon={faPlus} style={{ fontSize: 16 }} /> Nova Roça
            </button>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fff', borderBottom: '2px solid #e5e7eb' }}>
                  {['Código', 'Nome', 'Localização', 'Produtor', 'Qtd. colhida', 'Colhida/pé', 'Ações'].map(h => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: BLUE }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRocas.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af' }}>Nenhuma roça encontrada</td></tr>
                ) : filteredRocas.map(r => {
                  const qtdColhida = colheitas.filter(c => c.rocaId === r.id).reduce((s, c) => s + c.quantidadeTotal, 0)
                  const colhidaPe = r.mudasPlantadas && r.mudasPlantadas > 0 ? qtdColhida / r.mudasPlantadas : 0
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: NAVY }}>{r.codigo ?? '—'}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: NAVY }}>{r.nome}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>{r.localizacao ?? '—'}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: BLUE, fontWeight: 600 }}>
                        {r.produtor ? `${r.produtor.codigo ?? ''} – ${r.produtor.nome}` : '—'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: GREEN, fontWeight: 600 }}>{fmtNum(qtdColhida, 0)}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>{colhidaPe > 0 ? fmtNum(colhidaPe, 2) : '—'}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openEdit(r)} style={{ background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', display: 'flex' }}><FontAwesomeIcon icon={faPenToSquare} style={{ fontSize: 14 }} /></button>
                          <button onClick={() => setDeleteTarget(r)} style={{ background: '#fee2e2', color: PINK, border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', display: 'flex' }}><FontAwesomeIcon icon={faTrash} style={{ fontSize: 14 }} /></button>
                          <button onClick={() => setSelected(r)} style={{ background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', display: 'flex' }}><FontAwesomeIcon icon={faChevronRight} style={{ fontSize: 14 }} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'meeiros' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: 16, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
              <input value={searchMeeiro} onChange={e => setSearchMeeiro(e.target.value)} placeholder="Buscar por nome, código ou CPF..."
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '10px 14px 10px 36px', fontSize: 14, color: NAVY, outline: 'none', boxSizing: 'border-box', background: '#fff' }} />
            </div>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              <FontAwesomeIcon icon={faFilter} style={{ fontSize: 14 }} /> Filtros
            </button>
            <button onClick={openCreateMeeiro} style={{ display: 'flex', alignItems: 'center', gap: 8, background: BLUE, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              <FontAwesomeIcon icon={faPlus} style={{ fontSize: 16 }} /> Novo Meeiro
            </button>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fff', borderBottom: '2px solid #e5e7eb' }}>
                  {['Código', 'Nome', 'Nome fantasia', 'CPF', 'Telefone', '% padrão', 'Ações'].map(h => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: BLUE }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMeeiros.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af' }}>Nenhum meeiro cadastrado</td></tr>
                ) : filteredMeeiros.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: NAVY }}>{m.codigo ?? '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: BLUE, fontWeight: 600, textTransform: 'uppercase' }}>{m.nome}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>{m.nomeFantasia ?? '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>{m.cpf ?? '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>{m.telefone ?? '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: NAVY, fontWeight: 600 }}>{m.percentual}%</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEditMeeiro(m)} style={{ background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', display: 'flex' }}><FontAwesomeIcon icon={faPenToSquare} style={{ fontSize: 14 }} /></button>
                        <button onClick={() => setDeleteMeeiroTarget(m)} style={{ background: '#fee2e2', color: PINK, border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', display: 'flex' }}><FontAwesomeIcon icon={faTrash} style={{ fontSize: 14 }} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'produtos' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: 16, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
              <input value={searchProduto} onChange={e => setSearchProduto(e.target.value)} placeholder="Buscar produto..."
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '10px 14px 10px 36px', fontSize: 14, color: NAVY, outline: 'none', boxSizing: 'border-box', background: '#fff' }} />
            </div>
            <button onClick={openCreateProduto} style={{ display: 'flex', alignItems: 'center', gap: 8, background: BLUE, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              <FontAwesomeIcon icon={faPlus} style={{ fontSize: 16 }} /> Novo Produto
            </button>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #f3f4f6' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: NAVY, margin: 0 }}>Catálogo de produtos</h3>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>
                Produtos disponíveis para lançamento de produção. Use &quot;Fazer lançamento&quot; para registrar uma colheita.
              </p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
                  {['Nome', 'Código/SKU', 'Unidade', 'Valor unit.', 'Estoque', 'Ações'].map(h => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: BLUE }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProdutos.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af' }}>Nenhum produto cadastrado</td></tr>
                ) : filteredProdutos.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: BLUE, fontWeight: 600, textTransform: 'uppercase' }}>{p.nome}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>{p.sku ?? '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>{p.unidade}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: NAVY, fontWeight: 600 }}>{fmtCurrency(p.preco)}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>{fmtNum(p.estoqueMinimo, 0)}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { setActiveTab('lancamentos'); openCreateLanc(p.id) }} style={{ background: BLUE, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Fazer lançamento</button>
                        <button onClick={() => openEditProduto(p)} style={{ background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', display: 'flex' }}><FontAwesomeIcon icon={faPenToSquare} style={{ fontSize: 14 }} /></button>
                        <button onClick={() => setDeleteProdutoTarget(p)} style={{ background: '#fee2e2', color: PINK, border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', display: 'flex' }}><FontAwesomeIcon icon={faTrash} style={{ fontSize: 14 }} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'lancamentos' && (
        <div>
          <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              <FontAwesomeIcon icon={faFilter} style={{ fontSize: 14 }} /> Filtros
            </button>
            <button style={{ background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              Mais recentes primeiro
            </button>
            <div style={{ flex: 1, position: 'relative', minWidth: 200 }}>
              <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: 14, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
              <input value={searchLanc} onChange={e => setSearchLanc(e.target.value)} placeholder="Buscar por roça, meeiro ou produto..."
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 12px 8px 32px', fontSize: 13, color: NAVY, outline: 'none', boxSizing: 'border-box', background: '#fff' }} />
            </div>
            <button onClick={() => setActiveTab('notas')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 14 }} /> Relatórios de lançamento
            </button>
            <button onClick={async () => {
              const r = await fetch('/api/estoque/sync-lancamentos', { method: 'POST' })
              const d = await r.json()
              toast.success('Estoque sincronizado', `${d.sincronizados} produto(s) atualizados`)
            }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', color: TEAL, border: `1.5px solid ${TEAL}`, borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              ↻ Sincronizar estoque
            </button>
            <button onClick={() => openCreateLanc()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: NAVY, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <FontAwesomeIcon icon={faPlus} style={{ fontSize: 14 }} /> Novo Lançamento
            </button>
          </div>

          {(() => {
            const valorBruto     = filteredLanc.reduce((s, c) => s + c.quantidadeTotal * c.preco, 0)
            const totalDeducoes  = custosState.reduce((s, k) => s + k.combustivel + k.bandejaEmbalagem + k.valesDinheiro + k.creditos + k.debitosAnteriores, 0)
            const valorLiquido   = valorBruto - totalDeducoes
            return (
              <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: NAVY, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <span>Lançamentos no período: <strong>{filteredLanc.length}</strong></span>
                <span>|</span>
                <span>Soma dos produtos (qtde): <strong>{fmtNum(filteredLanc.reduce((s, c) => s + c.quantidadeTotal, 0), 0)}</strong></span>
                <span>|</span>
                <span>Valor bruto: <strong>{fmtCurrency(valorBruto)}</strong></span>
                {totalDeducoes > 0 && <>
                  <span>|</span>
                  <span style={{ color: PINK }}>Deduções: <strong>- {fmtCurrency(totalDeducoes)}</strong></span>
                  <span>|</span>
                  <span style={{ color: GREEN }}>Valor líquido: <strong>{fmtCurrency(valorLiquido)}</strong></span>
                </>}
              </div>
            )
          })()}

          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '14px 16px', textAlign: 'left' }}><input type="checkbox" /></th>
                  {['Data', 'Roça', 'Produtos', 'Qtde', 'Valor Unit.', 'Meeiro', '%', 'Valor do meeiro', 'Valor total', 'Ações'].map(h => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLanc.length === 0 ? (
                  <tr><td colSpan={11} style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af' }}>Nenhum lançamento</td></tr>
                ) : filteredLanc.map(c => {
                  const valorMeeiro = c.quantidadeTotal * c.preco * (c.percParceiro / 100)
                  const valorTotal  = c.quantidadeTotal * c.preco
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '14px 16px' }}><input type="checkbox" /></td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>{fmtDate(c.data)}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: NAVY, fontWeight: 600 }}>{c.rocaNome ?? '—'}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151', textTransform: 'uppercase' }}>{c.produtoNome}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>{fmtNum(c.quantidadeTotal, 0)}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>{fmtCurrency(c.preco)}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151', textTransform: 'uppercase' }}>{c.parceiroNome ?? '—'}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>{c.percParceiro}%</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: NAVY, fontWeight: 600 }}>{fmtCurrency(valorMeeiro)}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: GREEN, fontWeight: 600 }}>{fmtCurrency(valorTotal)}</td>
                      <td style={{ padding: '14px 16px', position: 'relative' }}>
                        <button onClick={e => {
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                          setLancMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                          setLancMenuId(lancMenuId === c.id ? null : c.id)
                        }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}>
                          <FontAwesomeIcon icon={faEllipsisH} style={{ fontSize: 16 }} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Menu flutuante dos 3 pontos */}
          {lancMenuId && (() => {
            const c = colheitas.find(x => x.id === lancMenuId)
            if (!c) return null
            return (
              <>
                <div onClick={() => setLancMenuId(null)} style={{ position: 'fixed', inset: 0, zIndex: 39 }} />
                <div style={{ position: 'fixed', top: lancMenuPos.top, right: lancMenuPos.right, background: '#fff', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 40, minWidth: 180, overflow: 'hidden' }}>
                  <button onClick={() => { setLancViewId(c.id); setLancMenuId(null) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#374151', textAlign: 'left' }}>
                    <FontAwesomeIcon icon={faClipboardList} style={{ fontSize: 14, color: BLUE }} /> Ver lançamento
                  </button>
                  <button onClick={() => {
                    setLancEditId(c.id)
                    setLancEditForm({ data: c.data.split('T')[0], quantidade: String(c.quantidadeTotal), preco: String(c.preco), observacao: '' })
                    setLancMenuId(null)
                  }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#374151', textAlign: 'left' }}>
                    <FontAwesomeIcon icon={faPenToSquare} style={{ fontSize: 14, color: ORANGE }} /> Editar
                  </button>
                  <button onClick={() => handleDeleteLanc(c.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: PINK, textAlign: 'left', borderTop: '1px solid #f3f4f6' }}>
                    <FontAwesomeIcon icon={faTrash} style={{ fontSize: 14 }} /> Excluir
                  </button>
                </div>
              </>
            )
          })()}

          {/* Modal VER lançamento */}
          {lancViewId && (() => {
            const c = colheitas.find(x => x.id === lancViewId)
            if (!c) return null
            const parceiro = parceiros.find(p => p.id === c.parceiroId)
            const valorBruto = c.quantidadeTotal * c.preco
            const embaDeducao = (parceiro?.valorEmba ?? 0) * c.quantidadeTotal
            const custo = custosState.find(k => k.produtorId === c.produtorId && k.data.split('T')[0] === c.data.split('T')[0])
            const outrasDeducoes = custo ? custo.combustivel + custo.valesDinheiro + custo.creditos + custo.debitosAnteriores : 0
            const valorLiquido = valorBruto - embaDeducao - outrasDeducoes
            return (
              <>
                <div onClick={() => setLancViewId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 40 }} />
                <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: 'var(--sidebar-w, 248px)', zIndex: 50, pointerEvents: 'none' }}>
                  <div style={{ width: 480, background: '#fff', borderRadius: 16, padding: '28px 32px', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', pointerEvents: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <h2 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: 0 }}>Detalhes do Lançamento</h2>
                      <button onClick={() => setLancViewId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><FontAwesomeIcon icon={faXmark} style={{ fontSize: 18 }} /></button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                      {[
                        ['Data',     fmtDate(c.data)],
                        ['Roça',     c.rocaNome ?? '—'],
                        ['Produto',  c.produtoNome],
                        ['Meeiro',   c.parceiroNome ?? '—'],
                        ['Produtor', c.produtorNome ?? '—'],
                        ['Qtde',     fmtNum(c.quantidadeTotal, 0)],
                        ['Preço un.', fmtCurrency(c.preco)],
                        ['% Meeiro', `${c.percParceiro}%`],
                        ['Valor bruto', fmtCurrency(valorBruto)],
                      ].map(([label, val]) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                          <span style={{ color: '#6b7280', fontWeight: 500 }}>{label}</span>
                          <span style={{ color: NAVY, fontWeight: 600 }}>{val}</span>
                        </div>
                      ))}
                      <div style={{ marginTop: 8, fontWeight: 700, color: NAVY, fontSize: 13 }}>Deduções do lançamento</div>
                      {embaDeducao > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
                          <span style={{ color: '#6b7280' }}>
                            Bandeja/Embalagens
                            <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>({fmtCurrency(parceiro?.valorEmba ?? 0)} × {fmtNum(c.quantidadeTotal, 0)} cx)</span>
                          </span>
                          <span style={{ color: PINK }}>- {fmtCurrency(embaDeducao)}</span>
                        </div>
                      )}
                      {custo && custo.combustivel > 0      && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}><span style={{ color: '#6b7280' }}>Combustível</span><span style={{ color: PINK }}>- {fmtCurrency(custo.combustivel)}</span></div>}
                      {custo && custo.valesDinheiro > 0    && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}><span style={{ color: '#6b7280' }}>Vales Dinheiro</span><span style={{ color: PINK }}>- {fmtCurrency(custo.valesDinheiro)}</span></div>}
                      {custo && custo.creditos > 0         && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}><span style={{ color: '#6b7280' }}>Créditos Coleta/Film.</span><span style={{ color: PINK }}>- {fmtCurrency(custo.creditos)}</span></div>}
                      {custo && custo.debitosAnteriores > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}><span style={{ color: '#6b7280' }}>Débitos Anteriores</span><span style={{ color: PINK }}>- {fmtCurrency(custo.debitosAnteriores)}</span></div>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '2px solid #e5e7eb', marginTop: 4 }}>
                        <span style={{ fontWeight: 700, color: NAVY }}>Valor líquido</span>
                        <span style={{ fontWeight: 700, color: GREEN, fontSize: 15 }}>{fmtCurrency(valorLiquido)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )
          })()}

          {/* Modal EDITAR lançamento */}
          {lancEditId && (() => {
            const c = colheitas.find(x => x.id === lancEditId)
            if (!c) return null
            async function salvarEdicao() {
              setSavingLancEdit(true)
              try {
                const qtd = parseFloat(lancEditForm.quantidade) || 0
                const prc = parseFloat(lancEditForm.preco) || 0
                const res = await fetch(`/api/colheita/${lancEditId}`, {
                  method: 'PUT', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ data: lancEditForm.data, quantidadeTotal: qtd, preco: prc, percParceiro: c!.percParceiro, percDono: 100 - c!.percParceiro }),
                })
                if (!res.ok) throw new Error()
                setColheitas(prev => prev.map(x => x.id === lancEditId ? { ...x, data: lancEditForm.data + 'T00:00:00.000Z', quantidadeTotal: qtd, preco: prc } : x))
                toast.success('Lançamento atualizado')
                setLancEditId(null)
              } catch { toast.error('Erro ao salvar') }
              finally { setSavingLancEdit(false) }
            }
            return (
              <>
                <div onClick={() => setLancEditId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 40 }} />
                <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: 'var(--sidebar-w, 248px)', zIndex: 50, pointerEvents: 'none' }}>
                  <div style={{ width: 420, background: '#fff', borderRadius: 16, padding: '28px 32px', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', pointerEvents: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <h2 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: 0 }}>Editar Lançamento</h2>
                      <button onClick={() => setLancEditId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><FontAwesomeIcon icon={faXmark} style={{ fontSize: 18 }} /></button>
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
                      <strong style={{ color: NAVY }}>{c.produtoNome}</strong> · {c.rocaNome ?? '—'} · Meeiro: {c.parceiroNome ?? '—'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <FormField label="Data">
                        <input type="date" style={inputStyle} value={lancEditForm.data} onChange={e => setLancEditForm(f => ({ ...f, data: e.target.value }))} />
                      </FormField>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <FormField label="Quantidade">
                          <input type="number" min="0" style={inputStyle} value={lancEditForm.quantidade} onChange={e => setLancEditForm(f => ({ ...f, quantidade: e.target.value }))} />
                        </FormField>
                        <FormField label="Preço un. (R$)">
                          <input type="number" min="0" step="0.01" style={inputStyle} value={lancEditForm.preco} onChange={e => setLancEditForm(f => ({ ...f, preco: e.target.value }))} />
                        </FormField>
                      </div>
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                        <button onClick={() => setLancEditId(null)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>Cancelar</button>
                        <button onClick={salvarEdicao} disabled={savingLancEdit}
                          style={{ background: BLUE, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: savingLancEdit ? 'not-allowed' : 'pointer', opacity: savingLancEdit ? 0.7 : 1 }}>
                          {savingLancEdit ? 'Salvando...' : 'Salvar alterações'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      )}

      {activeTab === 'pagamento' && (() => {
        const filtradosAberto = pagamentosMeeiros.filter(p => p.valorReceber > 0)
        const filtradosQuitados = pagamentosMeeiros.filter(p => p.valorReceber === 0)
        const lista = pagamentoStatus === 'aberto' ? filtradosAberto : filtradosQuitados
        return (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => setPagamentoStatus('aberto')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: pagamentoStatus === 'aberto' ? `2px solid ${BLUE}` : '1.5px solid #e5e7eb', background: pagamentoStatus === 'aberto' ? BLUE + '12' : '#fff', color: pagamentoStatus === 'aberto' ? BLUE : '#6b7280', cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                Em aberto
                <span style={{ background: pagamentoStatus === 'aberto' ? BLUE : '#e5e7eb', color: pagamentoStatus === 'aberto' ? '#fff' : '#6b7280', borderRadius: 999, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{filtradosAberto.length}</span>
              </button>
              <button onClick={() => setPagamentoStatus('quitado')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: pagamentoStatus === 'quitado' ? `2px solid ${BLUE}` : '1.5px solid #e5e7eb', background: pagamentoStatus === 'quitado' ? BLUE + '12' : '#fff', color: pagamentoStatus === 'quitado' ? BLUE : '#6b7280', cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
                Quitados
                <span style={{ background: pagamentoStatus === 'quitado' ? BLUE : '#e5e7eb', color: pagamentoStatus === 'quitado' ? '#fff' : '#6b7280', borderRadius: 999, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{filtradosQuitados.length}</span>
              </button>
              <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
                <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: 14, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                <input placeholder="Buscar por meeiro..." style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 12px 8px 34px', fontSize: 13, color: NAVY, outline: 'none', boxSizing: 'border-box', background: '#fff' }} />
              </div>
              <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                <FontAwesomeIcon icon={faFilter} style={{ fontSize: 14 }} /> Filtros
              </button>
              <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 14 }} /> Relatórios
              </button>
              <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                <FontAwesomeIcon icon={faClipboardList} style={{ fontSize: 14 }} /> Histórico de pagamentos
              </button>
            </div>
            {Object.keys(custosPorProdutor).length > 0 && (
              <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '16px 20px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 12 }}>Deduções registradas nos lançamentos</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(custosPorProdutor).map(([prodId, c]) => {
                    const prod = produtoresState.find(p => p.id === prodId)
                    const meirosDoProd = parceirosState.filter(m => m.produtorId === prodId).map(m => m.nome)
                    if (!c.valesDinheiro && !c.creditos && !c.debitosAnteriores) return null
                    return (
                      <div key={prodId} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', border: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: BLUE, marginBottom: 6 }}>
                          {prod?.nome ?? prodId}
                          {meirosDoProd.length > 0 && <span style={{ color: '#6b7280', fontWeight: 400, marginLeft: 8 }}>Meeiros: {meirosDoProd.join(', ')}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                          {c.valesDinheiro > 0 && <span style={{ fontSize: 12, color: PINK }}>Vales Dinheiro: <strong>{fmtCurrency(c.valesDinheiro)}</strong></span>}
                          {c.creditos > 0 && <span style={{ fontSize: 12, color: ORANGE }}>Créditos Coleta/Filmagem: <strong>{fmtCurrency(c.creditos)}</strong></span>}
                          {c.debitosAnteriores > 0 && <span style={{ fontSize: 12, color: PINK }}>Débitos Anteriores: <strong>{fmtCurrency(c.debitosAnteriores)}</strong></span>}
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                          {c.lancamentos.length} lançamento(s) registrado(s) — última atualização: {fmtDate(c.lancamentos[0]?.data ?? null)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
                    {['Meeiro', 'Chave PIX', 'Valor a receber', 'Emprést aberto', 'Desc emprést.', 'Valor final a pagar', 'Ações'].map(h => (
                      <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lista.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af' }}>{pagamentoStatus === 'aberto' ? 'Nenhum pagamento em aberto' : 'Nenhum pagamento quitado'}</td></tr>
                  ) : lista.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '16px', fontSize: 13, color: BLUE, fontWeight: 600, textTransform: 'uppercase' }}>{p.nome}</td>
                      <td style={{ padding: '16px', fontSize: 13, color: '#374151' }}>{p.chavePix ?? '—'}</td>
                      <td style={{ padding: '16px', fontSize: 13, color: '#374151' }}>{fmtCurrency(p.valorReceber)}</td>
                      <td style={{ padding: '16px', fontSize: 13, color: '#374151' }}>{fmtCurrency(p.emprestimo)}</td>
                      <td style={{ padding: '16px', fontSize: 13, color: '#374151' }}>{fmtCurrency(p.descEmprestimo)}</td>
                      <td style={{ padding: '16px', fontSize: 13, color: '#374151', fontWeight: 600 }}>{fmtCurrency(p.valorFinal)}</td>
                      <td style={{ padding: '16px' }}>
                        <button onClick={e => {
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                          setPagarMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right - 8 })
                          setPagarMenuId(pagarMenuId === p.id ? null : p.id)
                        }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}><FontAwesomeIcon icon={faEllipsisH} style={{ fontSize: 16 }} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {activeTab === 'pagamento-produtor' && (() => {
        const fechFiltrados = fechamentosState.filter(f => {
          if (fechProdutorFilter && f.produtorId !== fechProdutorFilter) return false
          if (fechStatusFilter !== 'TODOS' && f.status !== fechStatusFilter) return false
          return true
        })

        async function handleSaveFech() {
          if (!fechForm.produtorId) { setFechError('Produtor é obrigatório'); return }
          if (!fechForm.dataInicio || !fechForm.dataFim) { setFechError('Período é obrigatório'); return }
          if (!fechForm.dataPagamento) { setFechError('Data de pagamento é obrigatória'); return }
          setSavingFech(true); setFechError('')
          try {
            const res = await fetch('/api/fechamento', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                produtorId: fechForm.produtorId,
                dataInicio: fechForm.dataInicio,
                dataFim: fechForm.dataFim,
                dataPagamento: fechForm.dataPagamento,
                bandejaEmbalagem: Number(fechForm.bandejaEmbalagem) || 0,
                valesDinheiro: Number(fechForm.valesDinheiro) || 0,
                creditos: Number(fechForm.creditos) || 0,
                debitosAnteriores: Number(fechForm.debitosAnteriores) || 0,
              }),
            })
            if (!res.ok) throw new Error()
            const saved = await res.json()
            const produtor = produtoresState.find(p => p.id === saved.produtorId)
            const record: FechamentoRecord = {
              id: saved.id, produtorId: saved.produtorId,
              produtorNome: produtor?.nome ?? saved.produtor?.nome ?? '',
              dataInicio: saved.dataInicio, dataFim: saved.dataFim, dataPagamento: saved.dataPagamento,
              bandejaEmbalagem: saved.bandejaEmbalagem, valesDinheiro: saved.valesDinheiro,
              creditos: saved.creditos, debitosAnteriores: saved.debitosAnteriores,
              status: saved.status, createdAt: saved.createdAt,
            }
            setFechamentosState(prev => [record, ...prev])
            setShowFechModal(false)
            toast.success('Fechamento criado', produtor?.nome ?? '')
          } catch { setFechError('Erro ao salvar') }
          finally { setSavingFech(false) }
        }

        async function handleMarcarPago(id: string) {
          try {
            const res = await fetch(`/api/fechamento/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'PAGO' }),
            })
            if (!res.ok) throw new Error()
            setFechamentosState(prev => prev.map(f => f.id === id ? { ...f, status: 'PAGO' } : f))
            toast.success('Marcado como pago')
          } catch { toast.error('Erro ao atualizar') }
        }

        async function handleDeleteFech() {
          if (!deleteFechTarget) return
          setDeletingFech(true)
          try {
            await fetch(`/api/fechamento/${deleteFechTarget.id}`, { method: 'DELETE' })
            setFechamentosState(prev => prev.filter(f => f.id !== deleteFechTarget.id))
            setDeleteFechTarget(null)
            toast.success('Fechamento excluído')
          } catch { toast.error('Erro ao excluir') }
          finally { setDeletingFech(false) }
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `3px solid ${NAVY}` }}>
                <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Total de Fechamentos</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: NAVY }}>{fechamentosState.length}</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `3px solid ${ORANGE}` }}>
                <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Pendentes</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: ORANGE }}>{fechamentosState.filter(f => f.status === 'PENDENTE').length}</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `3px solid ${GREEN}` }}>
                <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Pagos</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: GREEN }}>{fechamentosState.filter(f => f.status === 'PAGO').length}</div>
              </div>
            </div>

            {/* Filter / action bar */}
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '16px 20px' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <select style={{ ...inputStyle, width: 220 }} value={fechProdutorFilter} onChange={e => setFechProdutorFilter(e.target.value)}>
                  <option value="">Todos os produtores</option>
                  {produtoresState.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
                <select style={{ ...inputStyle, width: 160 }} value={fechStatusFilter} onChange={e => setFechStatusFilter(e.target.value as 'TODOS' | 'PENDENTE' | 'PAGO')}>
                  <option value="TODOS">Todos os status</option>
                  <option value="PENDENTE">Pendente</option>
                  <option value="PAGO">Pago</option>
                </select>
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => { setFechError(''); setFechForm(emptyFechForm); setShowFechModal(true) }}
                  style={{ background: NAVY, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <FontAwesomeIcon icon={faPlus} />Novo Fechamento
                </button>
              </div>
            </div>

            {/* Table */}
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Produtor</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Período</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Data Pgto</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Vales Emb.</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Vales Din.</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Créditos</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Déb. Ant.</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {fechFiltrados.length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: '32px 16px', color: '#9ca3af' }}>Nenhum fechamento encontrado</td></tr>
                  ) : fechFiltrados.map((f, i) => (
                    <tr key={f.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: NAVY }}>{f.produtorNome}</td>
                      <td style={{ padding: '12px 16px', color: '#374151', whiteSpace: 'nowrap' }}>{fmtDate(f.dataInicio)} — {fmtDate(f.dataFim)}</td>
                      <td style={{ padding: '12px 16px', color: '#374151' }}>{fmtDate(f.dataPagamento)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: PINK }}>{fmtCurrency(f.bandejaEmbalagem)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: PINK }}>{fmtCurrency(f.valesDinheiro)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: GREEN }}>{fmtCurrency(f.creditos)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: ORANGE }}>{fmtCurrency(f.debitosAnteriores)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ background: f.status === 'PAGO' ? GREEN + '20' : ORANGE + '20', color: f.status === 'PAGO' ? GREEN : ORANGE, padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                          {f.status === 'PAGO' ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                          {f.status === 'PENDENTE' && (
                            <button onClick={() => handleMarcarPago(f.id)} title="Marcar como pago"
                              style={{ background: GREEN + '18', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', color: GREEN, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                              <FontAwesomeIcon icon={faCircleCheck} />Pagar
                            </button>
                          )}
                          <button onClick={() => setDeleteFechTarget(f)}
                            style={{ background: PINK + '14', border: 'none', borderRadius: 6, padding: '5px 9px', cursor: 'pointer', color: PINK }}>
                            <FontAwesomeIcon icon={faTrash} style={{ fontSize: 12 }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {Object.keys(custosPorProdutor).length > 0 && (
              <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '16px 20px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 12 }}>Insumos e deduções registradas nos lançamentos</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(custosPorProdutor).map(([prodId, c]) => {
                    const prod = produtoresState.find(p => p.id === prodId)
                    const temValor = c.combustivel || c.bandejaEmbalagem || c.valesDinheiro || c.creditos || c.debitosAnteriores
                    if (!temValor) return null
                    return (
                      <div key={prodId} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', border: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: BLUE, marginBottom: 8 }}>{prod?.nome ?? prodId}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                          <div style={{ background: '#fff', borderRadius: 8, padding: '8px 12px', border: '1px solid #e5e7eb' }}>
                            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Combustível</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{fmtCurrency(c.combustivel)}</div>
                          </div>
                          <div style={{ background: '#fff', borderRadius: 8, padding: '8px 12px', border: '1px solid #e5e7eb' }}>
                            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Bandeja/Embalagens</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{fmtCurrency(c.bandejaEmbalagem)}</div>
                          </div>
                          <div style={{ background: '#fff', borderRadius: 8, padding: '8px 12px', border: '1px solid #e5e7eb' }}>
                            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Vales Dinheiro</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: PINK }}>{fmtCurrency(c.valesDinheiro)}</div>
                          </div>
                          <div style={{ background: '#fff', borderRadius: 8, padding: '8px 12px', border: '1px solid #e5e7eb' }}>
                            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Créditos Coleta/Film.</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: ORANGE }}>{fmtCurrency(c.creditos)}</div>
                          </div>
                          <div style={{ background: '#fff', borderRadius: 8, padding: '8px 12px', border: '1px solid #e5e7eb' }}>
                            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Débitos Anteriores</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: PINK }}>{fmtCurrency(c.debitosAnteriores)}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
                          Baseado em {c.lancamentos.length} lançamento(s) — último: {fmtDate(c.lancamentos[0]?.data ?? null)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Create modal */}
            <AnimatePresence>
              {showFechModal && (
                <>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setShowFechModal(false)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 40 }} />
                  <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: 'var(--sidebar-w, 248px)', zIndex: 50, pointerEvents: 'none' }}>
                  <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                    style={{ width: 520, background: '#fff', borderRadius: 16, padding: '28px 32px', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', pointerEvents: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <h2 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: 0 }}>Novo Fechamento</h2>
                      <button onClick={() => setShowFechModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}><FontAwesomeIcon icon={faXmark} style={{ fontSize: 18 }} /></button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <FormField label="Produtor *">
                        <select style={inputStyle} value={fechForm.produtorId} onChange={e => setFechForm(f => ({ ...f, produtorId: e.target.value }))}>
                          <option value="">Selecione o produtor</option>
                          {produtoresState.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                        </select>
                      </FormField>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <FormField label="Data Início *"><input type="date" style={inputStyle} value={fechForm.dataInicio} onChange={e => setFechForm(f => ({ ...f, dataInicio: e.target.value }))} /></FormField>
                        <FormField label="Data Fim *"><input type="date" style={inputStyle} value={fechForm.dataFim} onChange={e => setFechForm(f => ({ ...f, dataFim: e.target.value }))} /></FormField>
                      </div>
                      <FormField label="Data de Pagamento *">
                        <input type="date" style={inputStyle} value={fechForm.dataPagamento} onChange={e => setFechForm(f => ({ ...f, dataPagamento: e.target.value }))} />
                      </FormField>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <FormField label="Vales Embalagem (R$)"><input type="number" min="0" step="0.01" style={inputStyle} value={fechForm.bandejaEmbalagem} onChange={e => setFechForm(f => ({ ...f, bandejaEmbalagem: e.target.value }))} /></FormField>
                        <FormField label="Vales Dinheiro (R$)"><input type="number" min="0" step="0.01" style={inputStyle} value={fechForm.valesDinheiro} onChange={e => setFechForm(f => ({ ...f, valesDinheiro: e.target.value }))} /></FormField>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <FormField label="Créditos (R$)"><input type="number" min="0" step="0.01" style={inputStyle} value={fechForm.creditos} onChange={e => setFechForm(f => ({ ...f, creditos: e.target.value }))} /></FormField>
                        <FormField label="Débitos Anteriores (R$)"><input type="number" min="0" step="0.01" style={inputStyle} value={fechForm.debitosAnteriores} onChange={e => setFechForm(f => ({ ...f, debitosAnteriores: e.target.value }))} /></FormField>
                      </div>
                      {fechError && <div style={{ color: PINK, fontSize: 13 }}>{fechError}</div>}
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                        <button onClick={() => setShowFechModal(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>Cancelar</button>
                        <button onClick={handleSaveFech} disabled={savingFech}
                          style={{ background: NAVY, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: savingFech ? 'not-allowed' : 'pointer', opacity: savingFech ? 0.7 : 1 }}>
                          {savingFech ? 'Salvando...' : 'Criar Fechamento'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                  </div>
                </>
              )}
            </AnimatePresence>

            {/* Delete confirm */}
            <AnimatePresence>
              {deleteFechTarget && (
                <>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setDeleteFechTarget(null)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 40 }} />
                  <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: 'var(--sidebar-w, 248px)', zIndex: 50, pointerEvents: 'none' }}>
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                    style={{ width: 380, background: '#fff', borderRadius: 16, padding: '28px 32px', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', textAlign: 'center', pointerEvents: 'auto' }}>
                    <FontAwesomeIcon icon={faTrash} style={{ fontSize: 32, color: PINK, marginBottom: 12 }} />
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: '0 0 8px' }}>Excluir Fechamento?</h3>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>Essa ação não pode ser desfeita.</p>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                      <button onClick={() => setDeleteFechTarget(null)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                      <button onClick={handleDeleteFech} disabled={deletingFech}
                        style={{ background: PINK, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: deletingFech ? 'not-allowed' : 'pointer', opacity: deletingFech ? 0.7 : 1 }}>
                        {deletingFech ? 'Excluindo...' : 'Excluir'}
                      </button>
                    </div>
                  </motion.div>
                  </div>
                </>
              )}
            </AnimatePresence>
          </div>
        )
      })()}

      {activeTab === 'notas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Notas de lançamento */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 18, color: BLUE }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: 0 }}>Notas de lançamento</h3>
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 18px' }}>Produto, quantidades, preço unitário e total (PDF). Os filtros abaixo são os mesmos do relatório geral seguinte e da sidebar de lançamentos.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
              <FormField label="Produtor"><select style={inputStyle} value={notasProdId} onChange={e => setNotasProdId(e.target.value)}><option value="">Todos os produtores</option>{produtoresState.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></FormField>
              <FormField label="Roça (opcional)"><select style={inputStyle} value={notasRocaId} onChange={e => setNotasRocaId(e.target.value)}><option value="">Todas as roças</option>{rocas.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}</select></FormField>
              <FormField label="Produto (opcional)"><select style={inputStyle} value={notasProdutoId} onChange={e => setNotasProdutoId(e.target.value)}><option value="">Todos os produtos</option>{produtosState.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></FormField>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <FormField label="Data inicial"><input type="date" style={inputStyle} value={notasDateI} onChange={e => setNotasDateI(e.target.value)} /></FormField>
              <FormField label="Data final"><input type="date" style={inputStyle} value={notasDateF} onChange={e => setNotasDateF(e.target.value)} /></FormField>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={gerarNotasLancamento} style={{ background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>⬇ Baixar PDF</button>
              <button onClick={gerarNotasLancamento} style={{ background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>🖨 Imprimir</button>
            </div>
          </div>

          {/* Relatório geral */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 18, color: BLUE }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: 0 }}>Relatório geral de lançamento</h3>
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 18px' }}>Período, produtor, roça e produto (opcionais). Mesmos filtros das Notas de lançamento acima e da sidebar de lançamentos.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
              <FormField label="Produtor"><select style={inputStyle} value={notasProdId} onChange={e => setNotasProdId(e.target.value)}><option value="">Todos os produtores</option>{produtoresState.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></FormField>
              <FormField label="Roça (opcional)"><select style={inputStyle} value={notasRocaId} onChange={e => setNotasRocaId(e.target.value)}><option value="">Todas as roças</option>{rocas.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}</select></FormField>
              <FormField label="Produto (opcional)"><select style={inputStyle} value={notasProdutoId} onChange={e => setNotasProdutoId(e.target.value)}><option value="">Todos os produtos</option>{produtosState.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></FormField>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <FormField label="Data inicial"><input type="date" style={inputStyle} value={notasDateI} onChange={e => setNotasDateI(e.target.value)} /></FormField>
              <FormField label="Data final"><input type="date" style={inputStyle} value={notasDateF} onChange={e => setNotasDateF(e.target.value)} /></FormField>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={gerarRelatorioGeral} style={{ background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>⬇ Baixar PDF</button>
              <button onClick={gerarRelatorioGeral} style={{ background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>🖨 Imprimir</button>
            </div>
          </div>

          {/* Meeiros */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 18, color: BLUE }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: 0 }}>Relatório de lançamentos de meeiros</h3>
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 18px' }}>Gera o relatório por meeiro selecionado com os lançamentos do período e permite exportar em PDF.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
              <FormField label="Meeiro"><select style={inputStyle} value={meeiroRelId} onChange={e => setMeeiroRelId(e.target.value)}><option value="">Todos os meeiros</option>{parceirosState.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></FormField>
              <FormField label="Data inicial"><input type="date" style={inputStyle} value={meeiroRelDateI} onChange={e => setMeeiroRelDateI(e.target.value)} /></FormField>
              <FormField label="Data final"><input type="date" style={inputStyle} value={meeiroRelDateF} onChange={e => setMeeiroRelDateF(e.target.value)} /></FormField>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => gerarRelatorioMeeiro()} style={{ background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>⬇ Baixar PDF</button>
              <button onClick={() => gerarRelatorioMeeiro()} style={{ background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>🖨 Imprimir</button>
            </div>
          </div>

          {/* Repasse ao parceiro */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 18, color: BLUE }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: 0 }}>Relatório de repasse ao parceiro</h3>
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 18px' }}>Sem meeiro e sem datas: PDF em lista consolidada. Com um meeiro e período: repasse ao parceiro detalhado.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
              <FormField label="Meeiro"><select style={inputStyle} value={repParcId} onChange={e => setRepParcId(e.target.value)}><option value="">Todos os meeiros</option>{parceirosState.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></FormField>
              <FormField label="Data inicial"><input type="date" style={inputStyle} value={repDateI} onChange={e => setRepDateI(e.target.value)} /></FormField>
              <FormField label="Data final"><input type="date" style={inputStyle} value={repDateF} onChange={e => setRepDateF(e.target.value)} /></FormField>
            </div>
            <div style={{ marginBottom: 16 }}>
              <FormField label="Roças (opcional)"><select style={inputStyle} value={repRocaId} onChange={e => setRepRocaId(e.target.value)}><option value="">Todas as roças</option>{rocas.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}</select></FormField>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={gerarRelatorioRepasse} style={{ background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>⬇ Baixar PDF</button>
              <button onClick={gerarRelatorioRepasse} style={{ background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>🖨 Imprimir</button>
              <button onClick={gerarRelatorioRepasse} style={{ background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>⬇ Repasses ao parceiro (1 PDF)</button>
              <button onClick={gerarRelatorioRepasse} style={{ background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>🖨 Imprimir repasses ao parceiro</button>
            </div>
          </div>

          {/* Empréstimos */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 18, color: BLUE }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: 0 }}>Relatório de empréstimos de meeiros</h3>
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 18px' }}>Exibe os meeiros que pediram empréstimo com data e valor, permitindo exportar em PDF.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
              <FormField label="Data inicial"><input type="date" style={inputStyle} value={empDateI} onChange={e => setEmpDateI(e.target.value)} /></FormField>
              <FormField label="Data final"><input type="date" style={inputStyle} value={empDateF} onChange={e => setEmpDateF(e.target.value)} /></FormField>
              <FormField label="Roça (opcional)"><select style={inputStyle} value={empRocaId} onChange={e => setEmpRocaId(e.target.value)}><option value="">Todas as roças</option>{rocas.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}</select></FormField>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={gerarRelatorioEmprestimos} style={{ background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>⬇ Baixar PDF</button>
              <button onClick={gerarRelatorioEmprestimos} style={{ background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>🖨 Imprimir</button>
            </div>
          </div>
        </div>
      )}

      {/* DROPDOWN AÇÕES MEEIRO */}
      {pagarMenuId && (
        <>
          <div onClick={() => setPagarMenuId(null)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
          <div style={{ position: 'fixed', top: pagarMenuPos.top, right: pagarMenuPos.right, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.14)', zIndex: 50, minWidth: 140, overflow: 'hidden' }}>
            <button onClick={() => { setPagarMenuId(null); setActiveTab('meeiros') }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: 13, color: '#374151', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}>
              ✏️ Editar
            </button>
            {(() => {
              const item = pagamentosMeeiros.find(m => m.id === pagarMenuId)
              return item ? (
                <button onClick={() => { setPagarMenuId(null); setPagarModal(item); setPagarFormaPag('PIX'); setPagarConta(''); setPagarData(new Date().toISOString().slice(0, 10)); setPagarObs('') }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: 13, color: '#374151', background: 'none', border: 'none', cursor: 'pointer' }}>
                  💰 Pagar
                </button>
              ) : null
            })()}
          </div>
        </>
      )}

      {/* MODAL PAGAMENTO MEEIRO */}
      <AnimatePresence>
        {pagarModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setPagarModal(null)}
              style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 60 }} />
            <motion.div initial={{ opacity: 0, scale: 0.96, x: '-50%', y: '-50%' }} animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }} exit={{ opacity: 0, scale: 0.96, x: '-50%', y: '-50%' }}
              style={{ position: 'fixed', top: '50%', left: '50%', background: '#fff', borderRadius: 16, width: 580, maxWidth: '95vw', zIndex: 70, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', maxHeight: '92vh', overflowY: 'auto' }}>
              <div style={{ padding: '28px 28px 0' }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: NAVY, margin: '0 0 4px' }}>Registrar pagamento</h2>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>Pagamento para <strong>{pagarModal.nome}</strong></p>

                {/* Resumo financeiro */}
                <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>Chave PIX</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, color: NAVY, fontWeight: 500 }}>{pagarModal.chavePix ?? '—'}</span>
                      {pagarModal.chavePix && (
                        <button onClick={() => navigator.clipboard.writeText(pagarModal.chavePix!)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: BLUE, fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                          📋 Copiar
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ height: 1, background: '#f3f4f6', margin: '12px 0' }} />
                  {[
                    { label: 'Valor total a receber (repasse)', valor: pagarModal.valorReceber, bold: false },
                    { label: 'Vale de embalagem (desconto)', valor: -pagarModal.descEmprestimo, bold: false },
                    { label: 'Emprést aberto', valor: pagarModal.emprestimo, bold: false },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: BLUE }}>{row.label}</span>
                      <span style={{ fontSize: 13, color: NAVY, fontWeight: row.bold ? 700 : 400 }}>{fmtCurrency(Math.abs(row.valor))}</span>
                    </div>
                  ))}
                  <div style={{ height: 1, background: '#f3f4f6', margin: '12px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, color: BLUE, fontWeight: 600 }}>Valor líquido a pagar ao meeiro</span>
                    <span style={{ fontSize: 16, color: NAVY, fontWeight: 700 }}>{fmtCurrency(pagarModal.valorFinal)}</span>
                  </div>
                </div>

                {/* Forma de pagamento */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>Forma de pagamento</label>
                  <select value={pagarFormaPag} onChange={e => setPagarFormaPag(e.target.value)} style={inputStyle}>
                    {['PIX', 'Dinheiro', 'Transferência', 'Cheque', 'Outro'].map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>Conta ou caixa utilizado (opcional)</label>
                  <input value={pagarConta} onChange={e => setPagarConta(e.target.value)} placeholder="Ex: Caixa Geral" style={inputStyle} />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>Data do pagamento</label>
                  <input type="date" value={pagarData} onChange={e => setPagarData(e.target.value)} style={inputStyle} />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>Observação (opcional)</label>
                  <textarea value={pagarObs} onChange={e => setPagarObs(e.target.value)} placeholder="Observação" rows={3}
                    style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
                </div>

                {/* Gerar relatório sem pagar */}
                <div style={{ background: '#fff8ed', border: '1.5px solid #fed7aa', borderRadius: 10, padding: '16px 18px', marginBottom: 24 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#92400e', margin: '0 0 6px' }}>Gerar relatório sem pagar</p>
                  <p style={{ fontSize: 13, color: '#78350f', margin: '0 0 14px' }}>
                    Baixa o PDF do meeiro (mesmos filtros de período e roças da aba) e registra no histórico como <strong>pendente</strong> até você confirmar o pagamento abaixo.
                  </p>
                  <button onClick={() => gerarRelatorioMeeiro(pagarModal.id, pagarModal.nome)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1.5px solid #fed7aa', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#92400e', cursor: 'pointer' }}>
                    📄 Gerar relatório sem pagar
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '16px 28px 24px', display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #f3f4f6' }}>
                <button onClick={() => setPagarModal(null)}
                  style={{ padding: '10px 22px', background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <motion.button onClick={async () => {
                  const p = pagarModal
                  try {
                    const res = await fetch('/api/pagamento-meeiro', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        parceiroId: p.id,
                        valor: p.valorFinal,
                        formaPag: pagarFormaPag,
                        conta: pagarConta,
                        dataPag: pagarData,
                        observacao: pagarObs,
                      }),
                    })
                    if (!res.ok) throw new Error()
                    const novo: PagamentoMeeiroRecord = await res.json()
                    setPagamentosState(prev => [novo, ...prev])
                    gerarComprovante(p)
                    setPagarModal(null)
                    toast.success('Pagamento confirmado', `${p.nome} movido para Quitados`)
                  } catch {
                    toast.error('Erro ao registrar pagamento')
                  }
                }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  style={{ padding: '10px 22px', background: NAVY, border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Confirmar e baixar comprovante
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MODAL ROCA */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 60 }} />
            <motion.div initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }} animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }} exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
              style={{ position: 'fixed', top: '50%', left: '50%', background: '#fff', borderRadius: 16, width: 700, maxWidth: '95vw', zIndex: 70, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', maxHeight: '92vh', overflowY: 'auto' }}>
              <div style={{ padding: '24px 28px' }}>
                <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 12, padding: 22 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: GREEN + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FontAwesomeIcon icon={faLeaf} style={{ fontSize: 18, color: GREEN }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: 0 }}>Informações da roça</h3>
                      <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>Identificação, datas de plantio/colheita e mudas; a produtividade por pé vem dos lançamentos.</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
                        <FontAwesomeIcon icon={faUsers} style={{ fontSize: 14, color: BLUE }} /> Produtor <span style={{ color: PINK }}>*</span>
                      </label>
                      <select value={form.produtorId} onChange={e => setForm(f => ({ ...f, produtorId: e.target.value }))} style={inputStyle}>
                        <option value="">Selecione o produtor responsável</option>
                        {produtoresState.map(p => <option key={p.id} value={p.id}>{p.codigo ? `${p.codigo} – ` : ''}{p.nome}</option>)}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
                          <span style={{ color: '#6b7280', fontWeight: 700 }}>#</span> Código da roça
                        </label>
                        <input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} placeholder="Ex: R001 – ou em branco para o sistema gerar" style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
                          <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 14, color: BLUE }} /> Nome ou identificação <span style={{ color: PINK }}>*</span>
                        </label>
                        <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Roça do Fundão" style={inputStyle} />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        Localização <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>(opcional)</span>
                      </label>
                      <textarea value={form.localizacao} onChange={e => setForm(f => ({ ...f, localizacao: e.target.value }))} rows={3} placeholder="Onde fica a roça (ponto de referência, comunidade, cidade, etc.)" style={{ ...inputStyle, resize: 'vertical', minHeight: 76 }} />
                    </div>

                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
                        <FontAwesomeIcon icon={faLeaf} style={{ fontSize: 14, color: GREEN }} /> Quantidade de mudas plantadas <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>(opcional)</span>
                      </label>
                      <input type="number" min="0" value={form.mudasPlantadas} onChange={e => setForm(f => ({ ...f, mudasPlantadas: e.target.value }))} placeholder="Ex: 5000" style={inputStyle} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
                          <FontAwesomeIcon icon={faCalendarDays} style={{ fontSize: 14, color: BLUE }} /> Data do plantio <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>(opcional)</span>
                        </label>
                        <input type="date" value={form.dataPlantio} onChange={e => setForm(f => ({ ...f, dataPlantio: e.target.value }))} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
                          <FontAwesomeIcon icon={faCalendarDays} style={{ fontSize: 14, color: BLUE }} /> Início da colheita <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>(opcional)</span>
                        </label>
                        <input type="date" value={form.dataColheita} onChange={e => setForm(f => ({ ...f, dataColheita: e.target.value }))} style={inputStyle} />
                      </div>
                    </div>
                  </div>
                </div>
                {formError && <div style={{ marginTop: 12, color: PINK, fontSize: 13, background: '#fee2e2', borderRadius: 8, padding: '8px 12px' }}>{formError}</div>}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '0 28px 24px' }}>
                <button onClick={() => setShowModal(false)} style={{ background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '10px 22px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={handleSave} disabled={saving} style={{ background: BLUE, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{saving ? 'Salvando...' : editing ? 'Salvar' : 'Salvar roça'}</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MODAL PRODUTOR */}
      <AnimatePresence>
        {showProdutorModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} onClick={() => setShowProdutorModal(false)} style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 60 }} />
            <motion.div initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }} animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }} exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
              style={{ position: 'fixed', top: '50%', left: '50%', background: '#fff', borderRadius: 16, width: 560, maxWidth: '95vw', zIndex: 70, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', maxHeight: '92vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '24px 28px 20px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: BLUE + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FontAwesomeIcon icon={faUsers} style={{ fontSize: 20, color: BLUE }} /></div>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: 0 }}>{editingProdutor ? 'Editar Produtor' : 'Novo Produtor'}</h2>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>Cadastre o responsável pela roça.</p>
                  </div>
                </div>
                <button onClick={() => setShowProdutorModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><FontAwesomeIcon icon={faXmark} style={{ fontSize: 20 }} /></button>
              </div>
              <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                <FormField label="Código (opcional)"><input value={produtorForm.codigo} onChange={e => setProdutorForm(f => ({ ...f, codigo: e.target.value }))} placeholder="P001 - ou em branco para o sistema gerar" style={inputStyle} /></FormField>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 10 }}>Tipo de Produtor</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[{ value: 'JURIDICA', label: 'Pessoa Jurídica', sub: 'CNPJ' }, { value: 'FISICA', label: 'Pessoa Física', sub: 'CPF' }].map(opt => {
                      const sel = produtorForm.tipo === opt.value
                      return (
                        <button key={opt.value} type="button" onClick={() => setProdutorForm(f => ({ ...f, tipo: opt.value }))}
                          style={{ position: 'relative', padding: '20px 12px 16px', border: `2px solid ${sel ? BLUE : '#e5e7eb'}`, borderRadius: 12, background: sel ? BLUE + '08' : '#fff', cursor: 'pointer', textAlign: 'center' }}>
                          {sel && <div style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: '50%', background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FontAwesomeIcon icon={faCircleCheck} style={{ fontSize: 13, color: '#fff' }} /></div>}
                          <div style={{ fontSize: 14, fontWeight: 700, color: sel ? BLUE : NAVY }}>{opt.label}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{opt.sub}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <FormField label="Nome *"><input value={produtorForm.nome} onChange={e => setProdutorForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo do produtor" style={inputStyle} /></FormField>
                {produtorForm.tipo === 'FISICA' ? (
                  <FormField label="CPF"><input value={produtorForm.cpf} onChange={e => setProdutorForm(f => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" style={inputStyle} /></FormField>
                ) : (
                  <>
                    <FormField label="CNPJ"><input value={produtorForm.cnpj} onChange={e => setProdutorForm(f => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" style={inputStyle} /></FormField>
                    <FormField label="Inscrição Estadual"><input value={produtorForm.inscricaoEstadual} onChange={e => setProdutorForm(f => ({ ...f, inscricaoEstadual: e.target.value }))} style={inputStyle} /></FormField>
                  </>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FormField label="Telefone"><input value={produtorForm.telefone} onChange={e => setProdutorForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(00) 00000-0000" style={inputStyle} /></FormField>
                  <FormField label="Endereço"><input value={produtorForm.endereco} onChange={e => setProdutorForm(f => ({ ...f, endereco: e.target.value }))} style={inputStyle} /></FormField>
                </div>
                {produtorFormError && <div style={{ color: PINK, fontSize: 13, background: '#fee2e2', borderRadius: 8, padding: '8px 12px' }}>{produtorFormError}</div>}
              </div>
              <div style={{ display: 'flex', gap: 12, padding: '16px 28px 24px', borderTop: '1px solid #f3f4f6' }}>
                <button onClick={() => setShowProdutorModal(false)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, padding: '11px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={handleSaveProdutor} disabled={savingProdutor} style={{ flex: 2, background: BLUE, color: '#fff', border: 'none', borderRadius: 8, padding: '11px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{savingProdutor ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MODAL MEEIRO */}
      <AnimatePresence>
        {showMeeiroModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} onClick={() => setShowMeeiroModal(false)} style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 60 }} />
            <motion.div initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }} animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }} exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
              style={{ position: 'fixed', top: '50%', left: '50%', background: '#fff', borderRadius: 16, width: 720, maxWidth: '95vw', zIndex: 70, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', maxHeight: '92vh', overflowY: 'auto' }}>
              <div style={{ padding: '24px 28px' }}>
                <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 12, padding: 22 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: BLUE + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FontAwesomeIcon icon={faUsers} style={{ fontSize: 18, color: BLUE }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: 0 }}>Informações do meeiro</h3>
                      <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>Defina o produtor responsável, código, nome e dados básicos do meeiro.</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
                        <FontAwesomeIcon icon={faUsers} style={{ fontSize: 14, color: BLUE }} /> Produtor <span style={{ color: PINK }}>*</span>
                      </label>
                      <select value={meeiroForm.produtorId} onChange={e => setMeeiroForm(f => ({ ...f, produtorId: e.target.value }))} style={inputStyle}>
                        <option value="">Selecione o produtor responsável</option>
                        {produtoresState.map(p => <option key={p.id} value={p.id}>{p.codigo ? `${p.codigo} – ` : ''}{p.nome}</option>)}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
                          <span style={{ color: '#6b7280', fontWeight: 700 }}>#</span> Código do meeiro
                        </label>
                        <input value={meeiroForm.codigo} onChange={e => setMeeiroForm(f => ({ ...f, codigo: e.target.value }))} placeholder="Ex: M001 – ou em branco para o sistema gerar" style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
                          <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 14, color: BLUE }} /> Nome <span style={{ color: PINK }}>*</span>
                        </label>
                        <input value={meeiroForm.nome} onChange={e => setMeeiroForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" style={inputStyle} />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
                        <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 14, color: BLUE }} /> Nome fantasia <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>(opcional)</span>
                      </label>
                      <input value={meeiroForm.nomeFantasia} onChange={e => setMeeiroForm(f => ({ ...f, nomeFantasia: e.target.value }))} placeholder="Nome fantasia" style={inputStyle} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
                          <span style={{ color: '#6b7280', fontWeight: 700 }}>#</span> CPF <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>(opcional)</span>
                        </label>
                        <input value={meeiroForm.cpf} onChange={e => setMeeiroForm(f => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
                          <FontAwesomeIcon icon={faDollarSign} style={{ fontSize: 14, color: BLUE }} /> Porcentagem padrão (%)
                        </label>
                        <input type="number" min="0" max="100" value={meeiroForm.percentual} onChange={e => setMeeiroForm(f => ({ ...f, percentual: e.target.value }))} placeholder="40" style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
                          <FontAwesomeIcon icon={faDollarSign} style={{ fontSize: 14, color: BLUE }} /> Valor de emba (R$)
                        </label>
                        <input type="number" min="0" step="0.01" value={meeiroForm.valorEmba} onChange={e => setMeeiroForm(f => ({ ...f, valorEmba: e.target.value }))} placeholder="1,2" style={inputStyle} />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        Telefone <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>(opcional)</span>
                      </label>
                      <input value={meeiroForm.telefone} onChange={e => setMeeiroForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(00) 00000-0000" style={inputStyle} />
                    </div>

                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                        Chave PIX <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>(opcional, até 140 caracteres)</span>
                      </label>
                      <input value={meeiroForm.chavePix} maxLength={140} onChange={e => setMeeiroForm(f => ({ ...f, chavePix: e.target.value }))} placeholder="CPF, celular, e-mail ou chave aleatória" style={inputStyle} />
                    </div>

                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        Endereço <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>(opcional)</span>
                      </label>
                      <textarea value={meeiroForm.endereco} onChange={e => setMeeiroForm(f => ({ ...f, endereco: e.target.value }))} rows={3} placeholder="Endereço completo" style={{ ...inputStyle, resize: 'vertical', minHeight: 76 }} />
                    </div>
                  </div>
                </div>
                {meeiroFormError && <div style={{ marginTop: 12, color: PINK, fontSize: 13, background: '#fee2e2', borderRadius: 8, padding: '8px 12px' }}>{meeiroFormError}</div>}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '0 28px 24px' }}>
                <button onClick={() => setShowMeeiroModal(false)} style={{ background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '10px 22px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={handleSaveMeeiro} disabled={savingMeeiro} style={{ background: BLUE, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{savingMeeiro ? 'Salvando...' : editingMeeiro ? 'Salvar' : 'Cadastrar'}</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MODAL PRODUTO */}
      <AnimatePresence>
        {showProdutoModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} onClick={() => setShowProdutoModal(false)} style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 60 }} />
            <motion.div initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }} animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }} exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
              style={{ position: 'fixed', top: '50%', left: '50%', background: '#fff', borderRadius: 16, width: 520, maxWidth: '95vw', zIndex: 70, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', maxHeight: '92vh', overflowY: 'auto' }}>
              <div style={{ padding: '24px 28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: 0 }}>{editingProduto ? 'Editar Produto' : 'Novo Produto'}</h2>
                  <button onClick={() => setShowProdutoModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><FontAwesomeIcon icon={faXmark} style={{ fontSize: 18 }} /></button>
                </div>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px', lineHeight: 1.5 }}>
                  Cadastre um produto no catálogo geral (disponível para qualquer produtor) ou vincule a um produtor específico. Produtos do catálogo podem ser usados em qualquer lançamento.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>Onde cadastrar</label>
                    <select value={produtoForm.ondeCadastrar} onChange={e => setProdutoForm(f => ({ ...f, ondeCadastrar: e.target.value, produtorId: e.target.value === 'catalogo' ? '' : f.produtorId }))} style={{ ...inputStyle, border: `2px solid ${BLUE}` }}>
                      <option value="catalogo">Catálogo geral (qualquer produtor)</option>
                      <option value="produtor">Vincular a um produtor específico</option>
                    </select>
                    <p style={{ fontSize: 12, color: BLUE, margin: '6px 0 0' }}>
                      {produtoForm.ondeCadastrar === 'catalogo'
                        ? 'O produto ficará disponível para todos os produtores nos lançamentos.'
                        : 'O produto ficará disponível apenas para o produtor selecionado.'}
                    </p>
                  </div>

                  {produtoForm.ondeCadastrar === 'produtor' && (
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>Produtor</label>
                      <select value={produtoForm.produtorId} onChange={e => setProdutoForm(f => ({ ...f, produtorId: e.target.value }))} style={inputStyle}>
                        <option value="">Selecione o produtor</option>
                        {produtoresState.map(p => <option key={p.id} value={p.id}>{p.codigo ? `${p.codigo} – ` : ''}{p.nome}</option>)}
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>Código do produto</label>
                      <input value={produtoForm.sku} onChange={e => setProdutoForm(f => ({ ...f, sku: e.target.value }))} placeholder="Deixe em branco para gerar automaticamente" style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>Nome do produto</label>
                      <input value={produtoForm.nome} onChange={e => setProdutoForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Milho" style={inputStyle} />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>Unidade de medida</label>
                    <select value={produtoForm.unidade} onChange={e => setProdutoForm(f => ({ ...f, unidade: e.target.value }))} style={inputStyle}>
                      {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                {produtoFormError && <div style={{ marginTop: 12, color: PINK, fontSize: 13, background: '#fee2e2', borderRadius: 8, padding: '8px 12px' }}>{produtoFormError}</div>}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '0 28px 24px' }}>
                <button onClick={() => setShowProdutoModal(false)} style={{ background: '#fff', color: '#374151', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '10px 22px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={handleSaveProduto} disabled={savingProduto} style={{ background: BLUE, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{savingProduto ? 'Salvando...' : editingProduto ? 'Salvar' : 'Cadastrar'}</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MODAL LANCAMENTO */}
      <AnimatePresence>
        {showLancModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} onClick={() => setShowLancModal(false)} style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 60 }} />
            <motion.div initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }} animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }} exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
              style={{ position: 'fixed', top: '50%', left: '50%', background: '#fff', borderRadius: 16, width: 700, maxWidth: '95vw', zIndex: 70, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', maxHeight: '92vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 28px', borderBottom: '1px solid #f3f4f6' }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: 0 }}>Novo Lançamento de Produção</h2>
                  <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
                    Registre a produção: roça, data, meeiros e produtos (quantidade, preço e, se quiser, pés colhidos por item para calcular produtividade).
                  </p>
                </div>
                <button onClick={() => setShowLancModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><FontAwesomeIcon icon={faXmark} style={{ fontSize: 20 }} /></button>
              </div>

              <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 12, padding: 18 }}>
                  <FormField label="Produtor">
                    <select value={lancForm.produtorId} onChange={e => setLancForm(f => ({ ...f, produtorId: e.target.value, rocaId: '', meeiroIds: [] }))} style={inputStyle}>
                      <option value="">Selecione o produtor</option>
                      {produtoresState.map(p => <option key={p.id} value={p.id}>{p.codigo ? `${p.codigo} – ` : ''}{p.nome}</option>)}
                    </select>
                  </FormField>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                    <FormField label="Data"><input type="date" value={lancForm.data} onChange={e => setLancForm(f => ({ ...f, data: e.target.value }))} style={inputStyle} /></FormField>
                    <FormField label="Roça">
                      <select value={lancForm.rocaId} onChange={e => setLancForm(f => ({ ...f, rocaId: e.target.value }))} style={inputStyle} disabled={!lancForm.produtorId}>
                        <option value="">Selecione a roça</option>
                        {rocasDoProdutor.map(r => <option key={r.id} value={r.id}>{r.codigo ? `${r.codigo} – ` : ''}{r.nome}</option>)}
                      </select>
                    </FormField>
                  </div>
                </div>

                <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 4 }}>Meeiros participantes</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Adicione os meeiros que participaram do lançamento. A porcentagem de cada um é definida ao lado de cada produto.</div>
                  {lancForm.meeiroIds.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {lancForm.meeiroIds.map(id => {
                        const m = parceirosState.find(p => p.id === id); if (!m) return null
                        return (
                          <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: BLUE + '15', color: BLUE, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                            {m.nome} ({m.percentual}%)
                            <button onClick={() => toggleMeeiro(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: BLUE, padding: 0, display: 'flex' }}><FontAwesomeIcon icon={faXmark} style={{ fontSize: 12 }} /></button>
                          </span>
                        )
                      })}
                    </div>
                  )}
                  <select value="" onChange={e => { if (e.target.value) toggleMeeiro(e.target.value) }} style={inputStyle} disabled={!lancForm.produtorId}>
                    <option value="">Selecione o meeiro</option>
                    {meeirosDoProdutor.filter(m => !lancForm.meeiroIds.includes(m.id)).map(m => (
                      <option key={m.id} value={m.id}>{m.nome} ({m.percentual}%)</option>
                    ))}
                  </select>
                </div>

                <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 12 }}>Produtos (quantidade, preço e % por meeiro — cada produto gera um lançamento com 1 pé colhido)</div>
                  <FormField label="Produto">
                    <select value={lancForm.produtoId} onChange={e => {
                      const prod = produtosState.find(p => p.id === e.target.value)
                      setLancForm(f => ({ ...f, produtoId: e.target.value, preco: prod ? String(prod.preco) : f.preco }))
                    }} style={inputStyle}>
                      <option value="">Selecione o produto</option>
                      {produtosState.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                  </FormField>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, marginTop: 12, alignItems: 'end' }}>
                    <FormField label="Qtd"><input type="number" min="0" value={lancForm.quantidade} onChange={e => setLancForm(f => ({ ...f, quantidade: e.target.value }))} placeholder="Quantidade" style={inputStyle} /></FormField>
                    <FormField label="Preço un."><input type="number" min="0" step="0.01" value={lancForm.preco} onChange={e => setLancForm(f => ({ ...f, preco: e.target.value }))} placeholder="Preço unitário" style={inputStyle} /></FormField>
                    <button onClick={addLancItem} disabled={!lancForm.produtoId || !lancForm.quantidade} style={{ background: !lancForm.produtoId || !lancForm.quantidade ? '#9ca3af' : BLUE, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: !lancForm.produtoId || !lancForm.quantidade ? 'not-allowed' : 'pointer', height: 38 }}>Adicionar</button>
                  </div>
                  {lancItems.length > 0 && (
                    <div style={{ marginTop: 14, borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
                      {lancItems.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f9fafb' }}>
                          <span style={{ fontSize: 13, color: NAVY }}>
                            <strong>{item.produtoNome}</strong> · {fmtNum(item.quantidade, 0)} × {fmtCurrency(item.preco)}
                          </span>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: GREEN }}>{fmtCurrency(item.quantidade * item.preco)}</span>
                            <button onClick={() => removeLancItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: PINK, padding: 4 }}><FontAwesomeIcon icon={faXmark} style={{ fontSize: 14 }} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1.5px solid #e5e7eb' }}>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>Total geral</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>{fmtCurrency(lancItems.reduce((s, i) => s + i.quantidade * i.preco, 0))}</span>
                  </div>
                </div>

                <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 4 }}>Insumos</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>Custos de materiais utilizados neste lançamento.</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <FormField label="Combustível (R$)">
                      <input type="number" min="0" step="0.01" value={lancForm.combustivel}
                        onChange={e => setLancForm(f => ({ ...f, combustivel: e.target.value }))} style={inputStyle} />
                    </FormField>
                    <FormField label="Bandeja e embalagens (R$)">
                      <input type="number" min="0" step="0.01" value={lancForm.bandejaEmbalagem}
                        onChange={e => setLancForm(f => ({ ...f, bandejaEmbalagem: e.target.value }))} style={inputStyle} />
                    </FormField>
                  </div>
                </div>

                <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 4 }}>Deduções</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>Valores a descontar do produtor neste lançamento.</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, alignItems: 'start' }}>
                    <FormField label="Vales Dinheiro (R$)">
                      <input type="number" min="0" step="0.01" value={lancForm.valesDinheiro}
                        onChange={e => setLancForm(f => ({ ...f, valesDinheiro: e.target.value }))} style={inputStyle} />
                    </FormField>
                    <FormField label="Créditos Coleta/Filmagem (R$)">
                      <input type="number" min="0" step="0.01" value={lancForm.creditos}
                        onChange={e => setLancForm(f => ({ ...f, creditos: e.target.value }))} style={inputStyle} />
                    </FormField>
                    <FormField label="Débitos Anteriores (R$)">
                      <input type="number" min="0" step="0.01" value={lancForm.debitosAnteriores}
                        onChange={e => setLancForm(f => ({ ...f, debitosAnteriores: e.target.value }))} style={inputStyle} />
                    </FormField>
                  </div>
                </div>

                {lancError && <div style={{ color: PINK, fontSize: 13, background: '#fee2e2', borderRadius: 8, padding: '8px 12px' }}>{lancError}</div>}
              </div>

              <div style={{ display: 'flex', gap: 12, padding: '16px 28px 24px', borderTop: '1px solid #f3f4f6' }}>
                <button onClick={() => setShowLancModal(false)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, padding: '11px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={handleSaveLanc} disabled={savingLanc} style={{ flex: 2, background: BLUE, color: '#fff', border: 'none', borderRadius: 8, padding: '11px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{savingLanc ? 'Registrando...' : 'Registrar lançamento'}</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMS */}
      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} onClick={() => setDeleteTarget(null)} style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 80 }} />
            <motion.div initial={{ opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }} animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }} exit={{ opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }}
              style={{ position: 'fixed', top: '50%', left: '50%', background: '#fff', borderRadius: 14, padding: '28px 32px', width: 380, zIndex: 90, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><FontAwesomeIcon icon={faTrash} style={{ fontSize: 24, color: PINK }} /></div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: NAVY, margin: '0 0 8px' }}>Excluir Roça?</h3>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}><strong>{deleteTarget.nome}</strong> será removida permanentemente.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, background: PINK, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{deleting ? 'Excluindo...' : 'Excluir'}</button>
              </div>
            </motion.div>
          </>
        )}
        {deleteProdutorTarget && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} onClick={() => setDeleteProdutorTarget(null)} style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 80 }} />
            <motion.div initial={{ opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }} animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }} exit={{ opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }}
              style={{ position: 'fixed', top: '50%', left: '50%', background: '#fff', borderRadius: 14, padding: '28px 32px', width: 380, zIndex: 90, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><FontAwesomeIcon icon={faTrash} style={{ fontSize: 24, color: PINK }} /></div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: NAVY, margin: '0 0 8px' }}>Excluir Produtor?</h3>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}><strong>{deleteProdutorTarget.nome}</strong> será removido.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setDeleteProdutorTarget(null)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={handleDeleteProdutor} disabled={deletingProdutor} style={{ flex: 1, background: PINK, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{deletingProdutor ? 'Excluindo...' : 'Excluir'}</button>
              </div>
            </motion.div>
          </>
        )}
        {deleteMeeiroTarget && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} onClick={() => setDeleteMeeiroTarget(null)} style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 80 }} />
            <motion.div initial={{ opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }} animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }} exit={{ opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }}
              style={{ position: 'fixed', top: '50%', left: '50%', background: '#fff', borderRadius: 14, padding: '28px 32px', width: 380, zIndex: 90, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><FontAwesomeIcon icon={faTrash} style={{ fontSize: 24, color: PINK }} /></div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: NAVY, margin: '0 0 8px' }}>Excluir Meeiro?</h3>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}><strong>{deleteMeeiroTarget.nome}</strong> será removido.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setDeleteMeeiroTarget(null)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={handleDeleteMeeiro} style={{ flex: 1, background: PINK, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Excluir</button>
              </div>
            </motion.div>
          </>
        )}
        {deleteProdutoTarget && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} onClick={() => setDeleteProdutoTarget(null)} style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 80 }} />
            <motion.div initial={{ opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }} animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }} exit={{ opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }}
              style={{ position: 'fixed', top: '50%', left: '50%', background: '#fff', borderRadius: 14, padding: '28px 32px', width: 380, zIndex: 90, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><FontAwesomeIcon icon={faTrash} style={{ fontSize: 24, color: PINK }} /></div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: NAVY, margin: '0 0 8px' }}>Excluir Produto?</h3>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}><strong>{deleteProdutoTarget.nome}</strong> será removido.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setDeleteProdutoTarget(null)} style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={handleDeleteProduto} style={{ flex: 1, background: PINK, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Excluir</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* SLIDE-OVER DETALHE ROCA */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.35 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 40 }} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 480, background: '#fff', zIndex: 50, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: NAVY }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>{selected.nome}</h2>
                  <div style={{ fontSize: 12, color: '#93c5fd', marginTop: 4 }}>{selected.codigo} · {selected.produtor?.nome ?? '—'}</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#fff' }}><FontAwesomeIcon icon={faXmark} style={{ fontSize: 18 }} /></button>
              </div>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Localização',    value: selected.localizacao ?? '—' },
                    { label: 'Mudas',          value: selected.mudasPlantadas != null ? String(selected.mudasPlantadas) : '—' },
                    { label: 'Data Plantio',   value: fmtDate(selected.dataPlantio) },
                    { label: 'Início Colheita',value: fmtDate(selected.dataColheita) },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, marginTop: 2 }}>{value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <button onClick={() => openEdit(selected)} style={{ flex: 1, background: NAVY, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <FontAwesomeIcon icon={faPenToSquare} style={{ fontSize: 14 }} /> Editar Roça
                  </button>
                  <button onClick={() => setDeleteTarget(selected)} style={{ background: '#fee2e2', color: PINK, border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    <FontAwesomeIcon icon={faTrash} style={{ fontSize: 14 }} />
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
                <div style={{ background: '#f8fafc', border: '1.5px dashed #d1d5db', borderRadius: 10, padding: 16, marginBottom: 20 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: NAVY, margin: '0 0 12px' }}>+ Adicionar Registro</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <input type="date" value={regForm.data} onChange={e => setRegForm(f => ({ ...f, data: e.target.value }))} style={inputStyle} />
                    <select value={regForm.tipo} onChange={e => setRegForm(f => ({ ...f, tipo: e.target.value }))} style={inputStyle}>
                      {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <input value={regForm.descricao} onChange={e => setRegForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição" style={{ ...inputStyle, marginBottom: 8 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="number" min="0" step="0.01" value={regForm.custo} onChange={e => setRegForm(f => ({ ...f, custo: e.target.value }))} placeholder="Custo (R$)" style={inputStyle} />
                    <button onClick={handleAddRegistro} disabled={savingReg} style={{ background: GREEN, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{savingReg ? '...' : '+'}</button>
                  </div>
                  {regError && <div style={{ color: PINK, fontSize: 12, marginTop: 8 }}>{regError}</div>}
                </div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: NAVY, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FontAwesomeIcon icon={faClipboardList} style={{ fontSize: 14 }} /> Histórico ({selected.registros.length})
                </h3>
                {selected.registros.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: 13, border: '1px dashed #e5e7eb', borderRadius: 8 }}>Nenhum registro ainda.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selected.registros.map(reg => (
                      <div key={reg.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 14px', borderLeft: `3px solid ${TIPO_COLORS[reg.tipo] ?? '#8b9dc3'}`, display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ background: (TIPO_COLORS[reg.tipo] ?? '#8b9dc3') + '18', color: TIPO_COLORS[reg.tipo] ?? '#8b9dc3', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{TIPO_LABELS[reg.tipo] ?? reg.tipo}</span>
                            <span style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 3 }}><FontAwesomeIcon icon={faCalendarDays} style={{ fontSize: 11 }} />{fmtDate(reg.data)}</span>
                          </div>
                          <div style={{ fontSize: 13, color: '#374151' }}>{reg.descricao}</div>
                          {reg.custo > 0 && <div style={{ fontSize: 12, color: ORANGE, fontWeight: 600, marginTop: 2 }}>{fmtCurrency(reg.custo)}</div>}
                        </div>
                        <button onClick={() => handleDeleteRegistro(reg.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: 4 }}><FontAwesomeIcon icon={faXmark} style={{ fontSize: 13 }} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  )
}
