'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faPlus, faTrash, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { useToast } from '@/components/toast'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'

type ItemProducao = { produto: string; unidade: string; quantidade: number; custoUnit: number; total: number }

const inputStyle = { width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', color: NAVY }
const unidades = ['CAIXA', 'KG', 'UNIDADE', 'SACO', 'LITRO', 'DUZIA', 'FARDO']

type Aba = '1' | '2' | '3'

export default function NovoRegistroProducaoPage() {
  const toast = useToast()
  const router = useRouter()
  const [aba, setAba] = useState<Aba>('1')
  const [loading, setLoading] = useState(false)

  const [info, setInfo] = useState({ data: new Date().toISOString().split('T')[0], descricao: '', observacao: '' })
  const [entradas, setEntradas] = useState<ItemProducao[]>([])
  const [saidas, setSaidas] = useState<ItemProducao[]>([])
  const [itemEntrada, setItemEntrada] = useState<ItemProducao>({ produto: '', unidade: 'CAIXA', quantidade: 0, custoUnit: 0, total: 0 })
  const [itemSaida, setItemSaida] = useState<ItemProducao>({ produto: '', unidade: 'CAIXA', quantidade: 0, custoUnit: 0, total: 0 })

  const updateItemField = (setter: React.Dispatch<React.SetStateAction<ItemProducao>>, field: keyof ItemProducao, val: string | number) => {
    setter((prev) => {
      const updated = { ...prev, [field]: val }
      if (field === 'quantidade' || field === 'custoUnit') updated.total = Number(updated.quantidade) * Number(updated.custoUnit)
      return updated
    })
  }

  const addEntrada = () => {
    if (!itemEntrada.produto) return
    setEntradas((p) => [...p, { ...itemEntrada }])
    setItemEntrada({ produto: '', unidade: 'CAIXA', quantidade: 0, custoUnit: 0, total: 0 })
  }

  const addSaida = () => {
    if (!itemSaida.produto) return
    setSaidas((p) => [...p, { ...itemSaida }])
    setItemSaida({ produto: '', unidade: 'CAIXA', quantidade: 0, custoUnit: 0, total: 0 })
  }

  const submit = async (finalizar: boolean) => {
    if (!info.descricao) {
      toast.warning('Campo obrigatório', 'Informe a descrição do registro.')
      return
    }
    setLoading(true)
    await fetch('/api/producao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...info, status: finalizar ? 'FINALIZADO' : 'RASCUNHO', entradas, saidas }),
    })
    toast.success(finalizar ? 'Registro finalizado' : 'Rascunho salvo', info.descricao)
    router.push('/producao/registro')
  }

  const abas: { id: Aba; label: string }[] = [{ id: '1', label: '1. Informações' }, { id: '2', label: '2. Entradas' }, { id: '3', label: '3. Saídas' }]

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href="/producao/registro" style={{ color: '#6b7280', display: 'flex' }}><FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: 20 }} /></Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: 0 }}>Novo Registro de Produção</h1>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {abas.map((a) => (
          <motion.button key={a.id} onClick={() => setAba(a.id)}
            whileHover={{ scale: 1.05, boxShadow: '0 4px 14px rgba(0,0,0,0.12)' }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            style={{ padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, backgroundColor: aba === a.id ? GREEN : '#e5e7eb', color: aba === a.id ? 'white' : '#6b7280' }}>
            {a.label}
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {aba === '1' && (
          <motion.div key="1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            style={{ backgroundColor: 'white', borderRadius: 14, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: NAVY, marginBottom: 20 }}>Informações gerais</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Data da produção</label>
                <input type="date" value={info.data} onChange={(e) => setInfo((f) => ({ ...f, data: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Descrição *</label>
                <input value={info.descricao} onChange={(e) => setInfo((f) => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Produção pimentão colorido" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Observação</label>
                <textarea value={info.observacao} onChange={(e) => setInfo((f) => ({ ...f, observacao: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>
          </motion.div>
        )}

        {(aba === '2' || aba === '3') && (
          <motion.div key={aba} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            style={{ backgroundColor: 'white', borderRadius: 14, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: NAVY, marginBottom: 20 }}>
              {aba === '2' ? 'Entradas (Matéria-Prima)' : 'Saídas (Produtos Acabados)'}
            </h2>
            {(() => {
              const item = aba === '2' ? itemEntrada : itemSaida
              const setItem = aba === '2' ? setItemEntrada : setItemSaida
              const lista = aba === '2' ? entradas : saidas
              const setLista = aba === '2' ? setEntradas : setSaidas
              const add = aba === '2' ? addEntrada : addSaida
              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr 80px 44px', gap: 10, alignItems: 'end' }}>
                    <div>
                      <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 5 }}>Produto *</label>
                      <input value={item.produto} onChange={(e) => updateItemField(setItem, 'produto', e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 5 }}>Unidade</label>
                      <select value={item.unidade} onChange={(e) => updateItemField(setItem, 'unidade', e.target.value)} style={inputStyle}>
                        {unidades.map((u) => <option key={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 5 }}>Qtd</label>
                      <input type="number" min="0" step="0.01" value={item.quantidade || ''} onChange={(e) => updateItemField(setItem, 'quantidade', parseFloat(e.target.value) || 0)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 5 }}>Custo Unit.</label>
                      <input type="number" min="0" step="0.01" value={item.custoUnit || ''} onChange={(e) => updateItemField(setItem, 'custoUnit', parseFloat(e.target.value) || 0)} style={inputStyle} />
                    </div>
                    <div style={{ padding: '10px 14px', backgroundColor: '#f9fafb', borderRadius: 8, fontSize: 13, fontWeight: 600, color: NAVY, border: '1.5px solid #f3f4f6' }}>
                      R$ {item.total.toFixed(2)}
                    </div>
                    <motion.button onClick={add}
                      whileHover={{ scale: 1.12, backgroundColor: '#4aa344', rotate: 90, boxShadow: '0 6px 18px rgba(90,185,82,0.4)' }}
                      whileTap={{ scale: 0.88 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      style={{ height: 40, width: 44, backgroundColor: GREEN, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FontAwesomeIcon icon={faPlus} style={{ fontSize: 18 }} />
                    </motion.button>
                  </div>
                  <div style={{ marginTop: 16 }}>
                    {lista.map((it, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#f9fafb', borderRadius: 8, marginTop: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: NAVY }}>{it.produto}</span>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>{it.quantidade} {it.unidade} × R$ {it.custoUnit.toFixed(2)}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: GREEN }}>R$ {it.total.toFixed(2)}</span>
                        <motion.button onClick={() => setLista((p) => p.filter((_, idx) => idx !== i))}
                          whileHover={{ scale: 1.2, rotate: 10 }} whileTap={{ scale: 0.8, rotate: -10 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: PINK }}>
                          <FontAwesomeIcon icon={faTrash} style={{ fontSize: 15 }} />
                        </motion.button>
                      </div>
                    ))}
                    {lista.length === 0 && <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', marginTop: 20 }}>Nenhum item adicionado</p>}
                  </div>
                </>
              )
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {aba !== '1' && (
            <motion.button onClick={() => setAba((a) => (a === '3' ? '2' : '1'))}
              whileHover={{ scale: 1.03, backgroundColor: '#f9fafb' }} whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              style={{ padding: '9px 20px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: 'white', cursor: 'pointer', fontSize: 13, color: NAVY }}>← Anterior</motion.button>
          )}
          {aba !== '3' && (
            <motion.button onClick={() => setAba((a) => (a === '1' ? '2' : '3'))}
              whileHover={{ scale: 1.04, backgroundColor: '#1e2550', boxShadow: '0 6px 20px rgba(45,53,97,0.4)' }} whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              style={{ padding: '9px 20px', border: 'none', borderRadius: 10, backgroundColor: NAVY, color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Próximo →</motion.button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <motion.button onClick={() => submit(false)} disabled={loading}
            whileHover={!loading ? { scale: 1.03, backgroundColor: '#f9fafb', boxShadow: '0 4px 14px rgba(0,0,0,0.08)' } : {}}
            whileTap={!loading ? { scale: 0.97 } : {}}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            style={{ padding: '9px 20px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: 'white', cursor: 'pointer', fontSize: 13, color: NAVY, display: 'flex', alignItems: 'center', gap: 6 }}>
            💾 Salvar rascunho
          </motion.button>
          <motion.button onClick={() => submit(true)} disabled={loading}
            whileHover={!loading ? { scale: 1.04, backgroundColor: '#4aa344', boxShadow: '0 8px 25px rgba(90,185,82,0.45)' } : {}}
            whileTap={!loading ? { scale: 0.95 } : {}}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            style={{ padding: '9px 20px', border: 'none', borderRadius: 10, backgroundColor: GREEN, color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, opacity: loading ? 0.7 : 1 }}>
            {loading ? <FontAwesomeIcon icon={faSpinner} style={{ fontSize: 15 }} className="animate-spin" /> : '✓'} Finalizar registro
          </motion.button>
        </div>
      </div>
    </div>
  )
}
