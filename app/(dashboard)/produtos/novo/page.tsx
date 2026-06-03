'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'motion/react'

const NAVY  = '#2d3561'
const PINK  = '#e8255a'
const BLUE  = '#3b82f6'
const GREEN = '#5ab952'

const UNIDADES = ['CAIXA', 'KG', 'UNIDADE', 'SACO', 'LITRO', 'DUZIA', 'FARDO']

export default function NovoProduto() {
  const router = useRouter()
  const [nome, setNome]           = useState('')
  const [sku, setSku]             = useState('')
  const [preco, setPreco]         = useState('0')
  const [unidade, setUnidade]     = useState('CAIXA')
  const [categoria, setCategoria] = useState('')
  const [ativo, setAtivo]         = useState(true)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { setError('Nome obrigatório'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/produtos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: nome.trim(), sku: sku.trim() || null,
        preco: parseFloat(preco) || 0,
        unidade, categoria: categoria.trim() || null, ativo,
      }),
    })
    if (res.ok) { router.push('/produtos'); router.refresh() }
    else { const d = await res.json().catch(() => ({})); setError(d.error || 'Erro ao salvar'); setLoading(false) }
  }

  const inp = { width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, color: NAVY, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' }
  const lbl = { fontSize: 13, fontWeight: 600, color: NAVY, display: 'block', marginBottom: 6 } as React.CSSProperties

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Link href="/produtos" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none', display: 'inline-block', marginBottom: 6 }}>← Produtos</Link>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: NAVY, margin: 0 }}>Novo Produto</h1>
        <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>Cadastre um produto do catálogo</p>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: 14, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', maxWidth: 540 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={lbl}>Nome do produto *</label>
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Morango, Tomate..." required style={inp} />
          </div>
          <div className="grid-2">
            <div>
              <label style={lbl}>SKU <span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af' }}>(auto se vazio)</span></label>
              <input value={sku} onChange={e => setSku(e.target.value)} placeholder="SKU-01" style={inp} />
            </div>
            <div>
              <label style={lbl}>Preço (R$)</label>
              <input type="number" step="0.01" min="0" value={preco} onChange={e => setPreco(e.target.value)} placeholder="0,00" style={inp} />
            </div>
          </div>
          <div className="grid-2">
            <div>
              <label style={lbl}>Unidade de medida</label>
              <select value={unidade} onChange={e => setUnidade(e.target.value)} style={inp}>
                {UNIDADES.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Categoria</label>
              <input value={categoria} onChange={e => setCategoria(e.target.value)} placeholder="Ex: Fruta, Hortaliça..." style={inp} />
            </div>
          </div>
          <div>
            <label style={lbl}>Status</label>
            <div className="grid-2" style={{ gap: 10 }}>
              {([{ val: true, label: 'Ativo' }, { val: false, label: 'Inativo' }] as const).map(opt => (
                <button key={String(opt.val)} type="button" onClick={() => setAtivo(opt.val)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', border: `2px solid ${ativo === opt.val ? (opt.val ? BLUE : PINK) : '#e5e7eb'}`, borderRadius: 10, background: ativo === opt.val ? (opt.val ? '#eff6ff' : '#fff0f3') : 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 14, color: ativo === opt.val ? (opt.val ? BLUE : PINK) : '#374151' }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: ativo === opt.val ? (opt.val ? GREEN : PINK) : '#d1d5db' }} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {error && <p style={{ color: PINK, fontSize: 13, margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 4 }}>
            <Link href="/produtos" style={{ padding: '10px 20px', border: '1.5px solid #e5e7eb', borderRadius: 10, textDecoration: 'none', fontSize: 14, color: NAVY, fontFamily: 'inherit' }}>
              Cancelar
            </Link>
            <motion.button type="submit" disabled={loading}
              whileHover={!loading ? { scale: 1.03 } : {}} whileTap={!loading ? { scale: 0.97 } : {}}
              style={{ padding: '10px 24px', backgroundColor: BLUE, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}>
              {loading ? 'Salvando...' : 'Criar Produto'}
            </motion.button>
          </div>
        </form>
      </div>
    </div>
  )
}
