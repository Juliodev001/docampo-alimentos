'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUsers, faPlus, faMagnifyingGlass, faPencil, faTrash, faPhone, faEnvelope, faFileLines, faBagShopping, faXmark, faBuilding, faUser, faLocationDot, faHashtag, faCheck, faEye, faHandshake, faCalendarAlt, faChartLine, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
import { formatCurrency } from '@/lib/utils'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { useToast } from '@/components/toast'

const GREEN  = '#5ab952'
const NAVY   = '#2d3561'
const PINK   = '#e8255a'
const ORANGE = '#e87320'
const BLUE   = '#3b82f6'
const TEAL   = '#0ea5e9'

/* ── types ── */
type EnderecoItem = {
  cep: string; logradouro: string; numero: string; complemento: string
  bairro: string; cidade: string; estado: string; referencia: string
}
type ContatoItem = {
  telefone: string; email: string; nomeContato: string; observacao: string
}
type WizardData = {
  tipo: 'JURIDICA' | 'FISICA'
  nome: string; cnpjCpf: string; inscricaoEstadual: string
  enderecos: EnderecoItem[]; contatos: ContatoItem[]
}
type ClienteEndereco = {
  id: string; cep: string | null; logradouro: string | null; numero: string | null
  complemento: string | null; bairro: string | null; cidade: string | null
  estado: string | null; referencia: string | null
}
type ClienteContato = {
  id: string; telefone: string | null; email: string | null
  nomeContato: string | null; observacao: string | null
}
type ClientePedido = {
  id: string; numero: number; valor: number; data: string
  formaPagamento: string | null; status: string; dataCobranca: string | null
}
type ClienteCompras = {
  totalComprado: number; qtdPedidos: number; ultimaCompra: string | null
  fiadoPendente: number; pedidos: ClientePedido[]
}
type Cliente = {
  id: string; nome: string; tipo: string
  cnpjCpf: string | null; inscricaoEstadual: string | null
  telefone: string | null; email: string | null
  createdAt: string
  _count?: { nfes: number; romaneios: number }
  enderecos: ClienteEndereco[]; contatos: ClienteContato[]
  compras: ClienteCompras
}

/* ── empty states ── */
const emptyEndereco = (): EnderecoItem => ({
  cep: '', logradouro: '', numero: '', complemento: '',
  bairro: '', cidade: '', estado: 'SP', referencia: '',
})
const emptyContato = (): ContatoItem => ({
  telefone: '', email: '', nomeContato: '', observacao: '',
})
const emptyWizard: WizardData = {
  tipo: 'FISICA', nome: '', cnpjCpf: '', inscricaoEstadual: '',
  enderecos: [], contatos: [],
}
const emptyEdit = { nome: '', tipo: 'FISICA', cnpjCpf: '', inscricaoEstadual: '', telefone: '', email: '' }

/* ── shared styles ── */
const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  border: '1.5px solid #e5e7eb', borderRadius: 10,
  fontSize: 14, color: NAVY, outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit', background: 'white',
}
const lbl: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: NAVY, display: 'block', marginBottom: 5,
}

/* ══════════════════════════════════════════════════ */
export default function ClientesClient({ clientes: inicial }: { clientes: Cliente[] }) {
  const toast = useToast()
  const [clientes, setClientes] = useState(inicial)
  const [q, setQ] = useState('')

  /* wizard (create) */
  const [wizard, setWizard] = useState(false)
  const [step, setStep] = useState<1|2|3>(1)
  const [wd, setWd] = useState<WizardData>(emptyWizard)

  /* edit modal */
  const [editModal, setEditModal] = useState(false)
  const [editing, setEditing] = useState<Cliente | null>(null)
  const [ef, setEf] = useState(emptyEdit)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [viewCliente, setViewCliente] = useState<Cliente | null>(null)

  const filtrados = clientes.filter(c =>
    !q ||
    c.nome.toLowerCase().includes(q.toLowerCase()) ||
    (c.cnpjCpf ?? '').includes(q) ||
    (c.telefone ?? '').includes(q)
  )

  /* ── wizard helpers ── */
  function openWizard() { setWd(emptyWizard); setStep(1); setError(''); setWizard(true) }
  function closeWizard() { setWizard(false) }

  function nextStep() {
    if (step === 1 && !wd.nome.trim()) { setError('Nome é obrigatório'); return }
    setError(''); setStep(s => (s < 3 ? (s + 1) as 1|2|3 : s))
  }
  function prevStep() { setError(''); setStep(s => (s > 1 ? (s - 1) as 1|2|3 : s)) }

  /* endereços */
  function addEndereco() { setWd(d => ({ ...d, enderecos: [...d.enderecos, emptyEndereco()] })) }
  function removeEndereco(i: number) { setWd(d => ({ ...d, enderecos: d.enderecos.filter((_,j) => j !== i) })) }
  function setEndereco(i: number, field: keyof EnderecoItem, val: string) {
    setWd(d => ({ ...d, enderecos: d.enderecos.map((e,j) => j === i ? { ...e, [field]: val } : e) }))
  }
  /* contatos */
  function addContato() { setWd(d => ({ ...d, contatos: [...d.contatos, emptyContato()] })) }
  function removeContato(i: number) { setWd(d => ({ ...d, contatos: d.contatos.filter((_,j) => j !== i) })) }
  function setContato(i: number, field: keyof ContatoItem, val: string) {
    setWd(d => ({ ...d, contatos: d.contatos.map((c,j) => j === i ? { ...c, [field]: val } : c) }))
  }

  async function handleFinalize() {
    if (!wd.nome.trim()) { setError('Nome é obrigatório'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: wd.nome.trim(), tipo: wd.tipo,
          cnpjCpf: wd.cnpjCpf || null,
          inscricaoEstadual: wd.inscricaoEstadual || null,
          enderecos: wd.enderecos, contatos: wd.contatos,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Erro ao criar')
      const novo = await res.json()
      setClientes(prev => [{ ...novo, enderecos: novo.enderecos ?? [], contatos: novo.contatos ?? [], compras: { totalComprado: 0, qtdPedidos: 0, ultimaCompra: null, fiadoPendente: 0, pedidos: [] } }, ...prev])
      toast.success('Cliente cadastrado', novo.nome)
      closeWizard()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  /* ── edit helpers ── */
  function openEdit(c: Cliente) {
    setEditing(c)
    setEf({ nome: c.nome, tipo: c.tipo, cnpjCpf: c.cnpjCpf ?? '', inscricaoEstadual: c.inscricaoEstadual ?? '', telefone: c.telefone ?? '', email: c.email ?? '' })
    setError(''); setEditModal(true)
  }
  function closeEdit() { setEditModal(false); setEditing(null) }

  async function handleSaveEdit() {
    if (!ef.nome.trim()) { setError('Nome é obrigatório'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/clientes/${editing!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: ef.nome.trim(), tipo: ef.tipo, cnpjCpf: ef.cnpjCpf || null, inscricaoEstadual: ef.inscricaoEstadual || null, telefone: ef.telefone || null, email: ef.email || null }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Erro ao salvar')
      const updated = await res.json()
      setClientes(prev => prev.map(c => c.id === updated.id
        ? { ...c, ...updated, enderecos: updated.enderecos ?? c.enderecos, contatos: updated.contatos ?? c.contatos }
        : c
      ))
      toast.success('Cliente atualizado', updated.nome)
      closeEdit()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/clientes/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Erro ao excluir')
      setClientes(prev => prev.filter(c => c.id !== id))
      toast.success('Cliente excluído')
    } catch (e: unknown) {
      toast.error('Não foi possível excluir', e instanceof Error ? e.message : 'Verifique se não há NF-e ou romaneios vinculados.')
    } finally {
      setLoading(false); setConfirmDelete(null)
    }
  }

  /* ── wizard header ── */
  function ProgressHeader() {
    return (
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f0f4f8', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 36 }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FontAwesomeIcon icon={faUsers} style={{ fontSize: 18, color: BLUE }} />
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: NAVY, fontSize: 16 }}>Novo Cliente</p>
            <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Passo {step} de 3</p>
          </div>
        </div>
        <div style={{ marginTop: 14, height: 4, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${(step / 3) * 100}%`, height: '100%', background: BLUE, borderRadius: 4, transition: 'width 0.35s ease' }} />
        </div>
        <button onClick={closeWizard}
          style={{ position: 'absolute', top: 18, right: 18, background: '#f3f4f6', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FontAwesomeIcon icon={faXmark} style={{ fontSize: 15 }} />
        </button>
      </div>
    )
  }

  /* ── step 1 ── */
  function Step1() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Tipo cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {([
            { val: 'FISICA'   as const, label: 'Pessoa Física',   sub: 'CPF',  icon: faUser    },
            { val: 'JURIDICA' as const, label: 'Pessoa Jurídica', sub: 'CNPJ', icon: faBuilding },
          ] as { val: 'FISICA' | 'JURIDICA'; label: string; sub: string; icon: IconDefinition }[]).map(({ val, label, sub, icon }) => {
            const sel = wd.tipo === val
            return (
              <button key={val} type="button" onClick={() => setWd(d => ({ ...d, tipo: val }))}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 12px', gap: 10, position: 'relative', border: `2px solid ${sel ? BLUE : '#e5e7eb'}`, borderRadius: 12, background: sel ? '#eff6ff' : 'white', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                {sel && (
                  <span style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: '50%', background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FontAwesomeIcon icon={faCheck} style={{ fontSize: 11, color: 'white' }} />
                  </span>
                )}
                <FontAwesomeIcon icon={icon} style={{ fontSize: 28, color: sel ? BLUE : '#9ca3af' }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: sel ? BLUE : NAVY }}>{label}</span>
                <span style={{ fontSize: 12, color: sel ? '#60a5fa' : '#9ca3af' }}>{sub}</span>
              </button>
            )
          })}
        </div>

        {/* Nome */}
        <div>
          <label style={lbl}>
            <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 13, display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            Nome <span style={{ color: PINK }}>*</span>
          </label>
          <input value={wd.nome} onChange={e => setWd(d => ({ ...d, nome: e.target.value }))}
            placeholder={wd.tipo === 'FISICA' ? 'Nome completo' : 'Razão social ou nome fantasia'}
            style={inp} autoFocus />
        </div>

        {/* CPF / CNPJ */}
        <div>
          <label style={lbl}>
            <FontAwesomeIcon icon={faHashtag} style={{ fontSize: 13, display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            {wd.tipo === 'FISICA' ? 'CPF' : 'CNPJ'}
            <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 400, color: '#9ca3af' }}>(opcional)</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input value={wd.cnpjCpf} onChange={e => setWd(d => ({ ...d, cnpjCpf: e.target.value }))}
              placeholder={wd.tipo === 'FISICA' ? '000.000.000-00' : '00.000.000/0000-00'}
              style={{ ...inp, paddingRight: 40 }} />
            <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: 15, position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          </div>
        </div>

        {/* Inscrição Estadual — só PJ */}
        {wd.tipo === 'JURIDICA' && (
          <div>
            <label style={lbl}>
              <FontAwesomeIcon icon={faHashtag} style={{ fontSize: 13, display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              Inscrição Estadual
            </label>
            <input value={wd.inscricaoEstadual} onChange={e => setWd(d => ({ ...d, inscricaoEstadual: e.target.value }))}
              placeholder="000.000.000.000" style={inp} />
          </div>
        )}
      </div>
    )
  }

  /* ── step 2 — endereços ── */
  function Step2() {
    return (
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FontAwesomeIcon icon={faLocationDot} style={{ fontSize: 16, color: BLUE }} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: NAVY, fontSize: 14 }}>Endereços</p>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Localizações do cliente</p>
            </div>
          </div>
          <button type="button" onClick={addEndereco}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontWeight: 600, color: NAVY, cursor: 'pointer', fontFamily: 'inherit' }}>
            <FontAwesomeIcon icon={faPlus} style={{ fontSize: 14 }} /> Adicionar Endereço
          </button>
        </div>

        {wd.enderecos.map((end, i) => (
          <div key={i} style={{ marginTop: 16, border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <p style={{ margin: 0, fontWeight: 700, color: NAVY, fontSize: 13 }}>Endereço {i + 1}</p>
              <button type="button" onClick={() => removeEndereco(i)}
                style={{ background: `${PINK}15`, border: 'none', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: PINK, display: 'flex', alignItems: 'center' }}>
                <FontAwesomeIcon icon={faXmark} style={{ fontSize: 13 }} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {([
                { field: 'cep'         as const, label: 'CEP',         ph: '00000-000'           },
                { field: 'logradouro'  as const, label: 'Logradouro',  ph: 'Rua, Avenida, etc.'  },
                { field: 'numero'      as const, label: 'Número',      ph: '123'                 },
                { field: 'complemento' as const, label: 'Complemento', ph: 'Apto, Sala, etc.'    },
                { field: 'bairro'      as const, label: 'Bairro',      ph: 'Nome do bairro'      },
                { field: 'cidade'      as const, label: 'Cidade',      ph: 'Nome da cidade'      },
                { field: 'estado'      as const, label: 'Estado (UF)', ph: 'SP'                  },
                { field: 'referencia'  as const, label: 'Referência',  ph: 'Ponto de referência' },
              ]).map(({ field, label, ph }) => (
                <div key={field}>
                  <label style={{ ...lbl, fontWeight: 500, color: '#374151', fontSize: 12 }}>{label}</label>
                  <input value={end[field]} onChange={e => setEndereco(i, field, e.target.value)}
                    placeholder={ph} style={{ ...inp, fontSize: 13, padding: '9px 12px' }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  /* ── step 3 — contatos ── */
  function Step3() {
    return (
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: `${TEAL}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FontAwesomeIcon icon={faPhone} style={{ fontSize: 16, color: TEAL }} />
            </div>
            <p style={{ margin: 0, fontWeight: 700, color: NAVY, fontSize: 14 }}>Contatos</p>
          </div>
          <button type="button" onClick={addContato}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: `${TEAL}15`, border: `1.5px solid ${TEAL}40`, borderRadius: 8, fontSize: 13, fontWeight: 600, color: TEAL, cursor: 'pointer', fontFamily: 'inherit' }}>
            <FontAwesomeIcon icon={faPlus} style={{ fontSize: 14 }} /> Adicionar Contato
          </button>
        </div>

        {wd.contatos.map((ct, i) => (
          <div key={i} style={{ marginTop: 16, border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <p style={{ margin: 0, fontWeight: 700, color: NAVY, fontSize: 13 }}>Contato {i + 1}</p>
              <button type="button" onClick={() => removeContato(i)}
                style={{ background: `${PINK}15`, border: 'none', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: PINK, display: 'flex', alignItems: 'center' }}>
                <FontAwesomeIcon icon={faXmark} style={{ fontSize: 13 }} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ ...lbl, fontWeight: 500, color: '#374151', fontSize: 12 }}>
                  <FontAwesomeIcon icon={faPhone} style={{ fontSize: 12, display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                  Telefone <span style={{ color: '#9ca3af', fontSize: 11 }}>(opcional)</span>
                </label>
                <input value={ct.telefone} onChange={e => setContato(i, 'telefone', e.target.value)}
                  placeholder="(00) 00000-0000" style={{ ...inp, fontSize: 13, padding: '9px 12px' }} />
              </div>
              <div>
                <label style={{ ...lbl, fontWeight: 500, color: '#374151', fontSize: 12 }}>
                  <FontAwesomeIcon icon={faEnvelope} style={{ fontSize: 12, display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                  E-mail
                </label>
                <input value={ct.email} onChange={e => setContato(i, 'email', e.target.value)}
                  placeholder="exemplo@email.com" type="email" style={{ ...inp, fontSize: 13, padding: '9px 12px' }} />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ ...lbl, fontWeight: 500, color: '#374151', fontSize: 12 }}>
                <FontAwesomeIcon icon={faUser} style={{ fontSize: 12, display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                Nome do Contato
              </label>
              <input value={ct.nomeContato} onChange={e => setContato(i, 'nomeContato', e.target.value)}
                placeholder="Nome do responsável" style={{ ...inp, fontSize: 13, padding: '9px 12px' }} />
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ ...lbl, fontWeight: 500, color: '#374151', fontSize: 12 }}>Observação</label>
              <input value={ct.observacao} onChange={e => setContato(i, 'observacao', e.target.value)}
                placeholder="Observações sobre o contato" style={{ ...inp, fontSize: 13, padding: '9px 12px' }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  /* ══════════════════════ RENDER ══════════════════════ */
  return (
    <div>
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex-header">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0 }}>Clientes</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Gerencie seus clientes</p>
        </div>
        <motion.button onClick={openWizard} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', backgroundColor: BLUE, color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <FontAwesomeIcon icon={faPlus} style={{ fontSize: 15 }} /> Criar Cliente
        </motion.button>
      </motion.div>

      {/* ── KPI Cards ── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}
        className="kpi-grid-3">
        {[
          { label: 'Total de Clientes',     value: clientes.length,                                                                   color: NAVY,    icon: faUsers      },
          { label: 'Com NF-e emitida',      value: clientes.filter(c => (c._count?.nfes ?? 0) > 0).length,                            color: GREEN,   icon: faFileLines   },
          { label: 'Com Romaneios',         value: clientes.filter(c => (c._count?.romaneios ?? 0) > 0).length,                       color: ORANGE,  icon: faBagShopping },
        ].map(({ label, value, color, icon }, i) => (
          <motion.div key={label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 + 0.1, duration: 0.4, type: 'spring', stiffness: 180 }}
            style={{ backgroundColor: 'white', borderRadius: 14, padding: '18px 22px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `4px solid ${color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>{label}</p>
                <p className="kpi-val" style={{ color, fontSize: 28, fontWeight: 700, margin: '4px 0 0', wordBreak: 'break-word' }}>{value}</p>
              </div>
              <div style={{ backgroundColor: `${color}15`, borderRadius: 10, padding: 8, flexShrink: 0, marginLeft: 6 }}>
                <FontAwesomeIcon icon={icon} style={{ fontSize: 16, color }} />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Table ── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}
        style={{ backgroundColor: 'white', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h3 style={{ margin: 0, color: NAVY, fontSize: 15, fontWeight: 600 }}>Clientes Cadastrados</h3>
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: 14, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nome, CPF/CNPJ..."
              style={{ ...inp, paddingLeft: 36, paddingTop: 8, paddingBottom: 8, fontSize: 13 }} />
          </div>
        </div>

        {filtrados.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ padding: 64, textAlign: 'center', color: '#9ca3af' }}>
            <FontAwesomeIcon icon={faUsers} style={{ fontSize: 40, opacity: 0.3, display: 'block', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600, margin: '0 0 6px' }}>Nenhum cliente encontrado</p>
            <p style={{ fontSize: 13, margin: 0 }}>Clique em &quot;Criar Cliente&quot; para cadastrar</p>
          </motion.div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                {['Nome', 'Tipo', 'CPF / CNPJ', 'Telefone', 'E-mail', 'NF-e', 'Romaneios', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c, i) => (
                <motion.tr key={c.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.32 + i * 0.04 }}
                  whileHover={{ backgroundColor: '#f8fffe' }}
                  style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '13px 16px', fontSize: 14, fontWeight: 600, color: NAVY }}>{c.nome}</td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: c.tipo === 'FISICA' ? `${TEAL}15` : `${BLUE}15`, color: c.tipo === 'FISICA' ? TEAL : BLUE }}>
                      {c.tipo === 'FISICA' ? 'PF' : 'PJ'}
                    </span>
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: '#6b7280' }}>
                    {c.cnpjCpf ?? <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: '#6b7280' }}>
                    {(c.contatos[0]?.telefone || c.telefone)
                      ? <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><FontAwesomeIcon icon={faPhone} style={{ fontSize: 12 }} />{c.contatos[0]?.telefone || c.telefone}</span>
                      : <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: '#6b7280' }}>
                    {(c.contatos[0]?.email || c.email)
                      ? <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><FontAwesomeIcon icon={faEnvelope} style={{ fontSize: 12 }} />{c.contatos[0]?.email || c.email}</span>
                      : <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ backgroundColor: `${NAVY}12`, color: NAVY, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                      {c._count?.nfes ?? 0}
                    </span>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ backgroundColor: `${ORANGE}12`, color: ORANGE, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                      {c._count?.romaneios ?? 0}
                    </span>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <motion.button onClick={() => setViewCliente(c)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        style={{ background: `${TEAL}15`, border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color: TEAL }}>
                        <FontAwesomeIcon icon={faEye} style={{ fontSize: 13 }} />
                      </motion.button>
                      <motion.button onClick={() => openEdit(c)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        style={{ background: `${NAVY}12`, border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color: NAVY }}>
                        <FontAwesomeIcon icon={faPencil} style={{ fontSize: 13 }} />
                      </motion.button>
                      <motion.button onClick={() => setConfirmDelete(c.id)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        style={{ background: `${PINK}12`, border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color: PINK }}>
                        <FontAwesomeIcon icon={faTrash} style={{ fontSize: 13 }} />
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>

      {/* ══════════════ WIZARD MODAL ══════════════ */}
      <AnimatePresence>
        {wizard && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeWizard}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1000 }} />
            <div className="modal-wrapper">
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 24 }}
                transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                style={{ backgroundColor: 'white', borderRadius: 16, width: '100%', maxWidth: 540, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}>
                <ProgressHeader />

                {/* Body */}
                <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                  {step === 1 && <Step1 />}
                  {step === 2 && <Step2 />}
                  {step === 3 && <Step3 />}
                  {error && (
                    <p style={{ color: PINK, fontSize: 13, margin: '14px 0 0', padding: '8px 12px', backgroundColor: `${PINK}10`, borderRadius: 8 }}>{error}</p>
                  )}
                </div>

                {/* Footer */}
                <div style={{ padding: '14px 24px', borderTop: '1px solid #f0f4f8' }}>
                  {step === 1 ? (
                    <motion.button onClick={nextStep} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      style={{ width: '100%', padding: '13px', backgroundColor: BLUE, color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Continuar
                    </motion.button>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                      <motion.button onClick={prevStep} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        style={{ padding: '13px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: 'white', fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Voltar
                      </motion.button>
                      <motion.button onClick={step === 3 ? handleFinalize : nextStep} disabled={loading}
                        whileHover={!loading ? { scale: 1.02 } : {}} whileTap={!loading ? { scale: 0.97 } : {}}
                        style={{ padding: '13px', backgroundColor: BLUE, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}>
                        {step === 3 ? (loading ? 'Salvando...' : 'Finalizar Cadastro') : 'Continuar'}
                      </motion.button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════════ EDIT MODAL ══════════════ */}
      <AnimatePresence>
        {editModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeEdit}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1000 }} />
            <div className="modal-wrapper">
              <motion.div
                initial={{ opacity: 0, scale: 0.93, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                style={{ backgroundColor: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: 0 }}>Editar Cliente</h2>
                  <motion.button onClick={closeEdit} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#6b7280', display: 'flex' }}>
                    <FontAwesomeIcon icon={faXmark} style={{ fontSize: 16 }} />
                  </motion.button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Tipo */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {([
                      { val: 'FISICA',   label: 'Pessoa Física',   icon: faUser    },
                      { val: 'JURIDICA', label: 'Pessoa Jurídica', icon: faBuilding },
                    ] as { val: string; label: string; icon: IconDefinition }[]).map(({ val, label, icon }) => (
                      <button key={val} type="button" onClick={() => setEf(p => ({ ...p, tipo: val }))}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: `2px solid ${ef.tipo === val ? BLUE : '#e5e7eb'}`, borderRadius: 10, background: ef.tipo === val ? '#eff6ff' : 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 13, color: ef.tipo === val ? BLUE : '#374151' }}>
                        <FontAwesomeIcon icon={icon} style={{ fontSize: 16, color: ef.tipo === val ? BLUE : '#9ca3af' }} />
                        {label}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label style={lbl}>Nome *</label>
                    <input value={ef.nome} onChange={e => setEf(p => ({ ...p, nome: e.target.value }))}
                      placeholder="Nome completo ou razão social" style={inp} autoFocus />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={lbl}>{ef.tipo === 'FISICA' ? 'CPF' : 'CNPJ'}</label>
                      <input value={ef.cnpjCpf} onChange={e => setEf(p => ({ ...p, cnpjCpf: e.target.value }))}
                        placeholder={ef.tipo === 'FISICA' ? '000.000.000-00' : '00.000.000/0000-00'} style={inp} />
                    </div>
                    {ef.tipo === 'JURIDICA' && (
                      <div>
                        <label style={lbl}>Insc. Estadual</label>
                        <input value={ef.inscricaoEstadual} onChange={e => setEf(p => ({ ...p, inscricaoEstadual: e.target.value }))}
                          placeholder="000.000.000.000" style={inp} />
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={lbl}>Telefone</label>
                      <input value={ef.telefone} onChange={e => setEf(p => ({ ...p, telefone: e.target.value }))}
                        placeholder="(00) 00000-0000" style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>E-mail</label>
                      <input type="email" value={ef.email} onChange={e => setEf(p => ({ ...p, email: e.target.value }))}
                        placeholder="email@exemplo.com" style={inp} />
                    </div>
                  </div>
                </div>

                {error && (
                  <p style={{ color: PINK, fontSize: 13, margin: '12px 0 0', padding: '8px 12px', backgroundColor: `${PINK}10`, borderRadius: 8 }}>{error}</p>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
                  <motion.button onClick={closeEdit} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    style={{ padding: '10px 18px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: 'white', fontSize: 14, color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancelar
                  </motion.button>
                  <motion.button onClick={handleSaveEdit} disabled={loading}
                    whileHover={!loading ? { scale: 1.03 } : {}} whileTap={!loading ? { scale: 0.97 } : {}}
                    style={{ padding: '10px 22px', backgroundColor: BLUE, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}>
                    {loading ? 'Salvando...' : 'Salvar'}
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════════ VIEW CLIENTE MODAL ══════════════ */}
      <AnimatePresence>
        {viewCliente && (() => {
          const c = viewCliente
          const compras = c.compras
          const hoje = new Date()
          hoje.setHours(0, 0, 0, 0)

          function diasParaVencer(dataCobranca: string | null) {
            if (!dataCobranca) return null
            const d = new Date(dataCobranca)
            d.setHours(0, 0, 0, 0)
            return Math.round((d.getTime() - hoje.getTime()) / 86400000)
          }

          const fiadosPendentes = compras.pedidos.filter(p => p.formaPagamento === 'FIADO' && p.status !== 'PAGO')

          return (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setViewCliente(null)}
                style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1000 }} />
              <div className="modal-wrapper">
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: 24 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: 24 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                  style={{ backgroundColor: 'white', borderRadius: 16, width: '100%', maxWidth: 620, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', maxHeight: '92vh', overflow: 'hidden' }}>

                  {/* Header */}
                  <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f0f4f8', display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: `${TEAL}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FontAwesomeIcon icon={c.tipo === 'FISICA' ? faUser : faBuilding} style={{ fontSize: 20, color: TEAL }} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, color: NAVY, fontSize: 17 }}>{c.nome}</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                        {c.tipo === 'FISICA' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                        {c.cnpjCpf ? ` · ${c.cnpjCpf}` : ''}
                      </p>
                    </div>
                    <button onClick={() => setViewCliente(null)}
                      style={{ position: 'absolute', top: 18, right: 18, background: '#f3f4f6', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#6b7280', display: 'flex' }}>
                      <FontAwesomeIcon icon={faXmark} style={{ fontSize: 15 }} />
                    </button>
                  </div>

                  {/* Body */}
                  <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* KPI cards */}
                    <div className="kpi-grid-4" style={{ marginBottom: 0 }}>
                      {[
                        { label: 'Total Comprado', value: formatCurrency(compras.totalComprado), color: GREEN, icon: faChartLine },
                        { label: 'Pedidos',         value: compras.qtdPedidos,                    color: BLUE,  icon: faBagShopping },
                        { label: 'Fiado Pendente',  value: formatCurrency(compras.fiadoPendente), color: compras.fiadoPendente > 0 ? PINK : '#9ca3af', icon: faExclamationTriangle },
                        { label: 'Última Compra',   value: compras.ultimaCompra ? new Date(compras.ultimaCompra).toLocaleDateString('pt-BR') : '—', color: ORANGE, icon: faCalendarAlt },
                      ].map(({ label, value, color, icon }) => (
                        <div key={label} style={{ background: '#f9fafb', borderRadius: 12, padding: '12px 14px', borderTop: `3px solid ${color}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                            <FontAwesomeIcon icon={icon} style={{ fontSize: 13, color }} />
                            <p style={{ margin: 0, fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{label}</p>
                          </div>
                          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color }}>{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Contato */}
                    {(c.telefone || c.email || c.contatos.length > 0) && (
                      <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 18px' }}>
                        <p style={{ margin: '0 0 12px', fontWeight: 700, color: NAVY, fontSize: 13, display: 'flex', alignItems: 'center', gap: 7 }}>
                          <FontAwesomeIcon icon={faPhone} style={{ fontSize: 13, color: TEAL }} /> Contato
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                          {(c.contatos[0]?.telefone || c.telefone) && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', background: '#f3f4f6', padding: '6px 12px', borderRadius: 8 }}>
                              <FontAwesomeIcon icon={faPhone} style={{ fontSize: 12, color: TEAL }} />
                              {c.contatos[0]?.telefone || c.telefone}
                            </span>
                          )}
                          {(c.contatos[0]?.email || c.email) && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', background: '#f3f4f6', padding: '6px 12px', borderRadius: 8 }}>
                              <FontAwesomeIcon icon={faEnvelope} style={{ fontSize: 12, color: BLUE }} />
                              {c.contatos[0]?.email || c.email}
                            </span>
                          )}
                        </div>
                        {c.contatos.slice(1).map((ct, i) => (ct.telefone || ct.email || ct.nomeContato) && (
                          <div key={i} style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
                            {ct.nomeContato && <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{ct.nomeContato}:</span>}
                            {ct.telefone && <span style={{ fontSize: 13, color: '#374151' }}>{ct.telefone}</span>}
                            {ct.email && <span style={{ fontSize: 13, color: '#374151' }}>{ct.email}</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Fiados pendentes */}
                    {fiadosPendentes.length > 0 && (
                      <div style={{ border: `1px solid ${PINK}30`, borderRadius: 12, padding: '14px 18px', background: `${PINK}06` }}>
                        <p style={{ margin: '0 0 12px', fontWeight: 700, color: PINK, fontSize: 13, display: 'flex', alignItems: 'center', gap: 7 }}>
                          <FontAwesomeIcon icon={faExclamationTriangle} style={{ fontSize: 13 }} /> Fiados em Aberto
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {fiadosPendentes.map(p => {
                            const dias = diasParaVencer(p.dataCobranca)
                            const cor = dias === null ? '#9ca3af' : dias < 0 ? PINK : dias === 0 ? ORANGE : dias <= 3 ? '#f59e0b' : GREEN
                            return (
                              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderRadius: 8, padding: '9px 12px', border: '1px solid #f3f4f6' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <FontAwesomeIcon icon={faHandshake} style={{ fontSize: 13, color: PINK }} />
                                  <span style={{ fontSize: 13, color: NAVY, fontWeight: 600 }}>Pedido #{p.numero}</span>
                                  <span style={{ fontSize: 12, color: '#6b7280' }}>{new Date(p.data).toLocaleDateString('pt-BR')}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: PINK }}>{formatCurrency(p.valor)}</span>
                                  {dias !== null && (
                                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${cor}18`, color: cor }}>
                                      {dias < 0 ? `${Math.abs(dias)}d atraso` : dias === 0 ? 'Vence hoje' : `${dias}d`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Histórico de compras */}
                    {compras.pedidos.length > 0 && (
                      <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 18px' }}>
                        <p style={{ margin: '0 0 12px', fontWeight: 700, color: NAVY, fontSize: 13, display: 'flex', alignItems: 'center', gap: 7 }}>
                          <FontAwesomeIcon icon={faChartLine} style={{ fontSize: 13, color: GREEN }} /> Histórico de Compras
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {compras.pedidos.slice(0, 15).map(p => (
                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f9fafb', borderRadius: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>#{p.numero}</span>
                                <span style={{ fontSize: 12, color: '#6b7280' }}>{new Date(p.data).toLocaleDateString('pt-BR')}</span>
                                {p.formaPagamento && (
                                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: p.formaPagamento === 'FIADO' ? `${ORANGE}18` : `${GREEN}18`, color: p.formaPagamento === 'FIADO' ? ORANGE : GREEN }}>
                                    {p.formaPagamento}
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{formatCurrency(p.valor)}</span>
                                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: p.status === 'PAGO' ? `${GREEN}18` : `${NAVY}10`, color: p.status === 'PAGO' ? GREEN : '#6b7280' }}>
                                  {p.status}
                                </span>
                              </div>
                            </div>
                          ))}
                          {compras.pedidos.length > 15 && (
                            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
                              + {compras.pedidos.length - 15} compras anteriores
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {compras.pedidos.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af' }}>
                        <FontAwesomeIcon icon={faBagShopping} style={{ fontSize: 32, opacity: 0.3, display: 'block', margin: '0 auto 10px' }} />
                        <p style={{ margin: 0, fontSize: 13 }}>Nenhuma compra registrada</p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div style={{ padding: '14px 24px', borderTop: '1px solid #f0f4f8', display: 'flex', justifyContent: 'flex-end' }}>
                    <motion.button onClick={() => setViewCliente(null)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      style={{ padding: '10px 22px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: 'white', fontSize: 14, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Fechar
                    </motion.button>
                  </div>
                </motion.div>
              </div>
            </>
          )
        })()}
      </AnimatePresence>

      {/* ══════════════ CONFIRM DELETE ══════════════ */}
      <AnimatePresence>
        {confirmDelete && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setConfirmDelete(null)}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1000 }} />
            <div className="modal-wrapper">
              <motion.div
                initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.93 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                style={{ backgroundColor: 'white', borderRadius: 14, padding: 24, width: 320, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${PINK}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <FontAwesomeIcon icon={faTrash} style={{ fontSize: 20, color: PINK }} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: '0 0 8px' }}>Excluir cliente?</h3>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>
                  Somente clientes sem NF-e ou romaneios podem ser excluídos.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <motion.button onClick={() => setConfirmDelete(null)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    style={{ flex: 1, padding: '10px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: 'white', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancelar
                  </motion.button>
                  <motion.button onClick={() => handleDelete(confirmDelete)} disabled={loading}
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
