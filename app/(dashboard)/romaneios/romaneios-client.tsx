'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFileLines, faPlus, faMagnifyingGlass, faXmark, faPrint, faBan } from '@fortawesome/free-solid-svg-icons'
import { formatCurrency, formatDate } from '@/lib/utils'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'
const ORANGE = '#e87320'

type Cliente = { id: string; nome: string }
type Item = { produto: string; unidade: string; quantidade: number; valorUnit: number; total: number }
type Romaneio = {
  id: string; numero: number; data: string | Date; status: string; totalValor: number
  cliente: Cliente; itens: Item[]
}

const statusLabel: Record<string, { label: string; bg: string; color: string }> = {
  EMITIDO: { label: 'Emitido', bg: '#f0faf0', color: GREEN },
  CANCELADO: { label: 'Cancelado', bg: '#fff0f3', color: PINK },
}

const emptyItem: Item = { produto: '', unidade: 'CAIXA', quantidade: 1, valorUnit: 0, total: 0 }

export default function RomaneiosClient({ romaneios: inicial, clientes }: { romaneios: Romaneio[]; clientes: Cliente[] }) {
  const router = useRouter()
  const [romaneios, setRomaneios] = useState(inicial)
  const [q, setQ] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('TODOS')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')

  const [modal, setModal] = useState(false)
  const [itens, setItens] = useState<Item[]>([{ ...emptyItem }])
  const [clienteId, setClienteId] = useState('')
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))
  const [observacao, setObservacao] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [detalhe, setDetalhe] = useState<Romaneio | null>(null)

  function imprimirRomaneio(r: Romaneio) {
    const rows = r.itens.map(it => `<tr><td>${it.produto}</td><td>${it.quantidade} ${it.unidade}</td><td>${formatCurrency(it.valorUnit)}</td><td style="font-weight:700">${formatCurrency(it.total)}</td></tr>`).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Romaneio #${r.numero}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:24px;color:#111827}h1{font-size:18px;color:#2d3561;margin-bottom:4px}.sub{font-size:12px;color:#6b7280;margin-bottom:20px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f3f4f6;padding:8px 10px;text-align:left;font-weight:700;color:#374151}td{padding:8px 10px;border-bottom:1px solid #f3f4f6}.total-row{font-weight:700}@media print{body{padding:0}}</style></head><body><h1>Romaneio #${r.numero}</h1><p class="sub">Data: ${formatDate(new Date(r.data))} — Cliente: ${r.cliente.nome}</p><table><thead><tr><th>Produto</th><th>Quantidade</th><th>Valor Unit.</th><th>Total</th></tr></thead><tbody>${rows}</tbody><tfoot><tr class="total-row"><td colspan="3" style="padding:10px;font-weight:700">Total</td><td style="padding:10px;font-weight:700">${formatCurrency(r.totalValor)}</td></tr></tfoot></table></body></html>`
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    setTimeout(() => w.print(), 400)
  }

  const filtrados = romaneios.filter(r => {
    const matchQ = !q || r.cliente.nome.toLowerCase().includes(q.toLowerCase()) || String(r.numero).includes(q)
    const matchStatus = statusFiltro === 'TODOS' || r.status === statusFiltro
    const dt = new Date(r.data)
    const matchDe = !de || dt >= new Date(de)
    const matchAte = !ate || dt <= new Date(ate)
    return matchQ && matchStatus && matchDe && matchAte
  })

  const total = filtrados.reduce((s, r) => s + r.totalValor, 0)

  function updateItem(i: number, field: keyof Item, value: string | number) {
    setItens(prev => prev.map((it, idx) => {
      if (idx !== i) return it
      const updated = { ...it, [field]: value }
      updated.total = updated.quantidade * updated.valorUnit
      return updated
    }))
  }

  async function handleCreate() {
    if (!clienteId) { setError('Selecione um cliente'); return }
    if (!itens.some(it => it.produto.trim())) { setError('Adicione pelo menos um item'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/romaneios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId, data, observacao: observacao || null, itens: itens.filter(it => it.produto.trim()) }),
      })
      if (!res.ok) throw new Error('Erro ao criar')
      const novo = await res.json()
      setRomaneios(prev => [novo, ...prev])
      setModal(false)
      setItens([{ ...emptyItem }])
      setClienteId(''); setData(new Date().toISOString().slice(0, 10)); setObservacao('')
      router.refresh()
    } catch {
      setError('Erro ao criar romaneio')
    } finally {
      setLoading(false)
    }
  }

  async function cancelar(id: string) {
    await fetch(`/api/romaneios/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'CANCELADO' }) })
    setRomaneios(prev => prev.map(r => r.id === id ? { ...r, status: 'CANCELADO' } : r))
    if (detalhe?.id === id) setDetalhe(d => d ? { ...d, status: 'CANCELADO' } : d)
  }

  const inp = { width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, color: NAVY, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' }
  const lbl = { fontSize: 13, fontWeight: 600, color: NAVY, display: 'block', marginBottom: 5 } as React.CSSProperties

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex-header">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0 }}>Romaneios</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Vendas internas sem valor fiscal</p>
        </div>
        <motion.button onClick={() => setModal(true)} whileHover={{ scale: 1.03, backgroundColor: '#4aa344' }} whileTap={{ scale: 0.97 }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', backgroundColor: GREEN, color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <FontAwesomeIcon icon={faPlus} style={{ fontSize: 15 }} /> Novo Romaneio
        </motion.button>
      </motion.div>

      {/* Filtros */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        style={{ backgroundColor: 'white', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: NAVY, margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Filtros</p>
        <div className="filter-grid-4-auto">
          <div>
            <label style={lbl}>De</label>
            <input type="date" value={de} onChange={e => setDe(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Até</label>
            <input type="date" value={ate} onChange={e => setAte(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Status</label>
            <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)} style={inp}>
              <option value="TODOS">Todos</option>
              <option value="EMITIDO">Emitido</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Buscar</label>
            <div style={{ position: 'relative' }}>
              <FontAwesomeIcon icon={faMagnifyingGlass} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 13 }} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cliente ou nº..." style={{ ...inp, paddingLeft: 34 }} />
            </div>
          </div>
          <div style={{ backgroundColor: `${NAVY}10`, borderRadius: 10, padding: '10px 16px', whiteSpace: 'nowrap' }}>
            <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>Total</p>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: NAVY }}>{formatCurrency(total)}</p>
          </div>
        </div>
      </motion.div>

      {/* Tabela */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        style={{ backgroundColor: 'white', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: NAVY, fontSize: 15, fontWeight: 600 }}>Romaneios Emitidos</h3>
          <span style={{ backgroundColor: `${NAVY}12`, color: NAVY, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{filtrados.length} registros</span>
        </div>
        {filtrados.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center', color: '#9ca3af' }}>
            <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 40, opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontWeight: 600, margin: 0 }}>Nenhum romaneio encontrado</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                {['Número', 'Data', 'Cliente', 'Status', 'Total', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((r, i) => {
                const st = statusLabel[r.status] ?? statusLabel.EMITIDO
                return (
                  <motion.tr key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.22 + i * 0.04 }} whileHover={{ backgroundColor: '#f8fffe' }}
                    style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 700, color: NAVY }}>#{r.numero}</td>
                    <td style={{ padding: '13px 16px', fontSize: 13, color: '#6b7280' }}>{formatDate(new Date(r.data))}</td>
                    <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 500, color: NAVY }}>{r.cliente.nome}</td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ backgroundColor: st.bg, color: st.color, padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{st.label}</span>
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 700, color: NAVY }}>{formatCurrency(r.totalValor)}</td>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <motion.button onClick={() => setDetalhe(r)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                          style={{ background: `${NAVY}12`, border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', color: NAVY, fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
                          Abrir
                        </motion.button>
                        {r.status === 'EMITIDO' && (
                          <motion.button onClick={() => cancelar(r.id)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            style={{ background: `${PINK}12`, border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color: PINK }}>
                            <FontAwesomeIcon icon={faBan} style={{ fontSize: 13 }} />
                          </motion.button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        )}
      </motion.div>

      {/* Modal criar */}
      <AnimatePresence>
        {modal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModal(false)}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1000 }} />
            <div className="modal-wrapper">
            <motion.div initial={{ opacity: 0, scale: 0.93, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.93, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              style={{ backgroundColor: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: 0 }}>Novo Romaneio</h2>
                <motion.button onClick={() => setModal(false)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#6b7280' }}>
                  <FontAwesomeIcon icon={faXmark} style={{ fontSize: 16 }} />
                </motion.button>
              </div>

              <div className="item-row-2" style={{ gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Cliente *</label>
                  <select value={clienteId} onChange={e => setClienteId(e.target.value)} style={inp}>
                    <option value="">Selecione</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Data *</label>
                  <input type="date" value={data} onChange={e => setData(e.target.value)} style={inp} />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Observação</label>
                <input value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Opcional..." style={inp} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label style={{ ...lbl, marginBottom: 0 }}>Itens</label>
                  <motion.button type="button" onClick={() => setItens(p => [...p, { ...emptyItem }])}
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    style={{ padding: '5px 12px', backgroundColor: NAVY, color: 'white', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                    + Item
                  </motion.button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {itens.map((it, i) => (
                    <div key={i} className="romaneio-items-row">
                      <input value={it.produto} onChange={e => updateItem(i, 'produto', e.target.value)} placeholder="Produto" style={{ ...inp, padding: '8px 10px', fontSize: 13 }} />
                      <select value={it.unidade} onChange={e => updateItem(i, 'unidade', e.target.value)} style={{ ...inp, padding: '8px 10px', fontSize: 13 }}>
                        {['CAIXA', 'KG', 'UNIDADE', 'SACO', 'LITRO', 'DUZIA', 'FARDO'].map(u => <option key={u}>{u}</option>)}
                      </select>
                      <input type="number" value={it.quantidade} min={0.01} step="any" onChange={e => updateItem(i, 'quantidade', parseFloat(e.target.value) || 0)} placeholder="Qtd" style={{ ...inp, padding: '8px 10px', fontSize: 13 }} />
                      <input type="number" value={it.valorUnit} min={0} step="any" onChange={e => updateItem(i, 'valorUnit', parseFloat(e.target.value) || 0)} placeholder="Valor" style={{ ...inp, padding: '8px 10px', fontSize: 13 }} />
                      {itens.length > 1 ? (
                        <motion.button type="button" onClick={() => setItens(p => p.filter((_, idx) => idx !== i))}
                          whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }}
                          style={{ color: PINK, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</motion.button>
                      ) : <div />}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ backgroundColor: '#f0faf0', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 14, color: NAVY, fontWeight: 600 }}>Total</span>
                <span style={{ fontSize: 18, color: GREEN, fontWeight: 700 }}>{formatCurrency(itens.reduce((s, it) => s + it.total, 0))}</span>
              </div>

              {error && <p style={{ color: PINK, fontSize: 13, margin: '0 0 12px', padding: '8px 12px', backgroundColor: `${PINK}10`, borderRadius: 8 }}>{error}</p>}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <motion.button type="button" onClick={() => setModal(false)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  style={{ padding: '10px 18px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: 'white', fontSize: 14, color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</motion.button>
                <motion.button type="button" onClick={handleCreate} disabled={loading}
                  whileHover={!loading ? { scale: 1.03, backgroundColor: '#4aa344' } : {}} whileTap={!loading ? { scale: 0.97 } : {}}
                  style={{ padding: '10px 22px', backgroundColor: GREEN, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}>
                  {loading ? 'Salvando...' : 'Emitir Romaneio'}
                </motion.button>
              </div>
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Detalhe */}
      <AnimatePresence>
        {detalhe && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDetalhe(null)}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1000 }} />
            <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 440, backgroundColor: 'white', zIndex: 1001, boxShadow: '-10px 0 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: 0 }}>Romaneio #{detalhe.numero}</h2>
                  <p style={{ fontSize: 13, color: '#6b7280', margin: '3px 0 0' }}>{formatDate(new Date(detalhe.data))}</p>
                </div>
                <motion.button onClick={() => setDetalhe(null)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#6b7280' }}>
                  <FontAwesomeIcon icon={faXmark} style={{ fontSize: 16 }} />
                </motion.button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Cliente</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: NAVY, margin: 0 }}>{detalhe.cliente.nome}</p>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Status</p>
                  <span style={{ backgroundColor: statusLabel[detalhe.status]?.bg, color: statusLabel[detalhe.status]?.color, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                    {statusLabel[detalhe.status]?.label}
                  </span>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Itens</p>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb' }}>
                        {['Produto', 'Qtd', 'Valor', 'Total'].map(h => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, color: '#6b7280', fontWeight: 700 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detalhe.itens.map((it, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '9px 10px', fontSize: 13, color: NAVY }}>{it.produto}</td>
                          <td style={{ padding: '9px 10px', fontSize: 13, color: '#6b7280' }}>{it.quantidade} {it.unidade}</td>
                          <td style={{ padding: '9px 10px', fontSize: 13, color: '#6b7280' }}>{formatCurrency(it.valorUnit)}</td>
                          <td style={{ padding: '9px 10px', fontSize: 13, fontWeight: 600, color: NAVY }}>{formatCurrency(it.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: 12, padding: '10px 12px', backgroundColor: '#f0faf0', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>Total</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: GREEN }}>{formatCurrency(detalhe.totalValor)}</span>
                  </div>
                </div>
              </div>
              <div style={{ padding: '16px 24px', borderTop: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <motion.button onClick={() => imprimirRomaneio(detalhe)} whileHover={{ scale: 1.02, backgroundColor: '#f3f4f6' }} whileTap={{ scale: 0.97 }}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#fff', color: NAVY, border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <FontAwesomeIcon icon={faPrint} style={{ fontSize: 14 }} /> Imprimir / PDF
                </motion.button>
                {detalhe.status === 'EMITIDO' && (
                  <motion.button onClick={() => cancelar(detalhe.id)} whileHover={{ scale: 1.02, backgroundColor: '#c91845' }} whileTap={{ scale: 0.97 }}
                    style={{ width: '100%', padding: '10px', backgroundColor: PINK, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <FontAwesomeIcon icon={faBan} style={{ fontSize: 14 }} /> Cancelar Romaneio
                  </motion.button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
