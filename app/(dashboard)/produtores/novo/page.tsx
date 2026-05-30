'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faPlus, faTrash, faSpinner } from '@fortawesome/free-solid-svg-icons'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'

type Parceiro = { nome: string; cpf: string; percentual: number }

const inputStyle = { width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', color: NAVY }

export default function NovoProdutorPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [produtor, setProdutor] = useState({ nome: '', cpf: '', telefone: '' })
  const [parceiros, setParceiros] = useState<Parceiro[]>([])
  const [novoParceiro, setNovoParceiro] = useState({ nome: '', cpf: '', percentual: 0 })
  const [erro, setErro] = useState('')

  const totalPerc = parceiros.reduce((s, p) => s + p.percentual, 0)

  const addParceiro = () => {
    setErro('')
    if (!novoParceiro.nome) return setErro('Nome do parceiro é obrigatório.')
    if (novoParceiro.percentual <= 0) return setErro('Percentual deve ser maior que 0.')
    if (totalPerc + novoParceiro.percentual > 100) return setErro('A soma das porcentagens não pode ultrapassar 100%.')
    setParceiros((p) => [...p, { ...novoParceiro }])
    setNovoParceiro({ nome: '', cpf: '', percentual: 0 })
  }

  const submit = async () => {
    setErro('')
    if (!produtor.nome) return setErro('Nome do produtor é obrigatório.')
    setLoading(true)
    try {
      const res = await fetch('/api/produtores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...produtor, parceiros }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErro(data.error || `Erro ao salvar (${res.status}).`)
        return
      }
      router.push('/produtores')
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <Link href="/produtores" style={{ color: '#6b7280', display: 'flex' }}><FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: 20 }} /></Link>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: 0 }}>Novo Produtor</h1>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>Cadastre o dono da lavoura e seus parceiros</p>
        </div>
      </div>

      {/* Dados do Produtor */}
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        style={{ backgroundColor: 'white', borderRadius: 14, padding: 28, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: NAVY, marginBottom: 20 }}>👤 Dados do Produtor (Dono da Lavoura)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Nome *</label>
            <input value={produtor.nome} onChange={(e) => setProdutor((f) => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>CPF/CNPJ</label>
            <input value={produtor.cpf} onChange={(e) => setProdutor((f) => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00 ou 00.000.000/0001-00" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Telefone</label>
            <input value={produtor.telefone} onChange={(e) => setProdutor((f) => ({ ...f, telefone: e.target.value }))} placeholder="(00) 00000-0000" style={inputStyle} />
          </div>
        </div>
      </motion.section>

      {/* Parceiros */}
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        style={{ backgroundColor: 'white', borderRadius: 14, padding: 28, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: NAVY, margin: 0 }}>🤝 Parceiros</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ height: 8, width: 120, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(totalPerc, 100)}%`, backgroundColor: totalPerc > 100 ? PINK : GREEN, borderRadius: 4, transition: 'width 0.4s' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: totalPerc > 100 ? PINK : NAVY }}>{totalPerc.toFixed(0)}%</span>
          </div>
        </div>

        {/* Adicionar parceiro */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 100px 44px', gap: 10, alignItems: 'end', marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 5 }}>Nome do Parceiro</label>
            <input value={novoParceiro.nome} onChange={(e) => setNovoParceiro((f) => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 5 }}>CPF/CNPJ</label>
            <input value={novoParceiro.cpf} onChange={(e) => setNovoParceiro((f) => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 5 }}>% Participação</label>
            <input type="number" min="0" max="100" step="0.1" value={novoParceiro.percentual || ''} onChange={(e) => setNovoParceiro((f) => ({ ...f, percentual: parseFloat(e.target.value) || 0 }))} style={inputStyle} />
          </div>
          <motion.button
            whileHover={{ scale: 1.12, backgroundColor: '#4aa344', rotate: 90, boxShadow: '0 6px 18px rgba(90,185,82,0.4)' }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            onClick={addParceiro}
            style={{ height: 40, width: 44, backgroundColor: GREEN, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FontAwesomeIcon icon={faPlus} style={{ fontSize: 18 }} />
          </motion.button>
        </div>

        <AnimatePresence>
          {parceiros.map((pa, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f9fafb', borderRadius: 10, marginBottom: 8 }}>
              <div>
                <p style={{ fontWeight: 600, color: NAVY, fontSize: 14, margin: 0 }}>{pa.nome}</p>
                {pa.cpf && <p style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>CPF/CNPJ: {pa.cpf}</p>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ backgroundColor: `${GREEN}20`, color: GREEN, padding: '4px 14px', borderRadius: 20, fontWeight: 700, fontSize: 14 }}>
                  {pa.percentual}%
                </span>
                <motion.button onClick={() => setParceiros((p) => p.filter((_, idx) => idx !== i))}
                  whileHover={{ scale: 1.2, rotate: 10 }} whileTap={{ scale: 0.8, rotate: -10 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: PINK }}>
                  <FontAwesomeIcon icon={faTrash} style={{ fontSize: 15 }} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Linha do produtor com % restante */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: `${GREEN}0d`, borderRadius: 10, border: `1px dashed ${GREEN}40`, marginTop: parceiros.length > 0 ? 4 : 0 }}>
          <div>
            <p style={{ fontWeight: 600, color: NAVY, fontSize: 14, margin: 0 }}>
              {produtor.nome || 'Produtor (Dono)'}
            </p>
            <p style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>Porcentagem restante</p>
          </div>
          <span style={{ backgroundColor: `${GREEN}30`, color: GREEN, padding: '4px 14px', borderRadius: 20, fontWeight: 700, fontSize: 14 }}>
            {Math.max(0, 100 - totalPerc).toFixed(0)}%
          </span>
        </div>
      </motion.section>

      {erro && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ padding: '12px 16px', backgroundColor: '#fff0f3', border: `1px solid ${PINK}40`, borderRadius: 10, color: PINK, fontSize: 13, marginBottom: 16 }}>
          {erro}
        </motion.div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <Link href="/produtores" style={{ padding: '10px 20px', border: '1.5px solid #e5e7eb', borderRadius: 10, color: '#6b7280', textDecoration: 'none', fontSize: 13 }}>Cancelar</Link>
        <motion.button
          whileHover={!loading ? { scale: 1.04, backgroundColor: '#4aa344', boxShadow: '0 8px 25px rgba(90,185,82,0.45)' } : {}}
          whileTap={!loading ? { scale: 0.95 } : {}}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          onClick={submit} disabled={loading}
          style={{ padding: '10px 24px', backgroundColor: GREEN, color: 'white', border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}>
          {loading && <FontAwesomeIcon icon={faSpinner} style={{ fontSize: 15 }} className="animate-spin" />}
          Salvar Produtor
        </motion.button>
      </div>
    </div>
  )
}
