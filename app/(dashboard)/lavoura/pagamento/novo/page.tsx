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
  const [combustivel, setCombustivel] = useState('0')
  const [valorEmbalagem, setValorEmbalagem] = useState('0')
  const [valesDinheiro, setValesDinheiro] = useState('0')
  const [creditos, setCreditos] = useState('0')
  const [debitosAnteriores, setDebitosAnteriores] = useState('0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/produtores').then(r => r.json()).then(d => setProdutores(Array.isArray(d) ? d : []))
    fetch('/api/configuracoes?chave=caixas_bandeja_padrao')
      .then(r => r.json())
      .then(d => { if (d.valor) setValorEmbalagem(d.valor) })
  }, [])

  // Ao selecionar produtor: detecta período em aberto e já busca colheitas
  useEffect(() => {
    if (!produtorId) return
    const hoje = new Date().toISOString().slice(0, 10)
    fetch(`/api/fechamento?produtorId=${encodeURIComponent(produtorId)}`)
      .then(r => r.json())
      .then((fechamentos: { dataFim: string }[]) => {
        let inicio: string
        if (Array.isArray(fechamentos) && fechamentos.length > 0) {
          const lastFim = new Date(fechamentos.sort((a, b) => new Date(b.dataFim).getTime() - new Date(a.dataFim).getTime())[0].dataFim)
          lastFim.setUTCDate(lastFim.getUTCDate() + 1)
          inicio = lastFim.toISOString().slice(0, 10)
        } else {
          inicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
        }
        setDataInicio(inicio)
        setDataFim(hoje)
      })
  }, [produtorId])

  useEffect(() => {
    if (produtorId && dataInicio && dataFim) buscarColheitas()
  }, [produtorId, dataInicio, dataFim]) // eslint-disable-line react-hooks/exhaustive-deps

  const buscarColheitas = useCallback(async () => {
    if (!produtorId || !dataInicio || !dataFim) return
    setBuscando(true)
    setBuscado(false)
    try {
      const [colheitasRes, lancamentosRes] = await Promise.all([
        fetch(`/api/colheita?produtorId=${encodeURIComponent(produtorId)}&inicio=${encodeURIComponent(dataInicio)}&fim=${encodeURIComponent(dataFim)}`),
        fetch(`/api/lancamento-custo?produtorId=${encodeURIComponent(produtorId)}&inicio=${encodeURIComponent(dataInicio)}&fim=${encodeURIComponent(dataFim)}`),
      ])
      const colheitasData = await colheitasRes.json()
      const lancamentosData = await lancamentosRes.json()
      const lista = Array.isArray(colheitasData) ? colheitasData : []
      setColheitas(lista)
      if (Array.isArray(lancamentosData) && lancamentosData.length > 0) {
        const totalComb    = lancamentosData.reduce((s: number, l: { combustivel: number }) => s + l.combustivel, 0)
        const totalBandeja = lancamentosData.reduce((s: number, l: { bandejaEmbalagem: number }) => s + l.bandejaEmbalagem, 0)
        const totalVales   = lancamentosData.reduce((s: number, l: { valesDinheiro: number }) => s + l.valesDinheiro, 0)
        const totalCred    = lancamentosData.reduce((s: number, l: { creditos: number }) => s + l.creditos, 0)
        const totalDeb     = lancamentosData.reduce((s: number, l: { debitosAnteriores: number }) => s + l.debitosAnteriores, 0)
        const cx = lista.reduce((s: number, c: { quantidadeTotal: number; descarte: number }) => s + (c.quantidadeTotal - c.descarte), 0)
        setCombustivel(totalComb.toFixed(2))
        setValorEmbalagem(cx > 0 && totalBandeja > 0 ? (totalBandeja / cx).toFixed(2) : '0')
        setValesDinheiro(totalVales.toFixed(2))
        setCreditos(totalCred.toFixed(2))
        setDebitosAnteriores(totalDeb.toFixed(2))
      }
    } catch {
      setColheitas([])
    } finally {
      setBuscando(false)
      setBuscado(true)
    }
  }, [produtorId, dataInicio, dataFim])

  const totalFaturas = colheitas.reduce((s, c) => s + (c.quantidadeTotal - c.descarte) * c.preco, 0)
  const totalCaixas = colheitas.reduce((s, c) => s + (c.quantidadeTotal - c.descarte), 0)
  const bandejaEmbalagem = (parseFloat(valorEmbalagem) || 0) * totalCaixas
  const totalInsumos = (parseFloat(combustivel) || 0) + bandejaEmbalagem
  const totalDeducoes = totalInsumos + (parseFloat(valesDinheiro) || 0) + (parseFloat(creditos) || 0) + (parseFloat(debitosAnteriores) || 0)
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
        combustivel: parseFloat(combustivel) || 0,
        bandejaEmbalagem,
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
        <div className="form-grid-2" style={{ gap: 20, marginBottom: 20 }}>
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

              <div className="grid-2" style={{ gap: 14 }}>
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
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {/* Insumos */}
            <div style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: NAVY, margin: '0 0 4px' }}>Insumos</h3>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 16px' }}>Custos de materiais utilizados neste lançamento.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ ...lbl, fontSize: 12 }}>Combustível (R$)</label>
                  <input type="number" value={combustivel} onChange={e => setCombustivel(e.target.value)} min="0" step="0.01" placeholder="0,00" style={inpDed} />
                </div>
                <div>
                  <label style={{ ...lbl, fontSize: 12 }}>Valor por Embalagem (R$/cx)</label>
                  <input type="number" value={valorEmbalagem} onChange={e => setValorEmbalagem(e.target.value)} min="0" step="0.01" placeholder="0,00" style={inpDed} />
                  {(parseFloat(valorEmbalagem) > 0 || totalCaixas > 0) && (
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: '5px 0 0', textAlign: 'right' }}>
                      {fmtBRL(parseFloat(valorEmbalagem) || 0)} × {totalCaixas.toFixed(1)} cx
                      {' = '}
                      <span style={{ fontWeight: 700, color: ORANGE }}>{fmtBRL(bandejaEmbalagem)}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Deduções */}
            <div style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: NAVY, margin: '0 0 4px' }}>Deduções</h3>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 16px' }}>Valores a descontar do produtor neste lançamento.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Vales Dinheiro (R$)', val: valesDinheiro, set: setValesDinheiro },
                  { label: 'Créditos Coleta/Filmagem (R$)', val: creditos, set: setCreditos },
                  { label: 'Débitos Anteriores (R$)', val: debitosAnteriores, set: setDebitosAnteriores },
                ].map(({ label, val, set }) => (
                  <div key={label}>
                    <label style={{ ...lbl, fontSize: 12 }}>{label}</label>
                    <input type="number" value={val} onChange={e => set(e.target.value)} min="0" step="0.01" placeholder="0,00" style={inpDed} />
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14, padding: '12px 14px', backgroundColor: '#f8faff', borderRadius: 10, border: '1.5px solid #e0e7ff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>Total Faturas</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{fmtBRL(totalFaturas)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>Total Insumos</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: ORANGE }}>- {fmtBRL(totalInsumos)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>Total Deduções</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: PINK }}>- {fmtBRL(totalDeducoes - totalInsumos)}</span>
                </div>
                <div style={{ borderTop: '1px solid #e0e7ff', paddingTop: 8, display: 'flex', justifyContent: 'space-between', marginBottom: produtorSelecionado && produtorSelecionado.parceiros.length > 0 ? 10 : 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>Valor Líquido Total</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: aReceber >= 0 ? GREEN : PINK }}>{fmtBRL(aReceber)}</span>
                </div>
                {produtorSelecionado && produtorSelecionado.parceiros.length > 0 && (() => {
                  const totalPercMeeiro = produtorSelecionado.parceiros.reduce((s, p) => s + p.percentual, 0)
                  const percProdutor = 100 - totalPercMeeiro
                  return (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 6, borderTop: '1px solid #e0e7ff', paddingTop: 8 }}>Divisão por Participante</div>
                      {produtorSelecionado.parceiros.map(p => (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, color: '#7c3aed' }}>{p.nome} ({p.percentual}%)</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#7c3aed' }}>{fmtBRL(aReceber * p.percentual / 100)}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid #e0e7ff', marginTop: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{produtorSelecionado.nome} ({percProdutor}%)</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: GREEN }}>{fmtBRL(aReceber * percProdutor / 100)}</span>
                      </div>
                    </>
                  )
                })()}
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
