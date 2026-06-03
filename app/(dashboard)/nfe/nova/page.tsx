'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faXmark, faUserPlus } from '@fortawesome/free-solid-svg-icons'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'

type Cliente = { id: string; nome: string }
type Item = { produto: string; unidade: string; quantidade: number; valorUnit: number; total: number; ncm: string; cfop: string }

const emptyNovoCliente = { nome: '', cnpjCpf: '', telefone: '', email: '' }

export default function NovaNFe() {
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [itens, setItens] = useState<Item[]>([{ produto: '', unidade: 'CAIXA', quantidade: 1, valorUnit: 0, total: 0, ncm: '', cfop: '6101' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [modalCliente, setModalCliente] = useState(false)
  const [novoCliente, setNovoCliente] = useState(emptyNovoCliente)
  const [savingCliente, setSavingCliente] = useState(false)
  const [erroCliente, setErroCliente] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState('')

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

  async function criarCliente() {
    if (!novoCliente.nome.trim()) { setErroCliente('Nome é obrigatório'); return }
    setSavingCliente(true)
    setErroCliente('')
    try {
      const body = { nome: novoCliente.nome.trim(), cnpjCpf: novoCliente.cnpjCpf || null, telefone: novoCliente.telefone || null, email: novoCliente.email || null }
      const res = await fetch('/api/clientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error((await res.json()).error || 'Erro ao criar')
      const criado: Cliente = await res.json()
      setClientes(prev => [...prev, criado].sort((a, b) => a.nome.localeCompare(b.nome)))
      setClienteSelecionado(criado.id)
      setModalCliente(false)
      setNovoCliente(emptyNovoCliente)
    } catch (e: unknown) {
      setErroCliente(e instanceof Error ? e.message : 'Erro inesperado')
    } finally {
      setSavingCliente(false)
    }
  }

  const totalValor = itens.reduce((s, it) => s + it.total, 0)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const body = {
      clienteId: clienteSelecionado || fd.get('clienteId'),
      numero: fd.get('numero') || null,
      serie: fd.get('serie') || '1',
      dataEmissao: fd.get('dataEmissao'),
      dataVencimento: fd.get('dataVencimento') || null,
      ambiente: fd.get('ambiente'),
      itens: itens.filter(it => it.produto),
    }
    const res = await fetch('/api/nfe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) {
      router.push('/vendas')
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Erro ao criar NF-e')
      setLoading(false)
    }
  }

  const inp = { width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, color: NAVY, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' }
  const lbl = { fontSize: 13, fontWeight: 500, color: NAVY, display: 'block', marginBottom: 6 } as React.CSSProperties

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Link href="/vendas" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none', marginBottom: 8, display: 'inline-block' }}>
          ← Voltar para Vendas
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: NAVY, margin: 0 }}>Nova Venda / NF-e</h1>
        <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>Nota Fiscal Eletrônica modelo 55 – Produtor Rural</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-grid-2" style={{ gap: 20, marginBottom: 20 }}>
          <div style={{ backgroundColor: 'white', borderRadius: 14, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: NAVY, margin: '0 0 16px' }}>Dados da nota</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ ...lbl, marginBottom: 0 }}>Cliente / Destinatário *</label>
                  <motion.button
                    type="button"
                    onClick={() => { setModalCliente(true); setErroCliente('') }}
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', backgroundColor: `${NAVY}10`, color: NAVY, border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    <FontAwesomeIcon icon={faUserPlus} style={{ fontSize: 12 }} /> Novo cliente
                  </motion.button>
                </div>
                <select
                  name="clienteId"
                  required
                  value={clienteSelecionado}
                  onChange={e => setClienteSelecionado(e.target.value)}
                  style={inp}
                >
                  <option value="">Selecione um cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="grid-2" style={{ gap: 12 }}>
                <div>
                  <label style={lbl}>Número da NF</label>
                  <input type="text" name="numero" placeholder="Automático" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Série</label>
                  <input type="text" name="serie" defaultValue="1" style={inp} />
                </div>
              </div>
              <div>
                <label style={lbl}>Data de emissão *</label>
                <input type="date" name="dataEmissao" required defaultValue={new Date().toISOString().slice(0, 10)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Data de vencimento</label>
                <input type="date" name="dataVencimento" style={inp} />
              </div>
              <div>
                <label style={lbl}>Ambiente</label>
                <select name="ambiente" style={inp}>
                  <option value="HOMOLOGACAO">Homologação (Teste)</option>
                  <option value="PRODUCAO">Produção</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: 14, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: NAVY, margin: 0 }}>Itens da nota</h3>
              <motion.button type="button" onClick={() => setItens(p => [...p, { produto: '', unidade: 'CAIXA', quantidade: 1, valorUnit: 0, total: 0, ncm: '', cfop: '6101' }])}
                whileHover={{ scale: 1.05, backgroundColor: '#1e2550', boxShadow: '0 4px 14px rgba(45,53,97,0.35)' }}
                whileTap={{ scale: 0.93 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                style={{ padding: '6px 14px', backgroundColor: NAVY, color: 'white', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                <FontAwesomeIcon icon={faPlus} style={{ fontSize: 12, display: 'inline', marginRight: 4 }} />Item
              </motion.button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 360, overflowY: 'auto' }}>
              {itens.map((item, i) => (
                <div key={i} style={{ border: '1px solid #f3f4f6', borderRadius: 10, padding: 12 }}>
                  <div className="item-row-2">
                    <input value={item.produto} onChange={e => updateItem(i, 'produto', e.target.value)} placeholder="Produto" style={{ ...inp, padding: '8px 12px', fontSize: 13 }} />
                    <select value={item.unidade} onChange={e => updateItem(i, 'unidade', e.target.value)} style={{ ...inp, padding: '8px 12px', fontSize: 13 }}>
                      {['CAIXA', 'KG', 'UNIDADE', 'SACO', 'LITRO', 'DUZIA', 'FARDO'].map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="grid-3" style={{ gap: 8, marginBottom: 8 }}>
                    <input type="number" value={item.quantidade} min={0.01} step="any" onChange={e => updateItem(i, 'quantidade', parseFloat(e.target.value) || 0)}
                      placeholder="Qtd" style={{ ...inp, padding: '8px 12px', fontSize: 13 }} />
                    <input type="number" value={item.valorUnit} min={0} step="any" onChange={e => updateItem(i, 'valorUnit', parseFloat(e.target.value) || 0)}
                      placeholder="Valor unit." style={{ ...inp, padding: '8px 12px', fontSize: 13 }} />
                    <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: GREEN, fontWeight: 600 }}>R$ {item.total.toFixed(2)}</span>
                  </div>
                  <div className="item-row-2-auto">
                    <input value={item.ncm} onChange={e => updateItem(i, 'ncm', e.target.value)} placeholder="NCM" style={{ ...inp, padding: '8px 12px', fontSize: 13 }} />
                    <input value={item.cfop} onChange={e => updateItem(i, 'cfop', e.target.value)} placeholder="CFOP" style={{ ...inp, padding: '8px 12px', fontSize: 13 }} />
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
            <div style={{ marginTop: 16, padding: '12px 16px', backgroundColor: '#f0faf0', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: NAVY, fontWeight: 600 }}>Total da NF-e</span>
              <span style={{ fontSize: 20, color: GREEN, fontWeight: 700 }}>R$ {totalValor.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {error && <p style={{ color: PINK, fontSize: 13, margin: '0 0 16px' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Link href="/vendas" style={{ padding: '10px 20px', border: '1.5px solid #e5e7eb', borderRadius: 10, textDecoration: 'none', fontSize: 14, color: NAVY }}>
            Cancelar
          </Link>
          <motion.button type="submit" disabled={loading}
            whileHover={!loading ? { scale: 1.04, backgroundColor: '#4aa344', boxShadow: '0 8px 25px rgba(90,185,82,0.45)' } : {}}
            whileTap={!loading ? { scale: 0.95 } : {}}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            style={{ padding: '10px 24px', backgroundColor: GREEN, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}>
            {loading ? 'Salvando...' : 'Registrar Venda'}
          </motion.button>
        </div>
      </form>

      {/* Modal: Criar novo cliente inline */}
      <AnimatePresence>
        {modalCliente && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setModalCliente(false)}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1000 }} />
            <div className="modal-wrapper">
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.93, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              style={{ backgroundColor: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: NAVY, margin: 0 }}>Cadastrar Novo Cliente</h2>
                <motion.button onClick={() => setModalCliente(false)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#6b7280' }}>
                  <FontAwesomeIcon icon={faXmark} style={{ fontSize: 16 }} />
                </motion.button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={lbl}>Nome *</label>
                  <input value={novoCliente.nome} onChange={e => setNovoCliente(p => ({ ...p, nome: e.target.value }))}
                    placeholder="Nome completo ou razão social" style={inp} autoFocus />
                </div>
                <div>
                  <label style={lbl}>CPF / CNPJ</label>
                  <input value={novoCliente.cnpjCpf} onChange={e => setNovoCliente(p => ({ ...p, cnpjCpf: e.target.value }))}
                    placeholder="000.000.000-00" style={inp} />
                </div>
                <div className="grid-2" style={{ gap: 10 }}>
                  <div>
                    <label style={lbl}>Telefone</label>
                    <input value={novoCliente.telefone} onChange={e => setNovoCliente(p => ({ ...p, telefone: e.target.value }))}
                      placeholder="(00) 00000-0000" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>E-mail</label>
                    <input type="email" value={novoCliente.email} onChange={e => setNovoCliente(p => ({ ...p, email: e.target.value }))}
                      placeholder="email@exemplo.com" style={inp} />
                  </div>
                </div>
              </div>

              {erroCliente && (
                <p style={{ color: PINK, fontSize: 13, margin: '10px 0 0', padding: '8px 12px', backgroundColor: `${PINK}10`, borderRadius: 8 }}>{erroCliente}</p>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                <motion.button type="button" onClick={() => setModalCliente(false)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  style={{ padding: '9px 16px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: 'white', fontSize: 14, color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancelar
                </motion.button>
                <motion.button type="button" onClick={criarCliente} disabled={savingCliente}
                  whileHover={!savingCliente ? { scale: 1.03, backgroundColor: '#4aa344' } : {}}
                  whileTap={!savingCliente ? { scale: 0.97 } : {}}
                  style={{ padding: '9px 20px', backgroundColor: GREEN, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: savingCliente ? 'not-allowed' : 'pointer', opacity: savingCliente ? 0.7 : 1, fontFamily: 'inherit' }}>
                  {savingCliente ? 'Cadastrando...' : 'Cadastrar e Selecionar'}
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
