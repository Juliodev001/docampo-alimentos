'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faCircleExclamation, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'
const ORANGE = '#e87320'

type Parceiro = { id: string; nome: string; percentual: number }
type Produtor = { id: string; nome: string; cpf: string | null; parceiros: Parceiro[] }
type Produto = { id: string; nome: string; unidade: string }
type Colheita = {
  id: string; data: string; produto: Produto
  quantidadeTotal: number; preco: number; qualidade: string | null
  descarte: number; nrDoc: string | null
}

function fmtBRL(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('pt-BR') }

export default function NovoFechamento() {
  const router = useRouter()
  const [produtores, setProdutores] = useState<Produtor[]>([])
  const [produtorId, setProdutorId] = useState('')
  const hoje = new Date().toISOString().slice(0, 10)
  const primeiroDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  const [dataInicio, setDataInicio] = useState(primeiroDiaMes)
  const [dataFim, setDataFim] = useState(hoje)
  const [dataPagamento, setDataPagamento] = useState(hoje)
  const [colheitas, setColheitas] = useState<Colheita[]>([])
  const [buscado, setBuscado] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [valesEmbalagem, setValesEmbalagem] = useState('0')
  const [valesDinheiro, setValesDinheiro] = useState('0')
  const [creditos, setCreditos] = useState('0')
  const [debitosAnteriores, setDebitosAnteriores] = useState('0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/produtores').then(r => r.json()).then(d => setProdutores(Array.isArray(d) ? d : []))
    fetch('/api/configuracoes?chave=caixas_bandeja_padrao')
      .then(r => r.json())
      .then(d => { if (d.valor) setValesEmbalagem(d.valor) })
  }, [])

  const buscarColheitas = useCallback(async () => {
    if (!produtorId || !dataInicio || !dataFim) return
    setBuscando(true)
    setBuscado(false)
    try {
      const res = await fetch(`/api/colheita?produtorId=${encodeURIComponent(produtorId)}&inicio=${encodeURIComponent(dataInicio)}&fim=${encodeURIComponent(dataFim)}`)
      const data = await res.json()
      setColheitas(Array.isArray(data) ? data : [])
    } catch {
      setColheitas([])
    } finally {
      setBuscando(false)
      setBuscado(true)
    }
  }, [produtorId, dataInicio, dataFim])

  const totalFaturas = colheitas.reduce((s, c) => s + (c.quantidadeTotal - c.descarte) * c.preco, 0)
  const totalDeducoes = (parseFloat(valesEmbalagem) || 0) + (parseFloat(valesDinheiro) || 0) + (parseFloat(creditos) || 0) + (parseFloat(debitosAnteriores) || 0)
  const aReceber = totalFaturas - totalDeducoes

  const produtorSelecionado = produtores.find(p => p.id === produtorId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!produtorId || !dataInicio || !dataFim || !dataPagamento) { setError('Preencha todos os campos obrigatórios'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/fechamento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        produtorId, dataInicio, dataFim, dataPagamento,
        valesEmbalagem: parseFloat(valesEmbalagem) || 0,
        valesDinheiro: parseFloat(valesDinheiro) || 0,
        creditos: parseFloat(creditos) || 0,
        debitosAnteriores: parseFloat(debitosAnteriores) || 0,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      router.push(`/lavoura/pagamento/${data.id}`)
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Erro ao salvar')
      setLoading(false)
    }
  }

  const inp = { width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, color: NAVY, outline: 'none', boxSizing: 'border-box' as const, backgroundColor: 'white' }
  const lbl = { fontSize: 13, fontWeight: 600, color: NAVY, display: 'block', marginBottom: 6 } as React.CSSProperties
  const inpDed = { width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, color: NAVY, outline: 'none', boxSizing: 'border-box' as const, backgroundColor: 'white', textAlign: 'right' as const }

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        style={{ marginBottom: 28 }}
      >
        <Link href="/lavoura/pagamento" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#6b7280', fontSize: 13, textDecoration: 'none', marginBottom: 8 }}>
          <FontAwesomeIcon icon={faChevronLeft} style={{ fontSize: 14 }} /> Pagamentos
        </Link>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0 }}>Novo Fechamento</h1>
        <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>Selecione o produtor e o período para gerar o demonstrativo</p>
      </motion.div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {/* Formulário esquerdo */}
          <motion.div
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1, duration: 0.4 }}
            style={{ backgroundColor: 'white', borderRadius: 16, padding: 28, boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 600, color: NAVY, margin: '0 0 22px' }}>Dados do fechamento</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              <div>
                <label style={lbl}>Produtor *</label>
                <select value={produtorId} onChange={e => setProdutorId(e.target.value)} required style={inp}>
                  <option value="">Selecione o produtor</option>
                  {produtores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={lbl}>Data início *</label>
                  <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} required style={inp} />
                </div>
                <div>
                  <label style={lbl}>Data fim *</label>
                  <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} required style={inp} />
                </div>
              </div>

              <div>
                <label style={lbl}>Data de pagamento *</label>
                <input type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)} required style={inp} />
              </div>

              <motion.button
                type="button" onClick={buscarColheitas}
                disabled={!produtorId || !dataInicio || !dataFim || buscando}
                whileHover={produtorId && !buscando ? { scale: 1.04, backgroundColor: '#1e2550', boxShadow: '0 6px 20px rgba(45,53,97,0.4)' } : undefined}
                whileTap={produtorId && !buscando ? { scale: 0.95 } : undefined}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '11px 20px', backgroundColor: produtorId && dataInicio && dataFim ? NAVY : '#e5e7eb',
                  color: produtorId && dataInicio && dataFim ? 'white' : '#9ca3af',
                  border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
                  cursor: produtorId && dataInicio && dataFim ? 'pointer' : 'not-allowed',
                }}
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: 15 }} /> {buscando ? 'Buscando...' : 'Buscar colheitas'}
              </motion.button>
            </div>
          </motion.div>

          {/* Deduções direita */}
          <motion.div
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, duration: 0.4 }}
            style={{ backgroundColor: 'white', borderRadius: 16, padding: 28, boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 600, color: NAVY, margin: '0 0 22px' }}>Deduções</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Caixas e Bandeja (R$)', val: valesEmbalagem, set: setValesEmbalagem },
                { label: 'Vales Dinheiro (R$)', val: valesDinheiro, set: setValesDinheiro },
                { label: 'Créditos — Coleta e Filmagem (R$)', val: creditos, set: setCreditos },
                { label: 'Débitos Anteriores (R$)', val: debitosAnteriores, set: setDebitosAnteriores },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label style={{ ...lbl, fontSize: 12 }}>{label}</label>
                  <input type="number" value={val} onChange={e => set(e.target.value)}
                    min="0" step="0.01" placeholder="0,00" style={inpDed} />
                </div>
              ))}

              <div style={{ marginTop: 8, padding: '14px 16px', backgroundColor: '#f8faff', borderRadius: 10, border: '1.5px solid #e0e7ff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>Total Faturas</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>{fmtBRL(totalFaturas)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>Total Deduções</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: PINK }}>- {fmtBRL(totalDeducoes)}</span>
                </div>
                <div style={{ borderTop: '1px solid #e0e7ff', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>A Receber</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: aReceber >= 0 ? GREEN : PINK }}>{fmtBRL(aReceber)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Nenhuma colheita encontrada */}
        <AnimatePresence>
          {buscado && colheitas.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ backgroundColor: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <FontAwesomeIcon icon={faCircleExclamation} style={{ fontSize: 16, color: '#d97706' }} />
              <p style={{ fontSize: 13, color: '#92400e', margin: 0 }}>
                Nenhuma colheita encontrada para este produtor no período <strong>{dataInicio}</strong> — <strong>{dataFim}</strong>.
                Verifique se as colheitas foram registradas com o produtor correto.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabela de colheitas */}
        <AnimatePresence>
          {colheitas.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{ backgroundColor: 'white', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', overflow: 'hidden', marginBottom: 20 }}
            >
              <div style={{ padding: '16px 22px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: NAVY }}>Colheitas do período</h3>
                <span style={{ backgroundColor: `${NAVY}12`, color: NAVY, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  {colheitas.length} registros
                </span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    {['Data', 'Nº Doc', 'Produto / Qualidade', 'Qtd.', 'Descarte', 'Líquido', 'Preço', 'Sub-total'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Sub-total' ? 'right' : 'left', fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {colheitas.map((c, i) => {
                    const liquido = c.quantidadeTotal - c.descarte
                    const sub = liquido * c.preco
                    return (
                      <motion.tr key={c.id}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        style={{ borderBottom: '1px solid #f3f4f6' }}
                      >
                        <td style={{ padding: '11px 14px', fontSize: 13, color: NAVY }}>{fmtDate(c.data)}</td>
                        <td style={{ padding: '11px 14px', fontSize: 13, color: '#6b7280' }}>{c.nrDoc ?? '—'}</td>
                        <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: NAVY }}>
                          {c.produto.nome}
                          {c.qualidade && <span style={{ fontSize: 11, color: ORANGE, marginLeft: 6, fontWeight: 600 }}>{c.qualidade}</span>}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 13, color: '#6b7280' }}>{c.quantidadeTotal.toFixed(1)}</td>
                        <td style={{ padding: '11px 14px', fontSize: 13, color: PINK }}>{c.descarte > 0 ? c.descarte.toFixed(1) : '—'}</td>
                        <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: NAVY }}>{liquido.toFixed(1)}</td>
                        <td style={{ padding: '11px 14px', fontSize: 13, color: '#6b7280' }}>{fmtBRL(c.preco)}</td>
                        <td style={{ padding: '11px 14px', fontSize: 14, fontWeight: 700, color: GREEN, textAlign: 'right' }}>{fmtBRL(sub)}</td>
                      </motion.tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f9fafb', borderTop: '2px solid #e5e7eb' }}>
                    <td colSpan={7} style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: NAVY }}>Total Faturas</td>
                    <td style={{ padding: '12px 14px', fontSize: 15, fontWeight: 800, color: GREEN, textAlign: 'right' }}>{fmtBRL(totalFaturas)}</td>
                  </tr>
                </tfoot>
              </table>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, color: PINK, fontSize: 13, backgroundColor: '#fff0f3', padding: '10px 14px', borderRadius: 8, border: `1px solid ${PINK}30`, marginBottom: 16 }}>
              <FontAwesomeIcon icon={faCircleExclamation} style={{ fontSize: 14 }} /> {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Link href="/lavoura/pagamento" style={{ padding: '10px 20px', border: '1.5px solid #e5e7eb', borderRadius: 10, textDecoration: 'none', fontSize: 14, color: NAVY }}>
            Cancelar
          </Link>
          <motion.button
            type="submit" disabled={loading}
            whileHover={!loading ? { scale: 1.05, backgroundColor: '#4aa344', boxShadow: '0 8px 28px rgba(90,185,82,0.5)' } : undefined}
            whileTap={!loading ? { scale: 0.94 } : undefined}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            style={{ padding: '10px 28px', backgroundColor: GREEN, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Salvando...' : 'Salvar Fechamento'}
          </motion.button>
        </div>
      </form>
    </div>
  )
}
