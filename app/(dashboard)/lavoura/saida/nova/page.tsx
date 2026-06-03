'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'motion/react'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'

type Produto = { id: string; nome: string }

export default function NovaSaidaLavoura() {
  const router = useRouter()
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [produtoId, setProdutoId] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [valorUnit, setValorUnit] = useState('')
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))
  const [obs, setObs] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const qtd = parseFloat(quantidade) || 0
  const vUnit = parseFloat(valorUnit) || 0
  const total = qtd * vUnit

  useEffect(() => {
    fetch('/api/produtos').then(r => r.json()).then(d => setProdutos(Array.isArray(d) ? d : []))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!produtoId) { setError('Selecione um produto'); return }
    if (qtd <= 0 || vUnit <= 0) { setError('Quantidade e valor são obrigatórios'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/saida-lavoura', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, produtoId, quantidade: qtd, valorUnit: vUnit, observacao: obs || null }),
    })
    if (res.ok) { router.push('/lavoura/saida'); router.refresh() }
    else { const d = await res.json().catch(() => ({})); setError(d.error || 'Erro ao salvar'); setLoading(false) }
  }

  const inp = { width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, color: NAVY, outline: 'none', boxSizing: 'border-box' as const }
  const lbl = { fontSize: 13, fontWeight: 500, color: NAVY, display: 'block', marginBottom: 6 } as React.CSSProperties

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Link href="/lavoura/saida" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none', display: 'inline-block', marginBottom: 6 }}>← Saídas</Link>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: NAVY, margin: 0 }}>📦 Registrar Saída</h1>
        <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>Movimentação financeira da saída de produção</p>
      </div>

      <div className="form-grid-2" style={{ gap: 20 }}>
        <div style={{ backgroundColor: 'white', borderRadius: 14, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: NAVY, margin: '0 0 20px' }}>Dados da saída</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={lbl}>Produto *</label>
              <select value={produtoId} onChange={e => setProdutoId(e.target.value)} required style={inp}>
                <option value="">Selecione o produto</option>
                {produtos.map(p => <option key={p.id} value={p.id}>🍓 {p.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Data *</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)} required style={inp} />
            </div>
            <div className="grid-2">
              <div>
                <label style={lbl}>Quantidade (cx) *</label>
                <input type="number" value={quantidade} onChange={e => setQuantidade(e.target.value)} min="0.1" step="0.1" placeholder="0" required style={inp} />
              </div>
              <div>
                <label style={lbl}>Valor por caixa (R$) *</label>
                <input type="number" value={valorUnit} onChange={e => setValorUnit(e.target.value)} min="0.01" step="0.01" placeholder="0,00" required style={inp} />
              </div>
            </div>
            <div>
              <label style={lbl}>Observação</label>
              <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3} placeholder="Destino, cliente..." style={{ ...inp, resize: 'vertical' }} />
            </div>
            {error && <p style={{ color: PINK, fontSize: 13, margin: 0 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <Link href="/lavoura/saida" style={{ padding: '10px 20px', border: '1.5px solid #e5e7eb', borderRadius: 10, textDecoration: 'none', fontSize: 14, color: NAVY }}>
                Cancelar
              </Link>
              <motion.button type="submit" disabled={loading}
                whileHover={!loading ? { scale: 1.04, backgroundColor: '#4aa344', boxShadow: '0 8px 25px rgba(90,185,82,0.45)' } : {}}
                whileTap={!loading ? { scale: 0.95 } : {}}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                style={{ padding: '10px 24px', backgroundColor: GREEN, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Salvando...' : 'Registrar Saída'}
              </motion.button>
            </div>
          </form>
        </div>

        {/* Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ backgroundColor: 'white', borderRadius: 14, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderTop: `3px solid ${GREEN}` }}>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 8px' }}>Total da saída</p>
            <p style={{ fontSize: 40, fontWeight: 800, color: GREEN, margin: 0 }}>
              R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            {qtd > 0 && vUnit > 0 && (
              <p style={{ fontSize: 13, color: '#6b7280', margin: '6px 0 0' }}>
                {qtd.toFixed(1)} caixas × R$ {vUnit.toFixed(2)}
              </p>
            )}
          </div>
          {qtd > 0 && (
            <div style={{ backgroundColor: '#f0faf0', borderRadius: 12, padding: '16px 20px', border: `1px solid ${GREEN}30` }}>
              <p style={{ fontSize: 12, color: GREEN, fontWeight: 600, margin: '0 0 4px' }}>Resumo</p>
              <p style={{ fontSize: 13, color: NAVY, margin: 0 }}>📦 {qtd.toFixed(1)} caixas sendo movimentadas</p>
              {vUnit > 0 && <p style={{ fontSize: 13, color: NAVY, margin: '4px 0 0' }}>💰 R$ {vUnit.toFixed(2)} por caixa</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
