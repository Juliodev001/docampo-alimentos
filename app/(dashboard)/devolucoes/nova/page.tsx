'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'motion/react'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'
const ORANGE = '#e87320'

type Cliente = { id: string; nome: string }
type Item = { produto: string; unidade: string; quantidade: number; valorUnit: number; total: number }

export default function NovaDevolucao() {
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [itens, setItens] = useState<Item[]>([{ produto: '', unidade: 'CAIXA', quantidade: 1, valorUnit: 0, total: 0 }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/clientes').then(r => r.json()).then(d => setClientes(Array.isArray(d) ? d : []))
  }, [])

  function updateItem(index: number, field: keyof Item, value: string | number) {
    setItens(prev => prev.map((it, i) => {
      if (i !== index) return it
      const updated = { ...it, [field]: value }
      updated.total = updated.quantidade * updated.valorUnit
      return updated
    }))
  }

  const totalValor = itens.reduce((s, it) => s + it.total, 0)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const body = {
      clienteId: fd.get('clienteId'),
      nfReferencia: fd.get('nfReferencia') || null,
      data: fd.get('data'),
      formaAcerto: fd.get('formaAcerto'),
      observacao: fd.get('observacao') || null,
      itens: itens.filter(it => it.produto),
    }
    const res = await fetch('/api/devolucoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) {
      router.push('/devolucoes')
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Erro ao registrar devolução')
      setLoading(false)
    }
  }

  const inp = { width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, color: NAVY, outline: 'none', boxSizing: 'border-box' as const }
  const lbl = { fontSize: 13, fontWeight: 500, color: NAVY, display: 'block', marginBottom: 6 } as React.CSSProperties

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Link href="/devolucoes" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none', marginBottom: 8, display: 'inline-block' }}>
          ← Voltar
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: NAVY, margin: 0 }}>Registrar Devolução</h1>
        <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>Nova nota de devolução recebida de cliente</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-grid-2" style={{ gap: 20, marginBottom: 20 }}>
          <div style={{ backgroundColor: 'white', borderRadius: 14, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: NAVY, margin: '0 0 16px' }}>Dados da devolução</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={lbl}>Cliente *</label>
                <select name="clienteId" required style={inp}>
                  <option value="">Selecione</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Data *</label>
                <input type="date" name="data" required defaultValue={new Date().toISOString().slice(0, 10)} style={inp} />
              </div>
              <div>
                <label style={lbl}>NF de referência</label>
                <input type="text" name="nfReferencia" placeholder="Número da NF original" style={inp} />
              </div>
              <div>
                <label style={lbl}>Forma de acerto *</label>
                <select name="formaAcerto" required style={inp}>
                  <option value="ABATIMENTO">Abatimento</option>
                  <option value="DEVOLUCAO_DINHEIRO">Devolução em dinheiro</option>
                  <option value="CREDITO">Crédito</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Observação</label>
                <textarea name="observacao" rows={3} placeholder="Motivo da devolução..." style={{ ...inp, resize: 'vertical' }} />
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: 14, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: NAVY, margin: 0 }}>Itens devolvidos</h3>
              <motion.button type="button" onClick={() => setItens(p => [...p, { produto: '', unidade: 'CAIXA', quantidade: 1, valorUnit: 0, total: 0 }])}
                whileHover={{ scale: 1.05, backgroundColor: '#1e2550', boxShadow: '0 4px 14px rgba(45,53,97,0.35)' }}
                whileTap={{ scale: 0.93 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                style={{ padding: '6px 14px', backgroundColor: NAVY, color: 'white', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
                + Item
              </motion.button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {itens.map((item, i) => (
                <div key={i} style={{ border: '1px solid #f3f4f6', borderRadius: 10, padding: 12 }}>
                  <div className="item-row-2">
                    <input value={item.produto} onChange={e => updateItem(i, 'produto', e.target.value)} placeholder="Produto" style={{ ...inp, padding: '8px 12px', fontSize: 13 }} />
                    <select value={item.unidade} onChange={e => updateItem(i, 'unidade', e.target.value)} style={{ ...inp, padding: '8px 12px', fontSize: 13 }}>
                      {['CAIXA', 'KG', 'UNIDADE', 'SACO', 'LITRO', 'DUZIA', 'FARDO'].map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="item-row-3-auto">
                    <input type="number" value={item.quantidade} min={0.01} step="any" onChange={e => updateItem(i, 'quantidade', parseFloat(e.target.value) || 0)}
                      placeholder="Qtd" style={{ ...inp, padding: '8px 12px', fontSize: 13 }} />
                    <input type="number" value={item.valorUnit} min={0} step="any" onChange={e => updateItem(i, 'valorUnit', parseFloat(e.target.value) || 0)}
                      placeholder="Valor unit." style={{ ...inp, padding: '8px 12px', fontSize: 13 }} />
                    <span style={{ fontSize: 13, color: PINK, fontWeight: 600 }}>R$ {item.total.toFixed(2)}</span>
                    {itens.length > 1 && (
                      <motion.button type="button" onClick={() => setItens(p => p.filter((_, idx) => idx !== i))}
                        whileHover={{ scale: 1.2, rotate: 10 }} whileTap={{ scale: 0.8, rotate: -10 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                        style={{ color: PINK, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</motion.button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: '12px 16px', backgroundColor: '#fff0f3', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: NAVY, fontWeight: 600 }}>Total devolvido</span>
              <span style={{ fontSize: 20, color: PINK, fontWeight: 700 }}>R$ {totalValor.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {error && <p style={{ color: PINK, fontSize: 13, margin: '0 0 16px' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Link href="/devolucoes" style={{ padding: '10px 20px', border: '1.5px solid #e5e7eb', borderRadius: 10, textDecoration: 'none', fontSize: 14, color: NAVY }}>
            Cancelar
          </Link>
          <motion.button type="submit" disabled={loading}
            whileHover={!loading ? { scale: 1.04, backgroundColor: '#4aa344', boxShadow: '0 8px 25px rgba(90,185,82,0.45)' } : {}}
            whileTap={!loading ? { scale: 0.95 } : {}}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            style={{ padding: '10px 24px', backgroundColor: GREEN, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Salvando...' : 'Registrar Devolução'}
          </motion.button>
        </div>
      </form>
    </div>
  )
}
