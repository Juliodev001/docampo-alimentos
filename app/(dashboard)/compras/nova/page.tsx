'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faPlus, faTrash, faSpinner } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'
import { useToast } from '@/components/toast'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'

type Fornecedor = { id: string; nome: string }
type Item = { produto: string; unidade: string; quantidade: number; valorUnit: number; total: number }

const unidades = ['CAIXA', 'KG', 'UNIDADE', 'SACO', 'LITRO', 'DUZIA', 'FARDO']
const categorias = [
  { value: 'MATERIA_PRIMA', label: 'Matéria Prima' },
  { value: 'INSUMO', label: 'Insumo' },
  { value: 'DESPESA_OPERACIONAL', label: 'Desp. Operacional' },
  { value: 'DESPESA_ADMINISTRATIVA', label: 'Desp. Administrativa' },
  { value: 'OUTROS', label: 'Outros' },
]
const formasPag = ['PIX', 'DINHEIRO', 'BOLETO', 'TRANSFERENCIA', 'CHEQUE', 'CARTAO_CREDITO', 'CARTAO_DEBITO']

const inputStyle = {
  width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8,
  fontSize: 14, outline: 'none', color: NAVY, backgroundColor: 'white',
}

export default function NovaCompraPage() {
  const toast = useToast()
  const router = useRouter()
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [loading, setLoading] = useState(false)
  const [showNovoFornecedor, setShowNovoFornecedor] = useState(false)
  const [novoFornNome, setNovoFornNome] = useState('')

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    fornecedorId: '', data: today, categoria: 'MATERIA_PRIMA',
    centroCustoId: '', observacao: '', condicao: 'A_VISTA',
    vencimento: today, formaPagamento: 'PIX', status: 'A_PAGAR',
  })

  const [itemAtual, setItemAtual] = useState<Item>({ produto: '', unidade: 'CAIXA', quantidade: 0, valorUnit: 0, total: 0 })
  const [itens, setItens] = useState<Item[]>([])

  useEffect(() => {
    fetch('/api/fornecedores').then((r) => r.json()).then(setFornecedores)
  }, [])

  const updateItem = (field: keyof Item, val: string | number) => {
    setItemAtual((prev) => {
      const updated = { ...prev, [field]: val }
      if (field === 'quantidade' || field === 'valorUnit') {
        updated.total = Number(updated.quantidade) * Number(updated.valorUnit)
      }
      return updated
    })
  }

  const addItem = () => {
    if (!itemAtual.produto || itemAtual.quantidade <= 0 || itemAtual.valorUnit <= 0) return
    setItens((prev) => [...prev, { ...itemAtual }])
    setItemAtual({ produto: '', unidade: 'CAIXA', quantidade: 0, valorUnit: 0, total: 0 })
  }

  const removeItem = (i: number) => setItens((prev) => prev.filter((_, idx) => idx !== i))

  const totalGeral = itens.reduce((s, i) => s + i.total, 0)

  const criarFornecedor = async () => {
    if (!novoFornNome.trim()) return
    const res = await fetch('/api/fornecedores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: novoFornNome }) })
    const novo = await res.json()
    setFornecedores((prev) => [...prev, novo])
    setForm((f) => ({ ...f, fornecedorId: novo.id }))
    setShowNovoFornecedor(false)
    setNovoFornNome('')
  }

  const submit = async () => {
    if (!form.fornecedorId || itens.length === 0) {
      toast.warning('Campos obrigatórios', 'Selecione um fornecedor e adicione ao menos 1 item.')
      return
    }
    setLoading(true)
    await fetch('/api/compras', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, itens }) })
    toast.success('Compra registrada')
    router.push('/compras')
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <Link href="/compras" style={{ display: 'flex', alignItems: 'center', color: '#6b7280', textDecoration: 'none' }}>
          <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: 20 }} />
        </Link>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: 0 }}>Nova Compra/Despesa</h1>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>Registre compras de mercadoria, insumos ou despesas</p>
        </div>
      </motion.div>

      {/* Dados da Compra */}
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        style={{ backgroundColor: 'white', borderRadius: 14, padding: 28, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: NAVY, marginBottom: 20 }}>Dados da Compra</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Data da Compra *</label>
            <input type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Fornecedor/Credor *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={form.fornecedorId} onChange={(e) => setForm((f) => ({ ...f, fornecedorId: e.target.value }))} style={{ ...inputStyle, flex: 1 }}>
                <option value="">Selecione um fornecedor</option>
                {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
              <motion.button onClick={() => setShowNovoFornecedor(true)}
                whileHover={{ scale: 1.1, backgroundColor: '#4aa344', boxShadow: '0 4px 14px rgba(90,185,82,0.4)' }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 420, damping: 17 }}
                style={{ padding: '0 14px', backgroundColor: GREEN, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 18, fontWeight: 300 }}>+</motion.button>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Categoria *</label>
            <select value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))} style={inputStyle}>
              {categorias.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / 2' }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Centro de Custo</label>
            <select value={form.centroCustoId} onChange={(e) => setForm((f) => ({ ...f, centroCustoId: e.target.value }))} style={inputStyle}>
              <option value="">Não informado</option>
            </select>
          </div>
          <div style={{ gridColumn: '2 / 4' }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Observação</label>
            <input value={form.observacao} onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))} placeholder="Anotações sobre esta compra" style={inputStyle} />
          </div>
        </div>

        {/* Novo Fornecedor Modal */}
        <AnimatePresence>
          {showNovoFornecedor && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ marginTop: 16, padding: 16, border: `1.5px solid ${GREEN}40`, borderRadius: 10, backgroundColor: '#f0faf0', display: 'flex', gap: 10, alignItems: 'center' }}>
              <input value={novoFornNome} onChange={(e) => setNovoFornNome(e.target.value)} placeholder="Nome do fornecedor" style={{ ...inputStyle, flex: 1 }} />
              <motion.button onClick={criarFornecedor}
                whileHover={{ scale: 1.04, backgroundColor: '#4aa344', boxShadow: '0 6px 18px rgba(90,185,82,0.4)' }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                style={{ padding: '10px 18px', backgroundColor: GREEN, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Salvar</motion.button>
              <motion.button onClick={() => setShowNovoFornecedor(false)}
                whileHover={{ scale: 1.03, backgroundColor: '#f9fafb' }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                style={{ padding: '10px 14px', backgroundColor: 'white', color: '#6b7280', border: '1.5px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Cancelar</motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* Itens */}
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        style={{ backgroundColor: 'white', borderRadius: 14, padding: 28, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: NAVY, marginBottom: 20 }}>Itens da Compra</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr 80px 44px', gap: 10, alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 5 }}>Produto *</label>
            <input value={itemAtual.produto} onChange={(e) => updateItem('produto', e.target.value)} placeholder="Ex: Tomate, Bandeja 21x21" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 5 }}>Unidade</label>
            <select value={itemAtual.unidade} onChange={(e) => updateItem('unidade', e.target.value)} style={inputStyle}>
              {unidades.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 5 }}>Qtd *</label>
            <input type="number" min="0" step="0.01" value={itemAtual.quantidade || ''} onChange={(e) => updateItem('quantidade', parseFloat(e.target.value) || 0)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 5 }}>Valor Unit. *</label>
            <input type="number" min="0" step="0.01" value={itemAtual.valorUnit || ''} onChange={(e) => updateItem('valorUnit', parseFloat(e.target.value) || 0)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 5 }}>Total</label>
            <div style={{ padding: '10px 14px', backgroundColor: '#f9fafb', borderRadius: 8, fontSize: 13, fontWeight: 600, color: NAVY, border: '1.5px solid #f3f4f6' }}>
              R$ {itemAtual.total.toFixed(2)}
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.12, backgroundColor: '#4aa344', rotate: 90, boxShadow: '0 6px 18px rgba(90,185,82,0.4)' }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            onClick={addItem}
            style={{ height: 40, width: 44, backgroundColor: GREEN, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FontAwesomeIcon icon={faPlus} style={{ fontSize: 18 }} />
          </motion.button>
        </div>

        {/* Lista de itens */}
        <AnimatePresence>
          {itens.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 16 }}>
              {itens.map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#f9fafb', borderRadius: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: NAVY }}>{item.produto}</span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{item.quantidade} {item.unidade} × R$ {item.valorUnit.toFixed(2)}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: GREEN }}>R$ {item.total.toFixed(2)}</span>
                  <motion.button onClick={() => removeItem(i)}
            whileHover={{ scale: 1.2, rotate: 10 }} whileTap={{ scale: 0.8, rotate: -10 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: PINK }}><FontAwesomeIcon icon={faTrash} style={{ fontSize: 15 }} /></motion.button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {itens.length === 0 && (
          <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', marginTop: 20 }}>
            Nenhum item adicionado. Preencha os campos acima e clique em + para adicionar.
          </p>
        )}
      </motion.section>

      {/* Condição de Pagamento */}
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        style={{ backgroundColor: 'white', borderRadius: 14, padding: 28, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: NAVY, marginBottom: 20 }}>Condição de Pagamento</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Condição *</label>
            <select value={form.condicao} onChange={(e) => setForm((f) => ({ ...f, condicao: e.target.value }))} style={inputStyle}>
              <option value="A_VISTA">À vista</option>
              <option value="A_PRAZO">A prazo</option>
              <option value="PARCELADO">Parcelado</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Vencimento *</label>
            <input type="date" value={form.vencimento} onChange={(e) => setForm((f) => ({ ...f, vencimento: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Forma de Pagamento</label>
            <select value={form.formaPagamento} onChange={(e) => setForm((f) => ({ ...f, formaPagamento: e.target.value }))} style={inputStyle}>
              {formasPag.map((f) => <option key={f}>{f.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, cursor: 'pointer', fontSize: 13, color: NAVY }}>
          <input type="checkbox" checked={form.status === 'PAGO'} onChange={(e) => setForm((f) => ({ ...f, status: e.target.checked ? 'PAGO' : 'A_PAGAR' }))} style={{ accentColor: GREEN, width: 16, height: 16 }} />
          Já foi pago
        </label>
      </motion.section>

      {/* Footer */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        style={{ backgroundColor: 'white', borderRadius: 14, padding: '20px 28px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Valor Total da Compra</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: NAVY, margin: '4px 0 0' }}>R$ {totalGeral.toFixed(2)}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/compras" style={{ padding: '10px 20px', border: '1.5px solid #e5e7eb', borderRadius: 10, color: '#6b7280', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
            Cancelar
          </Link>
          <motion.button
            whileHover={!loading ? { scale: 1.04, backgroundColor: '#4aa344', boxShadow: '0 8px 25px rgba(90,185,82,0.45)' } : {}}
            whileTap={!loading ? { scale: 0.95 } : {}}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            onClick={submit} disabled={loading}
            style={{ padding: '10px 24px', backgroundColor: GREEN, color: 'white', border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}>
            {loading && <FontAwesomeIcon icon={faSpinner} style={{ fontSize: 15 }} className="animate-spin" />}
            Registrar Compra
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
