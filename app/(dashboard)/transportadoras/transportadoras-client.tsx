'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTruck, faPlus, faPencil, faTrash, faPhone, faEnvelope, faMagnifyingGlass, faXmark, faUser, faCopy, faCircleCheck, faCircleXmark, faArrowTrendUp, faBox, faBuilding, faHashtag, faLocationDot, faCircleInfo, faFileLines } from '@fortawesome/free-solid-svg-icons'
import { useToast } from '@/components/toast'

const GREEN  = '#5ab952'
const NAVY   = '#2d3561'
const PINK   = '#e8255a'
const BLUE   = '#3b82f6'
const TEAL   = '#14b8a6'
const PURPLE = '#a855f7'
const ORANGE = '#e87320'

type Transportadora = {
  id: string; nome: string; nomeFantasia: string | null; cnpj: string | null
  inscricaoEstadual: string | null; telefone: string | null; email: string | null
  contato: string | null; cep: string | null; logradouro: string | null
  numero: string | null; complemento: string | null; bairro: string | null
  cidade: string | null; estado: string | null; observacao: string | null
  ativo: boolean; createdAt: string; _count?: { pedidos: number }
}

const emptyForm = {
  nome: '', nomeFantasia: '', cnpj: '', inscricaoEstadual: '',
  contato: '', telefone: '', email: '',
  cep: '', estado: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '',
  observacao: '', ativo: true,
}

/* ── shared input/label styles ── */
const inp: React.CSSProperties = {
  width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb',
  borderRadius: 10, fontSize: 14, color: NAVY, outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit', background: '#f9fafb',
}
const lbl = (color = NAVY): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 5,
  fontSize: 13, fontWeight: 600, color, marginBottom: 6,
})

/* ── section card wrapper ── */
function SectionCard({ icon, title, subtitle, iconBg, iconColor, children }: {
  icon: React.ReactNode; title: string; subtitle: string
  iconBg: string; iconColor: string; children: React.ReactNode
}) {
  return (
    <div style={{ backgroundColor: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: 0 }}>{title}</h3>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{subtitle}</p>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {children}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════ */
export default function TransportadorasClient({ transportadoras: inicial }: { transportadoras: Transportadora[] }) {
  const toast = useToast()
  const [lista, setLista] = useState(inicial)
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Transportadora | null>(null)
  const [form, setForm] = useState<typeof emptyForm>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const filtradas = lista.filter(t =>
    !q || t.nome.toLowerCase().includes(q.toLowerCase()) || (t.cnpj ?? '').includes(q)
  )
  const total    = lista.length
  const ativas   = lista.filter(t => t.ativo).length
  const inativas = total - ativas
  const taxa     = total > 0 ? Math.round((ativas / total) * 100) : 0

  function openCreate() { setEditing(null); setForm(emptyForm); setError(''); setModal(true) }
  function openEdit(t: Transportadora) {
    setEditing(t)
    setForm({
      nome: t.nome, nomeFantasia: t.nomeFantasia ?? '', cnpj: t.cnpj ?? '',
      inscricaoEstadual: t.inscricaoEstadual ?? '',
      contato: t.contato ?? '', telefone: t.telefone ?? '', email: t.email ?? '',
      cep: t.cep ?? '', estado: t.estado ?? '', logradouro: t.logradouro ?? '',
      numero: t.numero ?? '', complemento: t.complemento ?? '',
      bairro: t.bairro ?? '', cidade: t.cidade ?? '',
      observacao: t.observacao ?? '', ativo: t.ativo,
    })
    setError(''); setModal(true)
  }
  function closeModal() { setModal(false); setEditing(null); setForm(emptyForm); setError('') }
  function f(v: keyof typeof emptyForm, val: string | boolean) { setForm(p => ({ ...p, [v]: val })) }

  async function handleSave() {
    if (!form.nome.trim()) { setError('Nome é obrigatório'); return }
    setLoading(true); setError('')
    try {
      const body = {
        nome: form.nome.trim(),
        nomeFantasia: form.nomeFantasia || null,
        cnpj: form.cnpj || null,
        inscricaoEstadual: form.inscricaoEstadual || null,
        contato: form.contato || null,
        telefone: form.telefone || null,
        email: form.email || null,
        cep: form.cep || null,
        logradouro: form.logradouro || null,
        numero: form.numero || null,
        complemento: form.complemento || null,
        bairro: form.bairro || null,
        cidade: form.cidade || null,
        estado: form.estado || null,
        observacao: form.observacao || null,
        ativo: form.ativo,
      }
      if (editing) {
        const res = await fetch(`/api/transportadoras/${editing.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('Erro ao salvar')
        const upd = await res.json()
        setLista(prev => prev.map(t => t.id === upd.id ? { ...t, ...upd } : t))
        toast.success('Transportadora atualizada', upd.nome)
      } else {
        const res = await fetch('/api/transportadoras', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('Erro ao criar')
        const nova = await res.json()
        setLista(prev => [{ ...nova, _count: { pedidos: 0 } }, ...prev])
        toast.success('Transportadora cadastrada', nova.nome)
      }
      closeModal()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro inesperado')
    } finally { setLoading(false) }
  }

  async function handleDelete(id: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/transportadoras/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Erro ao excluir')
      setLista(prev => prev.filter(t => t.id !== id))
      toast.success('Transportadora excluída')
    } catch (e: unknown) {
      toast.error('Não foi possível excluir', e instanceof Error ? e.message : 'Erro')
    } finally { setLoading(false); setConfirmDel(null) }
  }

  /* ─────────────────────── KPI cards ─────────────────────── */
  const kpis = [
    { label: 'Total',            value: String(total),    icon: faCopy,         bg: '#eff6ff', color: BLUE   },
    { label: 'Ativas',           value: String(ativas),   icon: faCircleCheck,  bg: '#f0fdfa', color: TEAL   },
    { label: 'Inativas',         value: String(inativas), icon: faCircleXmark,  bg: '#f9fafb', color: '#6b7280' },
    { label: 'Taxa de Ativação', value: `${taxa}%`,       icon: faArrowTrendUp, bg: '#faf5ff', color: PURPLE },
  ]

  /* ══════════════════════ RENDER ══════════════════════ */
  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0 }}>Transportadoras</h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Gestão de transportadoras do ERP</p>
      </motion.div>

      {/* KPI cards */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="kpi-grid-4">
        {kpis.map(({ label, value, icon, bg, color }, i) => (
          <motion.div key={label}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
            style={{ backgroundColor: 'white', borderRadius: 14, padding: '20px 22px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0, fontWeight: 500 }}>{label}</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: NAVY, margin: '6px 0 0', lineHeight: 1 }}>{value}</p>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FontAwesomeIcon icon={icon} style={{ fontSize: 20, color }} />
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Search + table */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
        style={{ backgroundColor: 'white', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'visible' }}>

        <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderBottom: filtradas.length > 0 ? '1px solid #f3f4f6' : 'none' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
            <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: 14, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder="Buscar por nome ou CNPJ..."
              style={{ ...inp, paddingLeft: 36, paddingTop: 9, paddingBottom: 9, fontSize: 13 }} />
          </div>
          <motion.button onClick={openCreate} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', backgroundColor: BLUE, color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            <FontAwesomeIcon icon={faPlus} style={{ fontSize: 15 }} /> Nova Transportadora
          </motion.button>
        </div>

        {filtradas.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ padding: '72px 20px', textAlign: 'center' }}>
            <FontAwesomeIcon icon={faBox} style={{ fontSize: 48, opacity: 0.25, margin: '0 auto 16px', display: 'block', color: NAVY }} />
            <p style={{ fontWeight: 600, margin: 0, fontSize: 15, color: '#6b7280' }}>Nenhuma transportadora encontrada</p>
          </motion.div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                {['Nome', 'CNPJ', 'Contato', 'Telefone', 'E-mail', 'Pedidos', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((t, i) => (
                <motion.tr key={t.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '13px 16px', fontSize: 14, fontWeight: 600, color: NAVY }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <FontAwesomeIcon icon={faTruck} style={{ fontSize: 14, color: TEAL }} /> {t.nome}
                    </span>
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: '#6b7280' }}>{t.cnpj ?? <span style={{ color: '#d1d5db' }}>—</span>}</td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: '#6b7280' }}>
                    {t.contato ? <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><FontAwesomeIcon icon={faUser} style={{ fontSize: 11 }} />{t.contato}</span> : <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: '#6b7280' }}>
                    {t.telefone ? <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><FontAwesomeIcon icon={faPhone} style={{ fontSize: 11 }} />{t.telefone}</span> : <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: '#6b7280' }}>
                    {t.email ? <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><FontAwesomeIcon icon={faEnvelope} style={{ fontSize: 11 }} />{t.email}</span> : <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ background: '#f9fafb', color: '#6b7280', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: '1px solid #e5e7eb' }}>
                      {t._count?.pedidos ?? 0}
                    </span>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: t.ativo ? '#f0fdfa' : '#f9fafb', color: t.ativo ? TEAL : '#6b7280', border: `1px solid ${t.ativo ? '#99f6e4' : '#e5e7eb'}` }}>
                      {t.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <motion.button onClick={() => openEdit(t)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        style={{ background: `${NAVY}10`, border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color: NAVY, display: 'flex' }}>
                        <FontAwesomeIcon icon={faPencil} style={{ fontSize: 13 }} />
                      </motion.button>
                      <motion.button onClick={() => setConfirmDel(t.id)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        style={{ background: `${PINK}10`, border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color: PINK, display: 'flex' }}>
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

      {/* ══════════ MODAL CRIAR / EDITAR ══════════ */}
      <AnimatePresence>
        {modal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000 }} />
            <div className="modal-wrapper">
              <motion.div
                initial={{ opacity: 0, scale: 0.93, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                style={{ backgroundColor: '#f8fafc', borderRadius: 16, width: '100%', maxWidth: 680, boxShadow: '0 24px 80px rgba(0,0,0,0.25)', maxHeight: '93vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Modal header */}
                <div style={{ padding: '22px 26px 18px', background: 'white', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2 style={{ fontSize: 20, fontWeight: 700, color: NAVY, margin: '0 0 4px' }}>
                        {editing ? 'Editar Transportadora' : 'Nova Transportadora'}
                      </h2>
                      <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
                        {editing ? 'Atualize os dados da transportadora' : 'Preencha os dados para criar uma nova transportadora'}
                      </p>
                    </div>
                    <button onClick={closeModal}
                      style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: 7, cursor: 'pointer', color: '#6b7280', display: 'flex', marginLeft: 16 }}>
                      <FontAwesomeIcon icon={faXmark} style={{ fontSize: 16 }} />
                    </button>
                  </div>
                </div>

                {/* Modal body — scrollable */}
                <div style={{ overflowY: 'auto', padding: '20px 26px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* ── SEÇÃO 1: Informações Básicas ── */}
                  <SectionCard
                    icon={<FontAwesomeIcon icon={faBuilding} style={{ fontSize: 18, color: ORANGE }} />}
                    iconBg="#fff7ed" iconColor={ORANGE}
                    title="Informações Básicas"
                    subtitle="Dados principais da transportadora">

                    <div>
                      <label style={lbl(NAVY)}>
                        <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 13, color: BLUE }} /> Nome/Razão Social <span style={{ color: PINK }}>*</span>
                      </label>
                      <input value={form.nome} onChange={e => f('nome', e.target.value)}
                        placeholder="Nome da transportadora" style={inp} autoFocus />
                    </div>

                    <div>
                      <label style={lbl(NAVY)}>
                        <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 13, color: BLUE }} /> Nome Fantasia
                      </label>
                      <input value={form.nomeFantasia} onChange={e => f('nomeFantasia', e.target.value)}
                        placeholder="Nome fantasia (opcional)" style={inp} />
                    </div>

                    <div className="grid-2">
                      <div>
                        <label style={lbl(NAVY)}>
                          <FontAwesomeIcon icon={faHashtag} style={{ fontSize: 13, color: BLUE }} /> CNPJ
                        </label>
                        <input value={form.cnpj} onChange={e => f('cnpj', e.target.value)}
                          placeholder="12345678000190" style={inp} maxLength={18} />
                        <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>Digite apenas números (14 dígitos)</p>
                      </div>
                      <div>
                        <label style={lbl(NAVY)}>
                          <FontAwesomeIcon icon={faHashtag} style={{ fontSize: 13, color: BLUE }} /> Inscrição Estadual
                        </label>
                        <input value={form.inscricaoEstadual} onChange={e => f('inscricaoEstadual', e.target.value)}
                          placeholder="Inscrição estadual (opcional)" style={inp} />
                      </div>
                    </div>
                  </SectionCard>

                  {/* ── SEÇÃO 2: Contato ── */}
                  <SectionCard
                    icon={<FontAwesomeIcon icon={faPhone} style={{ fontSize: 18, color: BLUE }} />}
                    iconBg="#eff6ff" iconColor={BLUE}
                    title="Contato"
                    subtitle="Informações de contato da transportadora">

                    <div>
                      <label style={lbl(NAVY)}>
                        <FontAwesomeIcon icon={faUser} style={{ fontSize: 13, color: BLUE }} /> Nome do contato <span style={{ color: PINK }}>*</span>
                      </label>
                      <input value={form.contato} onChange={e => f('contato', e.target.value)}
                        placeholder="Ex.: João Silva" style={inp} />
                    </div>

                    <div className="grid-2">
                      <div>
                        <label style={lbl(NAVY)}>
                          <FontAwesomeIcon icon={faPhone} style={{ fontSize: 13, color: BLUE }} /> Telefone <span style={{ color: PINK }}>*</span>
                        </label>
                        <input value={form.telefone} onChange={e => f('telefone', e.target.value)}
                          placeholder="(00) 00000-0000" style={inp} />
                      </div>
                      <div>
                        <label style={lbl(NAVY)}>
                          <FontAwesomeIcon icon={faEnvelope} style={{ fontSize: 13, color: BLUE }} /> E-mail <span style={{ color: PINK }}>*</span>
                        </label>
                        <input type="email" value={form.email} onChange={e => f('email', e.target.value)}
                          placeholder="exemplo@email.com" style={inp} />
                        <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>
                          Digite um e-mail válido (ex: exemplo@email.com)
                        </p>
                      </div>
                    </div>
                  </SectionCard>

                  {/* ── SEÇÃO 3: Endereço ── */}
                  <SectionCard
                    icon={<FontAwesomeIcon icon={faLocationDot} style={{ fontSize: 18, color: GREEN }} />}
                    iconBg="#f0fdf4" iconColor={GREEN}
                    title="Endereço"
                    subtitle="Localização da transportadora">

                    <div className="grid-2">
                      <div>
                        <label style={lbl(NAVY)}><FontAwesomeIcon icon={faLocationDot} style={{ fontSize: 13, color: GREEN }} /> CEP</label>
                        <input value={form.cep} onChange={e => f('cep', e.target.value)}
                          placeholder="00000-000" style={inp} maxLength={9} />
                      </div>
                      <div>
                        <label style={lbl(NAVY)}><FontAwesomeIcon icon={faLocationDot} style={{ fontSize: 13, color: GREEN }} /> Estado (UF)</label>
                        <input value={form.estado} onChange={e => f('estado', e.target.value)}
                          placeholder="SP" style={inp} maxLength={2} />
                      </div>
                    </div>

                    <div>
                      <label style={lbl(NAVY)}><FontAwesomeIcon icon={faLocationDot} style={{ fontSize: 13, color: GREEN }} /> Logradouro</label>
                      <input value={form.logradouro} onChange={e => f('logradouro', e.target.value)}
                        placeholder="Rua, Avenida, etc." style={inp} />
                    </div>

                    <div className="grid-2">
                      <div>
                        <label style={lbl(NAVY)}><FontAwesomeIcon icon={faLocationDot} style={{ fontSize: 13, color: GREEN }} /> Número</label>
                        <input value={form.numero} onChange={e => f('numero', e.target.value)}
                          placeholder="123" style={inp} />
                      </div>
                      <div>
                        <label style={lbl(NAVY)}><FontAwesomeIcon icon={faLocationDot} style={{ fontSize: 13, color: GREEN }} /> Complemento</label>
                        <input value={form.complemento} onChange={e => f('complemento', e.target.value)}
                          placeholder="Apto, Sala, etc." style={inp} />
                      </div>
                    </div>

                    <div className="grid-2">
                      <div>
                        <label style={lbl(NAVY)}><FontAwesomeIcon icon={faLocationDot} style={{ fontSize: 13, color: GREEN }} /> Bairro</label>
                        <input value={form.bairro} onChange={e => f('bairro', e.target.value)}
                          placeholder="Nome do bairro" style={inp} />
                      </div>
                      <div>
                        <label style={lbl(NAVY)}><FontAwesomeIcon icon={faLocationDot} style={{ fontSize: 13, color: GREEN }} /> Cidade</label>
                        <input value={form.cidade} onChange={e => f('cidade', e.target.value)}
                          placeholder="Nome da cidade" style={inp} />
                      </div>
                    </div>
                  </SectionCard>

                  {/* ── SEÇÃO 4: Outros ── */}
                  <SectionCard
                    icon={<FontAwesomeIcon icon={faCircleInfo} style={{ fontSize: 18, color: '#9ca3af' }} />}
                    iconBg="#f9fafb" iconColor="#9ca3af"
                    title="Outros"
                    subtitle="Observações e status da transportadora">

                    <div>
                      <label style={lbl(NAVY)}>
                        <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 13, color: '#9ca3af' }} /> Observações
                      </label>
                      <textarea value={form.observacao} onChange={e => f('observacao', e.target.value)}
                        placeholder="Observações adicionais sobre a transportadora"
                        rows={3}
                        style={{ ...inp, resize: 'vertical', minHeight: 80 }} />
                    </div>

                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, color: NAVY, display: 'block', marginBottom: 8 }}>Status</label>
                      <div className="grid-2">
                        {([{ val: true, label: 'ATIVO' }, { val: false, label: 'INATIVO' }] as const).map(opt => (
                          <button key={String(opt.val)} type="button" onClick={() => f('ativo', opt.val)}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', border: `2px solid ${form.ativo === opt.val ? BLUE : '#e5e7eb'}`, borderRadius: 10, background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, color: form.ativo === opt.val ? NAVY : '#9ca3af', transition: 'all 0.15s' }}>
                            <span style={{ width: 12, height: 12, borderRadius: '50%', flexShrink: 0, background: form.ativo === opt.val ? (opt.val ? GREEN : PINK) : '#d1d5db', border: `2px solid ${form.ativo === opt.val ? (opt.val ? GREEN : PINK) : '#d1d5db'}` }} />
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </SectionCard>

                  {error && (
                    <p style={{ color: PINK, fontSize: 13, margin: 0, padding: '10px 14px', backgroundColor: `${PINK}10`, borderRadius: 8, border: `1px solid ${PINK}30` }}>{error}</p>
                  )}
                </div>

                {/* Modal footer */}
                <div style={{ padding: '16px 26px', background: 'white', borderTop: '1px solid #f3f4f6', flexShrink: 0 }}>
                  <motion.button onClick={handleSave} disabled={loading}
                    whileHover={!loading ? { scale: 1.01 } : {}} whileTap={!loading ? { scale: 0.99 } : {}}
                    style={{ width: '100%', padding: '14px', background: `linear-gradient(135deg, ${BLUE} 0%, #1d4ed8 100%)`, color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit', letterSpacing: 0.2 }}>
                    {loading ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Criar Transportadora'}
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmDel(null)}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1000 }} />
            <div className="modal-wrapper">
              <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.93 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                style={{ backgroundColor: 'white', borderRadius: 14, padding: 24, width: 320, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${PINK}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <FontAwesomeIcon icon={faTrash} style={{ fontSize: 20, color: PINK }} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: '0 0 8px' }}>Excluir transportadora?</h3>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>Só é possível excluir sem pedidos vinculados.</p>
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
