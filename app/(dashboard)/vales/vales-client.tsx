'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHandHoldingDollar, faPlus, faXmark, faTrash, faMagnifyingGlass, faBan, faPencil } from '@fortawesome/free-solid-svg-icons'
import { useToast } from '@/components/toast'

const NAVY   = '#2d3561'
const PINK   = '#e8255a'
const BLUE   = '#3b82f6'
const ORANGE = '#d97706'
const GREEN  = '#16a34a'

type Produtor = { id: string; nome: string; codigo: string | null }
type Parceiro = { id: string; nome: string; codigo: string | null; produtorNome: string }
type Vale = {
  id: string
  valor: number
  data: string
  observacao: string | null
  status: string
  createdAt: string
  produtor: { id: string; nome: string; codigo: string | null } | null
  parceiro: { id: string; nome: string; codigo: string | null; produtorNome: string } | null
}

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb',
  borderRadius: 10, fontSize: 14, color: NAVY, outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit', background: 'white',
}
const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: NAVY, display: 'block', marginBottom: 5 }

function fmtBRL(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) }

export default function ValesClient({ vales: inicial, produtores, parceiros }: { vales: Vale[]; produtores: Produtor[]; parceiros: Parceiro[] }) {
  const toast = useToast()
  const [vales, setVales] = useState(inicial)
  const [q, setQ] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'PRODUTOR' | 'MEEIRO'>('TODOS')
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'ABERTO' | 'DESCONTADO' | 'CANCELADO'>('TODOS')

  const [modal, setModal] = useState(false)
  // id do vale em edição; null = modal está criando um novo.
  const [editing, setEditing] = useState<string | null>(null)
  // Vale já descontado está preso ao fechamento de alguém: o valor pode ser
  // corrigido (o acerto é ajustado junto), mas trocar de beneficiário, não.
  const [editBeneficiarioTravado, setEditBeneficiarioTravado] = useState(false)
  const [tipo, setTipo] = useState<'PRODUTOR' | 'MEEIRO'>('PRODUTOR')
  const [beneficiarioId, setBeneficiarioId] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))
  const [observacao, setObservacao] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState<string | null>(null)
  const [discarding, setDiscarding] = useState(false)

  const filtrados = vales.filter(v => {
    if (filtroTipo === 'PRODUTOR' && !v.produtor) return false
    if (filtroTipo === 'MEEIRO' && !v.parceiro) return false
    if (filtroStatus !== 'TODOS' && v.status !== filtroStatus) return false
    if (q) {
      const nome = (v.produtor?.nome ?? v.parceiro?.nome ?? '').toLowerCase()
      if (!nome.includes(q.toLowerCase())) return false
    }
    return true
  })

  const totalAberto = vales.filter(v => v.status === 'ABERTO').reduce((s, v) => s + v.valor, 0)
  const qtdAberto = vales.filter(v => v.status === 'ABERTO').length
  const totalDescontado = vales.filter(v => v.status === 'DESCONTADO').reduce((s, v) => s + v.valor, 0)

  function openCreate() {
    setEditing(null); setEditBeneficiarioTravado(false)
    setTipo('PRODUTOR'); setBeneficiarioId(''); setValor(''); setData(new Date().toISOString().slice(0, 10))
    setObservacao(''); setError(''); setModal(true)
  }

  function openEdit(v: Vale) {
    setEditing(v.id)
    setEditBeneficiarioTravado(v.status === 'DESCONTADO')
    setTipo(v.parceiro ? 'MEEIRO' : 'PRODUTOR')
    setBeneficiarioId(v.parceiro?.id ?? v.produtor?.id ?? '')
    setValor(String(v.valor))
    setData(v.data.slice(0, 10))
    setObservacao(v.observacao ?? '')
    setError(''); setModal(true)
  }

  async function handleSave() {
    if (!beneficiarioId) { setError('Selecione o beneficiário'); return }
    if (!valor || parseFloat(valor) <= 0) { setError('Informe um valor válido'); return }
    setLoading(true); setError('')
    try {
      const body = {
        produtorId: tipo === 'PRODUTOR' ? beneficiarioId : null,
        parceiroId: tipo === 'MEEIRO' ? beneficiarioId : null,
        valor: parseFloat(valor),
        data,
        observacao: observacao.trim() || null,
      }
      const res = await fetch(editing ? `/api/vales/${editing}` : '/api/vales', {
        method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Erro ao salvar')
      const salvo = await res.json()
      const produtor = tipo === 'PRODUTOR' ? produtores.find(p => p.id === beneficiarioId) ?? null : null
      const parceiro = tipo === 'MEEIRO' ? parceiros.find(p => p.id === beneficiarioId) ?? null : null
      const linha: Vale = {
        id: salvo.id, valor: Number(salvo.valor), data: salvo.data, observacao: salvo.observacao,
        status: salvo.status, createdAt: salvo.createdAt,
        produtor: produtor ? { id: produtor.id, nome: produtor.nome, codigo: produtor.codigo } : null,
        parceiro: parceiro ? { id: parceiro.id, nome: parceiro.nome, codigo: parceiro.codigo, produtorNome: parceiro.produtorNome } : null,
      }
      setVales(prev => editing ? prev.map(v => v.id === editing ? linha : v) : [linha, ...prev])
      toast.success(editing ? 'Vale atualizado' : 'Vale registrado')
      setModal(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro inesperado')
    } finally { setLoading(false) }
  }

  async function handleDiscard(id: string) {
    setDiscarding(true)
    try {
      const res = await fetch(`/api/vales/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'CANCELADO' }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Erro ao descartar')
      setVales(prev => prev.map(v => v.id === id ? { ...v, status: 'CANCELADO' } : v))
      toast.success('Vale descartado', 'Ele não será mais cobrado')
      setConfirmDiscard(null)
    } catch (e: unknown) {
      toast.error('Não foi possível descartar', e instanceof Error ? e.message : '')
    } finally { setDiscarding(false) }
  }

  async function handleDelete(id: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/vales/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Erro ao excluir')
      setVales(prev => prev.filter(v => v.id !== id))
      toast.success('Vale excluído')
      setConfirmDel(null)
    } catch (e: unknown) {
      toast.error('Não foi possível excluir', e instanceof Error ? e.message : '')
    } finally { setLoading(false) }
  }

  const kpiCard = (label: string, value: string, color: string) => (
    <div style={{ flex: 1, backgroundColor: 'white', borderRadius: 14, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${color}` }}>
      <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</p>
      <p className="kpi-val" style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: 0, wordBreak: 'break-word' }}>{value}</p>
    </div>
  )

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex-header">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0 }}>Vales em Dinheiro</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Adiantamentos para produtores e meeiros</p>
        </div>
        <motion.button
          onClick={openCreate}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', backgroundColor: ORANGE, color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <FontAwesomeIcon icon={faPlus} style={{ fontSize: 15 }} /> Novo Vale
        </motion.button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.3 }}
        className="kpi-grid-3" style={{ marginBottom: 20 }}>
        {kpiCard('Total em Aberto', fmtBRL(totalAberto), ORANGE)}
        {kpiCard('Vales Abertos', String(qtdAberto), BLUE)}
        {kpiCard('Total Descontado', fmtBRL(totalDescontado), GREEN)}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.3 }}
        style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as typeof filtroTipo)}
          style={{ ...inp, width: 'auto', padding: '9px 14px', fontSize: 13 }}>
          <option value="TODOS">Todos os tipos</option>
          <option value="PRODUTOR">Produtores</option>
          <option value="MEEIRO">Meeiros</option>
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as typeof filtroStatus)}
          style={{ ...inp, width: 'auto', padding: '9px 14px', fontSize: 13 }}>
          <option value="TODOS">Todos os status</option>
          <option value="ABERTO">Em aberto</option>
          <option value="DESCONTADO">Descontados</option>
          <option value="CANCELADO">Descartados</option>
        </select>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <FontAwesomeIcon icon={faMagnifyingGlass} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14 }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nome..."
            style={{ ...inp, paddingLeft: 36, paddingTop: 9, paddingBottom: 9, fontSize: 13 }} />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}
        style={{ backgroundColor: 'white', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {filtrados.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center', color: '#9ca3af' }}>
            <FontAwesomeIcon icon={faHandHoldingDollar} style={{ fontSize: 40, opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontWeight: 600, margin: '0 0 6px' }}>Nenhum vale encontrado</p>
            <p style={{ fontSize: 13, margin: 0 }}>Clique em &quot;Novo Vale&quot; para registrar um adiantamento</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                {['Data', 'Beneficiário', 'Valor', 'Status', 'Observação', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(v => (
                <tr key={v.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>{fmtDate(v.data)}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13 }}>
                    <span style={{ fontWeight: 700, color: NAVY }}>{v.produtor?.nome ?? v.parceiro?.nome}</span>
                    <span style={{
                      marginLeft: 8, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                      backgroundColor: v.produtor ? '#eff6ff' : '#fef3c7', color: v.produtor ? BLUE : ORANGE,
                    }}>
                      {v.produtor ? 'Produtor' : 'Meeiro'}
                    </span>
                    {v.parceiro && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{v.parceiro.produtorNome}</div>}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 700, color: NAVY }}>{fmtBRL(v.valor)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                      backgroundColor: v.status === 'ABERTO' ? '#fff7ed' : v.status === 'DESCONTADO' ? '#f0fdf4' : '#f3f4f6',
                      color: v.status === 'ABERTO' ? ORANGE : v.status === 'DESCONTADO' ? GREEN : '#6b7280',
                    }}>
                      {v.status === 'ABERTO' ? 'Em aberto' : v.status === 'DESCONTADO' ? 'Descontado' : 'Descartado'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#6b7280' }}>{v.observacao ?? <span style={{ color: '#d1d5db' }}>—</span>}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => openEdit(v)} title="Editar"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, color: BLUE }}>
                        <FontAwesomeIcon icon={faPencil} style={{ fontSize: 14 }} />
                      </button>
                      {(v.status === 'ABERTO' || v.status === 'DESCONTADO') && (
                        <button onClick={() => setConfirmDiscard(v.id)} title="Descartar (não cobrar)"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, color: '#6b7280' }}>
                          <FontAwesomeIcon icon={faBan} style={{ fontSize: 14 }} />
                        </button>
                      )}
                      {v.status === 'ABERTO' && (
                        <button onClick={() => setConfirmDel(v.id)} title="Excluir"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, color: PINK }}>
                          <FontAwesomeIcon icon={faTrash} style={{ fontSize: 14 }} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>

      {/* ══════════ NOVO VALE MODAL ══════════ */}
      <AnimatePresence>
        {modal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setModal(false)}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1000 }} />
            <div className="modal-wrapper">
              <motion.div
                initial={{ opacity: 0, scale: 0.93, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.93, y: 20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                style={{ backgroundColor: 'white', borderRadius: 16, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #f3f4f6' }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: 0 }}>{editing ? 'Editar Vale' : 'Novo Vale'}</h2>
                  <button onClick={() => setModal(false)}
                    style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#6b7280', display: 'flex' }}>
                    <FontAwesomeIcon icon={faXmark} style={{ fontSize: 15 }} />
                  </button>
                </div>
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={lbl}>Beneficiário</label>
                    <div className="grid-2" style={{ gap: 10, marginBottom: 10 }}>
                      {([{ val: 'PRODUTOR' as const, label: 'Produtor' }, { val: 'MEEIRO' as const, label: 'Meeiro' }]).map(opt => (
                        <button key={opt.val} type="button"
                          disabled={editBeneficiarioTravado}
                          onClick={() => { setTipo(opt.val); setBeneficiarioId('') }}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 14px',
                            border: `2px solid ${tipo === opt.val ? BLUE : '#e5e7eb'}`, borderRadius: 10,
                            background: editBeneficiarioTravado ? '#f9fafb' : tipo === opt.val ? '#eff6ff' : 'white',
                            cursor: editBeneficiarioTravado ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                            fontWeight: 600, fontSize: 13,
                            color: editBeneficiarioTravado ? '#9ca3af' : tipo === opt.val ? BLUE : '#374151',
                          }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <select value={beneficiarioId} onChange={e => setBeneficiarioId(e.target.value)}
                      disabled={editBeneficiarioTravado}
                      style={{ ...inp, background: editBeneficiarioTravado ? '#f9fafb' : 'white', color: editBeneficiarioTravado ? '#9ca3af' : NAVY }}>
                      <option value="">Selecione...</option>
                      {tipo === 'PRODUTOR'
                        ? produtores.map(p => <option key={p.id} value={p.id}>{p.codigo ? `${p.codigo} — ` : ''}{p.nome}</option>)
                        : parceiros.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.produtorNome})</option>)}
                    </select>
                    {editBeneficiarioTravado && (
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: '5px 0 0' }}>
                        Vale já descontado: o valor pode ser corrigido (o fechamento é ajustado junto), mas o beneficiário não muda.
                      </p>
                    )}
                  </div>
                  <div>
                    <label style={lbl}>Valor (R$)</label>
                    <input type="number" step="0.01" min="0" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Data</label>
                    <input type="date" value={data} onChange={e => setData(e.target.value)} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Observação <span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af' }}>(opcional)</span></label>
                    <input value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Ex: adiantamento para insumos" style={inp} />
                  </div>
                  {error && <p style={{ color: PINK, fontSize: 13, margin: 0, padding: '8px 12px', backgroundColor: `${PINK}10`, borderRadius: 8 }}>{error}</p>}
                </div>
                <div style={{ padding: '16px 24px', borderTop: '1px solid #f3f4f6' }}>
                  <motion.button onClick={handleSave} disabled={loading}
                    whileHover={!loading ? { scale: 1.01 } : {}} whileTap={!loading ? { scale: 0.99 } : {}}
                    style={{ width: '100%', padding: '13px', backgroundColor: ORANGE, color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}>
                    {loading ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Registrar Vale'}
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════ CONFIRM DISCARD ══════════ */}
      <AnimatePresence>
        {confirmDiscard && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setConfirmDiscard(null)}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1000 }} />
            <div className="modal-wrapper">
              <motion.div
                initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.93 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                style={{ backgroundColor: 'white', borderRadius: 14, padding: 24, width: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: '0 0 8px' }}>Descartar vale?</h3>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>
                  Esse vale não será mais cobrado. Se já estava descontado em um fechamento ainda pendente, o valor volta a ser somado ao que a pessoa tem a receber.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setConfirmDiscard(null)}
                    style={{ flex: 1, padding: '10px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: 'white', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancelar
                  </button>
                  <motion.button onClick={() => handleDiscard(confirmDiscard)} disabled={discarding}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    style={{ flex: 1, padding: '10px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {discarding ? 'Aguarde...' : 'Descartar'}
                  </motion.button>
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
                <h3 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: '0 0 8px' }}>Excluir vale?</h3>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>Essa ação não pode ser desfeita.</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setConfirmDel(null)}
                    style={{ flex: 1, padding: '10px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: 'white', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancelar
                  </button>
                  <motion.button onClick={() => handleDelete(confirmDel)} disabled={loading}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    style={{ flex: 1, padding: '10px', backgroundColor: PINK, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {loading ? 'Aguarde...' : 'Excluir'}
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
