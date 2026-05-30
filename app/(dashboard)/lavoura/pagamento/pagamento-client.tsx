'use client'
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faPrint, faPlus, faFileLines } from '@fortawesome/free-solid-svg-icons'
import PageSkeleton from '@/components/page-skeleton'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'
const ORANGE = '#e87320'
const PURPLE = '#7c3aed'

type Parceiro = { id: string; nome: string; percentual: number }
type Produtor = { id: string; nome: string; cpf: string | null; parceiros: Parceiro[] }
type Fechamento = {
  id: string
  produtor: Produtor
  dataInicio: string; dataFim: string; dataPagamento: string
  valesEmbalagem: number; valesDinheiro: number; creditos: number; debitosAnteriores: number
  status: string
}

function fmt(d: string) { return new Date(d).toLocaleDateString('pt-BR') }
function fmtBRL(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }

export default function PagamentoClient() {
  const [produtores, setProdutores] = useState<Produtor[]>([])
  const [fechamentos, setFechamentos] = useState<Fechamento[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [produtorSel, setProdutorSel] = useState<Produtor | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/produtores').then(r => r.json()),
      fetch('/api/fechamento').then(r => r.json()),
    ]).then(([p, f]) => {
      setProdutores(p)
      setFechamentos(f)
    }).finally(() => setLoading(false))
  }, [])

  const sugestoes = useMemo(() => {
    const q = busca.toLowerCase().trim()
    if (!q || produtorSel) return []
    const resultado: { tipo: 'produtor' | 'meeiro'; label: string; sub: string; produtor: Produtor }[] = []
    for (const p of produtores) {
      if (p.nome.toLowerCase().includes(q) || p.cpf?.includes(q)) {
        resultado.push({ tipo: 'produtor', label: p.nome, sub: p.cpf ?? '', produtor: p })
      }
      for (const parc of p.parceiros) {
        if (parc.nome.toLowerCase().includes(q)) {
          resultado.push({ tipo: 'meeiro', label: parc.nome, sub: `Meeiro de ${p.nome}`, produtor: p })
        }
      }
    }
    return resultado.slice(0, 8)
  }, [busca, produtores, produtorSel])

  const fechamentosDoProd = useMemo(() => {
    if (!produtorSel) return []
    return fechamentos.filter(f => f.produtor.id === produtorSel.id)
  }, [produtorSel, fechamentos])

  function selecionar(produtor: Produtor, label: string) {
    setProdutorSel(produtor)
    setBusca(label)
  }

  function limpar() {
    setProdutorSel(null)
    setBusca('')
  }

  if (loading) return <PageSkeleton cards={0} rows={4} />

  const totalParceirosPct = produtorSel ? produtorSel.parceiros.reduce((s, p) => s + p.percentual, 0) : 0
  const percProdutor = Math.max(0, 100 - totalParceirosPct)

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0 }}>Demonstrativos de Pagamento</h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Busque pelo nome do produtor ou meeiro</p>
      </motion.div>

      {/* Campo de busca */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        style={{ position: 'relative', maxWidth: 520, marginBottom: 32 }}>
        <FontAwesomeIcon icon={faSearch} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#9ca3af', pointerEvents: 'none', zIndex: 1 }} />
        <input
          value={busca}
          onChange={e => { setBusca(e.target.value); if (produtorSel) setProdutorSel(null) }}
          placeholder="Digite o nome do produtor ou meeiro..."
          autoFocus
          style={{ width: '100%', padding: '14px 16px 14px 44px', border: `2px solid ${produtorSel ? GREEN : '#e5e7eb'}`, borderRadius: 12, fontSize: 15, outline: 'none', color: NAVY, boxSizing: 'border-box', transition: 'border-color 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          onFocus={e => { if (!produtorSel) e.target.style.borderColor = GREEN }}
          onBlur={e => { if (!produtorSel) e.target.style.borderColor = '#e5e7eb' }}
        />
        {busca && (
          <button onClick={limpar} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18, lineHeight: 1, padding: 4 }}>×</button>
        )}

        {/* Sugestões */}
        <AnimatePresence>
          {sugestoes.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
              style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, backgroundColor: 'white', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid #e5e7eb', zIndex: 50, overflow: 'hidden' }}>
              {sugestoes.map((s, i) => (
                <motion.button key={i} onMouseDown={() => selecionar(s.produtor, s.label)}
                  whileHover={{ backgroundColor: '#f8fffe' }}
                  style={{ width: '100%', padding: '11px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderBottom: i < sugestoes.length - 1 ? '1px solid #f3f4f6' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, backgroundColor: s.tipo === 'produtor' ? `${GREEN}15` : `${PURPLE}15`, color: s.tipo === 'produtor' ? GREEN : PURPLE, textTransform: 'uppercase', flexShrink: 0 }}>
                    {s.tipo === 'produtor' ? 'Produtor' : 'Meeiro'}
                  </span>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: NAVY }}>{s.label}</p>
                    {s.sub && <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>{s.sub}</p>}
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Resultado: produtor selecionado */}
      <AnimatePresence mode="wait">
        {produtorSel && (
          <motion.div key={produtorSel.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            {/* Info do produtor */}
            <div style={{ backgroundColor: 'white', borderRadius: 14, padding: '18px 22px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 16, borderLeft: `4px solid ${GREEN}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: NAVY }}>{produtorSel.nome}</p>
                  {produtorSel.cpf && <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>CPF: {produtorSel.cpf}</p>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: GREEN, backgroundColor: `${GREEN}12`, padding: '3px 10px', borderRadius: 20 }}>
                      Produtor {percProdutor}%
                    </span>
                    {produtorSel.parceiros.map(p => (
                      <span key={p.id} style={{ fontSize: 12, fontWeight: 700, color: PURPLE, backgroundColor: `${PURPLE}10`, padding: '3px 10px', borderRadius: 20 }}>
                        Meeiro: {p.nome} {p.percentual}%
                      </span>
                    ))}
                  </div>
                </div>
                <Link href={`/lavoura/pagamento/novo?produtorId=${produtorSel.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', backgroundColor: GREEN, color: 'white', borderRadius: 10, textDecoration: 'none', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                  <FontAwesomeIcon icon={faPlus} style={{ fontSize: 13 }} /> Novo Fechamento
                </Link>
              </div>
            </div>

            {/* Fechamentos */}
            {fechamentosDoProd.length === 0 ? (
              <div style={{ backgroundColor: 'white', borderRadius: 14, padding: '48px 24px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', color: '#9ca3af' }}>
                <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 32, opacity: 0.3, marginBottom: 10, display: 'block', margin: '0 auto 10px' }} />
                <p style={{ fontWeight: 600, color: '#6b7280', margin: '0 0 4px' }}>Nenhum fechamento para {produtorSel.nome}</p>
                <p style={{ fontSize: 13, margin: 0 }}>Crie o primeiro fechamento para gerar os demonstrativos.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {fechamentosDoProd.map((f, i) => {
                  const totalDed = f.valesEmbalagem + f.valesDinheiro + f.creditos + f.debitosAnteriores
                  return (
                    <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      style={{ backgroundColor: 'white', borderRadius: 12, padding: '16px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>

                      <div style={{ flex: 1, minWidth: 140 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: NAVY }}>{fmt(f.dataInicio)} – {fmt(f.dataFim)}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>Pagamento: {fmt(f.dataPagamento)}</p>
                      </div>

                      {totalDed > 0 && (
                        <div style={{ minWidth: 120 }}>
                          <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>Deduções</p>
                          <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: PINK }}>- {fmtBRL(totalDed)}</p>
                        </div>
                      )}

                      <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, backgroundColor: f.status === 'PAGO' ? '#f0faf0' : '#fff7ed', color: f.status === 'PAGO' ? GREEN : ORANGE }}>
                        {f.status === 'PAGO' ? 'Pago' : 'Pendente'}
                      </span>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <motion.button onClick={() => window.open(`/imprimir/pagamento/${f.id}`, '_blank')}
                          whileHover={{ scale: 1.05, backgroundColor: '#1e2550' }} whileTap={{ scale: 0.95 }}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', backgroundColor: NAVY, color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          <FontAwesomeIcon icon={faPrint} style={{ fontSize: 12 }} />
                          {produtorSel.parceiros.length > 0 ? `Produtor (${percProdutor}%)` : 'Imprimir'}
                        </motion.button>

                        {produtorSel.parceiros.map((p, pi) => (
                          <motion.button key={p.id} onClick={() => window.open(`/imprimir/pagamento/${f.id}/meeiro?p=${pi}`, '_blank')}
                            whileHover={{ scale: 1.05, backgroundColor: '#6d28d9' }} whileTap={{ scale: 0.95 }}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', backgroundColor: PURPLE, color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            <FontAwesomeIcon icon={faPrint} style={{ fontSize: 12 }} />
                            {p.nome} ({p.percentual}%)
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}

        {!produtorSel && !busca && (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center', paddingTop: 60, color: '#9ca3af' }}>
            <FontAwesomeIcon icon={faSearch} style={{ fontSize: 40, opacity: 0.2, display: 'block', margin: '0 auto 14px' }} />
            <p style={{ fontWeight: 600, fontSize: 15, color: '#6b7280', margin: '0 0 4px' }}>Digite o nome para começar</p>
            <p style={{ fontSize: 13, margin: 0 }}>Busca produtores e meeiros cadastrados no sistema</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
