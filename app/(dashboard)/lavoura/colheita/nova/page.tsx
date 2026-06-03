'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faCircleExclamation } from '@fortawesome/free-solid-svg-icons'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'
const ORANGE = '#e87320'

type Produto = { id: string; nome: string; unidade: string; categoria?: string }

const iconesPorCategoria: Record<string, string> = {
  Fruta: '🍎', Hortaliça: '🥬', Legume: '🥕', Grão: '🌾', Erva: '🌿', Outros: '📦',
}
function iconeProduto(categoria?: string) {
  return categoria ? (iconesPorCategoria[categoria] ?? '📦') : '📦'
}
type Parceiro = { id: string; nome: string; percentual: number }
type Produtor = { id: string; nome: string; cpf: string | null; parceiros: Parceiro[] }

export default function NovaColheita() {
  const router = useRouter()
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [produtores, setProdutores] = useState<Produtor[]>([])
  const [produtoId, setProdutoId] = useState('')
  const [produtorId, setProdutorId] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [preco, setPreco] = useState('')
  const [qualidade, setQualidade] = useState('')
  const [descarte, setDescarte] = useState('0')
  const [nrDoc, setNrDoc] = useState('')
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))
  const [obs, setObs] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/produtos').then(r => r.json()).then(d => setProdutos(Array.isArray(d) ? d : []))
    fetch('/api/produtores').then(r => r.json()).then(d => setProdutores(Array.isArray(d) ? d : []))
  }, [])

  const qtd = parseFloat(quantidade) || 0

  // Calcula percentuais do produtor selecionado
  const produtorSelecionado = produtores.find(p => p.id === produtorId) ?? null
  const percParceiro = produtorSelecionado
    ? produtorSelecionado.parceiros.reduce((s, p) => s + p.percentual, 0)
    : 0
  const percDono = 100 - percParceiro
  const qtdDono = qtd * (percDono / 100)
  const qtdParceiro = qtd * (percParceiro / 100)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!produtoId) { setError('Selecione um produto'); return }
    if (!produtorId) { setError('Selecione o produtor'); return }
    if (qtd <= 0) { setError('Quantidade deve ser maior que zero'); return }
    const precoNum = parseFloat(preco) || 0
    if (precoNum <= 0) { setError('Informe o preço por caixa'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/colheita', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data, produtoId, produtorId, quantidadeTotal: qtd,
        preco: precoNum,
        qualidade: qualidade || null,
        descarte: parseFloat(descarte) || 0,
        nrDoc: nrDoc || null,
        observacao: obs || null,
      }),
    })
    if (res.ok) { router.push('/lavoura/colheita'); router.refresh() }
    else { const d = await res.json().catch(() => ({})); setError(d.error || 'Erro ao salvar'); setLoading(false) }
  }

  const inp = { width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, color: NAVY, outline: 'none', boxSizing: 'border-box' as const, backgroundColor: 'white' }
  const lbl = { fontSize: 13, fontWeight: 600, color: NAVY, display: 'block', marginBottom: 6 } as React.CSSProperties

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        style={{ marginBottom: 28 }}
      >
        <Link href="/lavoura/colheita" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#6b7280', fontSize: 13, textDecoration: 'none', marginBottom: 8 }}>
          <FontAwesomeIcon icon={faChevronLeft} style={{ fontSize: 14 }} /> Colheitas
        </Link>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0 }}>Registrar Colheita</h1>
        <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>A divisão é calculada automaticamente conforme o cadastro do produtor</p>
      </motion.div>

      <div className="form-grid-2" style={{ gap: 20 }}>
        {/* Formulário */}
        <motion.div
          initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1, duration: 0.4 }}
          style={{ backgroundColor: 'white', borderRadius: 16, padding: 28, boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 600, color: NAVY, margin: '0 0 22px' }}>Dados da colheita</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Produtor */}
            <div>
              <label style={lbl}>Produtor *</label>
              {produtores.length === 0
                ? <div style={{ ...inp, display: 'flex', alignItems: 'center', color: '#9ca3af', gap: 8 }}>
                    <span>Nenhum produtor cadastrado.</span>
                    <Link href="/produtores/novo" style={{ color: GREEN, fontWeight: 600, fontSize: 13 }}>Cadastrar →</Link>
                  </div>
                : <select value={produtorId} onChange={e => setProdutorId(e.target.value)} required style={inp}>
                    <option value="">Selecione o produtor</option>
                    {produtores.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                        {p.parceiros.length > 0
                          ? ` — ${(100 - p.parceiros.reduce((s, pa) => s + pa.percentual, 0)).toFixed(0)}% Dono / ${p.parceiros.reduce((s, pa) => s + pa.percentual, 0).toFixed(0)}% Parceiros`
                          : ' — 100% Dono'}
                      </option>
                    ))}
                  </select>}
            </div>

            {/* Produto */}
            <div>
              <label style={lbl}>Produto *</label>
              {produtos.length === 0
                ? <div style={{ ...inp, display: 'flex', alignItems: 'center', color: '#9ca3af', gap: 8 }}>
                    <span>Nenhum produto cadastrado.</span>
                    <Link href="/produtos/novo" style={{ color: GREEN, fontWeight: 600, fontSize: 13 }}>Cadastrar →</Link>
                  </div>
                : <select value={produtoId} onChange={e => setProdutoId(e.target.value)} required style={inp}>
                    <option value="">Selecione o produto</option>
                    {produtos.map(p => <option key={p.id} value={p.id}>{iconeProduto(p.categoria)} {p.nome}</option>)}
                  </select>}
            </div>

            {/* Data */}
            <div>
              <label style={lbl}>Data da colheita *</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)} required style={inp} />
            </div>

            {/* Quantidade */}
            <div>
              <label style={lbl}>Quantidade colhida (caixas) *</label>
              <input type="number" value={quantidade} onChange={e => setQuantidade(e.target.value)}
                min="0.1" step="0.1" placeholder="0" required style={inp} />
            </div>

            {/* Preço por caixa */}
            <div>
              <label style={lbl}>Preço por caixa (R$) *</label>
              <input type="number" value={preco} onChange={e => setPreco(e.target.value)}
                min="0.01" step="0.01" placeholder="0,00" required style={inp} />
            </div>

            {/* Qualidade + Descarte em linha */}
            <div className="grid-2" style={{ gap: 14 }}>
              <div>
                <label style={lbl}>Qualidade</label>
                <input type="text" value={qualidade} onChange={e => setQualidade(e.target.value)}
                  placeholder="ex: GRAUDO, MÉDIO..." style={inp} />
              </div>
              <div>
                <label style={lbl}>Descarte (caixas)</label>
                <input type="number" value={descarte} onChange={e => setDescarte(e.target.value)}
                  min="0" step="0.1" placeholder="0" style={inp} />
              </div>
            </div>

            {/* Nº Documento */}
            <div>
              <label style={lbl}>Nº Documento</label>
              <input type="text" value={nrDoc} onChange={e => setNrDoc(e.target.value)}
                placeholder="Número do documento (opcional)" style={inp} />
            </div>

            {/* Observação */}
            <div>
              <label style={lbl}>Observação</label>
              <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3}
                placeholder="Condições da colheita..." style={{ ...inp, resize: 'vertical' }} />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, color: PINK, fontSize: 13, backgroundColor: '#fff0f3', padding: '10px 14px', borderRadius: 8, border: `1px solid ${PINK}30` }}>
                  <FontAwesomeIcon icon={faCircleExclamation} style={{ fontSize: 14 }} /> {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 4 }}>
              <Link href="/lavoura/colheita" style={{ padding: '10px 20px', border: '1.5px solid #e5e7eb', borderRadius: 10, textDecoration: 'none', fontSize: 14, color: NAVY }}>
                Cancelar
              </Link>
              <motion.button
                type="submit" disabled={loading}
                whileHover={!loading ? { scale: 1.05, backgroundColor: '#4aa344', boxShadow: '0 8px 28px rgba(90,185,82,0.5)' } : undefined}
                whileTap={!loading ? { scale: 0.94 } : undefined}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                style={{ padding: '10px 24px', backgroundColor: GREEN, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Salvando...' : 'Registrar Colheita'}
              </motion.button>
            </div>
          </form>
        </motion.div>

        {/* Preview da divisão */}
        <motion.div
          initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, duration: 0.4 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {/* Total colhido */}
          <motion.div
            animate={{ scale: qtd > 0 ? 1 : 0.97, opacity: qtd > 0 ? 1 : 0.55 }}
            style={{ backgroundColor: 'white', borderRadius: 14, padding: 28, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', borderTop: `4px solid ${GREEN}` }}
          >
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 8px' }}>Total colhido</p>
            <p style={{ fontSize: 38, fontWeight: 800, color: NAVY, margin: 0 }}>
              {qtd.toFixed(1)}<span style={{ fontSize: 16, fontWeight: 400, color: '#6b7280', marginLeft: 8 }}>caixas</span>
            </p>
          </motion.div>

          {/* Seletor de produtor — aviso se não selecionado */}
          <AnimatePresence mode="wait">
            {!produtorId ? (
              <motion.div key="aviso"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                style={{ backgroundColor: '#fffbeb', borderRadius: 12, padding: '16px 20px', border: '1.5px solid #fcd34d', display: 'flex', alignItems: 'center', gap: 10 }}
              >
                <FontAwesomeIcon icon={faCircleExclamation} style={{ fontSize: 16, color: '#d97706' }} />
                <p style={{ fontSize: 13, color: '#92400e', margin: 0 }}>Selecione o produtor para calcular a divisão</p>
              </motion.div>
            ) : (
              <motion.div key="split"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                {/* Info do produtor */}
                <div style={{ backgroundColor: '#f8faff', borderRadius: 12, padding: '14px 18px', border: '1.5px solid #e0e7ff' }}>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>Produtor selecionado</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: 0 }}>{produtorSelecionado?.nome}</p>
                  {produtorSelecionado && produtorSelecionado.parceiros.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {produtorSelecionado.parceiros.map(pa => (
                        <span key={pa.id} style={{ backgroundColor: `${ORANGE}15`, color: ORANGE, border: `1px solid ${ORANGE}30`, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                          {pa.nome} · {pa.percentual}%
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cards dono / parceiro */}
                <div className="grid-2">
                  <motion.div animate={{ scale: qtd > 0 ? 1 : 0.97 }}
                    style={{ backgroundColor: '#f0faf0', borderRadius: 12, padding: '20px', border: `1.5px solid ${GREEN}40` }}
                  >
                    <p style={{ fontSize: 11, color: GREEN, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>
                      👨‍🌾 Dono · {percDono.toFixed(0)}%
                    </p>
                    <p style={{ fontSize: 30, fontWeight: 800, color: GREEN, margin: 0 }}>{qtdDono.toFixed(1)}</p>
                    <p style={{ fontSize: 13, color: '#4a7a44', margin: '2px 0 0' }}>caixas</p>
                  </motion.div>
                  <motion.div animate={{ scale: qtd > 0 ? 1 : 0.97 }}
                    style={{ backgroundColor: '#fff7ed', borderRadius: 12, padding: '20px', border: `1.5px solid ${ORANGE}40` }}
                  >
                    <p style={{ fontSize: 11, color: ORANGE, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>
                      🤝 Parceiros · {percParceiro.toFixed(0)}%
                    </p>
                    <p style={{ fontSize: 30, fontWeight: 800, color: ORANGE, margin: 0 }}>{qtdParceiro.toFixed(1)}</p>
                    <p style={{ fontSize: 13, color: '#b35a00', margin: '2px 0 0' }}>caixas</p>
                  </motion.div>
                </div>

                {/* Barra de distribuição */}
                {qtd > 0 && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    style={{ backgroundColor: 'white', borderRadius: 12, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                  >
                    <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 10px' }}>Distribuição</p>
                    <div style={{ height: 12, backgroundColor: '#f3f4f6', borderRadius: 6, overflow: 'hidden', display: 'flex' }}>
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${percDono}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        style={{ backgroundColor: GREEN, borderRadius: percParceiro === 0 ? 6 : '6px 0 0 6px' }}
                      />
                      {percParceiro > 0 && (
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${percParceiro}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                          style={{ backgroundColor: ORANGE, borderRadius: '0 6px 6px 0' }}
                        />
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      <span style={{ fontSize: 11, color: GREEN, fontWeight: 700 }}>{percDono.toFixed(0)}% Dono</span>
                      {percParceiro > 0 && <span style={{ fontSize: 11, color: ORANGE, fontWeight: 700 }}>{percParceiro.toFixed(0)}% Parceiros</span>}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
