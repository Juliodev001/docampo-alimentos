'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBox, faPlus, faMagnifyingGlass, faXmark, faEllipsisVertical, faPencil, faTrash, faTag, faChevronDown, faSliders } from '@fortawesome/free-solid-svg-icons'
import { useToast } from '@/components/toast'

const GREEN  = '#5ab952'
const NAVY   = '#2d3561'
const PINK   = '#e8255a'
const BLUE   = '#3b82f6'
const ORANGE = '#e87320'

const UNIDADES = ['CAIXA', 'KG', 'UNIDADE', 'SACO', 'LITRO', 'DUZIA', 'FARDO'] as const

type Produto = {
  id: string; nome: string; descricao: string | null; sku: string | null
  preco: number; precoVenda: number; precoPromocional: number; precoPdv: number
  unidade: string; categoria: string | null; fornecedorId: string | null
  localizacao: string | null; estoqueMinimo: number; estoqueMaximo: number
  ncm: string | null; cest: string | null; cfop: string | null
  peso: number | null; altura: number | null; largura: number | null
  dataValidade: string | null; observacao: string | null
  ativo: boolean; createdAt: string; estoque: number
}

type FornecedorItem = { id: string; nome: string }

const emptyForm = {
  nome: '', descricao: '', sku: '',
  precoCusto: '0', precoVenda: '0', precoPromocional: '0', precoPdv: '0',
  categoria: '', fornecedorId: '',
  estoqueAtual: '0', estoqueMinimo: '0', estoqueMaximo: '0',
  unidade: 'CAIXA', localizacao: '',
  ncm: '', cest: '', cfop: '',
  peso: '', altura: '', largura: '', dataValidade: '',
  observacao: '', ativo: true,
}

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb',
  borderRadius: 10, fontSize: 14, color: NAVY, outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit', background: 'white',
}
const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: NAVY, display: 'block', marginBottom: 5 }

function SectionTitle({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 14, marginTop: 4, paddingBottom: 8, borderBottom: '1px solid #f3f4f6' }}>
      {title}
    </div>
  )
}

/* ══════════════════════════════════════ */
export default function ProdutosClient({ produtos: inicial }: { produtos: Produto[] }) {
  const toast = useToast()
  const [produtos, setProdutos] = useState(inicial)
  const [q, setQ] = useState('')

  /* modals */
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Produto | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [catModal, setCatModal] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [extraCats, setExtraCats] = useState<string[]>([])
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  /* fornecedores for dropdown */
  const [fornecedores, setFornecedores] = useState<FornecedorItem[]>([])

  /* per-row dropdown */
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /* close ⋮ menu on outside click */
  useEffect(() => {
    if (!openMenu) return
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openMenu])

  /* fetch fornecedores when modal opens */
  useEffect(() => {
    if (!modal) return
    fetch('/api/fornecedores')
      .then(r => r.ok ? r.json() : [])
      .then((data: { id: string; nome: string }[]) => setFornecedores(data.map(f => ({ id: f.id, nome: f.nome }))))
      .catch(() => setFornecedores([]))
  }, [modal])

  /* derived categories */
  const allCats = Array.from(new Set([
    ...produtos.map(p => p.categoria).filter(Boolean) as string[],
    ...extraCats,
  ])).sort()

  const filtrados = produtos.filter(p =>
    !q ||
    p.nome.toLowerCase().includes(q.toLowerCase()) ||
    (p.sku ?? '').toLowerCase().includes(q.toLowerCase())
  )

  /* ── helpers ── */
  function f(v: string | number) { return String(v ?? '') }

  function openCreate() {
    setEditing(null); setForm(emptyForm); setError(''); setModal(true)
  }
  function openEdit(p: Produto) {
    setEditing(p)
    setForm({
      nome: p.nome, descricao: p.descricao ?? '', sku: p.sku ?? '',
      precoCusto: f(p.preco), precoVenda: f(p.precoVenda), precoPromocional: f(p.precoPromocional), precoPdv: f(p.precoPdv),
      categoria: p.categoria ?? '', fornecedorId: p.fornecedorId ?? '',
      estoqueAtual: f(p.estoque), estoqueMinimo: f(p.estoqueMinimo), estoqueMaximo: f(p.estoqueMaximo),
      unidade: p.unidade, localizacao: p.localizacao ?? '',
      ncm: p.ncm ?? '', cest: p.cest ?? '', cfop: p.cfop ?? '',
      peso: p.peso != null ? f(p.peso) : '',
      altura: p.altura != null ? f(p.altura) : '',
      largura: p.largura != null ? f(p.largura) : '',
      dataValidade: p.dataValidade ? p.dataValidade.slice(0, 10) : '',
      observacao: p.observacao ?? '', ativo: p.ativo,
    })
    setError(''); setOpenMenu(null); setModal(true)
  }
  function closeModal() { setModal(false); setEditing(null); setError('') }

  async function handleSave() {
    if (!form.nome.trim()) { setError('Nome é obrigatório'); return }
    setLoading(true); setError('')
    try {
      const body = {
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || null,
        sku: form.sku.trim() || null,
        preco: parseFloat(form.precoCusto) || 0,
        precoVenda: parseFloat(form.precoVenda) || 0,
        precoPromocional: parseFloat(form.precoPromocional) || 0,
        precoPdv: parseFloat(form.precoPdv) || 0,
        unidade: form.unidade,
        categoria: form.categoria.trim() || null,
        fornecedorId: form.fornecedorId || null,
        localizacao: form.localizacao.trim() || null,
        estoqueAtual: editing ? undefined : parseFloat(form.estoqueAtual) || 0,
        estoqueMinimo: parseFloat(form.estoqueMinimo) || 0,
        estoqueMaximo: parseFloat(form.estoqueMaximo) || 0,
        ncm: form.ncm.trim() || null,
        cest: form.cest.trim() || null,
        cfop: form.cfop.trim() || null,
        peso: form.peso !== '' ? form.peso : null,
        altura: form.altura !== '' ? form.altura : null,
        largura: form.largura !== '' ? form.largura : null,
        dataValidade: form.dataValidade || null,
        observacao: form.observacao.trim() || null,
        ativo: form.ativo,
      }
      if (editing) {
        const res = await fetch(`/api/produtos/${editing.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Erro ao salvar')
        const upd = await res.json()
        setProdutos(prev => prev.map(p => p.id === upd.id ? { ...p, ...upd } : p))
        toast.success('Produto atualizado', upd.nome)
      } else {
        const res = await fetch('/api/produtos', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Erro ao criar')
        const novo = await res.json()
        const estoqueIni = parseFloat(form.estoqueAtual) || 0
        setProdutos(prev => [{ ...novo, estoque: estoqueIni, precoVenda: novo.precoVenda ?? 0, precoPromocional: novo.precoPromocional ?? 0, precoPdv: novo.precoPdv ?? 0, descricao: novo.descricao ?? null, fornecedorId: novo.fornecedorId ?? null, localizacao: novo.localizacao ?? null, estoqueMinimo: novo.estoqueMinimo ?? 0, estoqueMaximo: novo.estoqueMaximo ?? 0, ncm: novo.ncm ?? null, cest: novo.cest ?? null, cfop: novo.cfop ?? null, peso: novo.peso ?? null, altura: novo.altura ?? null, largura: novo.largura ?? null, dataValidade: novo.dataValidade ?? null, observacao: novo.observacao ?? null }, ...prev])
        toast.success('Produto criado', novo.nome)
      }
      closeModal()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro inesperado')
    } finally { setLoading(false) }
  }

  const toggleStatus = useCallback(async (id: string, novoAtivo: boolean) => {
    const res = await fetch(`/api/produtos/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: novoAtivo }),
    })
    if (res.ok) setProdutos(prev => prev.map(p => p.id === id ? { ...p, ativo: novoAtivo } : p))
  }, [])

  async function handleDelete(id: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/produtos/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Erro ao excluir')
      setProdutos(prev => prev.filter(p => p.id !== id))
      toast.success('Produto excluído')
    } catch (e: unknown) {
      toast.error('Não foi possível excluir', e instanceof Error ? e.message : 'Verifique se não há registros vinculados.')
    } finally { setLoading(false); setConfirmDel(null); setOpenMenu(null) }
  }

  function addCat() {
    const v = newCat.trim()
    if (!v || allCats.includes(v)) return
    setExtraCats(prev => [...prev, v])
    setNewCat('')
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  /* ══════════════════════ RENDER ══════════════════════ */
  return (
    <div>
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex-header">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0 }}>Produtos</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Gerencie seu catálogo de produtos</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <motion.button
            onClick={() => setCatModal(true)}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', backgroundColor: 'white', color: NAVY, border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <FontAwesomeIcon icon={faTag} style={{ fontSize: 14 }} /> Gerenciar Categorias
          </motion.button>
          <motion.button
            onClick={openCreate}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', backgroundColor: BLUE, color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <FontAwesomeIcon icon={faPlus} style={{ fontSize: 15 }} /> Criar Produto
          </motion.button>
        </div>
      </motion.div>

      {/* ── Filter bar ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.3 }}
        style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', backgroundColor: 'white', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 13, fontWeight: 600, color: NAVY, cursor: 'pointer', fontFamily: 'inherit' }}>
          <FontAwesomeIcon icon={faSliders} style={{ fontSize: 14 }} /> Filtros
        </button>
        <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
          <FontAwesomeIcon icon={faMagnifyingGlass} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14 }} />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar por nome ou SKU..."
            style={{ ...inp, paddingLeft: 36, paddingTop: 9, paddingBottom: 9, fontSize: 13 }}
          />
        </div>
      </motion.div>

      {/* ── Table ── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}
        style={{ backgroundColor: 'white', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

        {filtrados.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ padding: 64, textAlign: 'center', color: '#9ca3af' }}>
            <FontAwesomeIcon icon={faBox} style={{ fontSize: 40, opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontWeight: 600, margin: '0 0 6px' }}>Nenhum produto encontrado</p>
            <p style={{ fontSize: 13, margin: 0 }}>Clique em &quot;Criar Produto&quot; para cadastrar</p>
          </motion.div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                {['Nome', 'SKU', 'Preço', 'Estoque', 'Categoria', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p, i) => (
                <motion.tr key={p.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.16 + i * 0.03 }}
                  style={{ borderBottom: '1px solid #f3f4f6', position: 'relative' }}>

                  <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 700, color: NAVY, letterSpacing: 0.3 }}>
                    {p.nome.toUpperCase()}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    {p.sku
                      ? <span style={{ fontSize: 12, fontWeight: 600, color: BLUE, backgroundColor: '#eff6ff', padding: '3px 10px', borderRadius: 6 }}>{p.sku}</span>
                      : <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>

                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>
                    {fmt(p.preco)}
                  </td>

                  <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 700 }}>
                    <span style={{ color: p.estoque === 0 ? PINK : p.estoque < 10 ? ORANGE : NAVY }}>
                      {p.estoque}
                    </span>
                  </td>

                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#6b7280' }}>
                    {p.categoria ?? <span style={{ color: '#d1d5db' }}>–</span>}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                      <select
                        value={p.ativo ? 'ATIVO' : 'INATIVO'}
                        onChange={e => toggleStatus(p.id, e.target.value === 'ATIVO')}
                        style={{
                          appearance: 'none', WebkitAppearance: 'none',
                          padding: '5px 28px 5px 12px', borderRadius: 20,
                          border: `1.5px solid ${p.ativo ? '#86efac' : '#e5e7eb'}`,
                          background: p.ativo ? '#dcfce7' : '#f3f4f6',
                          color: p.ativo ? '#16a34a' : '#6b7280',
                          fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                        }}>
                        <option value="ATIVO">Ativo</option>
                        <option value="INATIVO">Inativo</option>
                      </select>
                      <FontAwesomeIcon icon={faChevronDown} style={{ position: 'absolute', right: 8, pointerEvents: 'none', color: p.ativo ? '#16a34a' : '#6b7280', fontSize: 12 }} />
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}
                         ref={openMenu === p.id ? menuRef : undefined}>
                      <button
                        onClick={() => setOpenMenu(prev => prev === p.id ? null : p.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
                        <FontAwesomeIcon icon={faEllipsisVertical} style={{ fontSize: 16 }} />
                      </button>
                      <AnimatePresence>
                        {openMenu === p.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.92, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: -4 }}
                            transition={{ duration: 0.12 }}
                            style={{ position: 'absolute', right: 0, top: '110%', zIndex: 50, backgroundColor: 'white', borderRadius: 10, boxShadow: '0 8px 30px rgba(0,0,0,0.15)', border: '1px solid #f3f4f6', minWidth: 140, overflow: 'hidden' }}>
                            <button onClick={() => openEdit(p)}
                              style={{ width: '100%', padding: '10px 16px', textAlign: 'left', border: 'none', background: 'white', fontSize: 13, color: NAVY, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <FontAwesomeIcon icon={faPencil} style={{ fontSize: 13, color: NAVY }} /> Editar
                            </button>
                            <button onClick={() => { setConfirmDel(p.id); setOpenMenu(null) }}
                              style={{ width: '100%', padding: '10px 16px', textAlign: 'left', border: 'none', background: 'white', fontSize: 13, color: PINK, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <FontAwesomeIcon icon={faTrash} style={{ fontSize: 13, color: PINK }} /> Excluir
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>

      {/* ══════════ CREATE / EDIT MODAL ══════════ */}
      <AnimatePresence>
        {modal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeModal}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1000 }} />
            <div className="modal-wrapper">
              <motion.div
                initial={{ opacity: 0, scale: 0.93, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                style={{ backgroundColor: 'white', borderRadius: 16, width: '100%', maxWidth: 680, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '93vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Modal header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FontAwesomeIcon icon={faBox} style={{ fontSize: 16, color: BLUE }} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: 0 }}>
                        {editing ? 'Editar Produto' : 'Novo Produto'}
                      </h2>
                      <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
                        {editing ? 'Atualize as informações do produto' : 'Preencha as informações do produto'}
                      </p>
                    </div>
                  </div>
                  <button onClick={closeModal}
                    style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#6b7280', display: 'flex' }}>
                    <FontAwesomeIcon icon={faXmark} style={{ fontSize: 15 }} />
                  </button>
                </div>

                {/* Modal body — scrollable */}
                <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* ── Informações Básicas ── */}
                    <div>
                      <SectionTitle title="Informações Básicas" />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                          <label style={lbl}>Nome do Produto <span style={{ color: PINK }}>*</span></label>
                          <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                            placeholder="Ex: Morango, Tomate, Alface..." style={inp} autoFocus />
                        </div>
                        <div>
                          <label style={lbl}>Descrição</label>
                          <textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
                            placeholder="Descrição detalhada do produto..."
                            rows={2}
                            style={{ ...inp, resize: 'vertical', minHeight: 70 }} />
                        </div>
                        <div style={{ maxWidth: 260 }}>
                          <label style={lbl}>
                            SKU <span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af' }}>(deixe vazio para gerar automaticamente)</span>
                          </label>
                          <input value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))}
                            placeholder="Ex: SKU-01" style={inp} />
                        </div>
                      </div>
                    </div>

                    {/* ── Categorização ── */}
                    <div>
                      <SectionTitle title="Categorização" />
                      <div className="grid-2">
                        <div>
                          <label style={lbl}>Categoria <span style={{ color: PINK }}>*</span></label>
                          <input
                            list="cats-list-modal"
                            value={form.categoria}
                            onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
                            placeholder="Ex: Fruta, Hortaliça..." style={inp} />
                          <datalist id="cats-list-modal">
                            {allCats.map(c => <option key={c} value={c} />)}
                          </datalist>
                        </div>
                        <div>
                          <label style={lbl}>Fornecedor <span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af' }}>(opcional)</span></label>
                          <select value={form.fornecedorId} onChange={e => setForm(p => ({ ...p, fornecedorId: e.target.value }))} style={inp}>
                            <option value="">Selecionar fornecedor...</option>
                            {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* ── Preços ── */}
                    <div>
                      <SectionTitle title="Preços" />
                      <div className="grid-4">
                        <div>
                          <label style={lbl}>Preço de Custo <span style={{ color: PINK }}>*</span></label>
                          <input type="number" step="0.01" min="0" value={form.precoCusto}
                            onChange={e => setForm(p => ({ ...p, precoCusto: e.target.value }))}
                            placeholder="0,00" style={inp} />
                        </div>
                        <div>
                          <label style={lbl}>Preço de Venda</label>
                          <input type="number" step="0.01" min="0" value={form.precoVenda}
                            onChange={e => setForm(p => ({ ...p, precoVenda: e.target.value }))}
                            placeholder="0,00" style={inp} />
                        </div>
                        <div>
                          <label style={lbl}>Preço PDV <span style={{ color: BLUE }}>★</span></label>
                          <input type="number" step="0.01" min="0" value={form.precoPdv}
                            onChange={e => setForm(p => ({ ...p, precoPdv: e.target.value }))}
                            placeholder="0,00" style={inp} />
                        </div>
                        <div>
                          <label style={lbl}>Preço Promocional</label>
                          <input type="number" step="0.01" min="0" value={form.precoPromocional}
                            onChange={e => setForm(p => ({ ...p, precoPromocional: e.target.value }))}
                            placeholder="0,00" style={inp} />
                        </div>
                      </div>
                    </div>

                    {/* ── Estoque ── */}
                    <div>
                      <SectionTitle title="Estoque" />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="grid-3">
                          <div>
                            <label style={lbl}>
                              Estoque Atual {!editing && <span style={{ color: PINK }}>*</span>}
                            </label>
                            <input type="number" step="any" min="0" value={form.estoqueAtual}
                              onChange={e => setForm(p => ({ ...p, estoqueAtual: e.target.value }))}
                              placeholder="0"
                              readOnly={!!editing}
                              style={{ ...inp, background: editing ? '#f9fafb' : 'white', color: editing ? '#9ca3af' : NAVY }} />
                            {editing && <p style={{ fontSize: 11, color: '#9ca3af', margin: '3px 0 0' }}>Gerencie via Movimentações</p>}
                          </div>
                          <div>
                            <label style={lbl}>Estoque Mínimo <span style={{ color: PINK }}>*</span></label>
                            <input type="number" step="any" min="0" value={form.estoqueMinimo}
                              onChange={e => setForm(p => ({ ...p, estoqueMinimo: e.target.value }))}
                              placeholder="0" style={inp} />
                          </div>
                          <div>
                            <label style={lbl}>Estoque Máximo</label>
                            <input type="number" step="any" min="0" value={form.estoqueMaximo}
                              onChange={e => setForm(p => ({ ...p, estoqueMaximo: e.target.value }))}
                              placeholder="0" style={inp} />
                          </div>
                        </div>
                        <div className="grid-2">
                          <div>
                            <label style={lbl}>Unidade de Medida <span style={{ color: PINK }}>*</span></label>
                            <select value={form.unidade} onChange={e => setForm(p => ({ ...p, unidade: e.target.value }))} style={inp}>
                              {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={lbl}>Localização</label>
                            <input value={form.localizacao} onChange={e => setForm(p => ({ ...p, localizacao: e.target.value }))}
                              placeholder="Ex: Corredor A, Prateleira 3..." style={inp} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Informações Fiscais ── */}
                    <div>
                      <SectionTitle title="Informações Fiscais" />
                      <div className="grid-3">
                        <div>
                          <label style={lbl}>NCM</label>
                          <input value={form.ncm} onChange={e => setForm(p => ({ ...p, ncm: e.target.value }))}
                            placeholder="0000.00.00" style={inp} maxLength={10} />
                        </div>
                        <div>
                          <label style={lbl}>CEST</label>
                          <input value={form.cest} onChange={e => setForm(p => ({ ...p, cest: e.target.value }))}
                            placeholder="00.000.00" style={inp} maxLength={9} />
                        </div>
                        <div>
                          <label style={lbl}>CFOP</label>
                          <input value={form.cfop} onChange={e => setForm(p => ({ ...p, cfop: e.target.value }))}
                            placeholder="0000" style={inp} maxLength={4} />
                        </div>
                      </div>
                    </div>

                    {/* ── Dimensões e Peso ── */}
                    <div>
                      <SectionTitle title="Dimensões e Peso" />
                      <div className="grid-4">
                        <div>
                          <label style={lbl}>Peso (kg)</label>
                          <input type="number" step="0.001" min="0" value={form.peso}
                            onChange={e => setForm(p => ({ ...p, peso: e.target.value }))}
                            placeholder="0,000" style={inp} />
                        </div>
                        <div>
                          <label style={lbl}>Altura (cm)</label>
                          <input type="number" step="0.1" min="0" value={form.altura}
                            onChange={e => setForm(p => ({ ...p, altura: e.target.value }))}
                            placeholder="0,0" style={inp} />
                        </div>
                        <div>
                          <label style={lbl}>Largura (cm)</label>
                          <input type="number" step="0.1" min="0" value={form.largura}
                            onChange={e => setForm(p => ({ ...p, largura: e.target.value }))}
                            placeholder="0,0" style={inp} />
                        </div>
                        <div>
                          <label style={lbl}>Data de Validade</label>
                          <input type="date" value={form.dataValidade}
                            onChange={e => setForm(p => ({ ...p, dataValidade: e.target.value }))}
                            style={inp} />
                        </div>
                      </div>
                    </div>

                    {/* ── Outros ── */}
                    <div>
                      <SectionTitle title="Outros" />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                          <label style={lbl}>Observações</label>
                          <textarea value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))}
                            placeholder="Informações adicionais..."
                            rows={2}
                            style={{ ...inp, resize: 'vertical', minHeight: 64 }} />
                        </div>
                        <div>
                          <label style={lbl}>Status</label>
                          <div className="grid-2" style={{ gap: 10, maxWidth: 320 }}>
                            {([{ val: true, label: 'Ativo' }, { val: false, label: 'Inativo' }] as const).map(opt => (
                              <button key={String(opt.val)} type="button" onClick={() => setForm(p => ({ ...p, ativo: opt.val }))}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: `2px solid ${form.ativo === opt.val ? (opt.val ? BLUE : PINK) : '#e5e7eb'}`, borderRadius: 10, background: form.ativo === opt.val ? (opt.val ? '#eff6ff' : '#fff0f3') : 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 13, color: form.ativo === opt.val ? (opt.val ? BLUE : PINK) : '#374151', transition: 'all 0.15s' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: form.ativo === opt.val ? (opt.val ? GREEN : PINK) : '#d1d5db' }} />
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {error && <p style={{ color: PINK, fontSize: 13, margin: 0, padding: '8px 12px', backgroundColor: `${PINK}10`, borderRadius: 8 }}>{error}</p>}
                  </div>
                </div>

                {/* Modal footer */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid #f3f4f6', flexShrink: 0 }}>
                  <motion.button onClick={handleSave} disabled={loading}
                    whileHover={!loading ? { scale: 1.01 } : {}} whileTap={!loading ? { scale: 0.99 } : {}}
                    style={{ width: '100%', padding: '13px', backgroundColor: BLUE, color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit', letterSpacing: 0.2 }}>
                    {loading ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Cadastrar Produto'}
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════ GERENCIAR CATEGORIAS MODAL ══════════ */}
      <AnimatePresence>
        {catModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setCatModal(false)}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1000 }} />
            <div className="modal-wrapper">
              <motion.div
                initial={{ opacity: 0, scale: 0.93, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                style={{ backgroundColor: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FontAwesomeIcon icon={faTag} style={{ fontSize: 15, color: BLUE }} />
                    </div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: 0 }}>Gerenciar Categorias</h2>
                  </div>
                  <button onClick={() => setCatModal(false)}
                    style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#6b7280', display: 'flex' }}>
                    <FontAwesomeIcon icon={faXmark} style={{ fontSize: 15 }} />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input value={newCat} onChange={e => setNewCat(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCat()}
                    placeholder="Nova categoria..." style={{ ...inp, flex: 1 }} />
                  <motion.button onClick={addCat} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    style={{ padding: '10px 14px', backgroundColor: BLUE, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <FontAwesomeIcon icon={faPlus} style={{ fontSize: 15 }} />
                  </motion.button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                  {allCats.length === 0 ? (
                    <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Nenhuma categoria cadastrada</p>
                  ) : allCats.map(cat => (
                    <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#f9fafb', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: BLUE, flexShrink: 0 }} />
                        <span style={{ fontSize: 14, fontWeight: 500, color: NAVY }}>{cat}</span>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>
                          ({produtos.filter(p => p.categoria === cat).length} produto{produtos.filter(p => p.categoria === cat).length !== 1 ? 's' : ''})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 20, textAlign: 'right' }}>
                  <button onClick={() => setCatModal(false)}
                    style={{ padding: '10px 22px', backgroundColor: BLUE, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Fechar
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════ CONFIRM DELETE ══════════ */}
      <AnimatePresence>
        {confirmDel && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setConfirmDel(null)}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1000 }} />
            <div className="modal-wrapper">
              <motion.div
                initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.93 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                style={{ backgroundColor: 'white', borderRadius: 14, padding: 24, width: 320, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${PINK}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <FontAwesomeIcon icon={faTrash} style={{ fontSize: 20, color: PINK }} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: '0 0 8px' }}>Excluir produto?</h3>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>
                  Somente produtos sem registros vinculados podem ser excluídos.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setConfirmDel(null)}
                    style={{ flex: 1, padding: '10px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: 'white', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancelar
                  </button>
                  <motion.button onClick={() => handleDelete(confirmDel)} disabled={loading}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    style={{ flex: 1, padding: '10px', backgroundColor: PINK, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {loading ? 'Excluindo...' : 'Excluir'}
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
