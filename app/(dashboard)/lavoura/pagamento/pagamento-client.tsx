'use client'
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faPrint, faPlus, faFileLines, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons'
import PageSkeleton from '@/components/page-skeleton'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'
const ORANGE = '#e87320'
const PURPLE = '#7c3aed'

type Parceiro = { id: string; nome: string; percentual: number }
type Produtor = { id: string; nome: string; cpf: string | null; parceiros: Parceiro[] }
type Fechamento = {
  id: string; produtor: Produtor
  dataInicio: string; dataFim: string; dataPagamento: string
  valesEmbalagem: number; valesDinheiro: number; creditos: number; debitosAnteriores: number
  status: string
}
type Colheita = {
  id: string; data: string; nrDoc: string | null
  produto: { nome: string }; quantidadeTotal: number; descarte: number
  preco: number; qualidade: string | null
}
type FechamentoDetalhe = Fechamento & { colheitas: Colheita[] }

function fmt(d: string) { return new Date(d).toLocaleDateString('pt-BR') }
function fmtBRL(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }

function RelatorioInline({ fechamento, produtor }: { fechamento: FechamentoDetalhe; produtor: Produtor }) {
  const totalParceirosPct = produtor.parceiros.reduce((s, p) => s + p.percentual, 0)
  const percProdutor = Math.max(0, 100 - totalParceirosPct)

  const bruto = fechamento.colheitas.reduce((s, c) => s + (c.quantidadeTotal - c.descarte) * c.preco, 0)
  const totalDed = fechamento.valesEmbalagem + fechamento.valesDinheiro + fechamento.creditos + fechamento.debitosAnteriores

  const partes = [
    { nome: produtor.nome, pct: percProdutor, cor: NAVY, tipo: 'Produtor' },
    ...produtor.parceiros.map(p => ({ nome: p.nome, pct: p.percentual, cor: PURPLE, tipo: 'Meeiro' })),
  ]

  const th: React.CSSProperties = { padding: '8px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.4, color: '#6b7280', backgroundColor: '#f9fafb', textAlign: 'left' as const, whiteSpace: 'nowrap' as const }
  const td: React.CSSProperties = { padding: '9px 12px', fontSize: 13, borderBottom: '1px solid #f3f4f6', color: '#374151' }

  return (
    <div style={{ padding: '0 0 4px' }}>
      {/* Tabela de colheitas */}
      <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, margin: '0 0 8px' }}>Colheitas do período</p>
      {fechamento.colheitas.length === 0 ? (
        <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 16px' }}>Nenhuma colheita registrada neste período.</p>
      ) : (
        <div style={{ overflowX: 'auto', marginBottom: 20, borderRadius: 10, border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Data', 'Nº Doc', 'Produto', 'Qtd', 'Descarte', 'Líquido', 'Preço/cx', 'Sub-total'].map(h => (
                  <th key={h} style={{ ...th, textAlign: h === 'Sub-total' ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fechamento.colheitas.map(c => {
                const liq = c.quantidadeTotal - c.descarte
                return (
                  <tr key={c.id}>
                    <td style={td}>{fmt(c.data)}</td>
                    <td style={{ ...td, color: '#9ca3af' }}>{c.nrDoc ?? '—'}</td>
                    <td style={{ ...td, fontWeight: 600, color: NAVY }}>
                      {c.produto.nome}
                      {c.qualidade && <span style={{ fontSize: 10, color: ORANGE, marginLeft: 6, fontWeight: 700 }}>{c.qualidade}</span>}
                    </td>
                    <td style={td}>{c.quantidadeTotal.toFixed(1)}</td>
                    <td style={{ ...td, color: PINK }}>{c.descarte > 0 ? c.descarte.toFixed(1) : '—'}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{liq.toFixed(1)}</td>
                    <td style={td}>{fmtBRL(c.preco)}</td>
                    <td style={{ ...td, fontWeight: 700, color: GREEN, textAlign: 'right' }}>{fmtBRL(liq * c.preco)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#f9fafb', borderTop: '2px solid #e5e7eb' }}>
                <td colSpan={7} style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: NAVY }}>Total Bruto</td>
                <td style={{ padding: '10px 12px', fontSize: 15, fontWeight: 800, color: GREEN, textAlign: 'right' }}>{fmtBRL(bruto)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Resumo por pessoa */}
      <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, margin: '0 0 10px' }}>Resumo por participante</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {partes.map(parte => {
          const fator = parte.pct / 100
          const brutoParte = bruto * fator
          const dedParte = totalDed * fator
          const liquido = brutoParte - dedParte
          return (
            <div key={parte.nome} style={{ flex: 1, minWidth: 220, border: `1.5px solid ${parte.cor}20`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ backgroundColor: `${parte.cor}10`, padding: '10px 14px', borderBottom: `1px solid ${parte.cor}15` }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: parte.cor, textTransform: 'uppercase', letterSpacing: 0.5 }}>{parte.tipo}</span>
                <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: NAVY }}>{parte.nome}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{parte.pct}% da produção</p>
              </div>
              <div style={{ padding: '10px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>Bruto ({parte.pct}%)</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{fmtBRL(brutoParte)}</span>
                </div>
                {fechamento.valesEmbalagem > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>Caixas/Bandeja</span>
                    <span style={{ fontSize: 12, color: PINK }}>- {fmtBRL(fechamento.valesEmbalagem * fator)}</span>
                  </div>
                )}
                {fechamento.valesDinheiro > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>Vales Dinheiro</span>
                    <span style={{ fontSize: 12, color: PINK }}>- {fmtBRL(fechamento.valesDinheiro * fator)}</span>
                  </div>
                )}
                {fechamento.creditos > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>Créditos</span>
                    <span style={{ fontSize: 12, color: PINK }}>- {fmtBRL(fechamento.creditos * fator)}</span>
                  </div>
                )}
                {fechamento.debitosAnteriores > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>Déb. Anteriores</span>
                    <span style={{ fontSize: 12, color: PINK }}>- {fmtBRL(fechamento.debitosAnteriores * fator)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', marginTop: 4, borderTop: `2px solid ${parte.cor}20` }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>A Receber</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: liquido >= 0 ? parte.cor : PINK }}>{fmtBRL(liquido)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FechamentoCard({ f, produtor }: { f: Fechamento; produtor: Produtor }) {
  const [aberto, setAberto] = useState(false)
  const [detalhe, setDetalhe] = useState<FechamentoDetalhe | null>(null)
  const [loadingDetalhe, setLoadingDetalhe] = useState(false)

  const totalParceirosPct = produtor.parceiros.reduce((s, p) => s + p.percentual, 0)
  const percProdutor = Math.max(0, 100 - totalParceirosPct)
  const totalDed = f.valesEmbalagem + f.valesDinheiro + f.creditos + f.debitosAnteriores

  async function toggle() {
    if (!aberto && !detalhe) {
      setLoadingDetalhe(true)
      const data = await fetch(`/api/fechamento/${f.id}`).then(r => r.json())
      setDetalhe(data)
      setLoadingDetalhe(false)
    }
    setAberto(v => !v)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      style={{ backgroundColor: 'white', borderRadius: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.06)', overflow: 'hidden', border: aberto ? `1.5px solid ${GREEN}30` : '1.5px solid transparent' }}>

      {/* Cabeçalho clicável */}
      <div onClick={toggle} style={{ padding: '14px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: NAVY }}>{fmt(f.dataInicio)} – {fmt(f.dataFim)}</p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>Pagamento: {fmt(f.dataPagamento)}</p>
        </div>

        {totalDed > 0 && (
          <div>
            <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>Deduções</p>
            <p style={{ margin: '1px 0 0', fontSize: 13, fontWeight: 700, color: PINK }}>- {fmtBRL(totalDed)}</p>
          </div>
        )}

        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, backgroundColor: f.status === 'PAGO' ? '#f0faf0' : '#fff7ed', color: f.status === 'PAGO' ? GREEN : ORANGE }}>
          {f.status === 'PAGO' ? 'Pago' : 'Pendente'}
        </span>

        {/* Botões de impressão */}
        <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
          <motion.button onClick={() => window.open(`/imprimir/pagamento/${f.id}`, '_blank')}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', backgroundColor: NAVY, color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <FontAwesomeIcon icon={faPrint} style={{ fontSize: 11 }} />
            {produtor.parceiros.length > 0 ? `Produtor (${percProdutor}%)` : 'Imprimir'}
          </motion.button>
          {produtor.parceiros.map((p, pi) => (
            <motion.button key={p.id} onClick={() => window.open(`/imprimir/pagamento/${f.id}/meeiro?p=${pi}`, '_blank')}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', backgroundColor: PURPLE, color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <FontAwesomeIcon icon={faPrint} style={{ fontSize: 11 }} />
              {p.nome} ({p.percentual}%)
            </motion.button>
          ))}
        </div>

        <FontAwesomeIcon icon={aberto ? faChevronUp : faChevronDown} style={{ fontSize: 13, color: '#9ca3af', flexShrink: 0 }} />
      </div>

      {/* Relatório expandido */}
      <AnimatePresence>
        {aberto && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f3f4f6' }}>
              {loadingDetalhe ? (
                <p style={{ padding: '20px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Carregando...</p>
              ) : detalhe ? (
                <div style={{ paddingTop: 16 }}>
                  <RelatorioInline fechamento={detalhe} produtor={produtor} />
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

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
    ]).then(([p, f]) => { setProdutores(p); setFechamentos(f) }).finally(() => setLoading(false))
  }, [])

  const sugestoes = useMemo(() => {
    const q = busca.toLowerCase().trim()
    if (!q || produtorSel) return []
    const res: { tipo: 'produtor' | 'meeiro'; label: string; sub: string; produtor: Produtor }[] = []
    for (const p of produtores) {
      if (p.nome.toLowerCase().includes(q) || p.cpf?.includes(q))
        res.push({ tipo: 'produtor', label: p.nome, sub: p.cpf ?? '', produtor: p })
      for (const parc of p.parceiros)
        if (parc.nome.toLowerCase().includes(q))
          res.push({ tipo: 'meeiro', label: parc.nome, sub: `Meeiro de ${p.nome}`, produtor: p })
    }
    return res.slice(0, 8)
  }, [busca, produtores, produtorSel])

  const fechamentosDoProd = useMemo(() =>
    produtorSel ? fechamentos.filter(f => f.produtor.id === produtorSel.id) : [],
    [produtorSel, fechamentos])

  function selecionar(produtor: Produtor, label: string) { setProdutorSel(produtor); setBusca(label) }
  function limpar() { setProdutorSel(null); setBusca('') }

  const totalParceirosPct = produtorSel ? produtorSel.parceiros.reduce((s, p) => s + p.percentual, 0) : 0
  const percProdutor = Math.max(0, 100 - totalParceirosPct)

  if (loading) return <PageSkeleton cards={0} rows={4} />

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0 }}>Demonstrativos de Pagamento</h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Busque pelo nome do produtor ou meeiro</p>
      </motion.div>

      {/* Busca */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        style={{ position: 'relative', maxWidth: 520, marginBottom: 28 }}>
        <FontAwesomeIcon icon={faSearch} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#9ca3af', pointerEvents: 'none', zIndex: 1 }} />
        <input
          value={busca}
          onChange={e => { setBusca(e.target.value); if (produtorSel) setProdutorSel(null) }}
          placeholder="Nome do produtor ou meeiro..."
          autoFocus
          style={{ width: '100%', padding: '13px 40px 13px 44px', border: `2px solid ${produtorSel ? GREEN : '#e5e7eb'}`, borderRadius: 12, fontSize: 15, outline: 'none', color: NAVY, boxSizing: 'border-box', transition: 'border-color 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          onFocus={e => { if (!produtorSel) e.target.style.borderColor = GREEN }}
          onBlur={e => { if (!produtorSel) e.target.style.borderColor = '#e5e7eb' }}
        />
        {busca && (
          <button onClick={limpar} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
        )}
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

      {/* Resultados */}
      <AnimatePresence mode="wait">
        {produtorSel && (
          <motion.div key={produtorSel.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>{produtorSel.nome}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: GREEN, backgroundColor: `${GREEN}12`, padding: '2px 10px', borderRadius: 20 }}>{percProdutor}%</span>
                {produtorSel.parceiros.map(p => (
                  <span key={p.id} style={{ fontSize: 12, fontWeight: 700, color: PURPLE, backgroundColor: `${PURPLE}10`, padding: '2px 10px', borderRadius: 20 }}>
                    {p.nome} {p.percentual}%
                  </span>
                ))}
              </div>
              <Link href={`/lavoura/pagamento/novo`}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', backgroundColor: GREEN, color: 'white', borderRadius: 8, textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
                <FontAwesomeIcon icon={faPlus} style={{ fontSize: 12 }} /> Novo Fechamento
              </Link>
            </div>

            {fechamentosDoProd.length === 0 ? (
              <div style={{ backgroundColor: 'white', borderRadius: 12, padding: '40px 24px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', color: '#9ca3af' }}>
                <FontAwesomeIcon icon={faFileLines} style={{ fontSize: 30, opacity: 0.3, display: 'block', margin: '0 auto 10px' }} />
                <p style={{ fontWeight: 600, color: '#6b7280', margin: '0 0 4px' }}>Nenhum fechamento para {produtorSel.nome}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {fechamentosDoProd.map(f => (
                  <FechamentoCard key={f.id} f={f} produtor={produtorSel} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {!produtorSel && !busca && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center', paddingTop: 60, color: '#9ca3af' }}>
            <FontAwesomeIcon icon={faSearch} style={{ fontSize: 40, opacity: 0.2, display: 'block', margin: '0 auto 14px' }} />
            <p style={{ fontWeight: 600, fontSize: 15, color: '#6b7280', margin: '0 0 4px' }}>Digite o nome para começar</p>
            <p style={{ fontSize: 13, margin: 0 }}>Produtores e meeiros cadastrados no sistema</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
